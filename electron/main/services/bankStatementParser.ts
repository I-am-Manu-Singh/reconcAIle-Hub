import crypto from "node:crypto";
import {
  StatementExtractionResult,
  ParsedStatementTransaction,
  RawPdfTextItem,
  ColumnBoundary,
} from "./bankStatementTypes.js";
import { BANK_PRESETS, detectBankPreset } from "./bankPresets.js";
import { extractPdfSpatialItems, mergeSplitDateTokens } from "./pdfCoordinateExtractor.js";
import {
  parseAmount,
  parseBankDate,
  discoverColumnBoundaries,
  assignColumn,
} from "./bankStatementHelpers.js";

/**
 * Native Coordinate-Aware Bank Statement Parser
 * Implements layout-aware table extraction, multi-line narration stitching,
 * Indian bank presets, and mathematical balance continuity checking.
 */
export async function parseBankStatementPdf(
  pdfBuffer: Buffer,
  documentId?: string,
  companyId?: string,
  password?: string
): Promise<StatementExtractionResult> {
  // Step 1: Extract spatial text items
  const { pages, fullText } = await extractPdfSpatialItems(pdfBuffer, password);

  // Derive spatial header text from the first page (top 450px or all items before table data)
  const page1Items = pages[0]?.items || [];
  const headerItems = page1Items.filter(it => it.y <= 420);
  const headerText = headerItems.map(it => it.str).join(" ");
  const spatialSortedText = pages.map(p => p.items.map(it => it.str).join(" ")).join("\n");

  // Step 2: Detect Bank Identity
  const presetKey = detectBankPreset(fullText, headerText);
  const bankConfig = BANK_PRESETS[presetKey];

  // Extract Metadata: Account Number, IFSC, Account Holder, Branch, Customer Id
  // Use spatialSortedText and headerText first so header values take precedence over narration tokens
  const metadataSource = `${headerText} ${spatialSortedText} ${fullText}`;
  const acctMatch = metadataSource.match(/(?:acct|a\/c|account)\s*(?:no\.?|number|#|:)?\s*[:.-]?\s*([0-9XxXX*]{9,20})/i) ||
                    metadataSource.match(/\b([0-9]{11,18})\b/);
  const accountNumber = acctMatch ? acctMatch[1] ?? null : null;
  // Look for labeled IFSC (e.g. "IFSC : HDFC0001116", "RTGS/NEFT IFSC : ...") or IFSC in the header section only
  const labeledIfscMatch = metadataSource.match(/(?:RTGS\/NEFT\s*)?IFSC\s*(?:CODE)?\s*[:.-]?\s*([A-Z]{4}0[A-Z0-9]{6})\b/i);
  const headerIfscMatch = headerText.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
  const ifscCode = labeledIfscMatch
    ? labeledIfscMatch[1]?.toUpperCase() ?? null
    : headerIfscMatch
    ? headerIfscMatch[1]?.toUpperCase() ?? null
    : null;

  // Extract Account Holder Name — handles: "Account Holder's Name", "ACCOUNT NAME", "Name of Account Holder"
  const holderMatch = fullText.match(
    /(?:account\s*holder'?s?\s*name|account\s*name|name\s*of\s*account\s*holder|proprietor\s*name)\s*[:.-]?\s*([A-Za-z\s.']+?)(?:Customer|Branch|Account|MICR|IFSC|\n|$)/i
  );
  const accountHolderName = holderMatch ? holderMatch[1]!.trim() : null;

  const branchMatch = fullText.match(/Branch\s*Name\s*[:.-]?\s*([A-Za-z0-9\s\-,()\/]+?)(?:MICR|IFSC|Customer|Account|\n|$)/i);
  const branchName = branchMatch ? branchMatch[1]!.trim() : null;

  const custIdMatch = fullText.match(/Customer\s*Id\s*[:.-]?\s*([0-9A-Za-z]+)/i);
  const customerId = custIdMatch ? custIdMatch[1]!.trim() : null;

  // Explicit Opening / Closing Balance in statement header
  const obHeaderMatch = fullText.match(/(?:Balance\s*as\s*on\s*[^:\n]+|Opening\s*Balance)\s*[:.-]?\s*(?:Rs\.?|INR)?\s*([0-9,]+\.[0-9]{2})/i);
  const explicitOpeningBalance = obHeaderMatch ? parseAmount(obHeaderMatch[1]) : null;

  const cbHeaderMatch = fullText.match(/(?:Closing\s*Balance|Balance\s*as\s*at\s*close)\s*[:.-]?\s*(?:Rs\.?|INR)?\s*([0-9,]+\.[0-9]{2})/i);
  const explicitClosingBalance = cbHeaderMatch ? parseAmount(cbHeaderMatch[1]) : null;

  const rawTransactions: ParsedStatementTransaction[] = [];
  let discoveredBoundaries: ColumnBoundary[] | null = null;

  // Step 3: Process Pages
  for (const page of pages) {
    const items = mergeSplitDateTokens(page.items);
    if (items.length === 0) continue;

    // Skip pages that are non-transactional deposit summaries or certificates
    const pageFullText = items.map(it => it.str).join(" ");

    // Check if this page is a Tally Day Book statement
    if (/Day\s*Book/i.test(pageFullText) && (/Vch\s*Type/i.test(pageFullText) || /Debit\s*Amount/i.test(pageFullText))) {
      const daybookTxs = parseDayBookItems(items, page.pageNumber, documentId, companyId);
      if (daybookTxs.length > 0) {
        rawTransactions.push(...daybookTxs);
        continue;
      }
    }

    // Skip pages that are non-transactional deposit summaries or certificates
    if (
      /Summary\s+Statement\s+of\s+Recurring\s+Deposit|Detailed\s+Statement\s+of\s+Recurring\s+Deposit|Interest\s+Certificate|Balance\s+Certificate|Tax\s+Statement|TDS\s+Certificate|Term\s+Deposit/i.test(pageFullText) &&
      !/Statement\s+of\s+(?:Banking\s+Account|Account)|TRANSACTION\s+PARTICULARS/i.test(pageFullText)
    ) {
      continue;
    }

    // Detect header row Y position on page
    let headerY = -1;
    for (const it of items) {
      const s = it.str.toUpperCase();
      if ((s.includes("DATE") || s.includes("VAL DT") || s.includes("VALUE") || s.includes("TRAN DATE")) && 
          (s.includes("NARRATION") || s.includes("PARTICULARS") || s.includes("DESCRIPTION") || s.includes("REMARKS") || s.includes("BALANCE") || s.includes("WITHDRAWAL") || s.includes("DEPOSIT") || s.includes("DEBIT") || s.includes("CREDIT") || s.includes("AMOUNT"))) {
        headerY = it.y;
        break;
      }
    }

    // If no single line contained multiple header terms, scan by y-proximity
    // Use a strict tolerance (<= 5.0px) so underlying data rows (such as CASH DEPOSIT on ICICI) do not bleed into the header row
    const headerTolerance = 5.0;
    if (headerY === -1) {
      for (const it of items) {
        if (/^(?:DATE|TXN\s*DATE|TRANSACTION\s*DATE|POSTING\s*DATE|VAL\s*DT|TRAN\s*DATE)$/i.test(it.str.trim())) {
          // Verify if there's narration/balance/amount on similar Y
          const sameRow = items.filter(other => Math.abs(other.y - it.y) <= headerTolerance);
          const hasDataHeaders = sameRow.some(r => /BALANCE|CLOSING|WITHDRAWAL|DEPOSIT|DEBIT|CREDIT|DR|CR|PARTICULARS|NARRATION|DESCRIPTION|AMOUNT/i.test(r.str));
          if (hasDataHeaders) {
            headerY = it.y;
            break;
          }
        }
      }
    }

    // Determine column boundaries: check if dynamic headers (Debit/Credit/Balance/Amount) are present on this page
    if (headerY !== -1) {
      const pageCols = discoverColumnBoundaries(items, headerY, headerTolerance);
      const essentialCols = pageCols.filter(c => c.name !== "ignore");
      if (essentialCols.length >= 3) {
        discoveredBoundaries = pageCols;
      }
    }

    const boundaries: ColumnBoundary[] = discoveredBoundaries || (
      bankConfig.knownColumns && bankConfig.knownColumns.length >= 4
        ? (bankConfig.knownColumns as ColumnBoundary[])
        : discoverColumnBoundaries(items, headerY !== -1 ? headerY : 120, headerTolerance)
    );

    // If page has an explicit header row, strictly start below it; otherwise skip page if no table headers were ever discovered
    if (headerY === -1 && !discoveredBoundaries) {
      continue;
    }

    // Filter items belonging strictly to the table data (below the header row)
    // On continuation pages without explicit table header, start below header metadata region (y > 225)
    const tableItems = headerY !== -1 
      ? items.filter(it => it.y > headerY + 4.0)
      : items.filter(it => it.y > 225);

    // Find the Y position of any disclaimer, end-of-statement marker, footer or total summary
    let disclaimerCutoffY = 999999;
    for (const it of tableItems) {
      const text = it.str.trim();
      if (/^(?:disclaimer|note|important\s*notice|terms|conditions|unless\s+(?:the\s+)?constituent|centralized\s+receipt|if\s+you\s+have\s+any\s+banking\s+grievance|online\s+complaint|pa\s+holder|beware\s+of\s+phishing|please\s+do\s+not\s+share)/i.test(text) ||
          /page\s+\d+\s+of\s+\d+|computer\s+generated|statement\s+summary|end\s+of\s+statement|total\s+amount|grand\s+total|transaction\s+total|total\s+debits|total\s+credits|summary\s*:|other\s+account\s+details|linked\s+casa|linked\s+deposits|banking\s+ombudsman|toll\s+free\s+no|automated\s+teller\s+machine|one\s+time\s+password|magnetic\s+ink\s+character|real\s+time\s+gross\s+settlement|account\s+related\s+other\s+information|hdfc\s+bank\s+limited|\*closing\s+balance/i.test(text)) {
        if (it.y < disclaimerCutoffY) {
          disclaimerCutoffY = it.y;
        }
      }
    }

    // Pre-process items: if any token starts with a date and has subsequent narration (e.g. Kotak "27-May-24 UPI/..."),
    // split it so the date is cleanly extracted into the date column
    const processedTableItems: RawPdfTextItem[] = [];
    for (const it of tableItems) {
      const m = it.str.match(/^(\d{2}-[A-Za-z]{3}-\d{2,4}|\d{2}[-/.]\d{2}[-/.]\d{2,4})\s+(.+)$/);
      if (m && m[1] && m[2]) {
        processedTableItems.push({
          ...it,
          str: m[1],
          width: Math.min(50, it.width * 0.3),
        });
        processedTableItems.push({
          ...it,
          x: it.x + Math.min(52, it.width * 0.32),
          str: m[2],
          width: Math.max(10, it.width - 52),
        });
      } else {
        processedTableItems.push(it);
      }
    }

    // Group items into physical horizontal lines (clustering Y within ±3.0px)
    const rowClusters: { y: number; items: RawPdfTextItem[] }[] = [];
    for (const it of processedTableItems) {
      // Ignore footers and disclaimers strictly at or below the cutoff
      if (it.y >= disclaimerCutoffY - 2.0) {
        continue;
      }
      if (/page\s+\d+|computer\s+generated|statement\s+summary|end\s+of\s+statement|disclaimer|banking\s+ombudsman|toll\s+free/i.test(it.str)) {
        continue;
      }

      let cluster = rowClusters.find(c => Math.abs(c.y - it.y) <= 3.0);
      if (!cluster) {
        cluster = { y: it.y, items: [] };
        rowClusters.push(cluster);
      }
      cluster.items.push(it);
    }

    // Sort clusters top-to-bottom
    rowClusters.sort((a, b) => a.y - b.y);

    // Stitch rows into transactions
    let currentTx: {
      date: string;
      valueDate?: string | undefined;
      narrationParts: string[];
      refParts: string[];
      withdrawalStr: string;
      depositStr: string;
      amountStr?: string;
      drcrStr?: string;
      balanceStr: string;
      pageNumber: number;
    } | null = null;

    let pendingPrecedingNarration: string[] = [];

    for (let clusterIdx = 0; clusterIdx < rowClusters.length; clusterIdx++) {
      const cluster = rowClusters[clusterIdx]!;
      // Filter out Opening Balance, statement period metadata lines (e.g. From : 01/06/2018 To : 10/10/2018), and standalone page/statement TOTAL summary rows
      const rowCombinedText = cluster.items.map(i => i.str).join(" ").trim();
      if (/OPENING\s*BALANCE|FROM\s*:\s*\d|STATEMENT\s+OF\s+ACCOUNT|ACCOUNT\s+RELATED\s+OTHER\s+INFORMATION|^\s*TOTAL\b/i.test(rowCombinedText)) {
        continue;
      }

      // Map cluster tokens to columns
      const colBuckets: Record<ColumnBoundary["name"], string[]> = {
        date: [],
        valueDate: [],
        narration: [],
        chqRef: [],
        withdrawal: [],
        deposit: [],
        amount: [],
        drcr: [],
        balance: [],
        ignore: [],
      };

      for (const it of cluster.items) {
        const col = assignColumn(it, boundaries);
        if (col && col !== "ignore") {
          colBuckets[col].push(it.str.trim());
        }
      }

      // Check date column for a valid date token (handling composite tokens where cheque/ref is on same row)
      let isoDate: string | null = null;
      const nonDateParts: string[] = [];
      for (const tok of colBuckets.date) {
        if (!isoDate) {
          const parsed = parseBankDate(tok, bankConfig);
          if (parsed) {
            isoDate = parsed;
            continue;
          }
        }
        nonDateParts.push(tok);
      }
      if (!isoDate && colBuckets.date.length > 0) {
        isoDate = parseBankDate(colBuckets.date.join(" ").trim(), bankConfig);
      }
      if (isoDate && nonDateParts.length > 0) {
        // If nonDateParts look like narration text (contains letters and words), place in narration
        const isNarrationLike = nonDateParts.some(p => /[A-Za-z]{3,}/.test(p) && !/^(?:CHQ|REF|NEFT|RTGS|UPI|IMPS|POS)$/i.test(p));
        if (isNarrationLike) {
          colBuckets.narration.unshift(...nonDateParts);
        } else {
          colBuckets.chqRef.unshift(...nonDateParts);
        }
      }

      if (isoDate) {
        // We have an anchor row for a new transaction
        if (currentTx) {
          pushTransaction(currentTx, rawTransactions, bankConfig.label, documentId, companyId, accountNumber);
        }

        const narrationInitial = [...pendingPrecedingNarration, ...colBuckets.narration.filter(Boolean)];
        pendingPrecedingNarration = [];

        currentTx = {
          date: isoDate,
          valueDate: colBuckets.valueDate.join(" ").trim() || undefined,
          narrationParts: narrationInitial,
          refParts: colBuckets.chqRef.filter(Boolean),
          withdrawalStr: colBuckets.withdrawal.join(" ").trim(),
          depositStr: colBuckets.deposit.join(" ").trim(),
          amountStr: colBuckets.amount.join(" ").trim(),
          drcrStr: colBuckets.drcr.join(" ").trim(),
          balanceStr: colBuckets.balance.join(" ").trim(),
          pageNumber: page.pageNumber,
        };
      } else {
        // Check if next row has date and is immediately following (preceding narration line)
        const nextCluster = rowClusters[clusterIdx + 1];
        const nextDateToken = nextCluster?.items.map(it => {
          const col = assignColumn(it, boundaries);
          return col === "date" ? it.str : "";
        }).join(" ").trim();
        const nextHasDate = nextDateToken ? Boolean(parseBankDate(nextDateToken, bankConfig)) : false;

        if (nextHasDate && nextCluster && (nextCluster.y - cluster.y) <= 8.5) {
          if (colBuckets.narration.length > 0) {
            pendingPrecedingNarration.push(...colBuckets.narration);
          }
        } else if (currentTx) {
          // Multi-line narration or split row continuation for existing currentTx
          if (colBuckets.narration.length > 0) {
            currentTx.narrationParts.push(...colBuckets.narration);
          }
          if (colBuckets.chqRef.length > 0) {
            currentTx.refParts.push(...colBuckets.chqRef);
          }
          // If amounts were on continuation line
          if (!currentTx.withdrawalStr && colBuckets.withdrawal.length > 0) {
            currentTx.withdrawalStr = colBuckets.withdrawal.join(" ").trim();
          }
          if (!currentTx.depositStr && colBuckets.deposit.length > 0) {
            currentTx.depositStr = colBuckets.deposit.join(" ").trim();
          }
          if (!currentTx.amountStr && colBuckets.amount.length > 0) {
            currentTx.amountStr = colBuckets.amount.join(" ").trim();
          }
          if (!currentTx.drcrStr && colBuckets.drcr.length > 0) {
            currentTx.drcrStr = colBuckets.drcr.join(" ").trim();
          }
          if (!currentTx.balanceStr && colBuckets.balance.length > 0) {
            currentTx.balanceStr = colBuckets.balance.join(" ").trim();
          }
        }
      }
    }

    if (currentTx) {
      pushTransaction(currentTx, rawTransactions, bankConfig.label, documentId, companyId, accountNumber);
    }
  }

  // Step 4: Balance Chain Reconciliation & Direction Inference
  let totalDebits = 0;
  let totalCredits = 0;
  let calculatedClosingBalance = 0;
  let openingBalance = 0;
  let isBalanceReconciled = true;

  if (rawTransactions.length > 0) {
    // Support both ascending (oldest-first) and descending (newest-first) statement layouts,
    // as well as detecting whether Withdrawal and Deposit columns were inverted.
    if (rawTransactions.length > 1) {
      // Test 4 permutations:
      // 1. Forward normal: Bal[i] = Bal[i-1] - Debit[i] + Credit[i]
      // 2. Forward swapped: Bal[i] = Bal[i-1] + Debit[i] - Credit[i]
      // 3. Reverse normal: Bal[i-1] = Bal[i] - Debit[i-1] + Credit[i-1]
      // 4. Reverse swapped: Bal[i-1] = Bal[i] + Debit[i-1] - Credit[i-1]
      let forwardNormalErr = 0;
      let forwardSwappedErr = 0;
      let reverseNormalErr = 0;
      let reverseSwappedErr = 0;

      for (let i = 1; i < rawTransactions.length; i++) {
        const prevBal = rawTransactions[i - 1]!.balance;
        const currBal = rawTransactions[i]!.balance;
        const d = rawTransactions[i]!.debit;
        const c = rawTransactions[i]!.credit;

        const expNormal = Math.round((prevBal - d + c) * 100) / 100;
        const expSwapped = Math.round((prevBal + d - c) * 100) / 100;

        if (Math.abs(expNormal - currBal) > 0.05) forwardNormalErr++;
        if (Math.abs(expSwapped - currBal) > 0.05) forwardSwappedErr++;
      }

      const reversed = [...rawTransactions].reverse();
      for (let i = 1; i < reversed.length; i++) {
        const prevBal = reversed[i - 1]!.balance;
        const currBal = reversed[i]!.balance;
        const d = reversed[i]!.debit;
        const c = reversed[i]!.credit;

        const expNormal = Math.round((prevBal - d + c) * 100) / 100;
        const expSwapped = Math.round((prevBal + d - c) * 100) / 100;

        if (Math.abs(expNormal - currBal) > 0.05) reverseNormalErr++;
        if (Math.abs(expSwapped - currBal) > 0.05) reverseSwappedErr++;
      }

      // Check dates if present
      const firstD = rawTransactions[0]!.date || "";
      const lastD = rawTransactions[rawTransactions.length - 1]!.date || "";
      const isDateDescending = firstD && lastD && firstD > lastD;

      const minForward = Math.min(forwardNormalErr, forwardSwappedErr);
      const minReverse = Math.min(reverseNormalErr, reverseSwappedErr);

      if (minReverse < minForward && (isDateDescending || minReverse === 0)) {
        rawTransactions.reverse();
        if (reverseSwappedErr < reverseNormalErr) {
          // Swap debit and credit on all transactions
          for (const tx of rawTransactions) {
            const temp = tx.debit;
            (tx as any).debit = tx.credit;
            (tx as any).credit = temp;
          }
        }
      } else if (forwardSwappedErr < forwardNormalErr && forwardSwappedErr === 0) {
        // Swap debit and credit on all transactions
        for (const tx of rawTransactions) {
          const temp = tx.debit;
          (tx as any).debit = tx.credit;
          (tx as any).credit = temp;
        }
      }
    }

    const firstTx = rawTransactions[0]!;
    const lastTx = rawTransactions[rawTransactions.length - 1]!;

    // Infer opening balance: OB = Bal1 + W1 - D1
    const inferredOb = Math.round((firstTx.balance + firstTx.debit - firstTx.credit) * 100) / 100;

    // Anchor opening balance:
    if (explicitOpeningBalance !== null) {
      if (Math.abs(explicitOpeningBalance - inferredOb) <= 0.05) {
        openingBalance = explicitOpeningBalance;
      } else if (Math.abs(explicitOpeningBalance - lastTx.balance) <= 0.05 && rawTransactions.length > 1) {
        // The header OB actually matches the other end; reverse transactions to align
        rawTransactions.reverse();
        openingBalance = explicitOpeningBalance;
      } else {
        // If explicit opening balance does not match the first transaction's inferred OB,
        // use inferredOb to maintain internal chain continuity, while preserving explicitOpeningBalance in metadata
        openingBalance = inferredOb;
      }
    } else {
      openingBalance = inferredOb;
    }

    calculatedClosingBalance = openingBalance;

    for (let i = 0; i < rawTransactions.length; i++) {
      const tx = rawTransactions[i]!;

      // Direction fallback via balance delta if Debit/Credit were zero or ambiguous:
      if (tx.debit === 0 && tx.credit === 0 && i > 0 && tx.balance !== 0) {
        const prevBal = rawTransactions[i - 1]!.balance;
        const delta = tx.balance - prevBal;
        if (delta > 0) {
          (tx as any).credit = Math.round(delta * 100) / 100;
        } else if (delta < 0) {
          (tx as any).debit = Math.round(Math.abs(delta) * 100) / 100;
        }
      }

      totalDebits += tx.debit;
      totalCredits += tx.credit;
      calculatedClosingBalance = calculatedClosingBalance - tx.debit + tx.credit;

      // Mathematical continuity validation: Prev_Bal - W + D == Current_Bal
      if (i > 0) {
        const prevBal = rawTransactions[i - 1]!.balance;
        const expected = Math.round((prevBal - tx.debit + tx.credit) * 100) / 100;
        const actual = Math.round(tx.balance * 100) / 100;
        if (Math.abs(expected - actual) > 0.05) {
          (tx as any).validationWarning = `Continuity mismatch: Expected ${expected}, got ${actual}`;
          isBalanceReconciled = false;
        }
      } else {
        // Validate first transaction against opening balance
        const expected = Math.round((openingBalance - tx.debit + tx.credit) * 100) / 100;
        const actual = Math.round(tx.balance * 100) / 100;
        if (Math.abs(expected - actual) > 0.05) {
          (tx as any).validationWarning = `Continuity mismatch with Opening Balance: Expected ${expected}, got ${actual}`;
          isBalanceReconciled = false;
        }
      }
    }
  }

  // Compute Per-Month Balance Breakdowns
  const monthMap = new Map<string, {
    month: string;
    monthLabel: string;
    txs: ParsedStatementTransaction[];
  }>();

  for (const tx of rawTransactions) {
    const ym = tx.date ? tx.date.slice(0, 7) : "Unknown";
    if (!monthMap.has(ym)) {
      let label = ym;
      try {
        const [year, month] = ym.split("-");
        const dateObj = new Date(parseInt(year!, 10), parseInt(month!, 10) - 1, 1);
        label = dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } catch {}
      monthMap.set(ym, { month: ym, monthLabel: label, txs: [] });
    }
    monthMap.get(ym)!.txs.push(tx);
  }

  const monthlyBreakdown: any[] = [];
  let monthRunningBal = openingBalance;

  for (const [ym, mData] of monthMap.entries()) {
    const mDebits = mData.txs.reduce((acc, t) => acc + t.debit, 0);
    const mCredits = mData.txs.reduce((acc, t) => acc + t.credit, 0);
    const startBal = monthRunningBal;
    const endBal = mData.txs.length > 0 ? mData.txs[mData.txs.length - 1]!.balance : startBal;
    const expectedEnd = Math.round((startBal - mDebits + mCredits) * 100) / 100;
    const isBalanced = Math.abs(expectedEnd - endBal) <= 0.05;
    monthRunningBal = endBal;

    monthlyBreakdown.push({
      month: ym,
      monthLabel: mData.monthLabel,
      openingBalance: Math.round(startBal * 100) / 100,
      totalDebits: Math.round(mDebits * 100) / 100,
      totalCredits: Math.round(mCredits * 100) / 100,
      closingBalance: Math.round(endBal * 100) / 100,
      txCount: mData.txs.length,
      isBalanced,
    });
  }

  // Compute Per-Page Balance Breakdowns
  const pageMap = new Map<number, ParsedStatementTransaction[]>();
  for (const tx of rawTransactions) {
    const pg = tx.pageNumber || 1;
    if (!pageMap.has(pg)) pageMap.set(pg, []);
    pageMap.get(pg)!.push(tx);
  }

  const pageBreakdown: any[] = [];
  let pageRunningBal = openingBalance;

  for (let pg = 1; pg <= pages.length; pg++) {
    const pTxs = pageMap.get(pg) || [];
    const pDebits = pTxs.reduce((acc, t) => acc + t.debit, 0);
    const pCredits = pTxs.reduce((acc, t) => acc + t.credit, 0);
    const startBal = pageRunningBal;
    const endBal = pTxs.length > 0 ? pTxs[pTxs.length - 1]!.balance : startBal;
    const expectedEnd = Math.round((startBal - pDebits + pCredits) * 100) / 100;
    const isBalanced = Math.abs(expectedEnd - endBal) <= 0.05;
    pageRunningBal = endBal;

    pageBreakdown.push({
      pageNumber: pg,
      startBalance: Math.round(startBal * 100) / 100,
      totalDebits: Math.round(pDebits * 100) / 100,
      totalCredits: Math.round(pCredits * 100) / 100,
      endBalance: Math.round(endBal * 100) / 100,
      txCount: pTxs.length,
      isBalanced,
    });
  }

  const closingBalance = explicitClosingBalance !== null
    ? explicitClosingBalance
    : (rawTransactions.length > 0
        ? Math.abs(rawTransactions[rawTransactions.length - 1]!.balance)
        : 0);

  const fromDate = rawTransactions.length > 0 ? rawTransactions[0]!.date : null;
  const toDate = rawTransactions.length > 0 ? rawTransactions[rawTransactions.length - 1]!.date : null;

  return {
    bankName: presetKey,
    bankLabel: bankConfig.label,
    accountHolderName,
    customerId,
    branchName,
    accountNumber,
    ifscCode,
    period: { fromDate, toDate },
    openingBalance: Math.round(openingBalance * 100) / 100,
    closingBalance: Math.round(closingBalance * 100) / 100,
    calculatedClosingBalance: Math.abs(Math.round(calculatedClosingBalance * 100) / 100) < 0.01 ? 0 : Math.round(calculatedClosingBalance * 100) / 100,
    isBalanceReconciled,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    transactions: rawTransactions,
    monthlyBreakdown,
    pageBreakdown,
    confidence: isBalanceReconciled ? 0.98 : 0.85,
    pageCount: pages.length,
    extractionMethod: "NATIVE_SPATIAL",
  };
}

function pushTransaction(
  txState: {
    date: string;
    valueDate?: string | undefined;
    narrationParts: string[];
    refParts: string[];
    withdrawalStr: string;
    depositStr: string;
    amountStr?: string | undefined;
    drcrStr?: string | undefined;
    balanceStr: string;
    pageNumber: number;
  },
  list: ParsedStatementTransaction[],
  bankLabel: string,
  documentId?: string,
  companyId?: string,
  accountNumber?: string | null
) {
  // Clean bank boilerplate, security advisories, and acronym footers from narration and referenceNo
  let narration = txState.narrationParts.join(" ").replace(/\s+/g, " ").trim();
  narration = narration
    .replace(/(?:Please\s+do\s+not\s+share\s+your\s+ATM.*|media\.\s*Bank\s*never\s*asks\s*for\s*such\s*information.*|Personal\s+Identification\s+Number.*|Magnetic\s+Ink\s+Character.*|Indian\s+Financial\s+System\s+Code.*|Real\s+Time\s+Gross\s+Settlement.*)/gi, "")
    .trim();

  let refNo = txState.refParts.join(" ").replace(/\s+/g, " ").trim();
  refNo = refNo
    .replace(/(?:Please\s+do\s+not\s+share\s+your\s+ATM.*|media\.\s*Bank\s*never\s*asks\s*for\s*such\s*information.*|Personal\s+Identification\s+Number.*|Magnetic\s+Ink\s+Character.*|Indian\s+Financial\s+System\s+Code.*|Real\s+Time\s+Gross\s+Settlement.*)/gi, "")
    .trim();

  let debit = Math.abs(parseAmount(txState.withdrawalStr));
  let credit = Math.abs(parseAmount(txState.depositStr));

  // If statement has single Amount column with DR/CR indicator (e.g. Axis Bank)
  if (debit === 0 && credit === 0 && txState.amountStr) {
    const rawAmt = Math.abs(parseAmount(txState.amountStr));
    const flag = (txState.drcrStr || "").trim().toUpperCase();
    if (flag === "DR" || flag.includes("DR")) {
      debit = rawAmt;
    } else if (flag === "CR" || flag.includes("CR")) {
      credit = rawAmt;
    } else {
      // Default to credit or debit based on context
      credit = rawAmt;
    }
  }

  const balance = parseAmount(txState.balanceStr);

  // Require at least a valid date and either an amount or narration
  if (!txState.date || (!narration && debit === 0 && credit === 0)) {
    return;
  }

  list.push({
    id: `tx_${crypto.randomUUID().slice(0, 12)}`,
    documentId,
    companyId: companyId || "",
    date: txState.date,
    valueDate: txState.valueDate,
    narration: narration || "Bank Transaction",
    referenceNo: refNo,
    debit,
    credit,
    balance,
    pageNumber: txState.pageNumber,
    bankName: bankLabel,
    accountNumber: accountNumber ?? undefined,
  });
}

function parseDayBookItems(
  pageItems: RawPdfTextItem[],
  pageNum: number,
  docId?: string,
  companyId?: string
): ParsedStatementTransaction[] {
  const rawItems = pageItems.map(it => ({ str: it.str.trim(), x: Math.round(it.x), y: Math.round(it.y) })).filter(i => i.str);
  const rows: { y: number; items: typeof rawItems }[] = [];
  rawItems.sort((a, b) => a.y - b.y);

  for (const item of rawItems) {
    const existing = rows.find(r => Math.abs(r.y - item.y) <= 4);
    if (existing) existing.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);

  const txs: ParsedStatementTransaction[] = [];
  let currentVch: any = null;
  const dateRegex = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/;

  for (const row of rows) {
    const texts = row.items.map(i => i.str);
    const first = texts[0] || "";
    if (dateRegex.test(first)) {
      if (currentVch) {
        txs.push(currentVch);
      }
      let party = "";
      let vchType = "";
      let vchNo = "";
      let debit = 0;
      let credit = 0;

      for (const item of row.items) {
        if (item.x >= 70 && item.x < 240) party = item.str;
        else if (item.x >= 240 && item.x < 350) vchType = item.str;
        else if (item.x >= 350 && item.x < 430) vchNo = item.str;
        else if (item.x >= 430 && item.x < 500) debit = parseFloat(item.str.replace(/,/g, "")) || 0;
        else if (item.x >= 500) credit = parseFloat(item.str.replace(/,/g, "")) || 0;
      }

      const dateParts = first.split(/[-/.]/);
      let isoDate = first;
      if (dateParts.length === 3 && dateParts[0] && dateParts[1] && dateParts[2]) {
        isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;
      }

      currentVch = {
        id: `daybook_${pageNum}_${vchType || "vch"}_${vchNo || txs.length + 1}_${Date.now()}_${txs.length}`,
        documentId: docId,
        companyId: companyId || "",
        date: isoDate,
        valueDate: isoDate,
        narration: `[${vchType || "Voucher"} #${vchNo || ""}] ${party}`.trim(),
        referenceNo: vchNo,
        debit,
        credit,
        balance: 0,
        pageNumber: pageNum,
        bankName: "Day Book Register",
        subEntries: [party]
      };
    } else if (currentVch) {
      let subText = "";
      let subDebit = 0;
      let subCredit = 0;
      for (const item of row.items) {
        if (item.x >= 70 && item.x < 430 && !/^\d+$/.test(item.str)) {
          subText = (subText + " " + item.str).trim();
        } else if (item.x >= 430 && item.x < 500) {
          subDebit = parseFloat(item.str.replace(/,/g, "")) || 0;
        } else if (item.x >= 500) {
          subCredit = parseFloat(item.str.replace(/,/g, "")) || 0;
        }
      }
      if (subText && !/Day Book|Page \d+|Inwards Qty|Outwards Qty|Date|Particulars|Debit Amount/i.test(subText)) {
        currentVch.subEntries.push(subText);
        if (currentVch.debit === 0 && subDebit > 0) currentVch.debit = subDebit;
        if (currentVch.credit === 0 && subCredit > 0) currentVch.credit = subCredit;
      }
    }
  }
  if (currentVch) txs.push(currentVch);

  return txs.map((t: any) => {
    const otherParties = (t.subEntries || []).slice(1).join(", ");
    const { subEntries, ...rest } = t;
    return {
      ...rest,
      narration: otherParties ? `${t.narration} (${otherParties})` : t.narration
    };
  });
}
