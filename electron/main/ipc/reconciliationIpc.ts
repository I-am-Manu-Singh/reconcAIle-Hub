import { ipcMain } from "electron";
import type { AccountingMirrorRepository } from "../local-db/accountingMirrorRepository.js";
import { generateStatutoryBrsReport } from "../services/brsReportGenerator.js";
import type { BRSAutoMatchOptions } from "../services/reconciliationTypes.js";

export function registerReconciliationIpc(accountingMirrorRepository: AccountingMirrorRepository): void {
  // 1. Run Automated BRS matching and return Statutory BRS Report
  ipcMain.handle(
    "reconciliation:run-auto-brs",
    (
      _event,
      payload: {
        companyId?: string;
        companyName?: string;
        bankLedgerName?: string;
        fromDate?: string;
        toDate?: string;
        options?: BRSAutoMatchOptions;
      }
    ) => {
      const {
        companyId,
        companyName = "Primary Company",
        bankLedgerName = "Bank Account",
        fromDate = "2026-04-01",
        toDate = "2027-03-31",
        options = {},
      } = payload;

      const bankTransactions = accountingMirrorRepository.listBankTransactions(companyId);
      const tallyVouchers = accountingMirrorRepository.listVouchers(companyId, 1000);

      const report = generateStatutoryBrsReport(
        companyName,
        bankLedgerName,
        fromDate,
        toDate,
        bankTransactions,
        tallyVouchers,
        options
      );

      return report;
    }
  );

  // 2. Link manual match between a bank transaction and a tally voucher
  ipcMain.handle(
    "reconciliation:link-manual-match",
    (
      _event,
      payload: {
        bankTransactionId: string;
        tallyVoucherId: string;
        companyId?: string;
      }
    ) => {
      return accountingMirrorRepository.markBankTransactionsReconciled([
        {
          transactionId: payload.bankTransactionId,
          voucherId: payload.tallyVoucherId,
          companyId: payload.companyId,
        },
      ]);
    }
  );
}
