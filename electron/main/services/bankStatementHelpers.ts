import { parse, isValid, format } from "date-fns";
import { RawPdfTextItem, ColumnBoundary, BankTemplateConfig } from "./bankStatementTypes.js";
import { BANK_PRESETS } from "./bankPresets.js";

/**
 * Normalizes Indian currency strings into numerical floats.
 * Handles commas in Indian numbering (12,50,000.50), trailing Dr/Cr,
 * parenthesized negatives (5,000.00), and dashes/blanks as 0.
 */
export function parseAmount(val: string | undefined | null): number {
  if (!val) return 0;
  let str = val.trim();
  if (str === "-" || str === "—" || str === "" || str.toLowerCase() === "nil") return 0;

  // Handle parenthesized negative (e.g. (1,500.00))
  const isParenNegative = /^\(.*\)$/.test(str);
  str = str.replace(/[()]/g, "").trim();

  // Strip currency symbols
  str = str.replace(/[₹$€£\s,]/g, "");

  // Detect Dr / Cr suffix
  const isDr = /dr$/i.test(str);
  str = str.replace(/(?:cr|dr)$/i, "").trim();

  const num = parseFloat(str);
  if (isNaN(num)) return 0;

  const result = Math.abs(num);
  return isParenNegative || isDr ? -result : result;
}

/**
 * Parses and formats heterogeneous Indian bank date strings into standardized ISO (YYYY-MM-DD).
 */
export function parseBankDate(raw: string, config: BankTemplateConfig): string | null {
  let clean = raw.trim();
  // Extract clean date token if mixed with serial numbers or noise (e.g. "1 07-04-2025" -> "07-04-2025")
  const dateSub = clean.match(/\b(\d{2}[-/.]\d{2}[-/.]\d{4}|\d{2}[-/.]\d{2}[-/.]\d{2}|\d{2}-[A-Za-z]{3}-\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\b/);
  if (dateSub && dateSub[1]) {
    clean = dateSub[1].trim();
  }

  // Try bank specific patterns first
  for (const { regex, format: fmt } of config.datePatterns) {
    if (regex.test(clean)) {
      if (fmt === "universal") break;
      try {
        const parsed = parse(clean, fmt, new Date());
        if (isValid(parsed)) {
          return format(parsed, "yyyy-MM-dd");
        }
      } catch {
        // continue
      }
    }
  }

  // Universal fallbacks
  const commonFormats = [
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "dd.MM.yyyy",
    "dd/MM/yy",
    "dd-MM-yy",
    "dd-MMM-yyyy",
    "dd-MMM-yy",
    "d MMM yyyy",
    "dd MMM yyyy",
    "yyyy-MM-dd",
    "yyyy/MM/dd",
  ];

  for (const fmt of commonFormats) {
    try {
      const parsed = parse(clean, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // continue
    }
  }

  return null;
}

/**
 * Auto-discovers table column boundaries if not statically hardcoded in preset.
 * Computes centroids of recognized header labels.
 */
export function discoverColumnBoundaries(
  items: RawPdfTextItem[],
  headerY: number,
  yTolerance: number
): ColumnBoundary[] {
  const headerTokens = items.filter(it => Math.abs(it.y - headerY) <= yTolerance);
  headerTokens.sort((a, b) => a.x - b.x);

  const foundCols: { name: ColumnBoundary["name"]; xCenter: number; left: number; right: number }[] = [];
  const seenCols = new Set<ColumnBoundary["name"]>();

  for (const it of headerTokens) {
    const s = it.str.toUpperCase().trim();
    const xCenter = it.x + (it.width / 2);

    let colName: ColumnBoundary["name"] | null = null;

    // Value Date column patterns (check before general DATE)
    if (/\b(?:VALUE\s*DATE|VAL\s*DT|VALUE\s*DT|VAL\s*DATE)\b/i.test(s)) {
      colName = "valueDate";
    } else if (/\b(?:DATE|TXN\s*DATE|TRANSACTION\s*DATE|TRANS\s*DATE|POSTING\s*DATE|POST\s*DATE|ENTRY\s*DATE|BOOK\s*DATE|TRAN\s*DATE)\b/i.test(s)) {
      colName = "date";
    } else if (/\b(?:BRANCH|BRANCH\s*CODE|SL\s*NO|SR\s*NO|SERIAL|S\s*NO|SNO|SR\.?\s*NO\.?|MODE|TXN\s*TYPE|TRANSACTION\s*TYPE|TYPE|INSTRUMENT\s*TYPE|INST\s*TYPE)\b/i.test(s)) {
      // Ignore: serial numbers, branch codes, transaction type/mode columns
      colName = "ignore";
    } else if (/\b(?:NARRATION|DESCRIPTION|PARTICULARS|TRANSACTION\s*DETAILS|TRANSACTION\s*REMARKS|TRANSACTION\s*NARRATION|REMARKS|DETAILS|MEMO)\b/i.test(s)) {
      colName = "narration";
    } else if (/\b(?:CHQ|CHEQUE|REF|UTR|REFERENCE|CHQ\s*NO|CHEQUE\s*NO|REF\s*NO|TRANSACTION\s*ID|TXN\s*ID|INSTRUMENT\s*NO|TRAN\s*ID|TRAN\s*REF|TRANS\s*REF|TRANSACTION\s*NO|UTR\s*NO|UTR\s*REF|CMS\s*REF)\b/i.test(s)) {
      colName = "chqRef";
    } else if (/\b(?:DR\/CR|CR\/DR|SIGN)\b/i.test(s)) {
      // Check composite DR/CR indicator before standalone DR/CR
      colName = "drcr";
    } else if (/\b(?:WITHDRAWAL|DEBIT|DR|WITHDRAWALS|DR\s*AMT|DR\s*AMOUNT|DEBIT\s*AMOUNT|PAID\s*OUT|PAYMENTS?)\b/i.test(s)) {
      colName = "withdrawal";
    } else if (/\b(?:DEPOSIT|CREDIT|CR|DEPOSITS|CR\s*AMT|CR\s*AMOUNT|CREDIT\s*AMOUNT|PAID\s*IN|RECEIPTS?)\b/i.test(s)) {
      colName = "deposit";
    } else if (/\b(?:AMOUNT\s*\(INR\)|AMOUNT|TRANSACTION\s*AMOUNT|TXN\s*AMT)\b/i.test(s)) {
      colName = "amount";
    } else if (/\b(?:BALANCE|CLOSING|CLOSING\s*BALANCE|BAL|RUNNING\s*BAL|RUNNING\s*BALANCE|NET\s*BALANCE|BALANCE\(INR\))\b/i.test(s)) {
      colName = "balance";
    }

    if (colName && colName !== "ignore") {
      if (!seenCols.has(colName)) {
        seenCols.add(colName);
        foundCols.push({ name: colName, xCenter, left: it.x, right: it.x + it.width });
      }
    } else if (colName === "ignore") {
      foundCols.push({ name: "ignore", xCenter, left: it.x, right: it.x + it.width });
    }
  }

  // Sort by x position
  foundCols.sort((a, b) => a.xCenter - b.xCenter);

  // If fewer than 3 essential columns were detected, fallback to standard layout
  if (foundCols.filter(c => c.name !== "ignore").length < 3) {
    return [
      { name: "date", minX: 10, maxX: 85 },
      { name: "narration", minX: 85, maxX: 330 },
      { name: "chqRef", minX: 330, maxX: 400 },
      { name: "withdrawal", minX: 400, maxX: 470 },
      { name: "deposit", minX: 470, maxX: 540 },
      { name: "balance", minX: 540, maxX: 650 },
    ];
  }

  // Calculate boundaries between adjacent columns
  const boundaries: ColumnBoundary[] = [];
  for (let i = 0; i < foundCols.length; i++) {
    const col = foundCols[i]!;
    let minX = i === 0 ? 0 : (foundCols[i - 1]!.xCenter + col.xCenter) / 2;
    let maxX = i === foundCols.length - 1 ? 1000 : (col.xCenter + foundCols[i + 1]!.xCenter) / 2;

    // Date column tokens are compact (typically <= 65px wide, e.g. "DD/MM/YY" or "DD-MM-YYYY").
    // Restrict date column maxX so wide narration text in the next column is never assigned to "date".
    if (col.name === "date" && i < foundCols.length - 1) {
      maxX = Math.min(maxX, col.right + 16);
    }
    if (i > 0 && foundCols[i - 1]!.name === "date") {
      minX = boundaries[i - 1]!.maxX;
    }

    boundaries.push({
      name: col.name,
      minX: Math.round(minX),
      maxX: Math.round(maxX),
    });
  }

  return boundaries;
}

/**
 * Assigns a text fragment to a column boundary based on its x-center coordinate.
 */
export function assignColumn(item: RawPdfTextItem, boundaries: ColumnBoundary[]): ColumnBoundary["name"] | null {
  const xCenter = item.x + (item.width / 2);
  for (const b of boundaries) {
    if (xCenter >= b.minX && xCenter < b.maxX) {
      return b.name;
    }
  }
  return null;
}
