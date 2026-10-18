export type MatchTier = "EXACT" | "WINDOW_DATE" | "NARRATION_PARTY" | "MANUAL";

export interface BRSMatchItem {
  readonly bankTransactionId: string;
  readonly tallyVoucherId: string;
  readonly matchTier: MatchTier;
  readonly confidenceScore: number;
  readonly bankAmount: number;
  readonly tallyAmount: number;
  readonly bankDate: string;
  readonly tallyDate: string;
  readonly clearingDate: string;
  readonly differenceAmount: number;
  readonly bankNarration: string;
  readonly voucherNumber?: string | undefined;
  readonly partyName?: string | undefined;
}

export interface BRSUnmatchedBankTx {
  readonly bankTransactionId: string;
  readonly date: string;
  readonly narration: string;
  readonly referenceNo?: string | undefined;
  readonly debit: number;
  readonly credit: number;
  readonly suggestedAction: "CREATE_VOUCHER_IN_TALLY" | "IGNORE_FEES" | "INVESTIGATE";
}

export interface BRSUnmatchedTallyVoucher {
  readonly voucherId: string;
  readonly date: string;
  readonly voucherNumber: string;
  readonly partyName: string;
  readonly amount: number;
  readonly voucherType: string;
  readonly reason: "CHEQUE_UNPRESENTED" | "CHEQUE_UNCLEARED" | "TIMING_DIFFERENCE";
}

export interface StatutoryBRSReport {
  readonly companyName: string;
  readonly bankLedgerName: string;
  readonly period: {
    readonly fromDate: string;
    readonly toDate: string;
  };
  readonly bookBalance: number;
  readonly statementBalance: number;
  readonly totalReconciledCount: number;
  readonly unpresentedChequesTotal: number;
  readonly unrecordedBankCreditsTotal: number;
  readonly unclearedDepositsTotal: number;
  readonly unrecordedBankDebitsTotal: number;
  readonly unreconciledDifference: number;
  readonly matches: readonly BRSMatchItem[];
  readonly unmatchedBankTxs: readonly BRSUnmatchedBankTx[];
  readonly unmatchedTallyVouchers: readonly BRSUnmatchedTallyVoucher[];
  readonly generatedAt: string;
}

export interface BRSAutoMatchOptions {
  readonly dateToleranceDays?: number;
  readonly amountToleranceRupees?: number;
  readonly fuzzyThreshold?: number;
}
