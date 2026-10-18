import { LedgerMatchResult, VoucherType } from "./ledgerClassifierTypes.js";

interface StatutoryRule {
  readonly pattern: RegExp;
  readonly ledgerName: string;
  readonly parentGroup: string;
  readonly voucherType: VoucherType;
  readonly reasoning: string;
}

const STATUTORY_RULES: readonly StatutoryRule[] = [
  // 1. Bank Charges & Administrative Fees
  {
    pattern: /\b(?:chg|charges|sms\s*chg|annual\s*fee|folio|imprest|debit\s*card\s*fee|amc|minimum\s*bal|min\s*bal|penal\s*chg|bounce\s*chg)\b/i,
    ledgerName: "Bank Charges",
    parentGroup: "Indirect Expenses",
    voucherType: "Payment",
    reasoning: "Statutory bank service charge or maintenance fee.",
  },
  // 2. Bank Interest Earned
  {
    pattern: /\b(?:int\.?\s*pd|interest\s*credit|sb\s*int|interest\s*received|fd\s*int|term\s*dep\s*int)\b/i,
    ledgerName: "Bank Interest Income",
    parentGroup: "Indirect Incomes",
    voucherType: "Receipt",
    reasoning: "Savings bank or deposit interest credited by bank.",
  },
  // 3. Cash Withdrawal / ATM (Contra)
  {
    pattern: /\b(?:atm\s*wdl|atm\s*cash|cash\s*wdl|self\s*chq|nfs\s*cash|cash\s*withdrawal)\b/i,
    ledgerName: "Cash",
    parentGroup: "Cash-in-hand",
    voucherType: "Contra",
    reasoning: "Self cash withdrawal from bank account.",
  },
  // 4. Cash Deposit (Contra)
  {
    pattern: /\b(?:cash\s*dep|cdm\s*dep|cash\s*deposit|bna\s*dep)\b/i,
    ledgerName: "Cash",
    parentGroup: "Cash-in-hand",
    voucherType: "Contra",
    reasoning: "Cash deposit into bank account via branch or CDM.",
  },
  // 5. Taxes & Government Compliance
  {
    pattern: /\b(?:gst\s*pmt|gst\s*challan|advance\s*tax|tds\s*pmt|direct\s*tax|epfo|esic|mca\s*fee|roc\s*fee)\b/i,
    ledgerName: "GST / Statutory Taxes Payable",
    parentGroup: "Duties & Taxes",
    voucherType: "Payment",
    reasoning: "Statutory tax or government regulatory challan payment.",
  },
  // 6. Fuel & Travel Expenses
  {
    pattern: /\b(?:petrol|hpcl|bpcl|ioc|indian\s*oil|fuel\s*stn|shell\s*petrol)\b/i,
    ledgerName: "Vehicle & Conveyance Expenses",
    parentGroup: "Indirect Expenses",
    voucherType: "Payment",
    reasoning: "Fuel station or vehicle running expense.",
  },
  // 7. Utility & Telecommunications
  {
    pattern: /\b(?:airtel|jio|vodafone|bsnl|electricity\s*bill|bescom|tneb|mahadiscom|tata\s*power)\b/i,
    ledgerName: "Telephone & Electricity Expenses",
    parentGroup: "Indirect Expenses",
    voucherType: "Payment",
    reasoning: "Utility bill or telecommunication services payment.",
  },
];

/**
 * Tier 1: Deterministic Statutory & Banking Rules
 * Zero-latency, 100% confidence matching against known transaction types.
 */
export function evaluateTier1Rules(
  transactionId: string,
  rawNarration: string,
  debit: number,
  credit: number
): LedgerMatchResult | null {
  const narration = rawNarration.trim();

  for (const rule of STATUTORY_RULES) {
    if (rule.pattern.test(narration)) {
      // Determine correct voucher type based on direction
      let vType = rule.voucherType;
      if (vType !== "Contra") {
        vType = debit > 0 ? "Payment" : "Receipt";
      }

      return {
        transactionId,
        originalNarration: rawNarration,
        cleanedPartyName: rule.ledgerName,
        suggestedLedgerName: rule.ledgerName,
        suggestedLedgerId: null,
        parentGroup: rule.parentGroup,
        voucherType: vType,
        confidenceScore: 0.99,
        matchTier: "TIER_1_RULE",
        reasoning: rule.reasoning,
        isAutoApproved: true,
      };
    }
  }

  return null;
}
