import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  FileUp,
  Code,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Table,
  Terminal,
  Activity,
  Copy,
  Check,
  Sparkles,
  Lock,
  X,
  History,
  Building,
  CreditCard,
  Calendar,
  Layers,
  CheckCircle,
  AlertTriangle,
  Star,
  FileCheck,
  User,
  Hash,
  Eye,
  Columns,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode2,
  Maximize2,
  Minimize2,
  FolderOpen,
  Filter,
  Search,
  BookOpen,
  Receipt,
  Printer
} from "lucide-react";
import { DynamicDataTable, ColumnDef } from "../components/DynamicDataTable";
import { parseUploadedFile, ParsedDocumentResult, ParsedBankTxResult, BankStatementMetadata } from "../utils/fileParser";
import { BankStatementReviewModal } from "./BankStatementReviewModal";
import { BankStatementHistoryView } from "./BankStatementHistoryView";
import { BankLogo } from "../components/BankLogo";
import { LedgersView } from "./LedgersView";
import { PdfCanvasViewer } from "../components/PdfCanvasViewer";
import { ImportActionPromptModal } from "../components/ImportActionPromptModal";
import { PrintSettingsModal } from "../components/PrintSettingsModal";

interface BankStatementImportViewProps {
  readonly activeCompanyId?: string | undefined;
  readonly mirrorCompanies?: readonly any[] | undefined;
  readonly onImportComplete?: (() => void) | undefined;
  readonly defaultTab?: "upload" | "statement_audit" | "paste" | "history" | "repository" | undefined;
}

export function BankStatementImportView({ activeCompanyId = "", mirrorCompanies = [], onImportComplete, defaultTab = "upload" }: BankStatementImportViewProps = {}): React.JSX.Element {
  // Always default to "upload" files tab when navigating to this screen unless specified
  const [activeSubTab, setActiveSubTab] = useState<"upload" | "statement_audit" | "paste" | "history" | "repository">(defaultTab);
  const [pastedCode, setPastedCode] = useState("");
  const [selectedFileType, setSelectedFileType] = useState<"json" | "csv" | "xml">("json");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorLineNo, setErrorLineNo] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parseLogs, setParseLogs] = useState<readonly string[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocumentResult[]>([]);
  const [parsedBankTxs, setParsedBankTxs] = useState<ParsedBankTxResult[]>([]);
  const [statementMeta, setStatementMeta] = useState<BankStatementMetadata | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL");
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>("ALL");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState<boolean>(false);

  const [activeTableMode, setActiveTableMode] = useState<"documents" | "bankTxs">("documents");
  const [proofreadDocSubTab, setProofreadDocSubTab] = useState<"items" | "voucher" | "summary">("items");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewClassifications, setReviewClassifications] = useState<any[]>([]);
  const [mirrorLedgers, setMirrorLedgers] = useState<any[]>([]);

  // Original File / Document State for Proofreading & Side-by-Side View
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [originalFileText, setOriginalFileText] = useState<string | null>(null);
  const [originalFileType, setOriginalFileType] = useState<"pdf" | "csv" | "json" | "xml" | "image" | "other">("pdf");
  const [isProofreadModalOpen, setIsProofreadModalOpen] = useState(false);
  const [isProofreadFullscreen, setIsProofreadFullscreen] = useState(false);

  // Password-Protected PDF Import State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [unlockedPdfPassword, setUnlockedPdfPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Import Ledger & Voucher Prompt Modal State
  const [isImportPromptOpen, setIsImportPromptOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Multi-Doc & History State
  const [repositoryDocuments, setRepositoryDocuments] = useState<any[]>([]);
  const [repoFilter, setRepoFilter] = useState<"ALL" | "INVOICE" | "STATEMENT" | "RECEIPT">("ALL");
  const [repoSearch, setRepoSearch] = useState<string>("");
  const [repoViewMode, setRepoViewMode] = useState<"table" | "history">("table");

  // Load documents and bank sessions from local SQLite mirror into unified repository
  const loadRepositoryData = useCallback(async () => {
    try {
      const [docs, bankSessions] = await Promise.all([
        window.desktop?.documents?.listRecent ? window.desktop.documents.listRecent().catch(() => []) : Promise.resolve([]),
        window.desktop?.bankSessions?.list ? window.desktop.bankSessions.list(activeCompanyId, { limit: 100 }).catch(() => []) : Promise.resolve([])
      ]);

      const formattedBankSessions = (bankSessions || [])
        .filter((s: any) => (s.txCount ?? s.tx_count ?? 0) > 0)
        .map((s: any) => ({
          id: s.id,
          sessionId: s.id,
          documentId: s.documentId || s.document_id || null,
          originalFileName: s.originalFileName || s.original_file_name || `${s.bankLabel || s.bankName || "Bank"}_Statement.pdf`,
          bankName: s.bankName || s.bank_name || s.bankLabel || s.bank_label,
          bankLabel: s.bankLabel || s.bank_label || s.bankName || s.bank_name,
          accountNumber: s.accountNumber || s.account_number,
          ifscCode: s.ifscCode || s.ifsc_code,
          financialYear: s.financialYear || s.financial_year,
          periodFrom: s.periodFrom || s.period_from,
          periodTo: s.periodTo || s.period_to,
          openingBalance: s.openingBalance ?? s.opening_balance ?? 0,
          closingBalance: s.closingBalance ?? s.closing_balance ?? 0,
          totalDebits: s.totalDebits ?? s.total_debits ?? 0,
          totalCredits: s.totalCredits ?? s.total_credits ?? 0,
          txCount: s.txCount ?? s.tx_count ?? 0,
          isBalanced: Boolean(s.isBalanced ?? s.is_balanced),
          status: (s.isBalanced ?? s.is_balanced) ? "BALANCED" : "EXTRACTED",
          mimeType: "application/pdf",
          docType: "STATEMENT",
          isBankSession: true
        }));

      // Combine and eliminate duplicates by matching originalFileName or documentId / sessionId
      const combinedDocs = [...(docs || [])];
      for (const bs of formattedBankSessions) {
        const existingIdx = combinedDocs.findIndex((d: any) =>
          d.id === bs.id ||
          d.sessionId === bs.id ||
          (bs.documentId && d.id === bs.documentId) ||
          (d.originalFileName && bs.originalFileName && d.originalFileName === bs.originalFileName)
        );
        if (existingIdx === -1) {
          combinedDocs.push(bs);
        } else {
          // Enrich existing doc with bank session metadata while keeping document identity
          combinedDocs[existingIdx] = {
            ...combinedDocs[existingIdx],
            ...bs,
            docType: "STATEMENT",
            isBankSession: true
          };
        }
      }

      setRepositoryDocuments(combinedDocs);
    } catch {
      // ignore
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void loadRepositoryData();
  }, [loadRepositoryData]);

  // Handler to open any document directly in active statement audit tab
  const openDocumentInAudit = async (doc: any) => {
    const isStatement = doc.isBankSession || (doc.category && doc.category.includes("Bank")) || doc.docType === "STATEMENT" || (doc.originalFileName || "").toLowerCase().includes("statement") || (doc.originalFileName || "").toLowerCase().includes("bank");

    setIsLoading(true);
    try {
      // 1. Try to fetch the document's file buffer to show in the left preview pane
      const fileLookupKeys = [doc.id, doc.sessionId, doc.documentId, doc.storedFilePath, doc.originalFileName].filter(Boolean);
      if ((window as any).desktop?.documents?.getFileBuffer) {
        try {
          let fileData: any = null;
          for (const key of fileLookupKeys) {
            fileData = await (window as any).desktop.documents.getFileBuffer(key).catch(() => null);
            if (fileData?.buffer) break;
          }
          if (fileData?.buffer) {
            const mime = fileData.mimeType || (fileData.fileName?.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
            const blob = new Blob([fileData.buffer], { type: mime });
            const url = URL.createObjectURL(blob);
            setOriginalFileUrl(url);
            setUploadedFile(new File([blob], fileData.fileName || doc.originalFileName || "document.pdf", { type: mime }));
            if (mime.includes("pdf") || (fileData.fileName && fileData.fileName.endsWith(".pdf"))) {
              setOriginalFileType("pdf");
            } else if (mime.includes("image") || (fileData.fileName && /\.(png|jpe?g|webp)$/i.test(fileData.fileName))) {
              setOriginalFileType("image");
            } else if (fileData.fileName && /\.(csv|xlsx?)$/i.test(fileData.fileName)) {
              setOriginalFileType("csv");
            } else {
              setOriginalFileType("other");
            }
          }
        } catch (bufErr) {
          console.warn("Could not retrieve file buffer for document preview:", bufErr);
        }
      }

      if (isStatement && window.desktop?.bankSessions?.getTransactions) {
        // Resolve the actual bank session id (if doc has sessionId, or doc.id is session, or look up by documentId / originalFileName)
        let targetSessionId = doc.sessionId || (doc.isBankSession ? doc.id : null);
        let session = doc.isBankSession ? doc : null;

        if (!targetSessionId && window.desktop?.bankSessions?.list) {
          const sessions = await window.desktop.bankSessions.list(activeCompanyId, { limit: 100 }).catch(() => []);
          const matched = sessions.find((s: any) => 
            s.id === doc.id || 
            (s.documentId && s.documentId === doc.id) || 
            (s.originalFileName && doc.originalFileName && s.originalFileName === doc.originalFileName)
          );
          if (matched) {
            targetSessionId = matched.id;
            session = matched;
          }
        }

        if (!targetSessionId) targetSessionId = doc.id;
        if (!session && window.desktop?.bankSessions?.get) {
          session = await window.desktop.bankSessions.get(targetSessionId).catch(() => null);
        }

        const txs = await window.desktop.bankSessions.getTransactions(targetSessionId, { limit: 1000 }).catch(() => []);

        const bankName = session?.bankName || session?.bankLabel || doc.bankName || doc.bankLabel || "Bank Statement";
        const openingBal = Number(session?.openingBalance ?? doc.openingBalance ?? 0);
        const closingBal = Number(session?.closingBalance ?? doc.closingBalance ?? 0);
        const totalDebits = Number(session?.totalDebits ?? doc.totalDebits ?? 0);
        const totalCredits = Number(session?.totalCredits ?? doc.totalCredits ?? 0);
        const calculatedClosing = Math.round((openingBal - totalDebits + totalCredits) * 100) / 100;
        const isBalanced = Math.abs(calculatedClosing - closingBal) < 0.05;

        const meta: BankStatementMetadata = {
          bankName,
          bankLabel: session?.bankLabel || bankName,
          accountHolderName: session?.accountHolderName || null,
          customerId: session?.customerId || null,
          branchName: session?.branchName || null,
          accountNumber: session?.accountNumber || doc.accountNumber || null,
          ifscCode: session?.ifscCode || doc.ifscCode || null,
          openingBalance: openingBal,
          closingBalance: closingBal,
          calculatedClosingBalance: calculatedClosing,
          totalDebits,
          totalCredits,
          isBalanceReconciled: session?.isBalanced ?? isBalanced,
          pageCount: session?.pageCount || 1,
          period: { fromDate: session?.periodFrom || doc.periodFrom || null, toDate: session?.periodTo || doc.periodTo || null }
        };

        const rawList = txs || [];
        const parsedTxs: ParsedBankTxResult[] = rawList.map((t: any, idx: number) => {
          const debit = Number(t.debit || 0);
          const credit = Number(t.credit || 0);
          const balanceAmount = Number(t.balance || 0);

          let validationWarning: string | undefined = t.validationWarning;
          if (!validationWarning && idx > 0) {
            const prevBal = Number(rawList[idx - 1].balance || 0);
            const expected = Math.round((prevBal - debit + credit) * 100) / 100;
            const actual = Math.round(balanceAmount * 100) / 100;
            if (Math.abs(expected - actual) > 0.05) {
              validationWarning = `Continuity mismatch: Expected ${expected}, got ${actual}`;
            }
          }

          return {
            id: t.id || `tx_${idx}`,
            companyId: t.companyId || activeCompanyId,
            bankName,
            transactionDate: t.transactionDate || t.date || "",
            valueDate: (t.valueDate && t.valueDate !== (t.transactionDate || t.date)) ? t.valueDate : "",
            description: t.description || t.narration || "",
            referenceNo: t.referenceNo || t.chqRef || "",
            utrNumber: t.utrNumber || "",
            debit,
            credit,
            balanceAmount,
            pageNumber: t.pageNumber || 1,
            accountNumber: t.accountNumber || meta.accountNumber || "",
            reviewFlag: Boolean(validationWarning),
            validationWarning,
            reconciliationStatus: (t.reconciliationStatus === "RECONCILED" ? "RECONCILED" : "UNRECONCILED") as any,
          };
        });

        setStatementMeta(meta);
        setParsedBankTxs(parsedTxs);
        setActiveTableMode("bankTxs");
        setActiveSubTab("statement_audit");
        return;
      }

      // If document is an invoice / bill / receipt
      let extraction: any = null;
      if (doc.id && (window as any).desktop?.documents?.processOcr) {
        // Trigger or retrieve OCR extraction
        extraction = await (window as any).desktop.documents.processOcr(doc.id).catch(() => null);
      }
      if (!extraction && doc.id && (window as any).desktop?.documents?.getExtraction) {
        extraction = await (window as any).desktop.documents.getExtraction(doc.id).catch(() => null);
      }

      // If we have raw OCR text, parse line items and party details layout-aware
      let parsedInvoice: any = null;
      const rawText = extraction?.rawOcrText || doc.rawOcrText || "";
      if (rawText) {
        const { extractInvoiceFromText } = await import("../utils/invoiceParser");
        parsedInvoice = extractInvoiceFromText(rawText, doc.originalFileName || "document.pdf");
      }

      const vendorName = extraction?.partyName || parsedInvoice?.vendorName || doc.vendorName || doc.originalFileName || "Vendor / Supplier";
      const buyerName = parsedInvoice?.buyerName || doc.buyerName || undefined;
      const gstin = extraction?.partyGstin || parsedInvoice?.vendorGstin || doc.gstin || "";
      const buyerGstin = parsedInvoice?.buyerGstin || doc.buyerGstin || undefined;
      const invoiceNumber = extraction?.invoiceNumber || parsedInvoice?.invoiceNumber || doc.invoiceNumber || `INV-${doc.id?.slice(0, 6) || "001"}`;
      const date = extraction?.invoiceDate || parsedInvoice?.invoiceDate || doc.date || doc.invoiceDate || new Date().toISOString().substring(0, 10);
      const subtotal = Number(extraction?.taxableAmount ?? parsedInvoice?.subtotal ?? doc.subtotal ?? 0);
      const cgst = Number(extraction?.cgstAmount ?? parsedInvoice?.cgst ?? doc.cgstAmount ?? 0);
      const sgst = Number(extraction?.sgstAmount ?? parsedInvoice?.sgst ?? doc.sgstAmount ?? 0);
      const igst = Number(extraction?.igstAmount ?? parsedInvoice?.igst ?? doc.igstAmount ?? 0);
      const totalTax = (cgst + sgst + igst) || (parsedInvoice?.totalTax ?? 0);
      const grandTotal = Number(extraction?.totalAmount ?? parsedInvoice?.grandTotal ?? doc.grandTotal ?? (subtotal + totalTax));
      const items = (parsedInvoice?.items && parsedInvoice.items.length > 0) ? parsedInvoice.items : (doc.items || []);

      // Determine entry type: If active company matches vendor, it is Sales. Otherwise Purchase.
      const entryType: "Sales" | "Purchase" = (
        (activeCompanyName && vendorName.toLowerCase().includes(activeCompanyName.toLowerCase())) ||
        (buyerName && buyerName.toLowerCase().includes("cafe food"))
      ) ? "Sales" : "Purchase";

      const parsedDocItem: ParsedDocumentResult = {
        id: doc.id || `doc_${Date.now()}`,
        companyId: activeCompanyId,
        originalFileName: doc.originalFileName || "document.pdf",
        mimeType: doc.mimeType || "application/pdf",
        byteSize: doc.byteSize || 0,
        status: (doc.status === "EXTRACTED" || extraction) ? "EXTRACTED" : "IMPORTED",
        storedFilePath: doc.storedFilePath || "",
        importedAt: doc.importedAt || new Date().toISOString(),
        vendorName,
        buyerName,
        gstin,
        buyerGstin,
        invoiceNumber,
        date,
        subtotal,
        totalTax,
        grandTotal,
        cgst,
        sgst,
        igst,
        validationStatus: "BALANCED",
        confidence: extraction?.confidenceScore || parsedInvoice?.confidence || 0.95,
        entryType,
        items,
        rawOcrText: rawText || undefined,
      };

      setParsedDocuments([parsedDocItem]);
      setStatementMeta(null);
      setParsedBankTxs([]);
      setActiveTableMode("documents");
      setIsProofreadModalOpen(true);
    } catch (e: any) {
      console.error("Error opening document in audit:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch company ledgers for the review modal
  useEffect(() => {
    if (window.desktop?.accountingMirror?.listLedgers) {
      window.desktop.accountingMirror.listLedgers().then((ledgers) => {
        setMirrorLedgers(ledgers as any[]);
      }).catch(() => { });
    }
  }, []);

  // Restore preferences from SQLite (keep upload as default for activeSubTab per user request)
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.getAll().then((prefs) => {
      if (prefs["import.selectedFileType"]) setSelectedFileType(prefs["import.selectedFileType"] as any);
      if (prefs["import.activeTableMode"]) setActiveTableMode(prefs["import.activeTableMode"] as any);
    }).catch(() => { });
  }, []);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("import.selectedFileType", selectedFileType);
  }, [selectedFileType]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("import.activeTableMode", activeTableMode);
  }, [activeTableMode]);

  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const appendLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setParseLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  // Auto-detect format when code is pasted
  const handleCodeChange = (newText: string) => {
    setPastedCode(newText);
    const trimmed = newText.trim();
    if (trimmed.startsWith("<") && (trimmed.includes("ENVELOPE") || trimmed.includes("XMLTAGS") || trimmed.includes("?xml"))) {
      setSelectedFileType("xml");
    } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      setSelectedFileType("json");
    } else if (trimmed.includes(",")) {
      setSelectedFileType("csv");
    }
  };

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Helper to store original file data for side-by-side proofreading
  const storeOriginalFileData = (file: File) => {
    setUploadedFile(file);
    const fname = file.name.toLowerCase();
    if (fname.endsWith(".pdf")) {
      setOriginalFileType("pdf");
    } else if (fname.endsWith(".csv") || fname.endsWith(".tsv")) {
      setOriginalFileType("csv");
    } else if (fname.endsWith(".json")) {
      setOriginalFileType("json");
    } else if (fname.endsWith(".xml")) {
      setOriginalFileType("xml");
    } else if (fname.endsWith(".png") || fname.endsWith(".jpg") || fname.endsWith(".jpeg") || fname.endsWith(".webp")) {
      setOriginalFileType("image");
    } else {
      setOriginalFileType("other");
    }

    try {
      if (originalFileUrl) {
        URL.revokeObjectURL(originalFileUrl);
      }
      const objUrl = URL.createObjectURL(file);
      setOriginalFileUrl(objUrl);
    } catch {
      // ignore
    }

    // If it's a text-readable format (JSON, CSV, XML), also read text for quick proofreading
    if (fname.endsWith(".json") || fname.endsWith(".csv") || fname.endsWith(".xml") || fname.endsWith(".tsv") || fname.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalFileText(e.target?.result as string || "");
      };
      reader.readAsText(file);
    } else {
      setOriginalFileText(null);
    }
  };

  // Common file processor for both input change and drag-and-drop
  const processSelectedFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setErrorLineNo(null);
    setSuccessMsg(null);
    setParseLogs([]);
    storeOriginalFileData(file);

    appendLog(`Starting file upload parse for: "${file.name}" (${file.size} bytes)`);

    try {
      const result = await parseUploadedFile(file, activeCompanyId, undefined, appendLog);
      setParsedDocuments(result.documents);
      setParsedBankTxs(result.bankTxs);
      setStatementMeta(result.statementMeta || null);

      appendLog(`Parsing complete. Extracted ${result.documents.length} document records and ${result.bankTxs.length} bank transactions.`);

      if (result.bankTxs.length > 0 && result.documents.length === 0) {
        setActiveTableMode("bankTxs");
        setActiveSubTab("statement_audit");
      } else {
        setActiveTableMode("documents");
      }

      if (result.documents.length === 0 && result.bankTxs.length === 0) {
        setErrorMsg(`No document records or bank transactions could be extracted from "${file.name}". Please verify the file format.`);
      } else {
        setSuccessMsg(`Successfully parsed ${result.documents.length} documents and ${result.bankTxs.length} bank transactions from "${file.name}".`);
        setIsImportPromptOpen(true);
        onImportComplete?.();
      }
    } catch (err: any) {
      const errMsg = err?.message || "Failed to parse the uploaded file.";
      if (errMsg.includes("PASSWORD_REQUIRED") || errMsg.toLowerCase().includes("password")) {
        setPendingFile(file);
        setPdfPassword("");
        setPasswordError(null);
        setPasswordModalOpen(true);
        appendLog(`PDF is password protected: "${file.name}". Waiting for password...`);
      } else {
        setErrorMsg(errMsg);
        appendLog(`ERROR: ${errMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file picker upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile) return;

    setIsLoading(true);
    setPasswordError(null);
    appendLog(`Unlocking bank statement "${pendingFile.name}" with provided password...`);
    storeOriginalFileData(pendingFile);

    try {
      const result = await parseUploadedFile(pendingFile, activeCompanyId, pdfPassword, appendLog);
      setParsedDocuments(result.documents);
      setParsedBankTxs(result.bankTxs);
      setStatementMeta(result.statementMeta || null);

      appendLog(`Successfully unlocked! Extracted ${result.documents.length} documents and ${result.bankTxs.length} bank transactions.`);

      if (result.bankTxs.length > 0 && result.documents.length === 0) {
        setActiveTableMode("bankTxs");
        setActiveSubTab("statement_audit");
      } else {
        setActiveTableMode("documents");
      }

      setSuccessMsg(`Successfully unlocked & parsed ${result.bankTxs.length} bank transactions from "${pendingFile.name}".`);
      setIsImportPromptOpen(true);
      onImportComplete?.();
      setUnlockedPdfPassword(pdfPassword);
      setPasswordModalOpen(false);
      setPendingFile(null);
      setPdfPassword("");
    } catch (err: any) {
      const errMsg = err?.message || "Invalid PDF password.";
      setPasswordError(errMsg.includes("PASSWORD_REQUIRED") ? "Incorrect password. Please verify and try again." : errMsg);
      appendLog(`ERROR: Unlock failed — ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle raw code pasting
  const handleProcessPastedCode = () => {
    if (!pastedCode.trim()) {
      setErrorMsg("Please paste some valid code before processing.");
      setErrorLineNo(1);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorLineNo(null);
    setSuccessMsg(null);
    setParseLogs([]);

    appendLog(`Processing pasted ${selectedFileType.toUpperCase()} payload (${pastedCode.length} characters)...`);

    try {
      // Validate JSON format if selected
      if (selectedFileType === "json") {
        try {
          JSON.parse(pastedCode);
        } catch (jsonErr: any) {
          const match = jsonErr.message.match(/position\s+(\d+)/i);
          let lineNo = 1;
          if (match) {
            const pos = Number(match[1]);
            lineNo = pastedCode.substring(0, pos).split("\n").length;
          }
          throw new Error(`JSON Syntax Error at Line ${lineNo}: ${jsonErr.message}`);
        }
      }

      let simulatedFile: File;
      if (selectedFileType === "json") {
        simulatedFile = new File([pastedCode], "pasted_data.json", { type: "application/json" });
      } else if (selectedFileType === "xml") {
        simulatedFile = new File([pastedCode], "pasted_data.xml", { type: "text/xml" });
      } else {
        simulatedFile = new File([pastedCode], "pasted_data.csv", { type: "text/csv" });
      }
      storeOriginalFileData(simulatedFile);

      parseUploadedFile(simulatedFile).then((result) => {
        setParsedDocuments(result.documents);
        setParsedBankTxs(result.bankTxs);

        appendLog(`Pasted code successfully parsed! Found ${result.documents.length} documents and ${result.bankTxs.length} bank transactions.`);

        if (result.bankTxs.length > 0 && result.documents.length === 0) {
          setActiveTableMode("bankTxs");
          setActiveSubTab("statement_audit");
        } else {
          setActiveTableMode("documents");
        }
        if (result.documents.length > 0 || result.bankTxs.length > 0) {
          setIsImportPromptOpen(true);
        }
        setSuccessMsg(`Successfully parsed ${result.documents.length} documents and ${result.bankTxs.length} bank transactions.`);
        setIsLoading(false);
      }).catch((err) => {
        const errMsg = err?.message || "Failed to process pasted payload.";
        setErrorMsg(errMsg);
        appendLog(`ERROR during code parse: ${errMsg}`);
        setIsLoading(false);
      });
    } catch (err: any) {
      const errMsg = err?.message || "Invalid code structure format.";
      setErrorMsg(errMsg);
      const lineMatch = errMsg.match(/Line\s+(\d+)/i);
      setErrorLineNo(lineMatch ? Number(lineMatch[1]) : 1);
      appendLog(`EXCEPTION: ${errMsg}`);
      setIsLoading(false);
    }
  };

  const jumpToLine = (line: number) => {
    if (!codeEditorRef.current) return;
    const lines = pastedCode.split("\n");
    let charIndex = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      charIndex += lines[i].length + 1;
    }
    codeEditorRef.current.focus();
    codeEditorRef.current.setSelectionRange(charIndex, charIndex + (lines[line - 1]?.length || 0));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pastedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Synchronize scrolling between line numbers and textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const documentColumns: ColumnDef[] = [
    { key: "id", label: "Doc ID", dataType: "text" },
    { key: "entryType", label: "Voucher Type", dataType: "status" },
    { key: "originalFileName", label: "File Name", dataType: "text" },
    { key: "vendorName", label: "Vendor / Supplier", dataType: "text" },
    { key: "gstin", label: "Supplier GSTIN", dataType: "text" },
    { key: "buyerName", label: "Buyer / Party", dataType: "text" },
    { key: "invoiceNumber", label: "Invoice No.", dataType: "text" },
    { key: "date", label: "Date", dataType: "date" },
    { key: "subtotal", label: "Taxable Amt (₹)", dataType: "number" },
    { key: "totalTax", label: "Tax Amt (₹)", dataType: "number" },
    { key: "grandTotal", label: "Total Amt (₹)", dataType: "number" },
    { key: "status", label: "Status", dataType: "status" },
  ];

  const bankTxColumns: ColumnDef[] = [
    { key: "transactionDate", label: "Tx Date", dataType: "date" },
    { key: "bankName", label: "Bank", dataType: "text" },
    { key: "id", label: "Tx ID", dataType: "text" },
    { key: "description", label: "Description", dataType: "text" },
    { key: "referenceNo", label: "Ref No", dataType: "text" },
    { key: "debit", label: "Debit (₹)", dataType: "number" },
    { key: "credit", label: "Credit (₹)", dataType: "number" },
    { key: "balanceAmount", label: "Balance (₹)", dataType: "number" },
    { key: "reconciliationStatus", label: "Status", dataType: "status" },
  ];

  const lineNumbers = useMemo(() => {
    const count = Math.max(1, pastedCode.split("\n").length);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [pastedCode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "4px" }} role="region" aria-label="Statement Import & Code Visualizer">

      {/* Header Card */}
      <div className="panel" style={{ padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ padding: "10px", background: "var(--accent-subtle)", borderRadius: "10px", color: "var(--accent)", display: "flex" }}>
            <Database size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", margin: 0 }}>Unified Document & Bank Statement Center</h2>
            <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "2px 0 0 0" }}>Upload, parse, proofread, and inspect bank statements, invoices, and bills</p>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div style={{ display: "flex", gap: "6px", background: "var(--surface-2)", padding: "4px", borderRadius: "8px", border: "1px solid var(--line)", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveSubTab("upload")}
            style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", background: activeSubTab === "upload" ? "var(--surface)" : "transparent", color: activeSubTab === "upload" ? "var(--accent)" : "var(--text)", border: "none" }}
          >
            <FileUp size={13} style={{ display: "inline", marginRight: "4px" }} /> Upload Files
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("repository")}
            style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", background: activeSubTab === "repository" ? "var(--surface)" : "transparent", color: activeSubTab === "repository" ? "var(--accent)" : "var(--text)", border: "none" }}
          >
            <FolderOpen size={13} style={{ display: "inline", marginRight: "4px" }} /> Multi-Doc & History ({repositoryDocuments.length})
          </button>
          {statementMeta && (
            <button
              type="button"
              onClick={() => setActiveSubTab("statement_audit")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                background: activeSubTab === "statement_audit" ? "var(--surface)" : "transparent",
                color: activeSubTab === "statement_audit" ? "var(--accent)" : "var(--text)",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <BankLogo bankName={statementMeta.bankName || statementMeta.bankLabel} ifsc={statementMeta.ifscCode} showBadge={false} size={15} />
              <span>Active Statement Audit ({parsedBankTxs.length})</span>
            </button>
          )}
    
          <button
            type="button"
            onClick={() => setActiveSubTab("paste")}
            style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", background: activeSubTab === "paste" ? "var(--surface)" : "transparent", color: activeSubTab === "paste" ? "var(--accent)" : "var(--text)", border: "none" }}
          >
            <Code size={13} style={{ display: "inline", marginRight: "4px" }} /> Paste Raw Code
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(13,148,136,0.1)", border: "1px solid var(--accent)", padding: "12px 16px", borderRadius: "8px", color: "var(--accent)", fontWeight: "700", fontSize: "13px" }}>
          <RefreshCw size={16} className="spin" /> Processing and parsing dataset records...
        </div>
      )}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "12px 16px", borderRadius: "8px", color: "#ef4444", fontWeight: "700", fontSize: "13px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          {errorLineNo && (
            <button
              type="button"
              onClick={() => jumpToLine(errorLineNo)}
              style={{ background: "#ef4444", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "6px", fontSize: "11.5px", cursor: "pointer", fontWeight: "800" }}
            >
              Go to Line {errorLineNo}
            </button>
          )}
        </div>
      )}
      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", padding: "12px 16px", borderRadius: "8px", color: "#10b981", fontWeight: "700", fontSize: "13px" }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* SUBTAB 1: UPLOAD FILES INTERFACE */}
      {activeSubTab === "upload" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="panel"
          style={{
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: isDragging ? "2px dashed var(--accent)" : "2px dashed var(--line)",
            borderRadius: "14px",
            background: isDragging ? "var(--accent-subtle)" : "var(--surface-2)",
            textAlign: "center",
            gap: "14px",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ padding: "16px", background: "var(--surface)", borderRadius: "50%", color: "var(--accent)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <FileUp size={34} />
          </div>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", margin: 0 }}>
              {isDragging ? "Drop your files right here to parse" : "Drop files to inspect data"}
            </h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 16px 0" }}>Supports PDF, XLSX, CSV, JSON, XML, and Image invoice formats</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <label style={{ padding: "8px 22px", borderRadius: "8px", background: "var(--accent)", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              Browse Local File
              <input type="file" accept=".json,.xml,.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>

            {(parsedBankTxs.length > 0 || parsedDocuments.length > 0) && (
              <button
                type="button"
                onClick={() => setIsProofreadModalOpen(true)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "1px solid var(--line)",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <Columns size={14} style={{ color: "var(--accent)" }} />
                <span>View Original & Proofread Side-by-Side</span>
              </button>
            )}

            {statementMeta && (
              <button
                type="button"
                onClick={() => setActiveSubTab("statement_audit")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "var(--surface)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Table size={14} />
                <span>View in Active Statement Audit</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PASTE RAW CODE INTERFACE */}
      {activeSubTab === "paste" && (
        <div className="panel" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>Raw Payload Editor:</span>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer", color: "var(--text)" }}
              >
                {copiedCode ? <Check size={12} style={{ color: "#10b981" }} /> : <Copy size={12} />}
                {copiedCode ? "Copied!" : "Copy Code"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)" }}>Format:</label>
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value as any)}
                style={{ padding: "4px 8px", borderRadius: "6px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              >
                <option value="json">JSON Code</option>
                <option value="xml">XML Code (Tally / UDIMagic)</option>
                <option value="csv">CSV Code / Spreadsheet rows</option>
              </select>
            </div>
          </div>

          {/* Styled Code Editor Container with Synchronized Line Numbers */}
          <div style={{ display: "flex", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", overflow: "hidden", position: "relative", height: "320px" }}>

            {/* Line Numbers Column */}
            <div
              ref={lineNumbersRef}
              style={{
                display: "flex", flexDirection: "column", background: "var(--surface)", padding: "12px 8px",
                color: "var(--muted)", fontFamily: "monospace", fontSize: "12px", textAlign: "right",
                userSelect: "none", borderRight: "1px solid var(--line)", minWidth: "45px", overflowY: "hidden"
              }}
            >
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  onClick={() => jumpToLine(num)}
                  style={{ cursor: "pointer", color: errorLineNo === num ? "#ef4444" : "var(--muted)", fontWeight: errorLineNo === num ? "800" : "normal", height: "20px", lineHeight: "20px" }}
                  title={`Jump to line ${num}`}
                >
                  {num}
                </div>
              ))}
            </div>

            {/* Textarea Code Input with Synchronized Scrolling */}
            <div style={{ position: "relative", flex: 1, height: "100%", overflow: "hidden" }}>
              {errorLineNo && (
                <div
                  style={{
                    position: "absolute",
                    top: `${(errorLineNo - 1) * 20}px`,
                    left: 0,
                    right: 0,
                    height: "20px",
                    background: "rgba(239, 68, 68, 0.15)",
                    borderLeft: "4px solid #ef4444",
                    pointerEvents: "none",
                    zIndex: 2
                  }}
                />
              )}
              <textarea
                ref={codeEditorRef}
                value={pastedCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={selectedFileType === "json" ? '[\n  {\n    "vendorName": "Acme Corp",\n    "invoiceNumber": "INV-2026-01",\n    "grandTotal": 45000\n  }\n]' : selectedFileType === "xml" ? '<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import</TALLYREQUEST>\n  </HEADER>\n</ENVELOPE>' : 'Date,Description,Debit,Credit\n2026-07-28,Client Payout,0,50000'}
                style={{
                  width: "100%", height: "100%", padding: "12px", border: "none", background: "transparent",
                  color: "var(--text)", fontFamily: "monospace", fontSize: "12.5px", outline: "none",
                  boxSizing: "border-box", lineHeight: "20px", resize: "none", whiteSpace: "pre", overflowWrap: "normal", overflowX: "auto"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleProcessPastedCode}
              style={{ padding: "8px 20px", borderRadius: "8px", background: "var(--accent)", color: "#fff", fontWeight: "700", fontSize: "12.5px", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Table size={14} /> Parse & Render in Table
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB: SEAMLESS MULTI-DOC REPOSITORY & STATEMENT HISTORY */}
      {activeSubTab === "repository" && (
        <div className="panel" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px" }}>
          {/* Repository Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setRepoFilter("ALL")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: repoFilter === "ALL" ? "var(--accent)" : "var(--surface-2)",
                  color: repoFilter === "ALL" ? "#fff" : "var(--text)",
                  border: "1px solid var(--line)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <FolderOpen size={13} />
                <span>All Documents ({repositoryDocuments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRepoFilter("STATEMENT")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: repoFilter === "STATEMENT" ? "var(--accent)" : "var(--surface-2)",
                  color: repoFilter === "STATEMENT" ? "#fff" : "var(--text)",
                  border: "1px solid var(--line)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Database size={13} />
                <span>Bank Statements ({repositoryDocuments.filter((d: any) => {
                  const name = (d.originalFileName || d.storedFilePath || d.id || "").toLowerCase();
                  const type = (d.mimeType || docType(d) || "").toLowerCase();
                  const hasTxns = (d.txCount ?? d.tx_count ?? 0) > 0;
                  return (d.isBankSession && hasTxns) || name.includes("statement") || name.includes("passbook") || type.includes("statement");
                }).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRepoFilter("INVOICE")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: repoFilter === "INVOICE" ? "var(--accent)" : "var(--surface-2)",
                  color: repoFilter === "INVOICE" ? "#fff" : "var(--text)",
                  border: "1px solid var(--line)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Receipt size={13} />
                <span>Invoices & Bills ({repositoryDocuments.filter((d: any) => {
                  const name = (d.originalFileName || d.storedFilePath || d.id || "").toLowerCase();
                  const type = (d.mimeType || docType(d) || "").toLowerCase();
                  const hasTxns = (d.txCount ?? d.tx_count ?? 0) > 0;
                  const isStatement = (d.isBankSession && hasTxns) || name.includes("statement") || name.includes("passbook") || type.includes("statement");
                  const isReceipt = name.includes("receipt");
                  return !isStatement && !isReceipt;
                }).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRepoFilter("RECEIPT")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: repoFilter === "RECEIPT" ? "var(--accent)" : "var(--surface-2)",
                  color: repoFilter === "RECEIPT" ? "#fff" : "var(--text)",
                  border: "1px solid var(--line)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <BookOpen size={13} />
                <span>Receipts ({repositoryDocuments.filter((d: any) => {
                  const name = (d.originalFileName || d.storedFilePath || d.id || "").toLowerCase();
                  return name.includes("receipt");
                }).length})</span>
              </button>
            </div>

            {/* View Mode Switcher & Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "2px", background: "var(--surface-2)", padding: "3px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setRepoViewMode("table")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: repoViewMode === "table" ? "var(--surface)" : "transparent",
                    color: repoViewMode === "table" ? "var(--accent)" : "var(--muted)",
                    border: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Table size={12} /> Table View
                </button>
                <button
                  type="button"
                  onClick={() => setRepoViewMode("history")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: repoViewMode === "history" ? "var(--surface)" : "transparent",
                    color: repoViewMode === "history" ? "var(--accent)" : "var(--muted)",
                    border: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <History size={12} /> Detailed Cards
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", minWidth: "220px" }}>
                <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <input
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Search repository..."
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12px", fontWeight: "600" }}
                />
              </div>
            </div>
          </div>
          {/* VIEW MODE 1: DYNAMIC DATA TABLE */}
          {repoViewMode === "table" && (
            <DynamicDataTable
              tableName="Multi-Doc Repository"
              initialColumns={[
                { key: "id", label: "Document ID", dataType: "text" },
                ...(repoFilter !== "INVOICE" ? [{ key: "bankLogo", label: "Source / Bank", dataType: "text" as const }] : []),
                { key: "originalFileName", label: "File Name", dataType: "text" },
                { key: "category", label: "Document Type", dataType: "text" },
                { key: "status", label: "Status", dataType: "status" },
                { key: "mimeType", label: "MIME Type", dataType: "text" },
              ]}
              onRowClick={(row) => {
                const doc = repositoryDocuments.find((d: any) => d.id === row.id || d.originalFileName === row.originalFileName) || row;
                void openDocumentInAudit(doc);
              }}
              initialData={repositoryDocuments
                .filter((doc: any) => {
                  const fname = (doc.originalFileName || doc.storedFilePath || doc.id || "").toLowerCase();
                  const type = (doc.mimeType || doc.docType || "").toLowerCase();
                  const hasTxns = (doc.txCount ?? doc.tx_count ?? 0) > 0;
                  const isStatement = (doc.isBankSession && hasTxns) || fname.includes("statement") || fname.includes("passbook") || type.includes("statement");
                  const isReceipt = fname.includes("receipt");

                  if (repoFilter === "STATEMENT" && !isStatement) return false;
                  if (repoFilter === "RECEIPT" && !isReceipt) return false;
                  if (repoFilter === "INVOICE" && (isStatement || isReceipt)) return false;

                  if (repoSearch.trim()) {
                    const query = repoSearch.toLowerCase();
                    return fname.includes(query) || (doc.id || "").toLowerCase().includes(query) || (doc.bankLabel || "").toLowerCase().includes(query);
                  }
                  return true;
                })
                .map((doc: any, idx: number) => {
                  const fname = (doc.originalFileName || doc.storedFilePath || `doc_${idx}`).toLowerCase();
                  const hasTxns = (doc.txCount ?? doc.tx_count ?? 0) > 0;
                  const isStatement = (doc.isBankSession && hasTxns) || fname.includes("statement") || fname.includes("passbook");
                  const isReceipt = fname.includes("receipt");
                  const category = isStatement ? "Bank Statement" : isReceipt ? "Receipt" : "Invoice / Bill";
                  const bankName = isStatement ? (doc.bankLabel || doc.bankName || "Bank Statement") : isReceipt ? "Receipt" : "Invoice";

                  return {
                    id: doc.id || doc.sessionId || `doc_${idx}`,
                    ...(repoFilter !== "INVOICE" ? { bankLogo: bankName } : {}),
                    accountNumber: isStatement ? (doc.accountNumber || doc.account_number || "") : "",
                    originalFileName: doc.originalFileName || doc.storedFilePath || `Document_${idx + 1}.pdf`,
                    category,
                    status: doc.status || "EXTRACTED",
                    mimeType: doc.mimeType || "application/pdf",
                  };
                })}
            />
          )}

          {/* VIEW MODE 2: DETAILED BANK STATEMENT & DOCUMENT HISTORY CARDS */}
          {repoViewMode === "history" && (
            <div style={{ marginTop: "4px" }}>
              <BankStatementHistoryView activeCompanyId={activeCompanyId} />
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: DEDICATED ACTIVE STATEMENT AUDIT & INSPECTION VIEW (Moved to separate tab) */}
      {activeSubTab === "statement_audit" && statementMeta && (
        <div
          className="panel"
          style={{
            padding: "20px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          {/* Top Bar: Bank Brand, Account Number, IFSC, Total Pages, Reconciled Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <BankLogo bankName={statementMeta.bankName || statementMeta.bankLabel} ifsc={statementMeta.ifscCode} showBadge size={24} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                    {statementMeta.bankLabel || statementMeta.bankName} Statement
                  </h3>
                  {statementMeta.isBalanceReconciled ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: "11px", fontWeight: "800" }}>
                      <CheckCircle size={12} /> 100% Balanced & Verified
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontSize: "11px", fontWeight: "800" }}>
                      <AlertTriangle size={12} /> Balance Continuity Warning
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--muted)", marginTop: "4px", flexWrap: "wrap" }}>
                  {statementMeta.accountHolderName && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={13} style={{ color: "var(--accent)" }} /> Name: <strong>{statementMeta.accountHolderName}</strong>
                    </span>
                  )}
                  {statementMeta.accountNumber && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <CreditCard size={13} /> A/C: <strong>{statementMeta.accountNumber}</strong>
                    </span>
                  )}
                  {statementMeta.customerId && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Hash size={13} /> Cust ID: <strong>{statementMeta.customerId}</strong>
                    </span>
                  )}
                  {statementMeta.ifscCode && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Building size={13} /> IFSC: <strong>{statementMeta.ifscCode}</strong>
                    </span>
                  )}
                  {statementMeta.branchName && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Building size={13} /> Branch: <strong>{statementMeta.branchName}</strong>
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Layers size={13} /> Pages: <strong>{statementMeta.pageCount} Pages Parsed</strong>
                  </span>
                  {statementMeta.period?.fromDate && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={13} /> Period: <strong>{statementMeta.period.fromDate} to {statementMeta.period.toDate}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions: View Parsed Statement Table, View Original PDF Proofreader, Flag Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {/* Button to view original imported PDF/CSV/JSON side-by-side */}
              <button
                type="button"
                onClick={() => setIsProofreadModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  border: "1px solid var(--line)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
                title="View Original Imported PDF, JSON, CSV side-by-side with Parsed Data"
              >
                <Columns size={13} style={{ color: "var(--accent)" }} />
                <span>View Original & Proofread Side-by-Side</span>
              </button>

              {/* Button to open interactive review grid */}
              {parsedBankTxs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    background: "var(--accent)",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
                  }}
                  title="Open Interactive Tally Ledger Mapping & Review Grid"
                >
                  <Sparkles size={13} />
                  <span>Interactive Review Grid ({parsedBankTxs.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: showFlaggedOnly ? "rgba(234, 179, 8, 0.15)" : "var(--surface-2)",
                  color: showFlaggedOnly ? "#ca8a04" : "var(--text)",
                  border: showFlaggedOnly ? "1px solid #eab308" : "1px solid var(--line)",
                }}
              >
                <Star size={13} fill={showFlaggedOnly ? "#ca8a04" : "none"} />
                {showFlaggedOnly ? "Showing Flagged Only" : "Filter Flagged Rows"}
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: "rgba(59, 130, 246, 0.1)",
                  color: "#3b82f6",
                  border: "1px solid #3b82f6",
                }}
                title="Print Bank Statement Audit or Export to PDF"
              >
                <Printer size={13} />
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Key Financial Balances Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Opening Balance</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--text)", marginTop: "4px" }}>
                ₹{Number(statementMeta.openingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: "700", textTransform: "uppercase" }}>Total Withdrawals (Debit)</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#ef4444", marginTop: "4px" }}>
                ₹{Number(statementMeta.totalDebits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", textTransform: "uppercase" }}>Total Deposits (Credit)</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "#10b981", marginTop: "4px" }}>
                ₹{Number(statementMeta.totalCredits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: "700", textTransform: "uppercase" }}>Calculated Closing</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--accent)", marginTop: "4px" }}>
                ₹{Number(statementMeta.calculatedClosingBalance || statementMeta.closingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Statement Closing</div>
              <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--text)", marginTop: "4px" }}>
                ₹{Number(statementMeta.closingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* AUTOMATIC MONTHLY BREAKDOWN & CONTINUITY AUDIT */}
          {statementMeta.monthlyBreakdown && statementMeta.monthlyBreakdown.length > 0 && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={13} style={{ color: "var(--accent)" }} /> Monthly Continuity & Balance Breakdown:
                </span>
                {selectedMonthFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter("ALL")}
                    style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                  >
                    Reset Month Filter
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter("ALL")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: selectedMonthFilter === "ALL" ? "var(--accent)" : "var(--surface-2)",
                    color: selectedMonthFilter === "ALL" ? "#FFFFFF" : "var(--text)",
                    border: "1px solid var(--line)",
                    whiteSpace: "nowrap",
                  }}
                >
                  All Months ({parsedBankTxs.length} Txs)
                </button>

                {statementMeta.monthlyBreakdown.map((m: any) => {
                  const isSelected = selectedMonthFilter === m.month;
                  return (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => setSelectedMonthFilter(isSelected ? "ALL" : m.month)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: isSelected ? "var(--accent)" : "var(--surface-2)",
                        color: isSelected ? "#FFFFFF" : "var(--text)",
                        border: isSelected ? "1px solid var(--accent)" : m.isBalanced ? "1px solid var(--line)" : "1px solid #ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{m.monthLabel}</span>
                      <span style={{ opacity: 0.7, fontSize: "10.5px" }}>({m.txCount} txs)</span>
                      {m.isBalanced ? (
                        <CheckCircle size={11} style={{ color: isSelected ? "#FFFFFF" : "#10b981" }} />
                      ) : (
                        <AlertTriangle size={11} style={{ color: isSelected ? "#FFFFFF" : "#ef4444" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PER-PAGE BALANCE BREAKDOWN */}
          {statementMeta.pageBreakdown && statementMeta.pageBreakdown.length > 1 && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                <Layers size={13} /> Per-Page Balance Audit:
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setSelectedPageFilter("ALL")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: selectedPageFilter === "ALL" ? "var(--surface)" : "var(--surface-2)",
                    color: selectedPageFilter === "ALL" ? "var(--accent)" : "var(--muted)",
                    border: "1px solid var(--line)",
                  }}
                >
                  All Pages
                </button>
                {statementMeta.pageBreakdown.filter((p: any) => p.txCount > 0).map((p: any) => {
                  const isPageSelected = selectedPageFilter === String(p.pageNumber);
                  return (
                    <button
                      key={p.pageNumber}
                      type="button"
                      onClick={() => setSelectedPageFilter(isPageSelected ? "ALL" : String(p.pageNumber))}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: isPageSelected ? "var(--surface)" : "var(--surface-2)",
                        color: isPageSelected ? "var(--accent)" : "var(--text)",
                        border: p.isBalanced ? "1px solid var(--line)" : "1px solid #ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>Page {p.pageNumber} ({p.txCount})</span>
                      {p.isBalanced ? (
                        <CheckCircle size={10} style={{ color: "#10b981" }} />
                      ) : (
                        <AlertTriangle size={10} style={{ color: "#ef4444" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC TABLE RENDERER SECTION: Shown only in Active Statement Audit tab (hidden in Upload Files and Paste Raw Code tabs) */}
      {activeSubTab === "statement_audit" && (parsedDocuments.length > 0 || parsedBankTxs.length > 0) && (
        <div className="panel" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} style={{ color: "var(--accent)" }} />
              <h3 style={{ fontSize: "15px", fontWeight: "800", color: "var(--text)", margin: 0 }}>Parsed Live Data Inspector</h3>
            </div>

            {/* Toggle Dataset Views */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setIsProofreadModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  border: "1px solid var(--line)",
                }}
              >
                <Columns size={13} style={{ color: "var(--accent)" }} />
                <span>Side-by-Side Proofreader</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTableMode("documents")}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", background: activeTableMode === "documents" ? "var(--accent-subtle)" : "var(--surface-2)", color: activeTableMode === "documents" ? "var(--accent)" : "var(--text)", border: "none" }}
              >
                Documents & Masters Register ({parsedDocuments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTableMode("bankTxs")}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer", background: activeTableMode === "bankTxs" ? "var(--accent-subtle)" : "var(--surface-2)", color: activeTableMode === "bankTxs" ? "var(--accent)" : "var(--text)", border: "none" }}
              >
                Bank Transactions ({parsedBankTxs.length})
              </button>

              {parsedBankTxs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "800",
                    background: "var(--accent)",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
                  }}
                >
                  <Sparkles size={13} />
                  <span>Interactive Review Grid ({parsedBankTxs.length})</span>
                </button>
              )}
            </div>
          </div>

          {activeTableMode === "documents" ? (
            <DynamicDataTable
              tableName="Parsed Documents & Masters Register"
              initialColumns={documentColumns}
              initialData={parsedDocuments}
            />
          ) : (
            <DynamicDataTable
              tableName="Parsed Bank Feed Register"
              initialColumns={bankTxColumns}
              initialData={parsedBankTxs.filter((tx) => {
                if (showFlaggedOnly && !tx.reviewFlag) return false;
                if (selectedPageFilter !== "ALL" && String(tx.pageNumber) !== selectedPageFilter) return false;
                if (selectedMonthFilter !== "ALL") {
                  const txMonth = tx.transactionDate ? tx.transactionDate.slice(0, 7) : "";
                  if (txMonth !== selectedMonthFilter) return false;
                }
                return true;
              })}
              onDataChange={(updated) => {
                setParsedBankTxs(prev => prev.map(p => {
                  const match = updated.find(u => (u.id || u._id) === p.id);
                  return match ? { ...p, ...match } : p;
                }));
              }}
            />
          )}

        </div>
      )}

  

      {/* SIDE-BY-SIDE PROOFREADING & INSPECTION MODAL */}
      {isProofreadModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isProofreadFullscreen ? "0" : "20px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: isProofreadFullscreen ? "none" : "1px solid var(--line)",
              borderRadius: isProofreadFullscreen ? "0" : "16px",
              width: isProofreadFullscreen ? "100vw" : "96vw",
              height: isProofreadFullscreen ? "100vh" : "94vh",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "8px", borderRadius: "8px", background: "var(--accent-subtle)", color: "var(--accent)" }}>
                  <Columns size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                      Proofreading & Side-by-Side Audit
                    </h3>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(13, 148, 136, 0.15)", color: "var(--accent)", fontWeight: "700" }}>
                      {uploadedFile ? uploadedFile.name : (pastedCode ? `Pasted ${selectedFileType.toUpperCase()}` : "Document Proofreader")}
                    </span>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                    Compare original source document (PDF / CSV / JSON / Image) against parsed accounting entries for audit-grade verification.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsProofreadFullscreen(!isProofreadFullscreen)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--text)",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                  title={isProofreadFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isProofreadFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isProofreadFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProofreadModalOpen(false)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    color: "var(--muted)",
                    padding: "6px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Close Proofreader"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Split Body: Left Pane = Original File; Right Pane = Parsed Data */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* LEFT PANE: Original Document / File Viewer */}
              <div
                style={{
                  flex: "1 1 50%",
                  borderRight: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {/* Left Pane Header */}
                {/* <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {originalFileType === "pdf" ? (
                      <FileText size={15} style={{ color: "#ef4444" }} />
                    ) : originalFileType === "csv" ? (
                      <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
                    ) : (
                      <FileCode2 size={15} style={{ color: "var(--accent)" }} />
                    )}
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text)" }}>
                      Original Source File ({originalFileType.toUpperCase()})
                    </span>
                  </div>

                
                </div> */}

                {/* Left Pane Content */}
                <div style={{ flex: 1, overflow: "auto", position: "relative", background: "var(--surface-2)" }}>
                  {originalFileUrl ? (
                    originalFileType === "pdf" ? (
                      <PdfCanvasViewer url={originalFileUrl} file={uploadedFile} password={unlockedPdfPassword} />
                    ) : originalFileType === "image" ? (
                      <div style={{ padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100%" }}>
                        <img
                          src={originalFileUrl}
                          alt="Original Imported Invoice"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}
                        />
                      </div>
                    ) : (
                      <pre
                        style={{
                          margin: 0,
                          padding: "16px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: "var(--text)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          lineHeight: 1.5,
                        }}
                      >
                        {originalFileText || pastedCode || "No raw text representation available."}
                      </pre>
                    )
                  ) : pastedCode ? (
                    <pre
                      style={{
                        margin: 0,
                        padding: "16px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "var(--text)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        lineHeight: 1.5,
                      }}
                    >
                      {pastedCode}
                    </pre>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "10px", color: "var(--muted)" }}>
                      <FileUp size={32} />
                      <div style={{ fontSize: "13px", fontWeight: "600" }}>No original document uploaded yet.</div>
                      <div style={{ fontSize: "11.5px" }}>Upload a statement PDF or CSV in the Upload tab to preview it here.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANE: Parsed Financial Data & Entries Table */}
              <div
                style={{
                  flex: "1 1 50%",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {/* Right Pane Header */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Activity size={15} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text)" }}>
                      Parsed Accounting Data ({parsedBankTxs.length > 0 ? `${parsedBankTxs.length} Transactions` : `${parsedDocuments.length} Documents`})
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {parsedBankTxs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTableMode("bankTxs")}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                          background: activeTableMode === "bankTxs" ? "var(--accent-subtle)" : "var(--surface-2)",
                          color: activeTableMode === "bankTxs" ? "var(--accent)" : "var(--muted)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        Bank Txs ({parsedBankTxs.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTableMode("documents");
                        setProofreadDocSubTab("items");
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: activeTableMode === "documents" && proofreadDocSubTab === "items" ? "var(--accent-subtle)" : "var(--surface-2)",
                        color: activeTableMode === "documents" && proofreadDocSubTab === "items" ? "var(--accent)" : "var(--muted)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      Items ({parsedDocuments[0]?.items?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTableMode("documents");
                        setProofreadDocSubTab("voucher");
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: activeTableMode === "documents" && proofreadDocSubTab === "voucher" ? "rgba(16, 185, 129, 0.15)" : "var(--surface-2)",
                        color: activeTableMode === "documents" && proofreadDocSubTab === "voucher" ? "#10b981" : "var(--muted)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {parsedDocuments[0]?.entryType || "Voucher"} Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTableMode("documents");
                        setProofreadDocSubTab("summary");
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        background: activeTableMode === "documents" && proofreadDocSubTab === "summary" ? "var(--accent-subtle)" : "var(--surface-2)",
                        color: activeTableMode === "documents" && proofreadDocSubTab === "summary" ? "var(--accent)" : "var(--muted)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      Summary
                    </button>
                  </div>
                </div>

                {/* Right Pane Content: Live Table */}
                <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>
                  {activeTableMode === "bankTxs" && parsedBankTxs.length > 0 ? (
                    <DynamicDataTable
                      tableName="Proofreader Bank Transactions"
                      initialColumns={bankTxColumns}
                      initialData={parsedBankTxs.filter((tx) => {
                        if (showFlaggedOnly && !tx.reviewFlag) return false;
                        if (selectedPageFilter !== "ALL" && String(tx.pageNumber) !== selectedPageFilter) return false;
                        if (selectedMonthFilter !== "ALL") {
                          const txMonth = tx.transactionDate ? tx.transactionDate.slice(0, 7) : "";
                          if (txMonth !== selectedMonthFilter) return false;
                        }
                        return true;
                      })}
                      onDataChange={(updated) => {
                        setParsedBankTxs(prev => prev.map(p => {
                          const match = updated.find(u => (u.id || u._id) === p.id);
                          return match ? { ...p, ...match } : p;
                        }));
                      }}
                    />
                  ) : parsedDocuments.length > 0 ? (
                    <div>
                      {/* Top Header Card */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--line)",
                          marginBottom: "14px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "800",
                                background: parsedDocuments[0]?.entryType === "Sales" ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                                color: parsedDocuments[0]?.entryType === "Sales" ? "#10b981" : "#3b82f6",
                                textTransform: "uppercase",
                              }}
                            >
                              {parsedDocuments[0]?.entryType || "Purchase"} Voucher
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text)" }}>
                              {parsedDocuments[0]?.vendorName}
                            </span>
                            {parsedDocuments[0]?.buyerName && (
                              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                ➔ {parsedDocuments[0]?.buyerName}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "4px" }}>
                            Invoice #{parsedDocuments[0]?.invoiceNumber || "—"} | Date: {parsedDocuments[0]?.date || "—"} | GSTIN: {parsedDocuments[0]?.gstin || "N/A"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "var(--accent)" }}>
                            ₹{Number(parsedDocuments[0]?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                            Taxable: ₹{Number(parsedDocuments[0]?.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} | Tax: ₹{Number(parsedDocuments[0]?.totalTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* SUB-VIEW 1: ITEM DETAILS (LINE ITEMS) */}
                      {proofreadDocSubTab === "items" && (
                        <div>
                          {parsedDocuments[0]?.items && parsedDocuments[0].items.length > 0 ? (
                            <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                <thead>
                                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                                    <th style={{ padding: "8px 12px", width: "40px", color: "var(--muted)", fontWeight: "700" }}>#</th>
                                    <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700" }}>Item Description</th>
                                    <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700" }}>HSN/SAC</th>
                                    <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700", textAlign: "right" }}>Qty</th>
                                    <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700", textAlign: "right" }}>Rate (₹)</th>
                                    <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700", textAlign: "right" }}>Amount (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parsedDocuments[0].items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{item.slNo || idx + 1}</td>
                                      <td style={{ padding: "10px 12px", fontWeight: "700", color: "var(--text)" }}>{item.description}</td>
                                      <td style={{ padding: "10px 12px", color: "var(--muted)", fontFamily: "monospace" }}>{item.hsnSac || "—"}</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)" }}>{item.quantity || "1"}</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>
                                        {item.unitRate !== undefined ? `₹${Number(item.unitRate).toFixed(2)}` : "—"}
                                      </td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--text)" }}>
                                        ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr style={{ background: "var(--surface-2)", fontWeight: "800" }}>
                                    <td colSpan={5} style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)" }}>
                                      Total Invoice Amount:
                                    </td>
                                    <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--accent)", fontSize: "13px" }}>
                                      ₹{Number(parsedDocuments[0].grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: "8px" }}>
                              No itemized lines detected. Switch to Summary or Voucher Entry.
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-VIEW 2: SALES / PURCHASE VOUCHER LEDGER ENTRY */}
                      {proofreadDocSubTab === "voucher" && (
                        <div>
                          <div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ padding: "10px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: "800", fontSize: "12.5px", color: "var(--text)" }}>
                                Double-Entry Ledger Allocation ({parsedDocuments[0]?.entryType || "Purchase"})
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Mode: As Accounting Voucher
                              </span>
                            </div>

                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                              <thead>
                                <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                                  <th style={{ padding: "8px 12px", width: "50px", color: "var(--muted)", fontWeight: "700" }}>Dr/Cr</th>
                                  <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700" }}>Ledger Name</th>
                                  <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700" }}>Ledger Type</th>
                                  <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700", textAlign: "right" }}>Debit (₹)</th>
                                  <th style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: "700", textAlign: "right" }}>Credit (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parsedDocuments[0]?.entryType === "Sales" ? (
                                  <>
                                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                      <td style={{ padding: "10px 12px", fontWeight: "800", color: "#3b82f6" }}>Dr.</td>
                                      <td style={{ padding: "10px 12px", fontWeight: "700", color: "var(--text)" }}>
                                        {parsedDocuments[0].buyerName || "Sundry Debtor / Customer"}
                                      </td>
                                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Sundry Debtors</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--text)" }}>
                                        ₹{Number(parsedDocuments[0].grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                      <td style={{ padding: "10px 12px", fontWeight: "800", color: "#10b981" }}>Cr.</td>
                                      <td style={{ padding: "10px 12px", fontWeight: "700", color: "var(--text)" }}>
                                        Sales Account (GST Domestic)
                                      </td>
                                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Sales Accounts</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--text)" }}>
                                        ₹{Number(parsedDocuments[0].subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                    {Number(parsedDocuments[0].cgst || 0) > 0 && (
                                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                        <td style={{ padding: "10px 12px", fontWeight: "800", color: "#10b981" }}>Cr.</td>
                                        <td style={{ padding: "10px 12px", color: "var(--text)" }}>Output CGST</td>
                                        <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Duties & Taxes</td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>
                                          ₹{Number(parsedDocuments[0].cgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    )}
                                    {Number(parsedDocuments[0].sgst || 0) > 0 && (
                                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                        <td style={{ padding: "10px 12px", fontWeight: "800", color: "#10b981" }}>Cr.</td>
                                        <td style={{ padding: "10px 12px", color: "var(--text)" }}>Output SGST</td>
                                        <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Duties & Taxes</td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>
                                          ₹{Number(parsedDocuments[0].sgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                      <td style={{ padding: "10px 12px", fontWeight: "800", color: "#3b82f6" }}>Dr.</td>
                                      <td style={{ padding: "10px 12px", fontWeight: "700", color: "var(--text)" }}>
                                        Purchase Account (GST Domestic)
                                      </td>
                                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Purchase Accounts</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--text)" }}>
                                        ₹{Number(parsedDocuments[0].subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                    </tr>
                                    {Number(parsedDocuments[0].cgst || 0) > 0 && (
                                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                        <td style={{ padding: "10px 12px", fontWeight: "800", color: "#3b82f6" }}>Dr.</td>
                                        <td style={{ padding: "10px 12px", color: "var(--text)" }}>Input CGST</td>
                                        <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Duties & Taxes</td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>
                                          ₹{Number(parsedDocuments[0].cgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                      </tr>
                                    )}
                                    {Number(parsedDocuments[0].sgst || 0) > 0 && (
                                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                        <td style={{ padding: "10px 12px", fontWeight: "800", color: "#3b82f6" }}>Dr.</td>
                                        <td style={{ padding: "10px 12px", color: "var(--text)" }}>Input SGST</td>
                                        <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Duties & Taxes</td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "var(--text)" }}>
                                          ₹{Number(parsedDocuments[0].sgst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                      </tr>
                                    )}
                                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                                      <td style={{ padding: "10px 12px", fontWeight: "800", color: "#10b981" }}>Cr.</td>
                                      <td style={{ padding: "10px 12px", fontWeight: "700", color: "var(--text)" }}>
                                        {parsedDocuments[0].vendorName || "Sundry Creditor / Supplier"}
                                      </td>
                                      <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Sundry Creditors</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>—</td>
                                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--text)" }}>
                                        ₹{Number(parsedDocuments[0].grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: "var(--surface-2)", fontWeight: "800" }}>
                                  <td colSpan={3} style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)" }}>
                                    Total Balanced Allocation:
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--accent)" }}>
                                    ₹{Number(parsedDocuments[0].grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--accent)" }}>
                                    ₹{Number(parsedDocuments[0].grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SUB-VIEW 3: SUMMARY TABLE */}
                      {proofreadDocSubTab === "summary" && (
                        <DynamicDataTable
                          tableName="Proofreader Parsed Documents"
                          initialColumns={documentColumns}
                          initialData={parsedDocuments}
                        />
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "10px", color: "var(--muted)" }}>
                      <Table size={32} />
                      <div style={{ fontSize: "13px", fontWeight: "600" }}>No parsed dataset available to proofread.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Statement Interactive Review Modal */}
      <BankStatementReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          // Refresh mirror ledgers when review modal closes
          if (window.desktop?.accountingMirror?.listLedgers) {
            window.desktop.accountingMirror.listLedgers().then(setMirrorLedgers).catch(() => { });
          }
        }}
        bankName={parsedBankTxs[0]?.bankName || statementMeta?.bankName || "Bank Statement"}
        accountNumber={statementMeta?.accountNumber || parsedBankTxs[0]?.accountNumber || ""}
        periodLabel={statementMeta?.period?.fromDate && statementMeta?.period?.toDate ? `${statementMeta.period.fromDate} to ${statementMeta.period.toDate}` : ""}
        initialTransactions={parsedBankTxs}
        initialClassifications={reviewClassifications}
        mirrorLedgers={mirrorLedgers}
        activeCompanyId={activeCompanyId || (mirrorCompanies && mirrorCompanies[0]?.id) || ""}
        activeCompanyName={mirrorCompanies?.find(c => c.id === activeCompanyId)?.displayName || mirrorCompanies?.find(c => c.id === activeCompanyId)?.name || mirrorCompanies?.[0]?.displayName || mirrorCompanies?.[0]?.name}
        statementMeta={statementMeta}
        originalFileUrl={originalFileUrl}
        uploadedFile={uploadedFile}
        originalFileType={originalFileType}
        unlockedPdfPassword={unlockedPdfPassword}
        onCommitVouchers={async (verifiedRows) => {
          if (window.desktop?.accountingMirror?.saveVoucher) {
            for (const r of verifiedRows) {
              const amount = r.debit > 0 ? r.debit : r.credit;
              await window.desktop.accountingMirror.saveVoucher({
                companyId: activeCompanyId || "default_company",
                voucherDate: r.date || new Date().toISOString().substring(0, 10),
                voucherTypeName: r.voucherType || (r.debit > 0 ? "Payment" : "Receipt"),
                voucherNumber: r.referenceNo || `TX-${r.transactionId?.slice(0, 8) || Date.now().toString().slice(-6)}`,
                narration: r.cleanNarration || r.originalNarration || "Imported from Bank Statement",
                amount,
                partyName: r.primaryLedgerName || (r.splits && r.splits[0]?.ledgerName) || "Bank Customer/Vendor",
              }).catch(() => null);
            }
          }
          if (window.desktop?.accountingMirror?.listLedgers) {
            window.desktop.accountingMirror.listLedgers().then(setMirrorLedgers).catch(() => { });
          }
          onImportComplete?.();
        }}

      />

      {/* Password-Protected Statement Unlock Modal */}
      {passwordModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease"
            }}
          >
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "8px", background: "var(--accent-subtle)", color: "var(--accent)" }}>
                  <Lock size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text)" }}>Password-Protected PDF</h3>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{pendingFile?.name}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setPasswordModalOpen(false); setPendingFile(null); }}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.5 }}>
                This bank statement is encrypted with a password. Enter the password (typically your Customer ID, Date of Birth <code style={{ color: "var(--accent)" }}>DDMMYYYY</code>, or PAN) to decrypt and extract transactions.
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                  Statement Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  placeholder="Enter PDF password..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    border: passwordError ? "1px solid var(--danger)" : "1px solid var(--line)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
                {passwordError && (
                  <div style={{ color: "var(--danger)", fontSize: "11.5px", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={13} /> {passwordError}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setPasswordModalOpen(false); setPendingFile(null); }}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid var(--line)",
                    color: "var(--muted)",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !pdfPassword.trim()}
                  className="primary"
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: isLoading || !pdfPassword.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isLoading && <RefreshCw size={13} className="spin" />}
                  <span>{isLoading ? "Unlocking..." : "Unlock & Import"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Ledger & Voucher Creation Prompt Modal */}
      <ImportActionPromptModal
        isOpen={isImportPromptOpen}
        onClose={() => setIsImportPromptOpen(false)}
        onContinueReview={() => setIsImportPromptOpen(false)}
        activeCompanyId={activeCompanyId}
        activeCompanyName={mirrorCompanies?.find((c) => c.id === activeCompanyId)?.displayName || mirrorCompanies?.find((c) => c.id === activeCompanyId)?.name}
        parsedDocuments={parsedDocuments}
        parsedBankTxs={parsedBankTxs}
        onLedgersCreated={() => {
          if (window.desktop?.accountingMirror?.listLedgers) {
            window.desktop.accountingMirror.listLedgers().then((ledgers) => {
              setMirrorLedgers(ledgers as any[]);
            }).catch(() => {});
          }
        }}
        onVouchersCreated={() => {
          onImportComplete?.();
        }}
      />

      {/* Universal Bank Statement Print Service Modal */}
      <PrintSettingsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultFileName="Bank_Statement_Audit"
        documentTitle={`Bank_Statement_${(statementMeta?.bankName || "Audit").replace(/\s+/g, "_")}`}
        reportData={(parsedBankTxs && parsedBankTxs.length > 0 ? parsedBankTxs : parsedDocuments).map((tx: any) => ({
          Date: tx.date || tx.transactionDate || "N/A",
          Description: tx.description || tx.narration || tx.particulars || "N/A",
          Reference: tx.referenceNo || tx.utrNumber || tx.chqNumber || "N/A",
          WithdrawalDebit: tx.debit || 0,
          DepositCredit: tx.credit || 0,
          Balance: tx.balance || 0
        }))}
      />
    </div>
  );
}