import Fuse from "fuse.js";
import { LedgerMatchResult, VoucherType } from "./ledgerClassifierTypes.js";

export interface CompanyLedgerCandidate {
  readonly id: string;
  readonly name: string;
  readonly parentGroup: string;
  readonly alias?: string;
}

/**
 * Tier 3: In-Memory Fuzzy Token Matcher
 * Uses fuse.js against loaded active company ledgers with weighted scoring.
 */
export function evaluateTier3Fuzzy(
  activeLedgers: readonly CompanyLedgerCandidate[],
  transactionId: string,
  rawNarration: string,
  cleanedPartyName: string,
  debit: number,
  credit: number
): LedgerMatchResult | null {
  if (activeLedgers.length === 0 || !cleanedPartyName || cleanedPartyName.length < 3) {
    return null;
  }

  const fuse = new Fuse(activeLedgers, {
    keys: [
      { name: "name", weight: 0.75 },
      { name: "alias", weight: 0.15 },
      { name: "parentGroup", weight: 0.10 },
    ],
    includeScore: true,
    threshold: 0.38, // Lower score means closer match in Fuse.js
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  const searchResults = fuse.search(cleanedPartyName);
  if (searchResults.length === 0) {
    return null;
  }

  const best = searchResults[0];
  if (!best || best.score === undefined) return null;

  // Fuse score: 0 is exact match, 1 is total mismatch
  const confidence = Math.max(0.60, Math.min(0.94, 1.0 - best.score));

  if (confidence < 0.70) {
    return null; // Ambiguous or too weak for Tier 3
  }

  const ledger = best.item;
  const parent = (ledger.parentGroup || "").toLowerCase();

  // Infer double-entry voucher type based on ledger parent group and bank flow
  let vType: VoucherType = debit > 0 ? "Payment" : "Receipt";
  if (parent.includes("bank") || parent.includes("cash")) {
    vType = "Contra";
  } else if (parent.includes("debtor") || parent.includes("sales") || parent.includes("income")) {
    vType = credit > 0 ? "Receipt" : "Payment";
  } else if (parent.includes("creditor") || parent.includes("purchase") || parent.includes("expense")) {
    vType = debit > 0 ? "Payment" : "Receipt";
  }

  return {
    transactionId,
    originalNarration: rawNarration,
    cleanedPartyName,
    suggestedLedgerName: ledger.name,
    suggestedLedgerId: ledger.id,
    parentGroup: ledger.parentGroup || "General",
    voucherType: vType,
    confidenceScore: Math.round(confidence * 100) / 100,
    matchTier: "TIER_3_FUZZY",
    reasoning: `Fuzzy matched party "${cleanedPartyName}" against chart of accounts (${Math.round(confidence * 100)}% match).`,
    isAutoApproved: confidence >= 0.88,
  };
}
