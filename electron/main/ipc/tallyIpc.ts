import { ipcMain } from "electron";
import { z } from "zod";
import type { TallyService } from "../tally/tallyService.js";

const companyNameSchema = z.object({
  companyName: z.string().trim().min(1).max(180),
});

const voucherRangeSchema = companyNameSchema.extend({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function registerTallyIpc(tallyService: TallyService): void {
  ipcMain.handle("tally:check-connection", () => tallyService.checkConnection());
  ipcMain.handle("tally:list-companies", () => tallyService.listCompanies());

  ipcMain.handle("tally:list-ledgers", (_event, payload: unknown) => {
    const parsed = companyNameSchema.parse(payload);
    return tallyService.listLedgers(parsed.companyName);
  });

  ipcMain.handle("tally:list-voucher-types", (_event, payload: unknown) => {
    const parsed = companyNameSchema.parse(payload);
    return tallyService.listVoucherTypes(parsed.companyName);
  });

  ipcMain.handle("tally:list-voucher-summaries", (_event, payload: unknown) => {
    const parsed = voucherRangeSchema.parse(payload);
    return tallyService.listVoucherSummaries(parsed.companyName, parsed.fromDate, parsed.toDate);
  });

  ipcMain.handle("tally:import-statement-vouchers", async (_event, payload: { companyName: string; vouchers: any[] }) => {
    return tallyService.importStatementVouchers(payload.companyName, payload.vouchers);
  });

  ipcMain.handle("tally:export-statement-vouchers-xml", async (_event, payload: { companyName: string; vouchers: any[]; suggestedFileName?: string }) => {
    const { dialog } = await import("electron");
    const fs = await import("node:fs/promises");
    const xml = await tallyService.exportStatementVouchersXml(payload.companyName, payload.vouchers);

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Export Tally Accounting Vouchers XML",
      defaultPath: payload.suggestedFileName || `${payload.companyName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Vouchers.xml`,
      filters: [{ name: "XML Files", extensions: ["xml"] }],
    });

    if (canceled || !filePath) {
      return { canceled: true, filePath: null, exportedCount: 0 };
    }

    await fs.writeFile(filePath, xml, "utf-8");
    return { canceled: false, filePath, exportedCount: payload.vouchers.length };
  });
}
