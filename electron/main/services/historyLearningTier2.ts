import type { LocalDatabase } from "../local-db/database.js";
import { LedgerMatchResult, NarrationRuleRow, VoucherType } from "./ledgerClassifierTypes.js";

/**
 * Tier 2: Historical Pattern Learning Cache
 * Checks SQLite table `narration_ledger_rules` for mappings previously confirmed by the accountant.
 */
export function evaluateTier2History(
  database: LocalDatabase,
  companyId: string,
  transactionId: string,
  rawNarration: string,
  cleanedPartyName: string,
  debit: number,
  credit: number
): LedgerMatchResult | null {
  try {
    // 1. Check exact or normalized party pattern match
    const row = database
      .prepare(
        `SELECT * FROM narration_ledger_rules 
         WHERE company_id = ? 
         AND (narration_pattern = ? OR normalized_party_name = ?)
         ORDER BY hit_count DESC LIMIT 1`
      )
      .get(companyId, rawNarration.trim(), cleanedPartyName.trim()) as NarrationRuleRow | undefined;

    if (row) {
      // Increment hit_count asynchronously
      try {
        database
          .prepare(
            `UPDATE narration_ledger_rules 
             SET hit_count = hit_count + 1, updated_at = ? 
             WHERE id = ?`
          )
          .run(new Date().toISOString(), row.id);
      } catch {
        // ignore update failures
      }

      const vType = (row.voucher_type as VoucherType) || (debit > 0 ? "Payment" : "Receipt");

      return {
        transactionId,
        originalNarration: rawNarration,
        cleanedPartyName,
        suggestedLedgerName: row.matched_ledger_name,
        suggestedLedgerId: row.matched_ledger_id,
        parentGroup: "Learnt Mapping",
        voucherType: vType,
        confidenceScore: 0.95,
        matchTier: "TIER_2_HISTORY",
        reasoning: `Matched previously confirmed mapping (Used ${row.hit_count} times).`,
        isAutoApproved: true,
      };
    }
  } catch (err) {
    console.warn("[Tier2History] Lookup error:", err);
  }

  return null;
}
