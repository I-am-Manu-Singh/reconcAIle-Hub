/**
 * 4-Tier Ledger Classifier Types
 * Inspired by Bally-AI (LLM Reasoning) & Hisaabo (4-Tier Rule Hierarchy)
 */

export type MatchTier = 
  | "TIER_1_RULE"
  | "TIER_2_HISTORY"
  | "TIER_3_FUZZY"
  | "TIER_4_LLM"
  | "UNMAPPED";

export type VoucherType = "Payment" | "Receipt" | "Contra" | "Journal";

export interface LedgerMatchResult {
  readonly transactionId: string;
  readonly originalNarration: string;
  readonly cleanedPartyName: string;
  readonly suggestedLedgerName: string;
  readonly suggestedLedgerId: string | null;
  readonly parentGroup: string;
  readonly voucherType: VoucherType;
  readonly confidenceScore: number;
  readonly matchTier: MatchTier;
  readonly reasoning: string;
  readonly isAutoApproved: boolean; // True if confidenceScore >= 0.90
}

export interface StatementClassificationSummary {
  readonly totalProcessed: number;
  readonly autoMatchedCount: number;
  readonly reviewRequiredCount: number;
  readonly byTierBreakdown: {
    readonly tier1Rules: number;
    readonly tier2History: number;
    readonly tier3Fuzzy: number;
    readonly tier4Llm: number;
    readonly unmapped: number;
  };
  readonly results: readonly LedgerMatchResult[];
}

export interface NarrationRuleRow {
  readonly id: string;
  readonly company_id: string;
  readonly narration_pattern: string;
  readonly normalized_party_name: string;
  readonly matched_ledger_name: string;
  readonly matched_ledger_id: string | null;
  readonly voucher_type: string;
  readonly confidence: number;
  readonly hit_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}
