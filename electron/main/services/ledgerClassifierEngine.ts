import type { LocalDatabase } from "../local-db/database.js";
import {
  StatementClassificationSummary,
  LedgerMatchResult,
} from "./ledgerClassifierTypes.js";
import { ParsedStatementTransaction } from "./bankStatementTypes.js";
import { cleanNarrationParty } from "./narrationCleaner.js";
import { evaluateTier1Rules } from "./ruleEngineTier1.js";
import { evaluateTier2History } from "./historyLearningTier2.js";
import { evaluateTier3Fuzzy, CompanyLedgerCandidate } from "./fuzzyLedgerTier3.js";
import { evaluateTier4LlmBatch, AiModelOptions } from "./llmClassifierTier4.js";

/**
 * Master 4-Tier Ledger Classifier Coordinator
 * Cascades transactions through:
 * Tier 1 (Rules) -> Tier 2 (History) -> Tier 3 (Fuzzy) -> Tier 4 (LLM)
 */
export async function classifyStatementTransactions(
  database: LocalDatabase,
  companyId: string,
  transactions: readonly ParsedStatementTransaction[],
  aiOptions?: AiModelOptions | string
): Promise<StatementClassificationSummary> {
  // 1. Fetch Company Name & Chart of Accounts Ledgers from SQLite
  const companyRow = database
    .prepare("SELECT name FROM accounting_companies WHERE id = ?")
    .get(companyId) as { name: string } | undefined;
  const companyName = companyRow?.name || "Active Client";

  const ledgerRows = database
    .prepare(
      `SELECT id, name, parent_group AS parentGroup 
       FROM accounting_ledgers 
       WHERE company_id = ?`
    )
    .all(companyId) as CompanyLedgerCandidate[];

  const results: LedgerMatchResult[] = [];
  const unmappedForTier4: Array<{
    id: string;
    date: string;
    rawNarration: string;
    cleanedParty: string;
    debit: number;
    credit: number;
  }> = [];

  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let tier4Count = 0;
  let unmappedCount = 0;

  // 2. Cascade Tiers 1 through 3
  for (const tx of transactions) {
    const rawNarration = tx.narration || "";
    const cleanedParty = cleanNarrationParty(rawNarration);

    // Tier 1: Deterministic Statutory & Banking Rules
    const tier1 = evaluateTier1Rules(tx.id, rawNarration, tx.debit, tx.credit);
    if (tier1) {
      results.push(tier1);
      tier1Count++;
      continue;
    }

    // Tier 2: Historical Pattern Learning Cache
    const tier2 = evaluateTier2History(database, companyId, tx.id, rawNarration, cleanedParty, tx.debit, tx.credit);
    if (tier2) {
      results.push(tier2);
      tier2Count++;
      continue;
    }

    // Tier 3: In-Memory Fuzzy Matching against Ledgers
    const tier3 = evaluateTier3Fuzzy(ledgerRows, tx.id, rawNarration, cleanedParty, tx.debit, tx.credit);
    if (tier3) {
      results.push(tier3);
      tier3Count++;
      continue;
    }

    // Prepare for Tier 4 LLM Batching
    unmappedForTier4.push({
      id: tx.id,
      date: tx.date,
      rawNarration,
      cleanedParty,
      debit: tx.debit,
      credit: tx.credit,
    });
  }

  // 3. Cascade Tier 4 for unmapped/ambiguous items
  if (unmappedForTier4.length > 0) {
    const modelOpts: AiModelOptions = typeof aiOptions === "string" 
      ? { apiKey: aiOptions, provider: "groq" } 
      : (aiOptions || { provider: "groq" });

    const tier4Results = await evaluateTier4LlmBatch(
      unmappedForTier4,
      companyName,
      ledgerRows,
      modelOpts
    );

    for (const item of unmappedForTier4) {
      const match = tier4Results.get(item.id);
      if (match) {
        results.push(match);
        if (match.matchTier === "TIER_4_LLM") {
          tier4Count++;
        } else {
          unmappedCount++;
        }
      }
    }
  }

  // Update bank_transactions table with classification results
  try {
    const updateStmt = database.prepare(`
      UPDATE bank_transactions 
      SET category = @category
      WHERE id = @id
    `);

    database.transaction(() => {
      for (const res of results) {
        updateStmt.run({
          id: res.transactionId,
          category: `${res.suggestedLedgerName} [${res.voucherType}]`,
        });
      }
    })();
  } catch (dbErr) {
    console.warn("[classifyStatementTransactions] Database update error:", dbErr);
  }

  const autoMatchedCount = results.filter(r => r.isAutoApproved).length;
  const reviewRequiredCount = results.length - autoMatchedCount;

  return {
    totalProcessed: results.length,
    autoMatchedCount,
    reviewRequiredCount,
    byTierBreakdown: {
      tier1Rules: tier1Count,
      tier2History: tier2Count,
      tier3Fuzzy: tier3Count,
      tier4Llm: tier4Count,
      unmapped: unmappedCount,
    },
    results,
  };
}

/**
 * Saves a user-confirmed ledger rule into SQLite for Tier 2 future learning.
 */
export function saveLedgerMappingRule(
  database: LocalDatabase,
  companyId: string,
  narrationPattern: string,
  matchedLedgerName: string,
  matchedLedgerId: string | null,
  voucherType: string
): void {
  const normalizedParty = cleanNarrationParty(narrationPattern);
  const now = new Date().toISOString();

  database
    .prepare(
      `INSERT INTO narration_ledger_rules (
        id, company_id, narration_pattern, normalized_party_name,
        matched_ledger_name, matched_ledger_id, voucher_type, confidence,
        hit_count, created_at, updated_at
      ) VALUES (
        @id, @companyId, @narrationPattern, @normalizedParty,
        @matchedLedgerName, @matchedLedgerId, @voucherType, 1.0,
        1, @now, @now
      )
      ON CONFLICT(company_id, narration_pattern) DO UPDATE SET
        matched_ledger_name = excluded.matched_ledger_name,
        matched_ledger_id = excluded.matched_ledger_id,
        voucher_type = excluded.voucher_type,
        hit_count = hit_count + 1,
        updated_at = excluded.updated_at`
    )
    .run({
      id: `rule_${Math.random().toString(36).slice(2, 10)}`,
      companyId,
      narrationPattern: narrationPattern.trim(),
      normalizedParty,
      matchedLedgerName,
      matchedLedgerId,
      voucherType,
      now,
    });
}
