export interface SplitAllocation {
  id: string;
  ledgerName: string;
  ledgerId?: string;
  amount: number;
  narrationRemark?: string;
}

export interface VerifiedVoucherRow {
  transactionId: string;
  date: string; // ISO YYYY-MM-DD
  originalNarration: string;
  cleanNarration?: string;
  referenceNo: string;
  debit: number;
  credit: number;
  balance?: number;
  voucherType: "Payment" | "Receipt" | "Contra" | "Journal";
  primaryLedgerName: string; // Opposing ledger in Tally double-entry
  primaryLedgerId?: string;
  bankLedgerName: string; // The bank account ledger (e.g. "HDFC Bank")
  confidence: number;
  matchType?: "RULE_MATCH" | "HISTORY_MATCH" | "FUZZY_MATCH" | "LLM_MATCH" | "UNMATCHED";
  matchReason?: string;
  isSplit: boolean;
  splits?: SplitAllocation[];
  userModified: boolean;
  rememberRule: boolean;
  auditStatus: "AUTO_APPROVED" | "MANUALLY_VERIFIED" | "NEEDS_REVIEW" | "REJECTED";
}

export interface StatementSummaryStats {
  totalRows: number;
  totalDebit: number;
  totalCredit: number;
  netFlow: number;
  openingBalance: number;
  calculatedClosingBalance: number;
  statementClosingBalance: number;
  isReconciled: boolean;
  variance: number;
  autoApprovedCount: number;
  needsReviewCount: number;
  unmappedCount: number;
}
