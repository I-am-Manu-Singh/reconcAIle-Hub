import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Split,
  Layers,
  Save,
  Send,
  Download,
  Building2,
  Landmark,
  ShieldCheck,
  Check,
  RotateCcw,
  FileCode,
  FileText,
  Play,
  Zap,
  Columns,
  Printer
} from "lucide-react";
import { BankLogo } from "../components/BankLogo";
import { SearchableLedgerSelect, LedgerOption } from "../components/SearchableLedgerSelect";
import { SplitTransactionRow } from "../components/SplitTransactionRow";
import { PdfCanvasViewer } from "../components/PdfCanvasViewer";
import { VerifiedVoucherRow, StatementSummaryStats, SplitAllocation } from "../types/bankReviewTypes";
import { exportToCsv } from "../utils/csvExporter";
import { triggerToast } from "../components/ToastNotification";
import { PrintSettingsModal } from "../components/PrintSettingsModal";

export interface BankStatementReviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly bankName?: string;
  readonly accountNumber?: string;
  readonly periodLabel?: string;
  readonly initialTransactions: readonly any[];
  readonly initialClassifications?: readonly any[];
  readonly mirrorLedgers: readonly LedgerOption[];
  readonly activeCompanyId: string;
  readonly activeCompanyName?: string;
  readonly onCommitVouchers: (verifiedTransactions: readonly VerifiedVoucherRow[]) => Promise<void>;
  readonly statementMeta?: any;
  readonly originalFileUrl?: string | null;
  readonly uploadedFile?: File | null;
  readonly originalFileType?: "pdf" | "csv" | "excel" | "json" | "image" | "text";
  readonly unlockedPdfPassword?: string;
}

export function BankStatementReviewModal({
  isOpen,
  onClose,
  bankName = "Bank Account",
  accountNumber = "",
  periodLabel = "",
  initialTransactions,
  initialClassifications = [],
  mirrorLedgers,
  activeCompanyId,
  activeCompanyName,
  onCommitVouchers,
  statementMeta,
  originalFileUrl,
  uploadedFile,
  originalFileType = "pdf",
  unlockedPdfPassword,
}: BankStatementReviewModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  // Local ledgers state to support real-time on-the-fly created ledgers
  const [localLedgers, setLocalLedgers] = useState<readonly LedgerOption[]>(mirrorLedgers);

  useEffect(() => {
    setLocalLedgers(mirrorLedgers);
  }, [mirrorLedgers]);

  // Build classified row map
  const classificationMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of initialClassifications) {
      if (c?.transactionId) map.set(c.transactionId, c);
    }
    return map;
  }, [initialClassifications]);

  // Initialize editable rows
  const [rows, setRows] = useState<VerifiedVoucherRow[]>(() => {
    return initialTransactions.map((tx, idx) => {
      const txId = tx.id || `tx_${idx}`;
      const classification = classificationMap.get(txId);
      const isReceipt = Number(tx.credit || 0) > 0;
      const amount = isReceipt ? Number(tx.credit || 0) : Number(tx.debit || 0);

      const suggestedLedger = classification?.suggestedLedgerName || "";
      const suggestedVoucher = classification?.suggestedVoucherType || (isReceipt ? "Receipt" : "Payment");
      const confidence = classification?.confidence || 0;
      const matchType = classification?.matchType || "UNMATCHED";
      const matchReason = classification?.reason || "";

      const autoApproved = confidence >= 0.85 || matchType === "RULE_MATCH" || matchType === "HISTORY_MATCH";

      return {
        transactionId: txId,
        date: tx.date || tx.transactionDate || new Date().toISOString().substring(0, 10),
        originalNarration: tx.narration || tx.description || "",
        cleanNarration: classification?.cleanNarration,
        referenceNo: tx.referenceNo || tx.utrNumber || "",
        debit: Number(tx.debit || 0),
        credit: Number(tx.credit || 0),
        balance: Number(tx.balance || tx.balanceAmount || 0),
        voucherType: suggestedVoucher,
        primaryLedgerName: suggestedLedger,
        primaryLedgerId: classification?.suggestedLedgerId,
        bankLedgerName: bankName,
        confidence,
        matchType,
        matchReason,
        isSplit: false,
        splits: undefined,
        userModified: false,
        rememberRule: false,
        auditStatus: autoApproved ? "AUTO_APPROVED" : "NEEDS_REVIEW",
      };
    });
  });

  // Table Controls
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AUTO_APPROVED" | "NEEDS_REVIEW" | "MANUALLY_VERIFIED" | "UNMAPPED">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PAYMENT" | "RECEIPT">("ALL");
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [bulkLedgerName, setBulkLedgerName] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDirectSyncing, setIsDirectSyncing] = useState(false);
  const [isExportingXml, setIsExportingXml] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [expandedSplitTxId, setExpandedSplitTxId] = useState<string | null>(null);
  const [isProofreadSplit, setIsProofreadSplit] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Compute live summary statistics
  const stats: StatementSummaryStats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let autoApprovedCount = 0;
    let needsReviewCount = 0;
    let unmappedCount = 0;

    for (const r of rows) {
      totalDebit += r.debit;
      totalCredit += r.credit;
      if (!r.primaryLedgerName.trim() && !r.isSplit) {
        unmappedCount++;
      } else if (r.auditStatus === "AUTO_APPROVED" || r.auditStatus === "MANUALLY_VERIFIED") {
        autoApprovedCount++;
      } else {
        needsReviewCount++;
      }
    }

    const netFlow = totalCredit - totalDebit;
    
    // Determine opening balance and statement closing balance reliably
    let openingBalance = 0;
    let statementClosingBalance = 0;

    if (statementMeta && (statementMeta.openingBalance !== undefined || statementMeta.closingBalance !== undefined)) {
      openingBalance = Number(statementMeta.openingBalance ?? 0);
      statementClosingBalance = Number(statementMeta.closingBalance ?? (openingBalance + netFlow));
    } else if (initialTransactions.length > 0) {
      // Auto-detect chronological direction
      const firstDate = initialTransactions[0]?.date || initialTransactions[0]?.transactionDate || "";
      const lastDate = initialTransactions[initialTransactions.length - 1]?.date || initialTransactions[initialTransactions.length - 1]?.transactionDate || "";
      const isDescending = Boolean(firstDate && lastDate && firstDate > lastDate);

      if (isDescending) {
        // First transaction in list is newest (closing balance), last is oldest (pre-opening balance)
        const oldestTx = initialTransactions[initialTransactions.length - 1];
        openingBalance = Number(oldestTx?.balance || oldestTx?.balanceAmount || 0) + (Number(oldestTx?.debit || 0) - Number(oldestTx?.credit || 0));
        statementClosingBalance = Number(initialTransactions[0]?.balance || initialTransactions[0]?.balanceAmount || 0);
      } else {
        // Ascending
        const firstTx = initialTransactions[0];
        openingBalance = Number(firstTx?.balance || firstTx?.balanceAmount || 0) + (Number(firstTx?.debit || 0) - Number(firstTx?.credit || 0));
        const lastTx = initialTransactions[initialTransactions.length - 1];
        statementClosingBalance = Number(lastTx?.balance || lastTx?.balanceAmount || 0);
      }
    }

    const calculatedClosingBalance = Math.round((openingBalance + netFlow) * 100) / 100;
    const variance = Math.abs(calculatedClosingBalance - statementClosingBalance);
    const isReconciled = variance < 0.05;

    return {
      totalRows: rows.length,
      totalDebit,
      totalCredit,
      netFlow,
      openingBalance,
      calculatedClosingBalance,
      statementClosingBalance,
      isReconciled,
      variance,
      autoApprovedCount,
      needsReviewCount,
      unmappedCount,
    };
  }, [rows, initialTransactions]);

  // Transform rows to Phase 4 StatementVoucherPayload structure
  const getPreparedVouchersPayload = () => {
    return rows
      .filter((r) => r.primaryLedgerName.trim() || (r.isSplit && r.splits && r.splits.length > 0))
      .map((r) => {
        const amount = r.debit > 0 ? r.debit : r.credit;
        return {
          transactionId: r.transactionId,
          date: r.date,
          voucherType: r.voucherType,
          partyLedgerName: r.primaryLedgerName || "General Expense",
          bankLedgerName: r.bankLedgerName || bankName,
          amount,
          narration: r.cleanNarration || r.originalNarration,
          referenceNo: r.referenceNo,
          isSplit: r.isSplit,
          splits: r.splits?.map((s) => ({
            ledgerName: s.ledgerName,
            amount: s.amount,
            narrationRemark: s.narrationRemark,
          })),
        };
      });
  };

  // 1. Direct Sync into local Tally (HTTP port 9000)
  const handleDirectTallySync = async () => {
    const targetCompany = activeCompanyName || "Acme Industrial Traders";
    const preparedVouchers = getPreparedVouchersPayload();

    if (preparedVouchers.length === 0) {
      triggerToast("No mapped vouchers available to push. Please assign Tally ledgers first.", "warning", "Validation");
      return;
    }

    if (stats.unmappedCount > 0) {
      const confirmSync = window.confirm(
        `${stats.unmappedCount} transactions are unmapped and will be skipped. Push remaining ${preparedVouchers.length} vouchers to Tally directly?`
      );
      if (!confirmSync) return;
    }

    setIsDirectSyncing(true);
    setSyncFeedback(null);

    try {
      if (window.desktop?.tally?.importStatementVouchers) {
        const res = await window.desktop.tally.importStatementVouchers(targetCompany, preparedVouchers);
        if (res.success || res.createdCount > 0) {
          setSyncFeedback({
            type: "success",
            message: `Successfully created ${res.createdCount} voucher(s) in Tally (${targetCompany})!`,
          });
          // Also persist approved vouchers to local database
          const validRows = rows.filter((r) => r.primaryLedgerName.trim() || (r.isSplit && r.splits && r.splits.length > 0));
          if (window.desktop?.accountingMirror?.markBankTransactionsReconciled) {
            await window.desktop.accountingMirror.markBankTransactionsReconciled(
              validRows.map((r) => ({
                transactionId: r.transactionId,
                companyId: activeCompanyId,
                voucherTypeName: r.voucherType,
                voucherDate: r.date,
                narration: r.cleanNarration || r.originalNarration,
              }))
            );
          }
          await onCommitVouchers(validRows);
          setTimeout(() => {
            onClose();
          }, 1800);
        } else {
          setSyncFeedback({
            type: "error",
            message: `Tally reported ${res.errorCount} error(s): ${res.lineErrors.join("; ") || "Please verify that Tally is open and ledgers exist."}`,
          });
        }
      } else {
        triggerToast("Direct Tally Sync is only available in Desktop Electron environment.", "info", "Environment");
      }
    } catch (err: any) {
      triggerToast(err?.message || "Failed to reach Tally on port 9000.", "error", "Tally Connection Error");
      setSyncFeedback({
        type: "error",
        message: `Tally Connection Error: ${err?.message || "Failed to reach Tally on port 9000."}`,
      });
    } finally {
      setIsDirectSyncing(false);
    }
  };

  // 2. Export Standalone Tally XML File for offline import
  const handleExportTallyXml = async () => {
    const targetCompany = activeCompanyName || "Acme Industrial Traders";
    const preparedVouchers = getPreparedVouchersPayload();

    if (preparedVouchers.length === 0) {
      triggerToast("No mapped vouchers available to export. Please assign Tally ledgers first.", "warning", "Validation");
      return;
    }

    setIsExportingXml(true);
    try {
      if (window.desktop?.tally?.exportStatementVouchersXml) {
        const res = await window.desktop.tally.exportStatementVouchersXml(
          targetCompany,
          preparedVouchers,
          `${bankName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Vouchers.xml`
        );
        if (!res.canceled && res.filePath) {
          triggerToast(`Tally XML successfully generated! Saved ${res.exportedCount} vouchers.`, "success", "XML Exported");
        }
      } else {
        // Fallback browser download
        const blob = new Blob([JSON.stringify(preparedVouchers, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bankName}_vouchers.json`;
        a.click();
        triggerToast("Vouchers exported as JSON", "success");
      }
    } catch (err: any) {
      triggerToast(`XML Export failed: ${err?.message || "Unable to save file."}`, "error", "Export Error");
    } finally {
      setIsExportingXml(false);
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        r.originalNarration.toLowerCase().includes(q) ||
        r.referenceNo.toLowerCase().includes(q) ||
        r.primaryLedgerName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (typeFilter === "PAYMENT" && r.voucherType !== "Payment") return false;
      if (typeFilter === "RECEIPT" && r.voucherType !== "Receipt") return false;

      if (statusFilter === "AUTO_APPROVED" && r.auditStatus !== "AUTO_APPROVED") return false;
      if (statusFilter === "MANUALLY_VERIFIED" && r.auditStatus !== "MANUALLY_VERIFIED") return false;
      if (statusFilter === "NEEDS_REVIEW" && r.auditStatus !== "NEEDS_REVIEW") return false;
      if (statusFilter === "UNMAPPED" && (r.primaryLedgerName.trim() || r.isSplit)) return false;

      return true;
    });
  }, [rows, searchTerm, statusFilter, typeFilter]);

  // Row update helpers
  const updateRow = (txId: string, updates: Partial<VerifiedVoucherRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.transactionId === txId) {
          const updated = { ...r, ...updates, userModified: true };
          if (updates.primaryLedgerName && updates.primaryLedgerName.trim()) {
            updated.auditStatus = "MANUALLY_VERIFIED";
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Selection toggles
  const toggleSelectRow = (txId: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTxIds.size === filteredRows.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredRows.map((r) => r.transactionId)));
    }
  };

  // Bulk Apply
  const handleBulkAssign = () => {
    if (!bulkLedgerName.trim() || selectedTxIds.size === 0) return;
    setRows((prev) =>
      prev.map((r) => {
        if (selectedTxIds.has(r.transactionId)) {
          return {
            ...r,
            primaryLedgerName: bulkLedgerName.trim(),
            auditStatus: "MANUALLY_VERIFIED",
            userModified: true,
          };
        }
        return r;
      })
    );
    setSelectedTxIds(new Set());
  };

  // Auto-Suggest Ledgers from Descriptions via AI / Rule engine
  const handleAiSuggestLedgers = async (targetTxId?: string) => {
    setIsAiSuggesting(true);
    try {
      const candidates = targetTxId
        ? rows.filter((r) => r.transactionId === targetTxId)
        : rows.filter((r) => !r.primaryLedgerName.trim() || selectedTxIds.has(r.transactionId));

      if (candidates.length === 0) {
        triggerToast("All transactions already have assigned ledgers.", "info", "Auto-Suggest");
        return;
      }

      if (window.desktop?.documents?.classifyTransactions) {
        const txPayload = candidates.map((r) => ({
          id: r.transactionId,
          date: r.date,
          narration: r.cleanNarration || r.originalNarration,
          referenceNo: r.referenceNo,
          debit: r.debit,
          credit: r.credit,
          balance: r.balance,
        }));

        const prefs = window.desktop?.preferences ? await window.desktop.preferences.getAll("ai").catch(() => ({})) : {};
        const aiOptions = {
          provider: prefs["ai.provider"] || "groq",
          apiKey: prefs["ai.apiKey"] || prefs["ai.groqApiKey"] || undefined,
          model: prefs["ai.model"] || undefined,
        };

        const result = await window.desktop.documents.classifyTransactions(
          activeCompanyId || "default_company",
          txPayload,
          aiOptions
        );

        if (result?.classifications && result.classifications.length > 0) {
          const classMap = new Map<string, any>();
          for (const c of result.classifications) {
            classMap.set(c.transactionId, c);
          }

          let updatedCount = 0;
          setRows((prev) =>
            prev.map((row) => {
              const matched = classMap.get(row.transactionId);
              if (matched && matched.suggestedLedgerName) {
                updatedCount++;
                return {
                  ...row,
                  primaryLedgerName: matched.suggestedLedgerName,
                  primaryLedgerId: matched.suggestedLedgerId || row.primaryLedgerId,
                  voucherType: matched.suggestedVoucherType || row.voucherType,
                  confidence: matched.confidence || 0.85,
                  matchType: matched.matchType || "AI_SUGGESTED",
                  matchReason: matched.matchReason || "Auto-suggested from narration",
                  auditStatus: (matched.confidence >= 0.85 || matched.matchType === "RULE_MATCH") ? "AUTO_APPROVED" : "NEEDS_REVIEW",
                  userModified: true,
                };
              }
              return row;
            })
          );
          triggerToast(`Auto-suggested ledgers for ${updatedCount} transaction(s)!`, "success", "AI Auto-Suggest");
        } else {
          // Fallback heuristic suggestion from description
          applyHeuristicLedgerSuggestions(candidates);
        }
      } else {
        applyHeuristicLedgerSuggestions(candidates);
      }
    } catch (err: any) {
      triggerToast(`AI Auto-Suggest Notice: ${err?.message || "Using narration heuristics"}`, "info", "Auto-Suggest");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const applyHeuristicLedgerSuggestions = (candidates: VerifiedVoucherRow[]) => {
    let matchedCount = 0;
    setRows((prev) =>
      prev.map((row) => {
        if (!candidates.some((c) => c.transactionId === row.transactionId)) return row;
        const text = (row.cleanNarration || row.originalNarration).toLowerCase();

        let suggested = "";
        let vType: any = row.voucherType;

        if (text.includes("salary") || text.includes("payroll")) {
          suggested = "Salaries & Wages";
          vType = "Payment";
        } else if (text.includes("rent") || text.includes("lease")) {
          suggested = "Office Rent";
          vType = "Payment";
        } else if (text.includes("elec") || text.includes("power") || text.includes("bescom") || text.includes("mseb")) {
          suggested = "Electricity Charges";
          vType = "Payment";
        } else if (text.includes("swiggy") || text.includes("zomato") || text.includes("restaurant") || text.includes("tea")) {
          suggested = "Staff Welfare & Refreshment";
          vType = "Payment";
        } else if (text.includes("fuel") || text.includes("petrol") || text.includes("hpcl") || text.includes("bpcl") || text.includes("ioc")) {
          suggested = "Fuel & Conveyance";
          vType = "Payment";
        } else if (text.includes("int.pd") || text.includes("interest paid") || text.includes("bank chg") || text.includes("sms chg")) {
          suggested = "Bank Charges & Interest";
          vType = "Payment";
        } else if (text.includes("int.rec") || text.includes("interest received")) {
          suggested = "Bank Interest Received";
          vType = "Receipt";
        } else if (row.credit > 0) {
          suggested = "Sales Account / Sundry Debtors";
          vType = "Receipt";
        } else {
          suggested = "General Expenses / Sundry Creditors";
          vType = "Payment";
        }

        if (suggested) {
          matchedCount++;
          return {
            ...row,
            primaryLedgerName: suggested,
            voucherType: vType,
            confidence: 0.75,
            matchType: "HEURISTIC_SUGGESTION",
            matchReason: "Rule-based description pattern match",
            auditStatus: "NEEDS_REVIEW",
            userModified: true,
          };
        }
        return row;
      })
    );
    triggerToast(`Suggested ledgers for ${matchedCount} transaction(s) from description!`, "success", "Pattern Matching");
  };

  // Commit and Push
  const handleCommit = async () => {
    if (stats.unmappedCount > 0) {
      const confirmProceed = window.confirm(
        `There are still ${stats.unmappedCount} unmapped transactions. Unmapped transactions will be omitted from the Tally batch. Proceed?`
      );
      if (!confirmProceed) return;
    }

    setIsCommitting(true);
    try {
      // Save rememberRule items to SQLite
      for (const r of rows) {
        if (r.rememberRule && r.primaryLedgerName.trim() && window.desktop?.documents?.saveLedgerRule) {
          await window.desktop.documents.saveLedgerRule(activeCompanyId, {
            narrationPattern: r.cleanNarration || r.originalNarration,
            matchedLedgerName: r.primaryLedgerName,
            matchedLedgerId: r.primaryLedgerId || null,
            voucherType: r.voucherType,
          }).catch(() => {});
        }
      }

      const validRows = rows.filter((r) => r.primaryLedgerName.trim() || (r.isSplit && r.splits && r.splits.length > 0));
      await onCommitVouchers(validRows);
      triggerToast(`Committed ${validRows.length} verified voucher(s) successfully!`, "success", "Vouchers Committed");
      onClose();
    } catch (err: any) {
      triggerToast(`Commit error: ${err?.message || "Failed to commit transactions"}`, "error", "Error");
    } finally {
      setIsCommitting(false);
    }
  };

  // Export current review grid
  const handleExport = () => {
    exportToCsv(`Verified_Statement_${bankName.replace(/\s+/g, "_")}`, rows, [
      { key: "date", label: "Date" },
      { key: "originalNarration", label: "Narration" },
      { key: "referenceNo", label: "Ref / UTR" },
      { key: "debit", label: "Debit (₹)" },
      { key: "credit", label: "Credit (₹)" },
      { key: "voucherType", label: "Voucher Type" },
      { key: "primaryLedgerName", label: "Tally Ledger" },
      { key: "auditStatus", label: "Verification Status" },
    ]);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="panel"
        style={{
          width: "95vw",
          maxWidth: "1400px",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          background: "var(--background)",
          border: "1px solid var(--line)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <BankLogo bankName={bankName} size={32} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", margin: 0 }}>
                  Bank Statement Verification & Ledger Review
                </h2>
                <span className="badge" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                  Phase 3 Grid
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                {bankName} {accountNumber ? `(${accountNumber})` : ""} {periodLabel ? `• ${periodLabel}` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {originalFileUrl && (
              <button
                type="button"
                onClick={() => setIsProofreadSplit((prev) => !prev)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: isProofreadSplit ? "var(--accent)" : "var(--surface-2)",
                  border: isProofreadSplit ? "1px solid var(--accent)" : "1px solid var(--line)",
                  color: isProofreadSplit ? "#FFFFFF" : "var(--text)",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <Columns size={14} /> {isProofreadSplit ? "Hide Source File" : "Proofread with Source File"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.12)",
                border: "1px solid #3b82f6",
                color: "#3b82f6",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
              title="Print verified statement or save to PDF"
            >
              <Printer size={14} /> Print Statement
            </button>

            <button
              type="button"
              onClick={handleExport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <Download size={14} /> Export CSV
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 1. FINANCIAL RECONCILIATION SUMMARY BANNER */}
        <div
          style={{
            padding: "12px 24px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Total Items</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", marginTop: "2px" }}>{stats.totalRows}</div>
          </div>

          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Opening Balance</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{stats.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Total Debits (Out)</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--danger)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{stats.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Total Credits (In)</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--success)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{stats.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Net Cash Flow</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: stats.netFlow >= 0 ? "var(--success)" : "var(--danger)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{stats.netFlow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Closing Balance</div>
              {stats.isReconciled ? (
                <span style={{ fontSize: "10px", fontWeight: "800", color: "var(--success)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <CheckCircle size={11} /> Matched
                </span>
              ) : (
                <span style={{ fontSize: "10px", fontWeight: "800", color: "var(--danger)", display: "flex", alignItems: "center", gap: "3px" }}>
                  <AlertTriangle size={11} /> Diff: ₹{stats.variance.toFixed(2)}
                </span>
              )}
            </div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: stats.isReconciled ? "var(--success)" : "var(--danger)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{stats.calculatedClosingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* 2. CONTROLS & BULK ACTION TOOLBAR */}
        <div
          style={{
            padding: "10px 24px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Left: Search & Filter Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 10px", borderRadius: "8px", height: "32px", width: "240px" }}>
              <Search size={14} style={{ color: "var(--muted)" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search narration or UTR..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "12px", color: "var(--text)" }}
              />
            </div>

            <div style={{ display: "flex", gap: "4px" }}>
              {(["ALL", "NEEDS_REVIEW", "UNMAPPED", "AUTO_APPROVED", "MANUALLY_VERIFIED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: statusFilter === st ? "var(--accent-subtle)" : "transparent",
                    color: statusFilter === st ? "var(--accent)" : "var(--muted)",
                    border: statusFilter === st ? "1px solid var(--accent)" : "1px solid transparent",
                  }}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Bulk Action controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {selectedTxIds.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", padding: "4px 8px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--accent)" }}>
                  {selectedTxIds.size} Selected
                </span>
                <div style={{ width: "180px" }}>
                  <SearchableLedgerSelect
                    value={bulkLedgerName}
                    onChange={(name) => setBulkLedgerName(name)}
                    onNewLedgerCreated={(newLedger) => {
                      setLocalLedgers((prev) => {
                        if (prev.some((l) => l.name.toLowerCase() === newLedger.name.toLowerCase())) return prev;
                        return [...prev, newLedger];
                      });
                      setBulkLedgerName(newLedger.name);
                    }}
                    ledgers={localLedgers}
                    companyId={activeCompanyId}
                    placeholder="Select ledger to apply..."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "var(--accent)",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* AI / LLM Auto-Suggest Ledgers Button */}
            <button
              type="button"
              onClick={() => handleAiSuggestLedgers()}
              disabled={isAiSuggesting}
              title="Automatically match & suggest ledgers using LLM / AI Rule engine from transaction descriptions"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                color: "var(--accent)",
                fontSize: "11.5px",
                fontWeight: "700",
                cursor: isAiSuggesting ? "wait" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Sparkles size={14} style={{ color: "#a855f7" }} />
              <span>{isAiSuggesting ? "AI Suggesting..." : selectedTxIds.size > 0 ? `AI Suggest (${selectedTxIds.size})` : "AI / LLM Suggest Ledgers"}</span>
            </button>
          </div>
        </div>

        {/* 3. INTERACTIVE DATA REVIEW GRID & SIDE-BY-SIDE PROOFREADER */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {isProofreadSplit && originalFileUrl && (
            <div
              style={{
                flex: "1 1 45%",
                borderRight: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                background: "var(--surface)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText size={14} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)" }}>
                    Original Document Preview ({originalFileType.toUpperCase()})
                  </span>
                </div>
                <a
                  href={originalFileUrl}
                  download={uploadedFile?.name || `source_document.${originalFileType}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  <Download size={11} /> Download
                </a>
              </div>
              <div style={{ flex: 1, overflow: "auto", background: "var(--surface-2)", position: "relative" }}>
                {originalFileType === "pdf" ? (
                  <PdfCanvasViewer url={originalFileUrl} file={uploadedFile} password={unlockedPdfPassword} />
                ) : originalFileType === "image" ? (
                  <div style={{ padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100%" }}>
                    <img
                      src={originalFileUrl}
                      alt="Original Statement"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: "20px", color: "var(--muted)", fontSize: "12px" }}>
                    File preview not available for this format.
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ flex: isProofreadSplit ? "1 1 55%" : "1 1 100%", overflowY: "auto", overflowX: "auto", padding: "0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--surface)", borderBottom: "2px solid var(--line)", zIndex: 10 }}>
                <tr>
                  <th style={{ padding: "10px 12px", width: "36px", textAlign: "center" }}>
                    <input
                    type="checkbox"
                    checked={selectedTxIds.size > 0 && selectedTxIds.size === filteredRows.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ padding: "10px 12px", width: "90px" }}>Date</th>
                <th style={{ padding: "10px 12px", minWidth: "260px" }}>Particulars / Narration</th>
                <th style={{ padding: "10px 12px", width: "110px", textAlign: "right" }}>Debit (Out)</th>
                <th style={{ padding: "10px 12px", width: "110px", textAlign: "right" }}>Credit (In)</th>
                <th style={{ padding: "10px 12px", width: "100px" }}>Voucher</th>
                <th style={{ padding: "10px 12px", minWidth: "220px" }}>Assigned Tally Ledger</th>
                <th style={{ padding: "10px 12px", width: "120px" }}>AI Match Badge</th>
                <th style={{ padding: "10px 12px", width: "60px", textAlign: "center" }}>Split</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>
                    No bank transactions match the active search or status filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const isSelected = selectedTxIds.has(r.transactionId);
                  const isSplitExpanded = expandedSplitTxId === r.transactionId;
                  const isUnmapped = !r.primaryLedgerName.trim() && !r.isSplit;

                  return (
                    <React.Fragment key={r.transactionId}>
                      <tr
                        style={{
                          borderBottom: isSplitExpanded ? "none" : "1px solid var(--line)",
                          background: isSelected
                            ? "var(--accent-subtle)"
                            : isUnmapped
                            ? "rgba(239, 68, 68, 0.04)"
                            : idx % 2 === 0
                            ? "transparent"
                            : "rgba(255, 255, 255, 0.015)",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.transactionId)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>

                        {/* Date */}
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontFamily: "monospace", color: "var(--text)" }}>
                          {r.date}
                        </td>

                        {/* Narration & Ref */}
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: "600", color: "var(--text)", lineHeight: "1.4" }}>
                            {r.originalNarration}
                          </div>
                          {r.referenceNo && (
                            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "monospace", marginTop: "2px" }}>
                              Ref: {r.referenceNo}
                            </div>
                          )}
                        </td>

                        {/* Debit */}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: r.debit > 0 ? "var(--danger)" : "var(--muted)", fontWeight: r.debit > 0 ? "700" : "400" }}>
                          {r.debit > 0 ? `₹${r.debit.toLocaleString("en-IN")}` : "—"}
                        </td>

                        {/* Credit */}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: r.credit > 0 ? "var(--success)" : "var(--muted)", fontWeight: r.credit > 0 ? "700" : "400" }}>
                          {r.credit > 0 ? `₹${r.credit.toLocaleString("en-IN")}` : "—"}
                        </td>

                        {/* Voucher Type */}
                        <td style={{ padding: "10px 12px" }}>
                          <select
                            value={r.voucherType}
                            onChange={(e) => updateRow(r.transactionId, { voucherType: e.target.value as any })}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "var(--surface)",
                              border: "1px solid var(--line)",
                              color: "var(--text)",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            <option value="Payment">Payment</option>
                            <option value="Receipt">Receipt</option>
                            <option value="Contra">Contra</option>
                            <option value="Journal">Journal</option>
                          </select>
                        </td>

                        {/* Assigned Tally Ledger (Searchable Dropdown) */}
                        <td style={{ padding: "10px 12px" }}>
                          {r.isSplit ? (
                            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Split size={13} /> {r.splits?.length || 0} Split Allocations
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <SearchableLedgerSelect
                                  value={r.primaryLedgerName}
                                  onChange={(name, id) => {
                                    updateRow(r.transactionId, { primaryLedgerName: name, primaryLedgerId: id, auditStatus: "MANUALLY_VERIFIED" });
                                    // Automatically save as learning rule for future statement imports
                                    if (window.desktop?.documents?.saveLedgerRule) {
                                      window.desktop.documents.saveLedgerRule(activeCompanyId, {
                                        narrationPattern: r.cleanNarration || r.originalNarration,
                                        matchedLedgerName: name,
                                        matchedLedgerId: id || null,
                                        voucherType: r.voucherType,
                                      }).catch(() => {});
                                    }
                                  }}
                                  onNewLedgerCreated={(newLedger) => {
                                    // Add to local ledger list and update row
                                    setLocalLedgers((prev) => {
                                      if (prev.some((l) => l.name.toLowerCase() === newLedger.name.toLowerCase())) return prev;
                                      return [...prev, newLedger];
                                    });
                                    updateRow(r.transactionId, { primaryLedgerName: newLedger.name, primaryLedgerId: newLedger.id, auditStatus: "MANUALLY_VERIFIED" });
                                  }}
                                  ledgers={localLedgers}
                                  companyId={activeCompanyId}
                                  placeholder="Assign Tally ledger..."
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAiSuggestLedgers(r.transactionId)}
                                disabled={isAiSuggesting}
                                title="AI Auto-suggest ledger for this transaction description"
                                style={{
                                  padding: "4px 6px",
                                  borderRadius: "6px",
                                  background: "var(--surface-2)",
                                  border: "1px solid var(--line)",
                                  color: "var(--accent)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}
                              >
                                <Sparkles size={12} />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* AI Match Badge */}
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "800",
                                background:
                                  r.auditStatus === "AUTO_APPROVED"
                                    ? "var(--accent-subtle)"
                                    : r.auditStatus === "MANUALLY_VERIFIED"
                                    ? "rgba(59, 130, 246, 0.12)"
                                    : "rgba(239, 68, 68, 0.12)",
                                color:
                                  r.auditStatus === "AUTO_APPROVED"
                                    ? "var(--accent)"
                                    : r.auditStatus === "MANUALLY_VERIFIED"
                                    ? "#3b82f6"
                                    : "#ef4444",
                                width: "fit-content",
                              }}
                            >
                              {r.confidence > 0 ? `${Math.round(r.confidence * 100)}%` : ""} {r.matchType || "UNMAPPED"}
                            </span>
                            {r.matchReason && (
                              <span style={{ fontSize: "9.5px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                                {r.matchReason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Split Toggle */}
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!r.isSplit) {
                                // Initialize split
                                const total = r.debit > 0 ? r.debit : r.credit;
                                updateRow(r.transactionId, {
                                  isSplit: true,
                                  splits: [{ id: `split_1`, ledgerName: r.primaryLedgerName || "", amount: total }],
                                });
                              }
                              setExpandedSplitTxId(isSplitExpanded ? null : r.transactionId);
                            }}
                            title="Split Transaction"
                            style={{
                              background: r.isSplit ? "var(--accent-subtle)" : "transparent",
                              border: "1px solid var(--line)",
                              borderRadius: "6px",
                              padding: "4px 6px",
                              color: r.isSplit ? "var(--accent)" : "var(--muted)",
                              cursor: "pointer",
                            }}
                          >
                            <Split size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Split Sub-Row */}
                      {isSplitExpanded && (
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td colSpan={9} style={{ padding: "0 16px 12px 16px" }}>
                            <SplitTransactionRow
                              totalAmount={r.debit > 0 ? r.debit : r.credit}
                              allocations={r.splits || []}
                              ledgers={localLedgers}
                              companyId={activeCompanyId}
                              onChange={(splits) => updateRow(r.transactionId, { splits })}
                              onCancel={() => {
                                updateRow(r.transactionId, { isSplit: false, splits: undefined });
                                setExpandedSplitTxId(null);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* 4. ACTIONS & FOOTER */}
        <div
          style={{
            padding: "14px 24px",
            background: "var(--surface)",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {rows.filter((r) => r.auditStatus === "MANUALLY_VERIFIED").length} modified by accountant
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleExportTallyXml}
              disabled={isExportingXml || isDirectSyncing || isCommitting}
              title="Generate offline standard Tally XML vouchers file"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: isExportingXml ? "not-allowed" : "pointer",
                opacity: isExportingXml ? 0.6 : 1,
              }}
            >
              <FileCode size={14} style={{ color: "var(--accent)" }} />
              {isExportingXml ? "Exporting..." : "Export Tally XML"}
            </button>

            <button
              type="button"
              onClick={handleDirectTallySync}
              disabled={isDirectSyncing || isExportingXml || isCommitting}
              title="Transmit vouchers directly to running Tally instance on port 9000"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "rgba(13, 148, 136, 0.15)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: isDirectSyncing ? "not-allowed" : "pointer",
                opacity: isDirectSyncing ? 0.6 : 1,
              }}
            >
              <Zap size={14} />
              {isDirectSyncing ? "Pushing to Tally..." : "Direct Push to Tally"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isCommitting || isDirectSyncing}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting || isDirectSyncing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: isCommitting ? "not-allowed" : "pointer",
                opacity: isCommitting ? 0.7 : 1,
                boxShadow: "0 2px 10px rgba(13, 148, 136, 0.3)",
              }}
            >
              <Send size={14} />
              {isCommitting ? "Saving..." : `Approve & Save (${rows.length - stats.unmappedCount})`}
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast Message */}
        {syncFeedback && (
          <div
            style={{
              padding: "10px 24px",
              background: syncFeedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: syncFeedback.type === "success" ? "var(--success)" : "var(--danger)",
              borderTop: "1px solid var(--line)",
              fontSize: "12.5px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {syncFeedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{syncFeedback.message}</span>
          </div>
        )}

        {/* Universal Print Service & Page Setup Modal */}
        <PrintSettingsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          defaultFileName={`Verified_Statement_${bankName.replace(/\s+/g, "_")}`}
          documentTitle={`Verified_Statement_${bankName.replace(/\s+/g, "_")}`}
          reportData={rows.map((r) => ({
            Date: r.date,
            Narration: r.originalNarration,
            VoucherType: r.suggestedVoucherType,
            PrimaryLedger: r.suggestedLedgerName,
            BankLedger: r.bankLedgerName,
            Debit: r.debit || 0,
            Credit: r.credit || 0,
            ReferenceNo: r.referenceNo || "N/A",
            Status: r.userDecision
          }))}
        />
      </div>
    </div>
  );
}
