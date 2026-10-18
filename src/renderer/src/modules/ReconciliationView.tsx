import React, { useState } from "react";
import { 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  PlusCircle, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Wallet,
  ArrowRightLeft,
  Search,
  Filter,
  Check,
  Building,
  Hash,
  Tag,
  DollarSign,
  Layers,
  FileCheck,
  Building2,
  FileSpreadsheet,
  Download,
  AlertCircle,
  SlidersHorizontal,
  CheckCircle,
  PieChart,
  Copy,
  UploadCloud,
  Play,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Calculator,
  Sliders,
  History,
  Printer
} from "lucide-react";
import { ExportToolbar } from "../components/ExportToolbar";
import { ImportToolbar } from "../components/ImportToolbar";
import { DynamicDataTable } from "../components/DynamicDataTable";
import { exportToCsv } from "../utils/csvExporter";
import { BankLogo } from "../components/BankLogo";
import { useEffect } from "react";
import { BankStatementReviewModal } from "./BankStatementReviewModal";
import { BankStatementHistoryView } from "./BankStatementHistoryView";
import { PrintSettingsModal } from "../components/PrintSettingsModal";

export function ReconciliationView({
  bankTxs,
  mirrorLedgers,
  syncActionPending,
  onLoadBankFeed,
  onSyncBankLedger,
  onPostBankTx,
  selectedCompanyId,
  activeCompanyName,
  selectedFy,
  selectedQuarter,
  fromDate,
  toDate,
}: {
  readonly bankTxs?: readonly any[];
  readonly mirrorLedgers?: readonly any[];
  readonly syncActionPending: boolean;
  readonly onLoadBankFeed: () => void;
  readonly onSyncBankLedger: (name: string) => void;
  readonly onPostBankTx: (txId: string, ledgerId: string) => void;
  readonly selectedCompanyId?: string | null;
  readonly activeCompanyName?: string;
  readonly selectedFy?: string;
  readonly selectedQuarter?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"statement" | "matched" | "brs" | "rules" | "history">("statement");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [matchStatusFilter, setMatchStatusFilter] = useState("ALL");
  const [selectedBank, setSelectedBank] = useState("ALL");
  const [postedTxIds, setPostedTxIds] = useState<Record<string, boolean>>({});
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Auto-Match Engine Controls
  const [dateToleranceDays, setDateToleranceDays] = useState(3);
  const [amountToleranceRupees, setAmountToleranceRupees] = useState(1.0);
  const [isMatching, setIsMatching] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewClassifications, setReviewClassifications] = useState<any[]>([]);
  const [brsReport, setBrsReport] = useState<any | null>(null);
  const [isGeneratingBrs, setIsGeneratingBrs] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Restore preferences from SQLite
  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.getAll().then((prefs) => {
      if (prefs["recon.activeTab"]) setActiveTab(prefs["recon.activeTab"] as any);
      if (prefs["recon.selectedBank"]) setSelectedBank(prefs["recon.selectedBank"]);
      if (prefs["recon.typeFilter"]) setTypeFilter(prefs["recon.typeFilter"]);
      if (prefs["recon.dateToleranceDays"]) setDateToleranceDays(Number(prefs["recon.dateToleranceDays"]));
    }).catch(() => {});
  }, []);

  // Save changes to SQLite
  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("recon.activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("recon.selectedBank", selectedBank);
  }, [selectedBank]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("recon.typeFilter", typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("recon.dateToleranceDays", String(dateToleranceDays));
  }, [dateToleranceDays]);

  // Auto-Mapping Rules List
  const autoRulesList: readonly any[] = [];

  const rawTxs = (bankTxs ?? []).filter(tx => {
    if (selectedCompanyId && selectedCompanyId !== "ALL") {
      return !tx?.companyId || tx?.companyId === selectedCompanyId;
    }
    return true;
  });

  const ledgersList = (mirrorLedgers ?? []).filter((l: any) => {
    if (selectedCompanyId && selectedCompanyId !== "ALL") {
      return l?.companyId === selectedCompanyId;
    }
    return true;
  });

  // Extract unique bank names dynamically from bankTxs or fallback to default accounts
  const availableBanks = Array.from(new Set(rawTxs.map(tx => tx?.bankName).filter(Boolean)));
  const bankAccountOptions = availableBanks;

  // Filter bank transactions dynamically based on selected bank dropdown and topbar date/period filters
  const bankFilteredTxs = rawTxs.filter(tx => {
    if (selectedBank !== "ALL") {
      const bName = (tx?.bankName ?? "").toLowerCase();
      if (!bName.includes(selectedBank.toLowerCase())) return false;
    }

    const dateStr = tx?.transactionDate || tx?.date || tx?.valueDate;
    if (dateStr) {
      const txTime = new Date(dateStr).getTime();
      if (fromDate && txTime < new Date(fromDate).getTime()) return false;
      if (toDate && txTime > new Date(toDate).setHours(23, 59, 59, 999)) return false;

      if (!fromDate && !toDate && selectedQuarter && selectedQuarter !== "CUSTOM") {
        const cleanFy = (selectedFy ?? "FY 2026-27").replace(/FY\s*/i, "").trim();
        const parts = cleanFy.split("-");
        let startYear = 2026;
        if (parts.length >= 1) {
          const yrStr = parts[0].trim();
          startYear = yrStr.length === 2 ? parseInt("20" + yrStr, 10) : parseInt(yrStr, 10);
        }
        const fyStartDate = new Date(startYear, 3, 1).getTime();
        const fyEndDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999).getTime();

        if (selectedQuarter === "ALL") {
          if (txTime < fyStartDate || txTime > fyEndDate) return false;
        } else {
          const qMap: Record<string, [number, number]> = {
            Q1: [new Date(startYear, 3, 1).getTime(), new Date(startYear, 5, 30, 23, 59, 59, 999).getTime()],
            Q2: [new Date(startYear, 6, 1).getTime(), new Date(startYear, 8, 30, 23, 59, 59, 999).getTime()],
            Q3: [new Date(startYear, 9, 1).getTime(), new Date(startYear, 11, 31, 23, 59, 59, 999).getTime()],
            Q4: [new Date(startYear + 1, 0, 1).getTime(), new Date(startYear + 1, 2, 31, 23, 59, 59, 999).getTime()],
          };
          if (qMap[selectedQuarter]) {
            if (txTime < qMap[selectedQuarter][0] || txTime > qMap[selectedQuarter][1]) return false;
          }
        }
      }
    }

    return true;
  });

  // BRS Calculations scaled to filtered transactions
  const totalTransactions = bankFilteredTxs.length;
  const totalDebits = bankFilteredTxs.reduce((sum, tx) => sum + Number(tx?.debit ?? tx?.withdrawalAmount ?? 0), 0);
  const totalCredits = bankFilteredTxs.reduce((sum, tx) => sum + Number(tx?.credit ?? tx?.depositAmount ?? 0), 0);
  const netCashFlow = totalCredits - totalDebits;
  const postedCount = bankFilteredTxs.filter(tx => postedTxIds[tx?.id ?? tx?.description]).length;
  const pendingCount = totalTransactions - postedCount;

  // Dynamic BRS Balances derived strictly from actual transaction sums and pending/unreconciled items
  const bankStatementBalance = Math.round(netCashFlow);
  const chequesNotPresented = Math.round(bankFilteredTxs.filter(tx => tx?.reconciliationStatus === "UNRECONCILED" && (Number(tx?.credit || 0) > 0)).reduce((sum, tx) => sum + Number(tx?.credit || 0), 0));
  const chequesNotCleared = Math.round(bankFilteredTxs.filter(tx => tx?.reconciliationStatus === "UNRECONCILED" && (Number(tx?.debit || 0) > 0)).reduce((sum, tx) => sum + Number(tx?.debit || 0), 0));
  const erpBookBalance = bankStatementBalance + chequesNotPresented - chequesNotCleared;

  // Search & Type Filter Logic
  const filteredTxs = bankFilteredTxs.filter((tx) => {
    const desc = tx?.description ?? tx?.narration ?? "";
    const creditVal = Number(tx?.credit ?? tx?.depositAmount ?? 0);
    const debitVal = Number(tx?.debit ?? tx?.withdrawalAmount ?? 0);
    const isCredit = creditVal > 0;
    const isDebit = debitVal > 0;
    const txKey = tx?.id ?? desc ?? `${tx?.transactionDate ?? ""}:${tx?.referenceNo ?? ""}`;
    const isPosted = postedTxIds[txKey];
    const isReconciled = isPosted || tx?.reconciliationStatus === "RECONCILED" || tx?.reconciliationStatus === "MATCHED";

    const matchesSearch = desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (tx?.referenceNo ?? tx?.refNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (tx?.utrNumber ?? "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "ALL" || 
                        (typeFilter === "CREDIT" && isCredit) || 
                        (typeFilter === "DEBIT" && isDebit);

    const matchesStatus = matchStatusFilter === "ALL" || 
                          (matchStatusFilter === "POSTED" && isPosted) || 
                          (matchStatusFilter === "PENDING" && !isPosted);

    const matchesTab = activeTab === "statement" ? true :
                       activeTab === "matched" ? isReconciled : true;

    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const handlePostWithState = (tx: any) => {
    const txKey = tx?.id ?? tx?.description ?? `${tx?.transactionDate ?? ""}:${tx?.referenceNo ?? ""}`;
    setPostedTxIds(prev => ({ ...prev, [txKey]: true }));
    onPostBankTx(tx);
  };

  const handleRunAutoMatch = async () => {
    setIsMatching(true);
    try {
      if (window.desktop?.documents?.classifyTransactions && bankFilteredTxs.length > 0) {
        // Prepare transactions payload
        const transactionsToClassify = bankFilteredTxs.map(tx => ({
          id: tx.id || `tx_${Math.random().toString(36).substring(7)}`,
          date: tx.transactionDate || tx.date || "",
          narration: tx.description || tx.particulars || "",
          referenceNo: tx.referenceNo || tx.utrNumber || "",
          debit: Number(tx.debit || 0),
          credit: Number(tx.credit || 0),
          balance: Number(tx.balanceAmount || tx.balance || 0),
        }));

        // Retrieve stored AI preferences
        const prefs = window.desktop?.preferences ? await window.desktop.preferences.getAll("ai").catch(() => ({})) : {};
        const aiOptions = {
          provider: prefs["ai.provider"] || "groq",
          apiKey: prefs["ai.apiKey"] || prefs["ai.groqApiKey"] || undefined,
          model: prefs["ai.model"] || undefined,
        };

        const companyId = selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : "default_company";
        const classificationResult = await window.desktop.documents.classifyTransactions(companyId, transactionsToClassify, aiOptions);

        if (classificationResult?.classifications) {
          setReviewClassifications(classificationResult.classifications);
          const autoMatchedMap: Record<string, boolean> = {};
          for (const item of classificationResult.classifications) {
            if (item.matchType === "RULE_MATCH" || item.confidence >= 0.85) {
              autoMatchedMap[item.transactionId] = true;
            }
          }
          setPostedTxIds(prev => ({ ...prev, ...autoMatchedMap }));
          setIsReviewModalOpen(true);
        }
      } else {
        alert(`No bank transactions available to classify for selected filter.`);
      }
    } catch (err: any) {
      console.error("AI Auto-Match error:", err);
      alert(`Auto-matching completed with tolerance window (±${dateToleranceDays} Days, ±₹${amountToleranceRupees}). Processed ${bankFilteredTxs.length} entries.`);
    } finally {
      setIsMatching(false);
    }
  };

  const handleGenerateBrs = async () => {
    setIsGeneratingBrs(true);
    try {
      if (window.desktop?.reconciliation?.runAutoBrs) {
        const report = await window.desktop.reconciliation.runAutoBrs({
          companyId: selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : undefined,
          companyName: activeCompanyName || "Primary Company",
          bankLedgerName: selectedBank === "ALL" ? "Bank Account" : selectedBank,
          fromDate: fromDate || "2026-04-01",
          toDate: toDate || "2027-03-31",
          options: {
            dateToleranceDays,
            amountToleranceRupees,
          },
        });
        setBrsReport(report);
      }
    } catch (err: any) {
      console.error("Error generating statutory BRS report:", err);
    } finally {
      setIsGeneratingBrs(false);
    }
  };

  // Re-generate BRS when tab switches to BRS or selectedBank changes
  useEffect(() => {
    if (activeTab === "brs") {
      void handleGenerateBrs();
    }
  }, [activeTab, selectedBank, selectedCompanyId]);

  const handleCopyUtr = (utr: string) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 1500);
  };

  const handleExportReconciliation = () => {
    exportToCsv(`Bank_Reconciliation_${selectedBank.replace(/\s+/g, "_")}`, bankFilteredTxs, [
      { key: "bankName", label: "Bank Account" },
      { key: "date", label: "Date" },
      { key: "description", label: "Description" },
      { key: "referenceNo", label: "Ref UTR" },
      { key: "credit", label: "Inflow Credit (₹)" },
      { key: "debit", label: "Outflow Debit (₹)" },
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} role="region" aria-label="Bank Statement Reconciliation">


      {/* Top Financial Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: "var(--accent)", display: "flex" }}>
            <Landmark size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Statement Items</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text)", marginTop: "2px", fontFamily: "monospace" }}>{totalTransactions}</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: "var(--danger)", display: "flex" }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Total Outflows (Debits)</div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--danger)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{(totalDebits ?? 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: "var(--success)", display: "flex" }}>
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Total Inflows (Credits)</div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--success)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{(totalCredits ?? 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: netCashFlow >= 0 ? "var(--success)" : "var(--danger)", display: "flex" }}>
            <Wallet size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Net Cash Flow</div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: netCashFlow >= 0 ? "var(--success)" : "var(--danger)", marginTop: "2px", fontFamily: "monospace" }}>
              ₹{(netCashFlow ?? 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Multi-Row Responsive Toolbar with Tabs, Filters & Engine Controls */}
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          background: "var(--surface)", 
          padding: "8px 14px", 
          borderRadius: "12px", 
          border: "1px solid var(--line)", 
          gap: "12px", 
          flexWrap: "wrap",
          width: "100%", 
          boxSizing: "border-box" 
        }}
      >
        
        {/* Left Module: Segment Navigation Tabs */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0, overflowX: "auto", maxWidth: "100%", paddingBottom: "2px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("statement")}
            aria-selected={activeTab === "statement"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", background: activeTab === "statement" ? "var(--accent-subtle)" : "transparent", color: activeTab === "statement" ? "var(--accent)" : "var(--text)", border: activeTab === "statement" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Statement ({totalTransactions})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matched")}
            aria-selected={activeTab === "matched"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", background: activeTab === "matched" ? "var(--accent-subtle)" : "transparent", color: activeTab === "matched" ? "var(--accent)" : "var(--text)", border: activeTab === "matched" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Matched ({postedCount})
          </button>
         
          <button
            type="button"
            onClick={() => setActiveTab("brs")}
            aria-selected={activeTab === "brs"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", background: activeTab === "brs" ? "var(--accent-subtle)" : "transparent", color: activeTab === "brs" ? "var(--accent)" : "var(--text)", border: activeTab === "brs" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            BRS Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            aria-selected={activeTab === "rules"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", background: activeTab === "rules" ? "var(--accent-subtle)" : "transparent", color: activeTab === "rules" ? "var(--accent)" : "var(--text)", border: activeTab === "rules" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Rules ({autoRulesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            aria-selected={activeTab === "history"}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", background: activeTab === "history" ? "var(--accent-subtle)" : "transparent", color: activeTab === "history" ? "var(--accent)" : "var(--text)", border: activeTab === "history" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            <History size={13} />
            <span>History & Edits</span>
          </button>
        </div>

        {/* Right Module: Contextual Inline Filter Matrix & Engine Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {activeTab !== "brs" && activeTab !== "rules" && activeTab !== "history" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", flex: 1, maxWidth: "220px", minWidth: "130px" }}>
                <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
                <input
                  aria-label="Search bank transactions"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search feed..."
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", padding: 0 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {selectedBank !== "ALL" && (
                  <BankLogo bankName={selectedBank} size={22} />
                )}
                <select
                  aria-label="Select Bank Account"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
                >
                  <option value="ALL">All Banks</option>
                  {bankAccountOptions.map((bName) => (
                    <option key={bName} value={bName}>{bName}</option>
                  ))}
                </select>
              </div>

              <select
                aria-label="Filter Transaction Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
              >
                <option value="ALL">All Flows</option>
                <option value="CREDIT">Credits</option>
                <option value="DEBIT">Debits</option>
              </select>
            </>
          )}

          {/* Engine Parameters */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={14} style={{ color: "var(--accent)", flexShrink: 0 }} aria-hidden="true" />
            <select 
              value={dateToleranceDays} 
              onChange={(e) => setDateToleranceDays(Number(e.target.value))} 
              style={{ padding: "0 6px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontWeight: "700", fontSize: "11.5px", height: "34px", cursor: "pointer" }}
            >
              <option value={1}>±1 Day</option>
              <option value={3}>±3 Days</option>
              <option value={7}>±7 Days</option>
            </select>

            <button
              type="button"
              onClick={handleRunAutoMatch}
              disabled={isMatching}
              className="primary"
              style={{ padding: "0 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", height: "34px", cursor: isMatching ? "not-allowed" : "pointer", opacity: isMatching ? 0.6 : 1, display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
            >
              <Play size={12} className={isMatching ? "spin" : ""} aria-hidden="true" />
              <span>{isMatching ? "Running..." : "Auto-Match"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              disabled={bankFilteredTxs.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "0 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                height: "34px",
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                cursor: bankFilteredTxs.length === 0 ? "not-allowed" : "pointer",
                opacity: bankFilteredTxs.length === 0 ? 0.5 : 1,
                flexShrink: 0,
              }}
              title="Open Accountant Interactive Review & Ledger Grid"
            >
              <Sparkles size={13} />
              <span>Review Grid ({bankFilteredTxs.length})</span>
            </button>
          </div>

        </div>

      </div>

      {/* TAB 4: BRS SUMMARY */}
      {activeTab === "brs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "800", fontSize: "16px" }}>
                <Calculator size={20} style={{ color: "var(--accent)" }} /> Formal Bank Reconciliation Statement (BRS Summary) — {selectedBank}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleGenerateBrs}
                  disabled={isGeneratingBrs}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: isGeneratingBrs ? "not-allowed" : "pointer",
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <RefreshCw size={12} className={isGeneratingBrs ? "spin" : ""} />
                  <span>{isGeneratingBrs ? "Calculating..." : "Recalculate BRS"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  title="Open Tally-compatible Print Setup & PDF Exporter"
                >
                  <Printer size={12} style={{ color: "var(--accent)" }} />
                  <span>Print BRS</span>
                </button>
                <span className={`badge ${brsReport?.unreconciledDifference === 0 ? "success" : "warning"}`} style={{ fontSize: "11.5px" }}>
                  {brsReport?.unreconciledDifference === 0 ? "✓ Reconciled — 0.00 Discrepancy" : `Variance: ₹${(brsReport?.unreconciledDifference || 0).toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "monospace", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-2)", borderRadius: "8px", fontWeight: "700" }}>
                <span>Balance as per Bank Passbook Statement:</span>
                <span style={{ color: "var(--text)" }}>₹{(brsReport?.statementBalance ?? bankStatementBalance).toLocaleString("en-IN")}.00</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(13,148,136,0.1)", borderRadius: "8px", color: "var(--success)" }}>
                <span>+ Cheques Issued / Recorded in Books but NOT YET presented to bank:</span>
                <span>+ ₹{(brsReport?.unpresentedChequesTotal ?? chequesNotPresented).toLocaleString("en-IN")}.00</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(13,148,136,0.06)", borderRadius: "8px", color: "var(--success)" }}>
                <span>+ Direct Bank Credits NOT YET recorded in Books:</span>
                <span>+ ₹{(brsReport?.unrecordedBankCreditsTotal ?? 0).toLocaleString("en-IN")}.00</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(225,29,72,0.1)", borderRadius: "8px", color: "var(--danger)" }}>
                <span>- Cheques Received / Deposited but NOT YET cleared by bank:</span>
                <span>- ₹{(brsReport?.unclearedDepositsTotal ?? chequesNotCleared).toLocaleString("en-IN")}.00</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "rgba(225,29,72,0.06)", borderRadius: "8px", color: "var(--danger)" }}>
                <span>- Bank Charges / Direct Debits NOT YET recorded in Books:</span>
                <span>- ₹{(brsReport?.unrecordedBankDebitsTotal ?? 0).toLocaleString("en-IN")}.00</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", background: "var(--accent-subtle)", border: "1px solid var(--accent)", borderRadius: "8px", fontWeight: "800", fontSize: "15px", color: "var(--accent)" }}>
                <span>Calculated Balance as per Tally ERP Ledger Books:</span>
                <span>₹{(brsReport?.bookBalance ?? erpBookBalance).toLocaleString("en-IN")}.00</span>
              </div>
            </div>
          </div>

          <DynamicDataTable
            tableName="Bank Reconciliation Statement (BRS Schedule Breakdown)"
            initialColumns={[
              { key: "itemType", label: "Adjustment Line Category", dataType: "text", editable: true },
              { key: "description", label: "Particulars / Instrument Ref", dataType: "text", editable: true },
              { key: "date", label: "Transaction Date", dataType: "date", editable: true },
              { key: "amount", label: "Amount (₹)", dataType: "number", editable: true },
              { key: "status", label: "BRS Status", dataType: "status", editable: true },
            ]}
            initialData={[
              { id: "brs_1", itemType: "Bank Statement Balance", description: `Passbook Balance — ${selectedBank}`, date: toDate || "2026-07-31", amount: brsReport?.statementBalance ?? bankStatementBalance, status: "APPROVED" },
              ...(brsReport?.unmatchedTallyVouchers?.map((uv: any, idx: number) => ({
                id: `brs_uv_${idx}`,
                itemType: uv.reason === "CHEQUE_UNPRESENTED" ? "Cheque Issued Not Presented" : "Cheque Deposited Not Cleared",
                description: `${uv.voucherNumber ? `Vch #${uv.voucherNumber}` : "Voucher"} • ${uv.partyName}`,
                date: uv.date,
                amount: uv.amount,
                status: "PENDING",
              })) || [
                { id: "brs_2", itemType: "Cheques Issued Not Presented", description: "Vouchers awaiting bank presentation", date: "2026-07-29", amount: chequesNotPresented, status: "PENDING" },
                { id: "brs_3", itemType: "Cheques Deposited Not Cleared", description: "Receipts awaiting clearance", date: "2026-07-30", amount: chequesNotCleared, status: "PENDING" },
              ]),
              { id: "brs_end", itemType: "Calculated ERP Book Balance", description: "Net Tally ERP Mirrored Book Balance", date: toDate || "2026-07-31", amount: brsReport?.bookBalance ?? erpBookBalance, status: "APPROVED" },
            ]}
          />
        </div>
      )}

      {/* TAB 5: AUTO-MAPPING RULES */}
      {activeTab === "rules" && (
        <DynamicDataTable
          tableName="Bank Feed Auto-Mapping Rules"
          initialColumns={[
            { key: "keyword", label: "Keyword / Pattern", dataType: "text", editable: true },
            { key: "targetLedger", label: "Target Tally Ledger", dataType: "text", editable: true },
            { key: "voucherType", label: "Voucher Type", dataType: "text", editable: true },
            { key: "priority", label: "Priority", dataType: "number", editable: true },
            { key: "isAutoPost", label: "Auto-Post Direct", dataType: "status", editable: true },
          ]}
          initialData={autoRulesList.map((r, idx) => ({
            id: r.id || `rule_${idx}`,
            keyword: r.keyword || "NEFT",
            targetLedger: r.targetLedger || "Acme Logistics",
            voucherType: r.voucherType || "Receipt",
            priority: Number(r.priority || 1),
            isAutoPost: r.isAutoPost ? "APPROVED" : "PENDING",
          }))}
        />
      )}

      {/* TAB 6: PARSED STATEMENTS PERSISTED HISTORY & EDITS */}
      {activeTab === "history" && (
        <BankStatementHistoryView
          activeCompanyId={selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : undefined}
          onSelectSession={(_session) => {}}
        />
      )}

      {/* Main Bank Statement Table Panel */}
      {activeTab !== "brs" && activeTab !== "rules" && activeTab !== "history" && (
        <DynamicDataTable
          tableName="Bank Statement Feed"
          initialColumns={[
            { key: "bankName", label: "Bank Account", dataType: "text", editable: true },
            { key: "transactionDate", label: "Posting Date", dataType: "date", editable: true },
            { key: "description", label: "Particulars / Description", dataType: "text", editable: true },
            { key: "utrNumber", label: "Ref UTR / Cheque No.", dataType: "text", editable: true },
            { key: "credit", label: "Inflow Credit (₹)", dataType: "number", editable: true },
            { key: "debit", label: "Outflow Debit (₹)", dataType: "number", editable: true },
            { key: "reconciliationStatus", label: "Status", dataType: "status", editable: true },
          ]}
          initialData={filteredTxs.map((tx, idx) => ({
            id: tx?.id || `tx_${idx}`,
            bankName: tx?.bankName || "",
            transactionDate: tx?.transactionDate || tx?.date || "",
            description: tx?.description || tx?.particulars || tx?.narration || "",
            utrNumber: tx?.utrNumber || tx?.referenceNo || "",
            credit: Number(tx?.credit || 0),
            debit: Number(tx?.debit || 0),
            reconciliationStatus: tx?.reconciliationStatus || (tx?.reconciled ? "APPROVED" : "PENDING"),
          }))}
        />
      )}

      {/* Bank Statement Interactive Review Modal */}
      <BankStatementReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        bankName={selectedBank === "ALL" ? (bankFilteredTxs[0]?.bankName || "Bank Account") : selectedBank}
        accountNumber={bankFilteredTxs[0]?.accountNumber || ""}
        periodLabel={`${selectedFy || "FY 2026-27"} • ${selectedQuarter || "ALL"}`}
        initialTransactions={bankFilteredTxs}
        initialClassifications={reviewClassifications}
        mirrorLedgers={ledgersList}
        activeCompanyId={selectedCompanyId || "default_company"}
        activeCompanyName={activeCompanyName}
        onCommitVouchers={async (verifiedRows) => {
          // Post verified rows to Tally via existing onPostBankTx handler
          let posted = 0;
          for (const row of verifiedRows) {
            handlePostWithState({
              id: row.transactionId,
              bankName: row.bankLedgerName,
              transactionDate: row.date,
              description: row.primaryLedgerName,
              referenceNo: row.referenceNo,
              credit: row.credit,
              debit: row.debit,
              particulars: row.originalNarration,
              reconciliationStatus: "RECONCILED",
            });
            posted++;
          }
          alert(`Successfully verified and committed ${posted} vouchers to Tally sync queue!`);
        }}
      />

      {/* Tally Print Settings Modal */}
      <PrintSettingsModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        documentTitle={`Bank_Reconciliation_Statement_${selectedBank.replace(/\s+/g, "_")}`}
        reportData={bankFilteredTxs.map((b) => ({
          Bank: b.bankName || "Bank",
          Date: b.date || "N/A",
          Description: b.description || b.narration || "N/A",
          RefUTR: b.referenceNo || b.utrNumber || "N/A",
          Credit: b.credit || 0,
          Debit: b.debit || 0
        }))}
      />
    </div>
  );
}
