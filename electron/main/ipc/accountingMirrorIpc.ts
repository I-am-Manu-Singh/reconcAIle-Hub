import { ipcMain } from "electron";
import type { AccountingMirrorRepository } from "../local-db/accountingMirrorRepository.js";

export function registerAccountingMirrorIpc(accountingMirrorRepository: AccountingMirrorRepository): void {
  ipcMain.handle("accounting-mirror:get-stats", () => accountingMirrorRepository.getStats());
  ipcMain.handle("accounting-mirror:list-companies", () => accountingMirrorRepository.listCompanies());
  ipcMain.handle("accounting-mirror:list-ledgers", (_event, payload: { companyId: string }) => accountingMirrorRepository.listLedgers(payload.companyId));
  ipcMain.handle("accounting-mirror:list-inventory-items", (_event, payload: { companyId?: string }) => accountingMirrorRepository.listInventoryItems(payload?.companyId));
  ipcMain.handle("accounting-mirror:list-vouchers", (_event, payload: { companyId: string; limit?: number }) => accountingMirrorRepository.listVouchers(payload.companyId, payload.limit));
  ipcMain.handle("accounting-mirror:list-bank-transactions", (_event, payload?: { companyId?: string }) => accountingMirrorRepository.listBankTransactions(payload?.companyId));
  ipcMain.handle("accounting-mirror:list-gstr2b-records", (_event, payload?: { companyId?: string }) => accountingMirrorRepository.listGstr2bRecords(payload?.companyId));
  ipcMain.handle("accounting-mirror:save-company", (_event, payload: { company: any }) => {
    return accountingMirrorRepository.saveCompany(payload.company);
  });
  ipcMain.handle("accounting-mirror:delete-company", (_event, payload: { companyId: string }) => {
    return accountingMirrorRepository.deleteCompany(payload.companyId);
  });
  ipcMain.handle("accounting-mirror:import-tally-xml-dump", (_event, payload: { companyName: string; xmlContent: string }) => {
    return accountingMirrorRepository.importTallyXmlDump(payload.companyName, payload.xmlContent);
  });
  ipcMain.handle("accounting-mirror:mark-bank-transactions-reconciled", (_event, payload: { transactions: readonly any[] }) => {
    return accountingMirrorRepository.markBankTransactionsReconciled(payload.transactions);
  });
  ipcMain.handle("accounting-mirror:export-gstr1-json", (_event, payload?: { companyId?: string }) => {
    return accountingMirrorRepository.generateGstr1Json(payload?.companyId);
  });
  ipcMain.handle("accounting-mirror:set-company-password", (_event, payload: { companyId: string; password: string | null }) => {
    return accountingMirrorRepository.setCompanyPassword(payload.companyId, payload.password);
  });
  ipcMain.handle("accounting-mirror:verify-company-password", (_event, payload: { companyId: string; password: string }) => {
    return accountingMirrorRepository.verifyCompanyPassword(payload.companyId, payload.password);
  });
  ipcMain.handle("accounting-mirror:save-ledger", (_event, payload: { ledger: any }) => {
    return accountingMirrorRepository.saveLedger(payload.ledger);
  });
  ipcMain.handle("accounting-mirror:delete-ledger", (_event, payload: { ledgerId: string }) => {
    return accountingMirrorRepository.deleteLedger(payload.ledgerId);
  });
  ipcMain.handle("accounting-mirror:save-voucher", (_event, payload: { voucher: any }) => {
    return accountingMirrorRepository.saveVoucher(payload.voucher);
  });
  ipcMain.handle("accounting-mirror:delete-voucher", (_event, payload: { voucherId: string }) => {
    return accountingMirrorRepository.deleteVoucher(payload.voucherId);
  });
  ipcMain.handle("accounting-mirror:save-inventory-item", (_event, payload: { item: any }) => {
    return accountingMirrorRepository.saveInventoryItem(payload.item);
  });
  ipcMain.handle("accounting-mirror:list-stock-groups", (_event, payload?: { companyId?: string }) => {
    return accountingMirrorRepository.listStockGroups(payload?.companyId);
  });
  ipcMain.handle("accounting-mirror:save-stock-group", (_event, payload: { group: any }) => {
    return accountingMirrorRepository.saveStockGroup(payload.group);
  });
  ipcMain.handle("accounting-mirror:list-stock-categories", (_event, payload?: { companyId?: string }) => {
    return accountingMirrorRepository.listStockCategories(payload?.companyId);
  });
  ipcMain.handle("accounting-mirror:save-stock-category", (_event, payload: { category: any }) => {
    return accountingMirrorRepository.saveStockCategory(payload.category);
  });
  ipcMain.handle("accounting-mirror:list-godowns", (_event, payload?: { companyId?: string }) => {
    return accountingMirrorRepository.listGodowns(payload?.companyId);
  });
  ipcMain.handle("accounting-mirror:save-godown", (_event, payload: { godown: any }) => {
    return accountingMirrorRepository.saveGodown(payload.godown);
  });
  ipcMain.handle("accounting-mirror:list-stock-batches", (_event, payload?: { companyId?: string; stockItemName?: string }) => {
    return accountingMirrorRepository.listStockBatches(payload?.companyId, payload?.stockItemName);
  });
  ipcMain.handle("accounting-mirror:save-stock-batch", (_event, payload: { batch: any }) => {
    return accountingMirrorRepository.saveStockBatch(payload.batch);
  });
  ipcMain.handle("accounting-mirror:list-units", (_event, payload?: { companyId?: string }) => {
    return accountingMirrorRepository.listUnits(payload?.companyId);
  });
  ipcMain.handle("accounting-mirror:save-unit", (_event, payload: { unit: any }) => {
    return accountingMirrorRepository.saveUnit(payload.unit);
  });
}


