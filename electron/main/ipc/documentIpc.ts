import { dialog, ipcMain } from "electron";
import type { DocumentRepository } from "../local-db/documentRepository.js";

export function registerDocumentIpc(documentRepository: DocumentRepository): void {
  ipcMain.handle("documents:pick-and-import", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Accounting Documents", extensions: ["pdf", "jpg", "jpeg", "png", "csv", "xlsx", "xls", "xml"] },
      ],
    });

    if (result.canceled) {
      return [];
    }

    return result.filePaths.map((filePath) => documentRepository.importFile(filePath));
  });

  ipcMain.handle("documents:import-buffer", async (_event, payload: { fileName: string; buffer: ArrayBuffer }) => {
    const buf = Buffer.from(payload.buffer);
    return documentRepository.importBuffer(payload.fileName, buf);
  });

  ipcMain.handle("documents:list-recent", () => documentRepository.listRecent(25));
  ipcMain.handle("documents:get-file-buffer", (_event, payload: { documentIdOrPath: string }) => {
    const res = documentRepository.getFileBuffer(payload.documentIdOrPath);
    if (!res) return null;
    return {
      buffer: res.buffer.buffer.slice(res.buffer.byteOffset, res.buffer.byteOffset + res.buffer.byteLength),
      mimeType: res.mimeType,
      fileName: res.fileName,
    };
  });
  ipcMain.handle("documents:get-stats", () => documentRepository.getStats());
  ipcMain.handle("documents:process-ocr", async (_event, payload: { documentId: string }) => documentRepository.processOcr(payload.documentId));
  ipcMain.handle("documents:get-extraction", (_event, payload: { documentId: string }) => documentRepository.getExtraction(payload.documentId));
  ipcMain.handle("documents:generate-draft-voucher", (_event, payload: { documentId: string; companyId?: string }) => documentRepository.generateDraftVoucher(payload.documentId, payload.companyId));
  ipcMain.handle("documents:approve-draft-voucher", (_event, payload: { documentId: string }) => documentRepository.approveDraftVoucher(payload.documentId));
  ipcMain.handle("documents:get-draft-voucher", (_event, payload: { documentId: string }) => documentRepository.getDraftVoucher(payload.documentId));
  ipcMain.handle("documents:parse-bank-statement", async (_event, payload: { documentId: string; companyId?: string; password?: string }) => 
    documentRepository.parseBankStatement(payload.documentId, payload.companyId, payload.password)
  );
  ipcMain.handle("documents:classify-transactions", async (_event, payload: { companyId: string; transactions: any[]; aiOptions?: any; groqApiKey?: string }) =>
    documentRepository.classifyTransactions(payload.companyId, payload.transactions, payload.aiOptions || payload.groqApiKey)
  );
  ipcMain.handle("documents:save-ledger-rule", async (_event, payload: { companyId: string; rule: any }) =>
    documentRepository.saveLedgerRule(payload.companyId, payload.rule)
  );
  ipcMain.handle("documents:list-ledger-rules", (_event, payload?: { companyId?: string }) =>
    documentRepository.listLedgerRules(payload?.companyId)
  );
  ipcMain.handle("documents:delete-ledger-rule", (_event, payload: { ruleId: string }) =>
    documentRepository.deleteLedgerRule(payload.ruleId)
  );

  // ─── Bank Statement Session History IPC ────────────────────────────────────
  ipcMain.handle("bank-sessions:list", (_event, payload: { companyId: string; options?: any }) =>
    documentRepository.listBankSessions(payload.companyId, payload.options)
  );
  ipcMain.handle("bank-sessions:get", (_event, payload: { sessionId: string }) =>
    documentRepository.getBankSession(payload.sessionId)
  );
  ipcMain.handle("bank-sessions:get-transactions", (_event, payload: { sessionId: string; options?: any }) =>
    documentRepository.getBankSessionTransactions(payload.sessionId, payload.options)
  );
  ipcMain.handle("bank-sessions:update-transaction", (_event, payload: { txId: string; updates: any }) =>
    documentRepository.updateBankTransaction(payload.txId, payload.updates)
  );
  ipcMain.handle("bank-sessions:update-notes", (_event, payload: { sessionId: string; notes: string }) =>
    documentRepository.updateBankSessionNotes(payload.sessionId, payload.notes)
  );
  ipcMain.handle("bank-sessions:delete", (_event, payload: { sessionId: string }) =>
    documentRepository.deleteBankSession(payload.sessionId)
  );
  // ─── Native Print Service & Printer Discovery IPC ───────────────────────
  ipcMain.handle("print:get-printers", async (event) => {
    try {
      const win = event.sender;
      return await win.getPrintersAsync();
    } catch (e: any) {
      console.error("[print:get-printers] error:", e);
      return [];
    }
  });

  ipcMain.handle("print:to-pdf", async (event, options?: any) => {
    try {
      const { BrowserWindow, dialog } = await import("electron");
      const fs = await import("node:fs/promises");

      const pdfOptions: any = {
        landscape: options?.landscape ?? false,
        printBackground: options?.printBackground ?? true,
        pageSize: options?.pageSize ?? "A4",
        scale: options?.scaleFactor ? options.scaleFactor / 100 : 1,
      };

      if (options?.header) {
        pdfOptions.displayHeaderFooter = true;
        pdfOptions.headerTemplate = `<div style="font-size:10px;text-align:center;width:100%;color:#475569;">${options.header}</div>`;
      }
      if (options?.footer) {
        pdfOptions.displayHeaderFooter = true;
        pdfOptions.footerTemplate = `<div style="font-size:9px;text-align:center;width:100%;color:#64748b;">${options.footer}</div>`;
      }

      let pdfBuffer: Buffer;

      if (options?.html) {
        // Render pure clean report HTML in an offscreen BrowserWindow
        const printWin = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
        await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`);
        pdfBuffer = await printWin.webContents.printToPDF(pdfOptions);
        printWin.close();
      } else {
        const win = event.sender;
        pdfBuffer = await win.printToPDF(pdfOptions);
      }

      const saveResult = await dialog.showSaveDialog({
        title: "Save Print to PDF",
        defaultPath: options?.suggestedFileName || `Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: "PDF Documents", extensions: ["pdf"] }],
      });

      if (!saveResult.canceled && saveResult.filePath) {
        await fs.writeFile(saveResult.filePath, pdfBuffer);
        return { success: true, filePath: saveResult.filePath, canceled: false };
      }
      return { success: false, canceled: true };
    } catch (e: any) {
      console.error("[print:to-pdf] error:", e);
      return { success: false, error: e?.message || String(e) };
    }
  });

  ipcMain.handle("print:execute", async (event, options?: any) => {
    try {
      const win = event.sender;
      return await new Promise((resolve) => {
        win.print(
          {
            silent: options?.silent ?? false,
            printBackground: options?.printBackground ?? true,
            deviceName: options?.deviceName || undefined,
            color: options?.color ?? true,
            margins: options?.margins || { marginType: "default" },
            landscape: options?.landscape ?? false,
            pagesPerSheet: options?.pagesPerSheet ?? 1,
            collate: options?.collate ?? true,
            copies: options?.copies ?? 1,
            header: options?.header || undefined,
            footer: options?.footer || undefined,
            pageSize: options?.pageSize || "A4",
          },
          (success, failureReason) => {
            resolve({ success, failureReason });
          }
        );
      });
    } catch (e: any) {
      console.error("[print:execute] error:", e);
      return { success: false, failureReason: e?.message || String(e) };
    }
  });
}





