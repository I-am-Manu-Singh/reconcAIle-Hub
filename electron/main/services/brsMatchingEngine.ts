import type {
  BRSMatchItem,
  BRSUnmatchedBankTx,
  BRSUnmatchedTallyVoucher,
  BRSAutoMatchOptions,
} from "./reconciliationTypes.js";

interface RawBankTx {
  readonly id: string;
  readonly companyId: string;
  readonly bankName: string;
  readonly transactionDate: string;
  readonly description: string;
  readonly referenceNo?: string | null;
  readonly debit: number;
  readonly credit: number;
  readonly balance?: number | null;
  readonly reconciliationStatus: string;
}

interface RawTallyVoucher {
  readonly id: string;
  readonly companyId: string;
  readonly voucherDate: string | null;
  readonly voucherTypeName: string | null;
  readonly voucherNumber: string | null;
  readonly narration: string | null;
  readonly amount?: number | null;
  readonly partyName?: string | null;
}

export interface MatchResults {
  readonly matches: readonly BRSMatchItem[];
  readonly unmatchedBankTxs: readonly BRSUnmatchedBankTx[];
  readonly unmatchedTallyVouchers: readonly BRSUnmatchedTallyVoucher[];
}

/**
 * Calculates day difference between two ISO date strings (YYYY-MM-DD or YYYYMMDD)
 */
function getDaysDifference(d1: string, d2: string): number {
  const norm1 = d1.replace(/[-/]/g, "");
  const norm2 = d2.replace(/[-/]/g, "");
  if (norm1.length !== 8 || norm2.length !== 8) return 999;
  const date1 = new Date(
    Number(norm1.slice(0, 4)),
    Number(norm1.slice(4, 6)) - 1,
    Number(norm1.slice(6, 8))
  );
  const date2 = new Date(
    Number(norm2.slice(0, 4)),
    Number(norm2.slice(4, 6)) - 1,
    Number(norm2.slice(6, 8))
  );
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes reference numbers: extracts 6-12 digit sequence (cheque, UTR, UPI, RRN)
 */
function extractRefTokens(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b\d{5,18}\b/g) || [];
  return matches;
}

/**
 * Simple Token Jaccard Similarity for fuzzy matching party names / narrations
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/);
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/);
  const set1 = new Set(s1.filter((w) => w.length > 2));
  const set2 = new Set(s2.filter((w) => w.length > 2));
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 4-Tier Automated Matching Engine (Hisaabo / Bally-AI specification)
 */
export function runBrsMatching(
  bankTransactions: readonly RawBankTx[],
  tallyVouchers: readonly RawTallyVoucher[],
  options: BRSAutoMatchOptions = {}
): MatchResults {
  const dateTolerance = options.dateToleranceDays ?? 3;
  const amountTolerance = options.amountToleranceRupees ?? 1.0;
  const fuzzyThreshold = options.fuzzyThreshold ?? 0.45;

  const matchedBankTxIds = new Set<string>();
  const matchedVoucherIds = new Set<string>();
  const matches: BRSMatchItem[] = [];

  // Map vouchers for matching
  const availableVouchers = tallyVouchers.map((v) => {
    const rawAmt = Math.abs(Number(v.amount || 0));
    const cleanDate = (v.voucherDate || "").slice(0, 10);
    const refTokens = extractRefTokens(`${v.voucherNumber || ""} ${v.narration || ""}`);
    return {
      raw: v,
      id: v.id,
      amount: rawAmt,
      date: cleanDate,
      refTokens,
      partyName: v.partyName || "",
      narration: v.narration || "",
      voucherNumber: v.voucherNumber || "",
      voucherType: v.voucherTypeName || "Payment",
    };
  });

  // Helper to extract effective bank tx amount
  const getTxAmount = (tx: RawBankTx): number => {
    return tx.credit > 0 ? Number(tx.credit) : Number(tx.debit);
  };

  // ==========================================
  // TIER 1: Exact Match (Confidence: 1.0)
  // Exact Amount + Exact Date + Exact Ref/Cheque
  // ==========================================
  for (const tx of bankTransactions) {
    if (matchedBankTxIds.has(tx.id)) continue;
    const txAmt = getTxAmount(tx);
    const txDate = tx.transactionDate.slice(0, 10);
    const txTokens = extractRefTokens(`${tx.referenceNo || ""} ${tx.description}`);

    for (const vch of availableVouchers) {
      if (matchedVoucherIds.has(vch.id)) continue;

      const amtDiff = Math.abs(txAmt - vch.amount);
      const daysDiff = getDaysDifference(txDate, vch.date);
      const hasSharedRef = txTokens.length > 0 && vch.refTokens.length > 0 &&
        txTokens.some((t) => vch.refTokens.includes(t));

      if (amtDiff <= 0.05 && daysDiff === 0 && (hasSharedRef || txTokens.length === 0)) {
        matchedBankTxIds.add(tx.id);
        matchedVoucherIds.add(vch.id);
        matches.push({
          bankTransactionId: tx.id,
          tallyVoucherId: vch.id,
          matchTier: "EXACT",
          confidenceScore: 1.0,
          bankAmount: txAmt,
          tallyAmount: vch.amount,
          bankDate: txDate,
          tallyDate: vch.date,
          clearingDate: txDate,
          differenceAmount: 0,
          bankNarration: tx.description,
          voucherNumber: vch.voucherNumber,
          partyName: vch.partyName,
        });
        break;
      }
    }
  }

  // ==========================================
  // TIER 2: Strong Window Match (Confidence: 0.95)
  // Exact Amount + Reference Match within Date Tolerance Window (e.g. 3-5 days)
  // ==========================================
  for (const tx of bankTransactions) {
    if (matchedBankTxIds.has(tx.id)) continue;
    const txAmt = getTxAmount(tx);
    const txDate = tx.transactionDate.slice(0, 10);
    const txTokens = extractRefTokens(`${tx.referenceNo || ""} ${tx.description}`);

    for (const vch of availableVouchers) {
      if (matchedVoucherIds.has(vch.id)) continue;

      const amtDiff = Math.abs(txAmt - vch.amount);
      const daysDiff = getDaysDifference(txDate, vch.date);
      const hasSharedRef = txTokens.length > 0 && vch.refTokens.length > 0 &&
        txTokens.some((t) => vch.refTokens.includes(t));

      if (amtDiff <= amountTolerance && daysDiff <= dateTolerance && (hasSharedRef || daysDiff <= 1)) {
        matchedBankTxIds.add(tx.id);
        matchedVoucherIds.add(vch.id);
        matches.push({
          bankTransactionId: tx.id,
          tallyVoucherId: vch.id,
          matchTier: "WINDOW_DATE",
          confidenceScore: 0.95,
          bankAmount: txAmt,
          tallyAmount: vch.amount,
          bankDate: txDate,
          tallyDate: vch.date,
          clearingDate: txDate,
          differenceAmount: txAmt - vch.amount,
          bankNarration: tx.description,
          voucherNumber: vch.voucherNumber,
          partyName: vch.partyName,
        });
        break;
      }
    }
  }

  // ==========================================
  // TIER 3: Narration & Entity Fuzzy Match (Confidence: 0.85)
  // Amount within tolerance, date within 7 days, fuzzy party name / narration match
  // ==========================================
  for (const tx of bankTransactions) {
    if (matchedBankTxIds.has(tx.id)) continue;
    const txAmt = getTxAmount(tx);
    const txDate = tx.transactionDate.slice(0, 10);

    for (const vch of availableVouchers) {
      if (matchedVoucherIds.has(vch.id)) continue;

      const amtDiff = Math.abs(txAmt - vch.amount);
      const daysDiff = getDaysDifference(txDate, vch.date);

      if (amtDiff <= amountTolerance && daysDiff <= 7) {
        const textSimilarity = Math.max(
          calculateSimilarity(tx.description, vch.partyName),
          calculateSimilarity(tx.description, vch.narration)
        );

        if (textSimilarity >= fuzzyThreshold || amtDiff <= 0.05) {
          matchedBankTxIds.add(tx.id);
          matchedVoucherIds.add(vch.id);
          matches.push({
            bankTransactionId: tx.id,
            tallyVoucherId: vch.id,
            matchTier: "NARRATION_PARTY",
            confidenceScore: Math.round((0.75 + textSimilarity * 0.2) * 100) / 100,
            bankAmount: txAmt,
            tallyAmount: vch.amount,
            bankDate: txDate,
            tallyDate: vch.date,
            clearingDate: txDate,
            differenceAmount: txAmt - vch.amount,
            bankNarration: tx.description,
            voucherNumber: vch.voucherNumber,
            partyName: vch.partyName,
          });
          break;
        }
      }
    }
  }

  // ==========================================
  // TIER 4: Unmatched Buckets & Discrepancies
  // ==========================================
  const unmatchedBankTxs: BRSUnmatchedBankTx[] = [];
  for (const tx of bankTransactions) {
    if (!matchedBankTxIds.has(tx.id)) {
      const descLower = tx.description.toLowerCase();
      let suggestedAction: "CREATE_VOUCHER_IN_TALLY" | "IGNORE_FEES" | "INVESTIGATE" = "CREATE_VOUCHER_IN_TALLY";
      if (descLower.includes("chg") || descLower.includes("charge") || descLower.includes("gst fee") || descLower.includes("sms")) {
        suggestedAction = "IGNORE_FEES";
      } else if (tx.debit > 100000 || tx.credit > 100000) {
        suggestedAction = "INVESTIGATE";
      }

      unmatchedBankTxs.push({
        bankTransactionId: tx.id,
        date: tx.transactionDate.slice(0, 10),
        narration: tx.description,
        referenceNo: tx.referenceNo ?? undefined,
        debit: Number(tx.debit),
        credit: Number(tx.credit),
        suggestedAction,
      });
    }
  }

  const unmatchedTallyVouchers: BRSUnmatchedTallyVoucher[] = [];
  for (const vch of availableVouchers) {
    if (!matchedVoucherIds.has(vch.id)) {
      const vType = vch.voucherType.toLowerCase();
      let reason: "CHEQUE_UNPRESENTED" | "CHEQUE_UNCLEARED" | "TIMING_DIFFERENCE" = "TIMING_DIFFERENCE";
      if (vType.includes("payment")) {
        reason = "CHEQUE_UNPRESENTED";
      } else if (vType.includes("receipt")) {
        reason = "CHEQUE_UNCLEARED";
      }

      unmatchedTallyVouchers.push({
        voucherId: vch.id,
        date: vch.date,
        voucherNumber: vch.voucherNumber,
        partyName: vch.partyName || "Party",
        amount: vch.amount,
        voucherType: vch.voucherType,
        reason,
      });
    }
  }

  return {
    matches,
    unmatchedBankTxs,
    unmatchedTallyVouchers,
  };
}
