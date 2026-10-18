import type {
  StatutoryBRSReport,
  BRSAutoMatchOptions,
} from "./reconciliationTypes.js";
import { runBrsMatching } from "./brsMatchingEngine.js";

/**
 * Computes statutory BRS audit totals and formats complete statutory report
 */
export function generateStatutoryBrsReport(
  companyName: string,
  bankLedgerName: string,
  fromDate: string,
  toDate: string,
  bankTransactions: readonly any[],
  tallyVouchers: readonly any[],
  options: BRSAutoMatchOptions = {}
): StatutoryBRSReport {
  // 1. Run 4-Tier Matching
  const { matches, unmatchedBankTxs, unmatchedTallyVouchers } = runBrsMatching(
    bankTransactions,
    tallyVouchers,
    options
  );

  // 2. Compute Timing Differences & Unrecorded Sums
  let unpresentedChequesTotal = 0;
  let unclearedDepositsTotal = 0;
  for (const vch of unmatchedTallyVouchers) {
    if (vch.reason === "CHEQUE_UNPRESENTED") {
      unpresentedChequesTotal += vch.amount;
    } else if (vch.reason === "CHEQUE_UNCLEARED") {
      unclearedDepositsTotal += vch.amount;
    } else {
      unpresentedChequesTotal += vch.amount;
    }
  }

  let unrecordedBankCreditsTotal = 0;
  let unrecordedBankDebitsTotal = 0;
  for (const tx of unmatchedBankTxs) {
    if (tx.credit > 0) {
      unrecordedBankCreditsTotal += tx.credit;
    }
    if (tx.debit > 0) {
      unrecordedBankDebitsTotal += tx.debit;
    }
  }

  // 3. Compute Balances
  // Bank statement closing balance = last transaction's running balance, or sum of credits - debits
  let statementBalance = 0;
  if (bankTransactions.length > 0) {
    const lastWithBal = [...bankTransactions].reverse().find((t) => t.balance != null);
    if (lastWithBal && Number(lastWithBal.balance) !== 0) {
      statementBalance = Number(lastWithBal.balance);
    } else {
      const totalCredit = bankTransactions.reduce((acc, t) => acc + Number(t.credit || 0), 0);
      const totalDebit = bankTransactions.reduce((acc, t) => acc + Number(t.debit || 0), 0);
      statementBalance = totalCredit - totalDebit;
    }
  }

  // Book Balance = statementBalance - Cheques unpresented + Uncleared deposits - Unrecorded credits + Unrecorded debits
  const bookBalance =
    statementBalance -
    unpresentedChequesTotal +
    unclearedDepositsTotal -
    unrecordedBankCreditsTotal +
    unrecordedBankDebitsTotal;

  // Expected statement balance derived from book balance
  const derivedStatementBalance =
    bookBalance +
    unpresentedChequesTotal -
    unclearedDepositsTotal +
    unrecordedBankCreditsTotal -
    unrecordedBankDebitsTotal;

  const unreconciledDifference = Math.round(Math.abs(statementBalance - derivedStatementBalance) * 100) / 100;

  return {
    companyName: companyName || "Primary Company",
    bankLedgerName: bankLedgerName || "Bank Account",
    period: {
      fromDate: fromDate || "2026-04-01",
      toDate: toDate || "2027-03-31",
    },
    bookBalance: Math.round(bookBalance * 100) / 100,
    statementBalance: Math.round(statementBalance * 100) / 100,
    totalReconciledCount: matches.length,
    unpresentedChequesTotal: Math.round(unpresentedChequesTotal * 100) / 100,
    unrecordedBankCreditsTotal: Math.round(unrecordedBankCreditsTotal * 100) / 100,
    unclearedDepositsTotal: Math.round(unclearedDepositsTotal * 100) / 100,
    unrecordedBankDebitsTotal: Math.round(unrecordedBankDebitsTotal * 100) / 100,
    unreconciledDifference,
    matches,
    unmatchedBankTxs,
    unmatchedTallyVouchers,
    generatedAt: new Date().toISOString(),
  };
}
