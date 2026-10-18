import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { LocalDatabase } from "./database.js";
import { extractInvoiceFromText } from "../services/invoiceParser.js";

export type DocumentStatus = "IMPORTED" | "OCR_PENDING" | "OCR_PROCESSING" | "OCR_FAILED" | "EXTRACTED" | "REVIEWED" | "REJECTED";

export type StoredDocument = {
  readonly id: string;
  readonly originalFileName: string;
  readonly storedFilePath: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly status: DocumentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DocumentExtraction = {
  readonly id: string;
  readonly documentId: string;
  readonly rawOcrText: string | null;
  readonly partyName: string | null;
  readonly partyGstin: string | null;
  readonly invoiceNumber: string | null;
  readonly invoiceDate: string | null;
  readonly taxableAmount: number | null;
  readonly cgstAmount: number | null;
  readonly sgstAmount: number | null;
  readonly igstAmount: number | null;
  readonly totalAmount: number | null;
  readonly confidenceScore: number;
  readonly extractedAt: string;
};

export type DraftVoucher = {
  readonly id: string;
  readonly documentId: string;
  readonly companyId: string | null;
  readonly voucherTypeName: string;
  readonly voucherDate: string;
  readonly voucherNumber: string | null;
  readonly partyName: string;
  readonly partyLedgerId: string | null;
  readonly taxableAmount: number;
  readonly cgstAmount: number;
  readonly sgstAmount: number;
  readonly igstAmount: number;
  readonly totalAmount: number;
  readonly status: "DRAFT" | "APPROVED" | "REJECTED";
  readonly validationStatus: "BALANCED" | "UNBALANCED" | "MISSING_LEDGER";
  readonly validationErrors: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};



type DocumentRow = {
  readonly id: string;
  readonly original_file_name: string;
  readonly stored_file_path: string;
  readonly mime_type: string;
  readonly byte_size: number;
  readonly sha256: string;
  readonly status: DocumentStatus;
  readonly created_at: string;
  readonly updated_at: string;
};

export class DocumentRepository {
  public constructor(
    private readonly database: LocalDatabase,
    private readonly userDataPath: string,
  ) {}

  public importFile(filePath: string): StoredDocument {
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
      throw new Error("Selected path is not a file.");
    }

    const byteSize = stats.size;
    const sha256 = hashFile(filePath);
    const existing = this.findByHash(sha256);
    if (existing) {
      return existing;
    }

    const id = `doc_${crypto.randomUUID()}`;
    const originalFileName = path.basename(filePath);
    const storedDirectory = path.join(this.userDataPath, "documents", id);
    const storedFilePath = path.join(storedDirectory, originalFileName);
    const now = new Date().toISOString();

    fs.mkdirSync(storedDirectory, { recursive: true });
    fs.copyFileSync(filePath, storedFilePath);

    const document: StoredDocument = {
      id,
      originalFileName,
      storedFilePath,
      mimeType: inferMimeType(originalFileName),
      byteSize,
      sha256,
      status: "IMPORTED",
      createdAt: now,
      updatedAt: now,
    };

    this.database
      .prepare(
        `INSERT INTO documents (
          id, original_file_name, stored_file_path, mime_type, byte_size,
          sha256, status, created_at, updated_at
        ) VALUES (
          @id, @originalFileName, @storedFilePath, @mimeType, @byteSize,
          @sha256, @status, @createdAt, @updatedAt
        )`,
      )
      .run(document);

    this.addEvent(id, "IMPORTED", "Document imported into local document store.");
    return document;
  }

  public importBuffer(fileName: string, buffer: Buffer): StoredDocument {
    const byteSize = buffer.length;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const existing = this.findByHash(sha256);
    if (existing) {
      return existing;
    }

    const id = `doc_${crypto.randomUUID()}`;
    const originalFileName = path.basename(fileName);
    const storedDirectory = path.join(this.userDataPath, "documents", id);
    const storedFilePath = path.join(storedDirectory, originalFileName);
    const now = new Date().toISOString();

    fs.mkdirSync(storedDirectory, { recursive: true });
    fs.writeFileSync(storedFilePath, buffer);

    const document: StoredDocument = {
      id,
      originalFileName,
      storedFilePath,
      mimeType: inferMimeType(originalFileName),
      byteSize,
      sha256,
      status: "IMPORTED",
      createdAt: now,
      updatedAt: now,
    };

    this.database
      .prepare(
        `INSERT INTO documents (
          id, original_file_name, stored_file_path, mime_type, byte_size,
          sha256, status, created_at, updated_at
        ) VALUES (
          @id, @originalFileName, @storedFilePath, @mimeType, @byteSize,
          @sha256, @status, @createdAt, @updatedAt
        )`,
      )
      .run(document);

    this.addEvent(id, "IMPORTED", "Document imported from upload into local document store.");
    return document;
  }

  public listRecent(limit: number): readonly StoredDocument[] {
    return this.database
      .prepare("SELECT * FROM documents ORDER BY created_at DESC LIMIT ?")
      .all(limit)
      .map((row) => mapDocument(row as DocumentRow));
  }

  public getFileBuffer(documentIdOrPath: string): { buffer: Buffer; mimeType: string; fileName: string } | null {
    let filePath = documentIdOrPath;
    let fileName = path.basename(documentIdOrPath);
    let mimeType = inferMimeType(fileName);

    if (fs.existsSync(filePath)) {
      return {
        buffer: fs.readFileSync(filePath),
        mimeType,
        fileName,
      };
    }

    let doc = this.database.prepare("SELECT * FROM documents WHERE id = ?").get(documentIdOrPath) as DocumentRow | undefined;
    if (!doc) {
      // Check if documentIdOrPath is a bank_statement_sessions ID
      const session = this.database.prepare("SELECT document_id, original_file_name FROM bank_statement_sessions WHERE id = ?").get(documentIdOrPath) as any;
      if (session?.document_id) {
        doc = this.database.prepare("SELECT * FROM documents WHERE id = ?").get(session.document_id) as DocumentRow | undefined;
      }
      if (!doc && session?.original_file_name) {
        doc = this.database.prepare("SELECT * FROM documents WHERE original_file_name = ? ORDER BY created_at DESC LIMIT 1").get(session.original_file_name) as DocumentRow | undefined;
      }
    }
    if (!doc) {
      doc = this.database.prepare("SELECT * FROM documents WHERE original_file_name = ? ORDER BY created_at DESC LIMIT 1").get(documentIdOrPath) as DocumentRow | undefined;
    }

    if (doc && fs.existsSync(doc.stored_file_path)) {
      return {
        buffer: fs.readFileSync(doc.stored_file_path),
        mimeType: doc.mime_type || inferMimeType(doc.original_file_name),
        fileName: doc.original_file_name,
      };
    }

    return null;
  }

  public getStats(): { readonly documents: number; readonly imported: number; readonly ocrPending: number } {
    return {
      documents: this.countWhere(null),
      imported: this.countWhere("IMPORTED"),
      ocrPending: this.countWhere("OCR_PENDING"),
    };
  }

  public async processOcr(documentId: string): Promise<DocumentExtraction> {
    const doc = this.database.prepare("SELECT * FROM documents WHERE id = ?").get(documentId) as DocumentRow | undefined;
    if (!doc) throw new Error(`Document ${documentId} not found.`);

    this.updateStatus(documentId, "OCR_PROCESSING");
    this.addEvent(documentId, "OCR_PROCESSING", "Local OCR & field extraction worker started.");

    let fileContent = "";
    if (fs.existsSync(doc.stored_file_path)) {
      try {
        const ext = path.extname(doc.stored_file_path).toLowerCase();
        if (ext === ".pdf") {
          // Robust PDF layout and text extraction using legacy pdfjs-dist
          const pdfBuffer = fs.readFileSync(doc.stored_file_path);
          const { extractPdfSpatialItems } = await import("../services/pdfCoordinateExtractor.js");
          const { fullText, structuredText } = await extractPdfSpatialItems(pdfBuffer);
          fileContent = structuredText || fullText || "";
        } else if ([".xlsx", ".xls"].includes(ext)) {
          // Parse Excel spreadsheets using xlsx module
          const XLSX = (await import("xlsx")).default;
          const workbook = XLSX.readFile(doc.stored_file_path);
          const sheetTexts: string[] = [];
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (sheet) {
              const csvText = XLSX.utils.sheet_to_csv(sheet);
              sheetTexts.push(`--- SHEET: ${sheetName} ---\n` + csvText);
            }
          }
          fileContent = sheetTexts.join("\n\n");
        } else if ([".png", ".jpg", ".jpeg", ".bmp", ".webp"].includes(ext)) {
          // Dynamic import of tesseract.js for offline image OCR
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("eng");
          const ret = await worker.recognize(doc.stored_file_path);
          fileContent = ret.data.text || "";
          await worker.terminate();
        } else {
          fileContent = fs.readFileSync(doc.stored_file_path, "utf-8");
        }
      } catch (err) {
        console.error("[DocumentRepository] OCR parsing error:", err);
        try {
          fileContent = fs.readFileSync(doc.stored_file_path, "utf-8");
        } catch {
          fileContent = "";
        }
      }
    }

    const extraction = extractOcrDocument(doc.id, doc.original_file_name, fileContent);

    const now = new Date().toISOString();

    this.database.prepare(
      `INSERT INTO document_extractions (
        id, document_id, raw_ocr_text, party_name, party_gstin, invoice_number,
        invoice_date, taxable_amount, cgst_amount, sgst_amount, igst_amount,
        total_amount, confidence_score, extracted_at
      ) VALUES (
        @id, @documentId, @rawOcrText, @partyName, @partyGstin, @invoiceNumber,
        @invoiceDate, @taxableAmount, @cgstAmount, @sgstAmount, @igstAmount,
        @totalAmount, @confidenceScore, @extractedAt
      )
      ON CONFLICT(document_id) DO UPDATE SET
        raw_ocr_text = excluded.raw_ocr_text,
        party_name = excluded.party_name,
        party_gstin = excluded.party_gstin,
        invoice_number = excluded.invoice_number,
        invoice_date = excluded.invoice_date,
        taxable_amount = excluded.taxable_amount,
        cgst_amount = excluded.cgst_amount,
        sgst_amount = excluded.sgst_amount,
        igst_amount = excluded.igst_amount,
        total_amount = excluded.total_amount,
        confidence_score = excluded.confidence_score,
        extracted_at = excluded.extracted_at`
    ).run({
      id: extraction.id,
      documentId: extraction.documentId,
      rawOcrText: extraction.rawOcrText,
      partyName: extraction.partyName,
      partyGstin: extraction.partyGstin,
      invoiceNumber: extraction.invoiceNumber,
      invoiceDate: extraction.invoiceDate,
      taxableAmount: extraction.taxableAmount,
      cgstAmount: extraction.cgstAmount,
      sgstAmount: extraction.sgstAmount,
      igstAmount: extraction.igstAmount,
      totalAmount: extraction.totalAmount,
      confidenceScore: extraction.confidenceScore,
      extractedAt: now,
    });

    this.updateStatus(documentId, "EXTRACTED");
    this.addEvent(documentId, "EXTRACTED", `Field extraction complete (Confidence: ${Math.round(extraction.confidenceScore * 100)}%).`);

    return extraction;
  }

  public getExtraction(documentId: string): DocumentExtraction | null {
    const row = this.database.prepare("SELECT * FROM document_extractions WHERE document_id = ?").get(documentId) as any;
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.document_id,
      rawOcrText: row.raw_ocr_text,
      partyName: row.party_name,
      partyGstin: row.party_gstin,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      taxableAmount: row.taxable_amount,
      cgstAmount: row.cgst_amount,
      sgstAmount: row.sgst_amount,
      igstAmount: row.igst_amount,
      totalAmount: row.total_amount,
      confidenceScore: row.confidence_score,
      extractedAt: row.extracted_at,
    };
  }

  public generateDraftVoucher(documentId: string, companyId?: string): DraftVoucher {
    const ext = this.getExtraction(documentId);
    if (!ext) throw new Error(`No OCR extraction found for document ${documentId}. Run OCR first.`);

    const now = new Date().toISOString();
    const draftId = `draft_${crypto.randomUUID()}`;
    const taxable = ext.taxableAmount ?? 0;
    const cgst = ext.cgstAmount ?? 0;
    const sgst = ext.sgstAmount ?? 0;
    const igst = ext.igstAmount ?? 0;
    const total = ext.totalAmount ?? (taxable + cgst + sgst + igst);
    const calculatedTotal = taxable + cgst + sgst + igst;

    const errors: string[] = [];
    if (Math.abs(total - calculatedTotal) > 0.01) {
      errors.push(`Voucher unbalanced: Total (₹${total}) does not match Taxable + Tax (₹${calculatedTotal}).`);
    }
    if (!ext.partyName) {
      errors.push("Missing Party Name in extracted document.");
    }
    
    // Audit #64: Validate GST Rate Slab (0%, 5%, 12%, 18%, 28%)
    const totalTax = cgst + sgst + igst;
    if (taxable > 0 && totalTax > 0) {
      const effectiveRate = (totalTax / taxable) * 100;
      const roundedRate = Math.round(effectiveRate);
      const standardSlabs = [0, 5, 12, 18, 28];
      if (!standardSlabs.includes(roundedRate)) {
        errors.push(`Non-standard GST tax slab detected (${effectiveRate.toFixed(1)}%). Expected 0%, 5%, 12%, 18%, or 28%.`);
      }
    }

    const validationStatus = errors.length === 0 ? "BALANCED" : "UNBALANCED";

    this.database.prepare(
      `INSERT INTO draft_vouchers (
        id, document_id, company_id, voucher_type_name, voucher_date, voucher_number,
        party_name, party_ledger_id, taxable_amount, cgst_amount, sgst_amount,
        igst_amount, total_amount, status, validation_status, validation_errors,
        created_at, updated_at
      ) VALUES (
        @id, @documentId, @companyId, 'Purchase', @voucherDate, @voucherNumber,
        @partyName, NULL, @taxableAmount, @cgstAmount, @sgstAmount,
        @igstAmount, @totalAmount, 'DRAFT', @validationStatus, @validationErrors,
        @createdAt, @updatedAt
      )
      ON CONFLICT(document_id) DO UPDATE SET
        voucher_type_name = excluded.voucher_type_name,
        voucher_date = excluded.voucher_date,
        voucher_number = excluded.voucher_number,
        party_name = excluded.party_name,
        taxable_amount = excluded.taxable_amount,
        cgst_amount = excluded.cgst_amount,
        sgst_amount = excluded.sgst_amount,
        igst_amount = excluded.igst_amount,
        total_amount = excluded.total_amount,
        validation_status = excluded.validation_status,
        validation_errors = excluded.validation_errors,
        updated_at = excluded.updated_at`
    ).run({
      id: draftId,
      documentId,
      companyId: companyId ?? null,
      voucherDate: ext.invoiceDate ?? "",
      voucherNumber: ext.invoiceNumber,
      partyName: ext.partyName ?? "",
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalAmount: total,
      validationStatus,
      validationErrors: JSON.stringify(errors),
      createdAt: now,
      updatedAt: now,
    });

    this.addEvent(documentId, "DRAFT_GENERATED", `AI Draft Voucher generated (${validationStatus}).`);
    return this.getDraftVoucher(documentId)!;
  }

  public approveDraftVoucher(documentId: string): DraftVoucher {
    const draft = this.getDraftVoucher(documentId);
    if (!draft) throw new Error(`No draft voucher found for document ${documentId}.`);

    if (draft.validationStatus !== "BALANCED") {
      throw new Error(`Cannot approve unbalanced voucher: ${draft.validationErrors.join("; ")}`);
    }

    const now = new Date().toISOString();
    this.database.prepare("UPDATE draft_vouchers SET status = 'APPROVED', updated_at = ? WHERE document_id = ?").run(now, documentId);
    this.updateStatus(documentId, "REVIEWED");
    this.addEvent(documentId, "APPROVED", "Draft voucher approved by human review.");

    return this.getDraftVoucher(documentId)!;
  }

  public getDraftVoucher(documentId: string): DraftVoucher | null {
    const row = this.database.prepare("SELECT * FROM draft_vouchers WHERE document_id = ?").get(documentId) as any;
    if (!row) return null;
    let errors: string[] = [];
    try { errors = JSON.parse(row.validation_errors || "[]"); } catch {}

    return {
      id: row.id,
      documentId: row.document_id,
      companyId: row.company_id,
      voucherTypeName: row.voucher_type_name,
      voucherDate: row.voucher_date,
      voucherNumber: row.voucher_number,
      partyName: row.party_name,
      partyLedgerId: row.party_ledger_id,
      taxableAmount: row.taxable_amount,
      cgstAmount: row.cgst_amount,
      sgstAmount: row.sgst_amount,
      igstAmount: row.igst_amount,
      totalAmount: row.total_amount,
      status: row.status,
      validationStatus: row.validation_status,
      validationErrors: errors,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }


  private updateStatus(documentId: string, status: DocumentStatus): void {
    this.database.prepare("UPDATE documents SET status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), documentId);
  }


  private findByHash(sha256: string): StoredDocument | null {
    const row = this.database.prepare("SELECT * FROM documents WHERE sha256 = ?").get(sha256) as DocumentRow | undefined;
    return row ? mapDocument(row) : null;
  }

  private addEvent(documentId: string, eventType: string, message: string): void {
    this.database
      .prepare("INSERT INTO document_events (id, document_id, event_type, message, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(`doc_evt_${crypto.randomUUID()}`, documentId, eventType, message, new Date().toISOString());
  }

  private countWhere(status: DocumentStatus | null): number {
    const row = status
      ? (this.database.prepare("SELECT COUNT(*) AS count FROM documents WHERE status = ?").get(status) as { count: number })
      : (this.database.prepare("SELECT COUNT(*) AS count FROM documents").get() as { count: number });

    return row.count;
  }

  public async parseBankStatement(
    documentId: string,
    companyId?: string,
    password?: string
  ): Promise<import("../services/bankStatementTypes.js").StatementExtractionResult> {
    const doc = this.database.prepare("SELECT * FROM documents WHERE id = ?").get(documentId) as DocumentRow | undefined;
    if (!doc) throw new Error(`Document ${documentId} not found.`);

    this.updateStatus(documentId, "OCR_PROCESSING");
    this.addEvent(documentId, "OCR_PROCESSING", "Native layout-aware bank statement parser started.");

    const fileBuffer = fs.readFileSync(doc.stored_file_path);
    const { parseBankStatementPdf } = await import("../services/bankStatementParser.js");
    const result = await parseBankStatementPdf(fileBuffer, documentId, companyId, password);

    if (result.transactions.length === 0) {
      throw new Error(`NO_TRANSACTIONS_FOUND: No bank transactions found in document ${doc.original_file_name}. This document may be an invoice, bill, or receipt rather than a bank statement.`);
    }

    const now = new Date().toISOString();
    const targetCompanyId = companyId || "";
    const sessionId = `bss_${crypto.randomUUID()}`;

    // Derive financial year from statement period or current date
    const periodFrom = result.period.fromDate;
    const periodTo   = result.period.toDate;
    const refDate    = periodTo ?? periodFrom ?? now.substring(0, 10);
    const financialYear = deriveFinancialYear(refDate);

    // Insert session record
    this.database.prepare(`
      INSERT INTO bank_statement_sessions (
        id, company_id, document_id, bank_name, bank_label, original_file_name,
        account_number, ifsc_code, period_from, period_to, financial_year,
        opening_balance, closing_balance, total_debits, total_credits,
        tx_count, is_balanced, confidence, notes, created_at, updated_at
      ) VALUES (
        @id, @companyId, @documentId, @bankName, @bankLabel, @fileName,
        @accountNumber, @ifscCode, @periodFrom, @periodTo, @financialYear,
        @openingBalance, @closingBalance, @totalDebits, @totalCredits,
        @txCount, @isBalanced, @confidence, NULL, @now, @now
      )
    `).run({
      id: sessionId,
      companyId: targetCompanyId,
      documentId,
      bankName: result.bankName,
      bankLabel: result.bankLabel,
      fileName: doc.original_file_name,
      accountNumber: result.accountNumber ?? null,
      ifscCode: result.ifscCode ?? null,
      periodFrom: result.period.fromDate ?? null,
      periodTo: result.period.toDate ?? null,
      financialYear,
      openingBalance: result.openingBalance,
      closingBalance: result.closingBalance,
      totalDebits: result.totalDebits,
      totalCredits: result.totalCredits,
      txCount: result.transactions.length,
      isBalanced: result.isBalanceReconciled ? 1 : 0,
      confidence: result.confidence,
      now,
    });

    // Persist parsed statement transactions into bank_transactions table
    const insertStmt = this.database.prepare(`
      INSERT OR REPLACE INTO bank_transactions (
        id, company_id, bank_name, transaction_date, description, reference_no,
        debit, credit, balance, category, reconciliation_status, matched_voucher_id,
        session_id, created_at, updated_at
      ) VALUES (
        @id, @companyId, @bankName, @date, @narration, @referenceNo,
        @debit, @credit, @balance, @category, 'UNRECONCILED', NULL,
        @sessionId, @createdAt, @createdAt
      )
    `);

    this.database.transaction(() => {
      for (const tx of result.transactions) {
        insertStmt.run({
          id: tx.id,
          companyId: targetCompanyId,
          bankName: result.bankLabel,
          date: tx.date,
          narration: tx.narration,
          referenceNo: tx.referenceNo || null,
          debit: tx.debit,
          credit: tx.credit,
          balance: tx.balance,
          category: null,
          sessionId,
          createdAt: now,
        });
      }
    })();

    this.updateStatus(documentId, "EXTRACTED");
    this.addEvent(
      documentId,
      "EXTRACTED",
      `Bank Statement parsing complete (${result.bankLabel}, ${result.transactions.length} transactions extracted, Reconciled: ${result.isBalanceReconciled ? "Yes" : "No"}).`
    );

    // Attach sessionId to the result for the renderer
    return { ...result, sessionId } as any;
  }

  // ─── Bank Statement Session History ─────────────────────────────────────────

  public listBankSessions(
    companyId: string,
    options?: {
      sortBy?: "created_at" | "bank_label" | "tx_count" | "financial_year";
      sortDir?: "ASC" | "DESC";
      financialYear?: string;
      bankName?: string;
      limit?: number;
      offset?: number;
    }
  ): readonly BankStatementSession[] {
    const { sortBy = "created_at", sortDir = "DESC", financialYear, bankName, limit = 50, offset = 0 } = options ?? {};
    const whereClauses: string[] = ["company_id = @companyId", "tx_count > 0"];
    const params: Record<string, any> = { companyId, limit, offset };

    if (financialYear) { whereClauses.push("financial_year = @financialYear"); params["financialYear"] = financialYear; }
    if (bankName)      { whereClauses.push("bank_label LIKE @bankName");       params["bankName"]      = `%${bankName}%`; }

    const safeSortCol = ["created_at", "bank_label", "tx_count", "financial_year", "updated_at"].includes(sortBy) ? sortBy : "created_at";
    const safeSortDir = sortDir === "ASC" ? "ASC" : "DESC";

    const rows = this.database.prepare(
      `SELECT * FROM bank_statement_sessions WHERE ${whereClauses.join(" AND ")} ORDER BY ${safeSortCol} ${safeSortDir} LIMIT @limit OFFSET @offset`
    ).all(params) as any[];

    return rows.map(mapBankSession);
  }

  public getBankSession(sessionId: string): BankStatementSession | null {
    const row = this.database.prepare("SELECT * FROM bank_statement_sessions WHERE id = ?").get(sessionId) as any;
    return row ? mapBankSession(row) : null;
  }

  public getBankSessionTransactions(
    sessionId: string,
    options?: { sortBy?: string; sortDir?: "ASC" | "DESC"; limit?: number; offset?: number }
  ): readonly BankSessionTransaction[] {
    const { sortBy = "transaction_date", sortDir = "ASC", limit = 500, offset = 0 } = options ?? {};
    const safeSortCol = ["transaction_date", "debit", "credit", "balance", "description", "created_at"].includes(sortBy) ? sortBy : "transaction_date";
    const safeSortDir = sortDir === "ASC" ? "ASC" : "DESC";

    const rows = this.database.prepare(
      `SELECT * FROM bank_transactions WHERE session_id = ? ORDER BY ${safeSortCol} ${safeSortDir} LIMIT ? OFFSET ?`
    ).all(sessionId, limit, offset) as any[];

    return rows.map(mapBankTx);
  }

  public updateBankTransaction(
    txId: string,
    updates: {
      description?: string;
      referenceNo?: string;
      debit?: number;
      credit?: number;
      balance?: number;
      category?: string;
      reconciliationStatus?: string;
    }
  ): BankSessionTransaction | null {
    const setClauses: string[] = ["updated_at = @updatedAt"];
    const params: Record<string, any> = { txId, updatedAt: new Date().toISOString() };

    if (updates.description       !== undefined) { setClauses.push("description = @description");             params["description"]           = updates.description; }
    if (updates.referenceNo       !== undefined) { setClauses.push("reference_no = @referenceNo");           params["referenceNo"]           = updates.referenceNo; }
    if (updates.debit             !== undefined) { setClauses.push("debit = @debit");                        params["debit"]                  = updates.debit; }
    if (updates.credit            !== undefined) { setClauses.push("credit = @credit");                      params["credit"]                 = updates.credit; }
    if (updates.balance           !== undefined) { setClauses.push("balance = @balance");                    params["balance"]                = updates.balance; }
    if (updates.category          !== undefined) { setClauses.push("category = @category");                  params["category"]               = updates.category; }
    if (updates.reconciliationStatus !== undefined) { setClauses.push("reconciliation_status = @reconciliationStatus"); params["reconciliationStatus"] = updates.reconciliationStatus; }

    this.database.prepare(`UPDATE bank_transactions SET ${setClauses.join(", ")} WHERE id = @txId`).run(params);
    const row = this.database.prepare("SELECT * FROM bank_transactions WHERE id = ?").get(txId) as any;
    return row ? mapBankTx(row) : null;
  }

  public updateBankSessionNotes(sessionId: string, notes: string): BankStatementSession | null {
    const now = new Date().toISOString();
    this.database.prepare("UPDATE bank_statement_sessions SET notes = ?, updated_at = ? WHERE id = ?").run(notes, now, sessionId);
    return this.getBankSession(sessionId);
  }

  public deleteBankSession(sessionId: string): void {
    // Delete all associated transactions first
    this.database.prepare("DELETE FROM bank_transactions WHERE session_id = ?").run(sessionId);
    this.database.prepare("DELETE FROM bank_statement_sessions WHERE id = ?").run(sessionId);
  }

  public getBankSessionSummaries(companyId: string): readonly BankSessionSummary[] {
    const rows = this.database.prepare(`
      SELECT financial_year, bank_label, COUNT(*) as session_count, SUM(tx_count) as total_txs, MAX(updated_at) as last_updated
      FROM bank_statement_sessions
      WHERE company_id = ?
      GROUP BY financial_year, bank_label
      ORDER BY financial_year DESC, bank_label ASC
    `).all(companyId) as any[];

    return rows.map(r => ({
      financialYear: r.financial_year ?? "Unknown",
      bankLabel: r.bank_label,
      sessionCount: r.session_count,
      totalTransactions: r.total_txs,
      lastUpdated: r.last_updated,
    }));
  }

  public async classifyTransactions(
    companyId: string,
    transactions: readonly import("../services/bankStatementTypes.js").ParsedStatementTransaction[],
    aiOptions?: any
  ): Promise<import("../services/ledgerClassifierTypes.js").StatementClassificationSummary> {
    const { classifyStatementTransactions } = await import("../services/ledgerClassifierEngine.js");
    return classifyStatementTransactions(this.database, companyId, transactions, aiOptions);
  }

  public async saveLedgerRule(
    companyId: string,
    rule: {
      narrationPattern: string;
      matchedLedgerName: string;
      matchedLedgerId: string | null;
      voucherType: string;
    }
  ): Promise<void> {
    const { saveLedgerMappingRule } = await import("../services/ledgerClassifierEngine.js");
    saveLedgerMappingRule(
      this.database,
      companyId,
      rule.narrationPattern,
      rule.matchedLedgerName,
      rule.matchedLedgerId,
      rule.voucherType
    );
  }

  public listLedgerRules(companyId?: string): readonly {
    id: string;
    companyId: string;
    narrationPattern: string;
    normalizedPartyName: string;
    matchedLedgerName: string;
    matchedLedgerId: string | null;
    voucherType: string;
    confidence: number;
    hitCount: number;
    updatedAt: string;
  }[] {
    const query = `
      SELECT id, company_id AS companyId, narration_pattern AS narrationPattern,
             normalized_party_name AS normalizedPartyName, matched_ledger_name AS matchedLedgerName,
             matched_ledger_id AS matchedLedgerId, voucher_type AS voucherType,
             confidence, hit_count AS hitCount, updated_at AS updatedAt
      FROM narration_ledger_rules
    `;
    if (!companyId || companyId === "ALL") {
      return this.database.prepare(`${query} ORDER BY hit_count DESC, updated_at DESC`).all() as any;
    }
    return this.database.prepare(`${query} WHERE company_id = ? ORDER BY hit_count DESC, updated_at DESC`).all(companyId) as any;
  }

  public deleteLedgerRule(ruleId: string): boolean {
    const info = this.database.prepare(`DELETE FROM narration_ledger_rules WHERE id = ?`).run(ruleId);
    return info.changes > 0;
  }
}

// ─── Bank Session / Transaction Types ───────────────────────────────────────

export type BankStatementSession = {
  readonly id: string;
  readonly companyId: string;
  readonly documentId: string | null;
  readonly bankName: string;
  readonly bankLabel: string;
  readonly originalFileName: string;
  readonly accountNumber: string | null;
  readonly ifscCode: string | null;
  readonly periodFrom: string | null;
  readonly periodTo: string | null;
  readonly financialYear: string | null;
  readonly openingBalance: number;
  readonly closingBalance: number;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly txCount: number;
  readonly isBalanced: boolean;
  readonly confidence: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type BankSessionTransaction = {
  readonly id: string;
  readonly companyId: string | null;
  readonly sessionId: string | null;
  readonly bankName: string;
  readonly transactionDate: string;
  readonly description: string;
  readonly referenceNo: string | null;
  readonly debit: number;
  readonly credit: number;
  readonly balance: number | null;
  readonly category: string | null;
  readonly reconciliationStatus: string;
  readonly matchedVoucherId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
};

export type BankSessionSummary = {
  readonly financialYear: string;
  readonly bankLabel: string;
  readonly sessionCount: number;
  readonly totalTransactions: number;
  readonly lastUpdated: string;
};

function mapBankSession(row: any): BankStatementSession {
  return {
    id: row.id,
    companyId: row.company_id,
    documentId: row.document_id ?? null,
    bankName: row.bank_name,
    bankLabel: row.bank_label,
    originalFileName: row.original_file_name,
    accountNumber: row.account_number ?? null,
    ifscCode: row.ifsc_code ?? null,
    periodFrom: row.period_from ?? null,
    periodTo: row.period_to ?? null,
    financialYear: row.financial_year ?? null,
    openingBalance: row.opening_balance ?? 0,
    closingBalance: row.closing_balance ?? 0,
    totalDebits: row.total_debits ?? 0,
    totalCredits: row.total_credits ?? 0,
    txCount: row.tx_count ?? 0,
    isBalanced: row.is_balanced === 1,
    confidence: row.confidence ?? 0,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBankTx(row: any): BankSessionTransaction {
  return {
    id: row.id,
    companyId: row.company_id ?? null,
    sessionId: row.session_id ?? null,
    bankName: row.bank_name,
    transactionDate: row.transaction_date,
    description: row.description,
    referenceNo: row.reference_no ?? null,
    debit: row.debit ?? 0,
    credit: row.credit ?? 0,
    balance: row.balance ?? null,
    category: row.category ?? null,
    reconciliationStatus: row.reconciliation_status ?? "UNRECONCILED",
    matchedVoucherId: row.matched_voucher_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

/** Derive Indian financial year string (e.g., "2024-25") from a date string */
function deriveFinancialYear(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";
    const month = d.getMonth() + 1; // 1=Jan
    const year  = d.getFullYear();
    const fyStart = month >= 4 ? year : year - 1;
    return `${fyStart}-${String(fyStart + 1).slice(2)}`;
  } catch {
    return "Unknown";
  }
}

function hashFile(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function inferMimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".csv":
      return "text/csv";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xml":
      return "application/xml";
    default:
      return "application/octet-stream";
  }
}

function mapDocument(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    originalFileName: row.original_file_name,
    storedFilePath: row.stored_file_path,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function extractOcrDocument(documentId: string, fileName: string, fileContent: string): DocumentExtraction {
  const now = new Date().toISOString();
  
  // Use layout-aware invoice parser
  const parsed = extractInvoiceFromText(fileContent, fileName);

  return {
    id: `ext_${crypto.randomUUID()}`,
    documentId,
    rawOcrText: fileContent.trim().length > 0 ? fileContent : null,
    partyName: parsed.vendorName || parsed.buyerName || fileName.replace(/\.[^/.]+$/, "").replaceAll("_", " "),
    partyGstin: parsed.vendorGstin || parsed.buyerGstin || null,
    invoiceNumber: parsed.invoiceNumber || null,
    invoiceDate: parsed.invoiceDate || null,
    taxableAmount: parsed.subtotal || null,
    cgstAmount: parsed.cgst || null,
    sgstAmount: parsed.sgst || null,
    igstAmount: parsed.igst || null,
    totalAmount: parsed.grandTotal || null,
    confidenceScore: parsed.confidence,
    extractedAt: now,
  };
}
