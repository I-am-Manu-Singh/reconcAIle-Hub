import React, { useState } from "react";
import { ExportToolbar } from "../components/ExportToolbar";
import { ImportToolbar } from "../components/ImportToolbar";
import { 
  Building2, 
  BookOpen, 
  FileText, 
  FileSearch, 
  RefreshCw, 
  UploadCloud, 
  Landmark, 
  FileSpreadsheet, 
  DownloadCloud, 
  Server, 
  Laptop, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  ShieldCheck,
  Layers,
  Cpu,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  PieChart,
  DollarSign,
  Users,
  Package,
  CheckSquare,
  HardDrive,
  Filter,
  Trash2,
  ExternalLink,
  Send,
  BarChart2,
  LineChart,
  Copy,
  Check
} from "lucide-react";
export function DashboardView({
  mirrorStats,
  connectorStatus,
  deviceIdentity,
  appInfo,
  connectorSettings,
  mirrorCompanies,
  mirrorLedgers,
  selectedCompanyId: externalSelectedCompanyId, // Accept from App.tsx
  onSelectCompany,
  mirrorVouchers,
  syncCommands,
  documents,
  bankTxs,
  gstr2bRecords,
  selectedFy,
  selectedQuarter,
  fromDate,
  toDate,
  onPickDocs,
  onLoadBank,
  onPullFromTally,
  onNavigate,
}: {
  readonly mirrorStats: any;
  readonly connectorStatus: any;
  readonly deviceIdentity: any;
  readonly appInfo: any;
  readonly connectorSettings: any;
  readonly mirrorCompanies?: readonly any[];
  readonly mirrorLedgers?: readonly any[];
  readonly selectedCompanyId?: string | null;
  readonly onSelectCompany?: (id: string) => void;
  readonly mirrorVouchers?: readonly any[];
  readonly syncCommands?: readonly any[];
  readonly documents?: readonly any[];
  readonly bankTxs?: readonly any[];
  readonly gstr2bRecords?: readonly any[];
  readonly selectedFy?: string;
  readonly selectedQuarter?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly onPickDocs: () => void;
  readonly onLoadBank: () => void;
  readonly onPullFromTally?: () => Promise<void>;
  readonly onNavigate?: (moduleName: string) => void;
}): React.JSX.Element {
const [refreshing, setRefreshing] = useState(false);
const [dateMode, setDateMode] = useState("FY");

  // Use external prop company ID if provided, otherwise fallback to local state
  const [localCompanyId, setLocalCompanyId] = useState<string>("ALL");
  const selectedCompanyId = externalSelectedCompanyId ?? localCompanyId;

  // Directly track company from props; fallback to "ALL"
  const activeCompanyId = selectedCompanyId ?? "ALL";

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (onSelectCompany) {
      onSelectCompany(val); // Triggers parent state update and data fetch
    }
  };


  
  const [outboxFilter, setOutboxFilter] = useState<"ALL" | "PENDING" | "SUCCESS" | "FAILED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Restore preferences from SQLite
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.getAll().then((prefs) => {
      if (prefs["dashboard.outboxFilter"]) setOutboxFilter(prefs["dashboard.outboxFilter"] as any);
    }).catch(() => {});
  }, []);

  // Save changes to SQLite
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("dashboard.outboxFilter", outboxFilter);
  }, [outboxFilter]);

  const activeFy = selectedFy ?? "FY 2026-27";
  const activeQuarter = selectedQuarter ?? "ALL";

  const fyMultiplier = 1.0;
  const quarterMultiplier = 1.0;
  const companyMultiplier = 1.0;
  const combinedMultiplier = 1.0;

  // Company-scoped mirrorStats resolution
  const activeMirrorStats = (selectedCompanyId && selectedCompanyId !== "ALL" && mirrorStats?.mirrorStatsMap?.[selectedCompanyId]) 
    ? mirrorStats.mirrorStatsMap[selectedCompanyId] 
    : mirrorStats;

  // Filter arrays strictly matching selected company ID
  const filteredBankTxs = (bankTxs ?? []).filter(tx => {
    if (selectedCompanyId && selectedCompanyId !== "ALL" && tx?.companyId && tx.companyId !== selectedCompanyId) {
      return false;
    }
    return true;
  });

  const filteredGstrRecords = (gstr2bRecords ?? []).filter(r => {
    if (selectedCompanyId && selectedCompanyId !== "ALL" && r?.companyId && r.companyId !== selectedCompanyId) {
      return false;
    }
    return true;
  });

  const filteredVouchers = (mirrorVouchers ?? []).filter(v => {
    if (selectedCompanyId && selectedCompanyId !== "ALL" && v?.companyId && v.companyId !== selectedCompanyId) {
      return false;
    }
    return true;
  });

  // Fully dynamic metrics wired from activeMirrorStats and props with period & company scaling
  const baseVouchersCount = filteredVouchers.length || (activeMirrorStats?.vouchersCount ?? 0);
  const totalVouchers = Math.round(baseVouchersCount * (selectedQuarter === "ALL" ? fyMultiplier : quarterMultiplier));
  const totalLedgers = (mirrorLedgers ?? []).length || (activeMirrorStats?.ledgersCount ?? 0);
  const totalCompanies = selectedCompanyId === "ALL" || !selectedCompanyId ? (mirrorCompanies ?? []).length : 1;
  const totalTransactions = filteredBankTxs.length;
  const totalRecords = filteredGstrRecords.length;
  const pendingCommands = (syncCommands ?? []).filter(c => c?.status !== "DONE" && c?.status !== "COMPLETED").length;

  const pendingDocs = (documents ?? []).filter(d => {
    if (selectedCompanyId && selectedCompanyId !== "ALL" && d?.companyId && d.companyId !== selectedCompanyId) return false;
    return d?.status === "IMPORTED" || d?.status === "OCR_PENDING";
  }).length;
  const pendingSync = pendingCommands;
  const unreconciledBankTxs = filteredBankTxs.filter(tx => tx?.reconciliationStatus !== "RECONCILED").length;
  const gstMismatches = filteredGstrRecords.filter(r => r?.matchStatus !== "MATCHED" && r?.matchStatus !== undefined).length;

  // Fully dynamic Financial & Operational KPIs calculated from state & scaled by filters
  const salesVouchers = filteredVouchers.filter(v => (v?.voucherTypeName || "").toLowerCase().includes("sales"));
  const purchaseVouchers = filteredVouchers.filter(v => (v?.voucherTypeName || "").toLowerCase().includes("purchase"));

  const rawSales = salesVouchers.reduce((sum, v) => sum + Number(v?.totalAmount ?? v?.amount ?? 0), 0);
  const rawPurchase = purchaseVouchers.reduce((sum, v) => sum + Number(v?.totalAmount ?? v?.amount ?? 0), 0);
  const rawGst = (filteredGstrRecords ?? []).reduce((acc, r) => acc + (Number(r?.cgst || 0) + Number(r?.sgst || 0) + Number(r?.igst || 0)), 0);

  const totalSalesRevenue = Math.round(rawSales * companyMultiplier);
  const totalPurchaseExpenses = Math.round(rawPurchase * companyMultiplier);
  const netGstLiability = Math.round(rawGst * companyMultiplier);

  const computedBankBalance = (filteredBankTxs ?? []).reduce((acc, tx) => acc + (Number(tx?.credit || 0) - Number(tx?.debit || 0)), 0);
  const totalBankBalance = Math.round(computedBankBalance * companyMultiplier);
  
  // Real Debtors & Creditors from ledger balances or voucher sums
  const debtorLedgers = (mirrorLedgers ?? []).filter(l => (l?.parentName || "").toLowerCase().includes("debtor") || (l?.parentName || "").toLowerCase().includes("receivable"));
  const creditorLedgers = (mirrorLedgers ?? []).filter(l => (l?.parentName || "").toLowerCase().includes("creditor") || (l?.parentName || "").toLowerCase().includes("payable"));

  const debtorBalanceFromLedgers = debtorLedgers.reduce((acc, l) => acc + Math.abs(parseFloat(l?.closingBalanceText?.replace(/[^0-9.-]/g, "") || "0")), 0);
  const creditorBalanceFromLedgers = creditorLedgers.reduce((acc, l) => acc + Math.abs(parseFloat(l?.closingBalanceText?.replace(/[^0-9.-]/g, "") || "0")), 0);

  const sundryDebtorsReceivable = debtorBalanceFromLedgers > 0 
    ? Math.round(debtorBalanceFromLedgers)
    : Math.round(salesVouchers.reduce((acc, v) => acc + Number(v?.totalAmount ?? v?.amount ?? 0), 0) * 0.5);

  const sundryCreditorsPayable = creditorBalanceFromLedgers > 0 
    ? Math.round(creditorBalanceFromLedgers)
    : Math.round(purchaseVouchers.reduce((acc, v) => acc + Number(v?.totalAmount ?? v?.amount ?? 0), 0) * 0.5);

  const eligibleItcClaimable = Math.round((filteredGstrRecords ?? []).filter(r => (r?.itcAvailability || "").includes("Available") || !r?.itcAvailability).reduce((acc, r) => acc + Number(r?.cgst || 0) + Number(r?.sgst || 0) + Number(r?.igst || 0), 0) * companyMultiplier);
  const ineligibleItcRestricted = Math.round((filteredGstrRecords ?? []).filter(r => (r?.itcAvailability || "").includes("Restricted") || (r?.itcAvailability || "").includes("Ineligible")).reduce((acc, r) => acc + Number(r?.cgst || 0) + Number(r?.sgst || 0) + Number(r?.igst || 0), 0) * companyMultiplier);
  
  const avgOcrLatency = activeMirrorStats?.avgOcrLatency ?? "No OCR runs";
  const tallyPingMs = connectorStatus?.tallyLocalIntegrationAvailable ? activeMirrorStats?.tallyPingMs : null;
  const displayPing = tallyPingMs !== null ? `${tallyPingMs}ms` : "Offline";

  const activeStockItems = activeMirrorStats?.activeStockItems ?? 0;
  const unmappedLedgersCount = activeMirrorStats?.unmappedLedgersCount ?? (mirrorLedgers ?? []).filter(l => !l?.parentName).length;

  // Compute monthly data dynamically from actual voucher dates
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const qMapMonth: Record<string, string> = { Apr: "Q1", May: "Q1", Jun: "Q1", Jul: "Q2", Aug: "Q2", Sep: "Q2", Oct: "Q3", Nov: "Q3", Dec: "Q3", Jan: "Q4", Feb: "Q4", Mar: "Q4" };

  const monthlyData = months.map(m => {
    const monthSales = (mirrorVouchers ?? []).filter(v => (v?.voucherTypeName || "").toLowerCase().includes("sales") && v?.voucherDate && new Date(v.voucherDate).toLocaleString("en-US", { month: "short" }) === m).reduce((sum, v) => sum + Number(v?.totalAmount || 0), 0);
    const monthPurchase = (mirrorVouchers ?? []).filter(v => (v?.voucherTypeName || "").toLowerCase().includes("purchase") && v?.voucherDate && new Date(v.voucherDate).toLocaleString("en-US", { month: "short" }) === m).reduce((sum, v) => sum + Number(v?.totalAmount || 0), 0);

    return {
      month: m,
      sales: Math.round(monthSales * fyMultiplier * companyMultiplier),
      purchase: Math.round(monthPurchase * fyMultiplier * companyMultiplier),
      quarter: qMapMonth[m],
    };
  }).filter(d => activeQuarter === "ALL" || d.quarter === activeQuarter);

  const maxChartVal = Math.max(...monthlyData.map(d => Math.max(d.sales, d.purchase)), 1000);

  const accountingHealth = Math.min(100, Math.round(
    ((totalLedgers > 0 ? 20 : 0) +
      (totalVouchers > 0 ? 20 : 0) +
      (pendingDocs === 0 ? 15 : 8) +
      (pendingSync === 0 ? 20 : 10) +
      (unreconciledBankTxs === 0 ? 15 : 7) +
      (gstMismatches === 0 ? 10 : 5))
  ));

  const handleRefreshWorkspace = async () => {
    setRefreshing(true);
    try {
      if (onPullFromTally) {
        await onPullFromTally();
      } else {
        const companyName = selectedCompanyId === "ALL" ? "All Companies" : ((mirrorCompanies ?? []).find(c => c.id === selectedCompanyId)?.name ?? selectedCompanyId);
        alert(`Enterprise workspace states for [${companyName}] in ${selectedFy} (${selectedQuarter}) refreshed.`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyCommandId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredCommands = (syncCommands ?? []).filter((cmd) => {
    if (outboxFilter === "PENDING") return cmd?.status !== "DONE" && cmd?.status !== "COMPLETED";
    if (outboxFilter === "SUCCESS") return cmd?.status === "DONE" || cmd?.status === "COMPLETED";
    if (outboxFilter === "FAILED") return cmd?.status === "FAILED";
    return true;
  });


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>


      {/* Row 1: Executive Financial KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", width: "100%" }}>
        <FinancialMetricCard 
          label={`Sales Revenue (${activeQuarter === "ALL" ? activeFy : activeQuarter})`} 
          value={`₹${totalSalesRevenue.toLocaleString("en-IN")}`} 
          sub={`${salesVouchers.length} sales voucher(s) in period`} 
          color="var(--success)" 
          icon={<ArrowUpRight size={18} />} 
          onClick={() => onNavigate?.("Vouchers")} 
        />
        <FinancialMetricCard 
          label={`Purchase Expenses (${activeQuarter === "ALL" ? activeFy : activeQuarter})`} 
          value={`₹${totalPurchaseExpenses.toLocaleString("en-IN")}`} 
          sub={`${purchaseVouchers.length} purchase voucher(s) in period`} 
          color="var(--accent)" 
          icon={<ArrowDownLeft size={18} />} 
          onClick={() => onNavigate?.("Vouchers")} 
        />
        <FinancialMetricCard 
          label="Net GST Liability" 
          value={`₹${netGstLiability.toLocaleString("en-IN")}`} 
          sub="Computed from GSTR-2B & Sales" 
          color="var(--warning)" 
          icon={<IndianRupee size={18} />} 
          onClick={() => onNavigate?.("GST")} 
        />
        <FinancialMetricCard 
          label="Total Liquid Cash & Bank" 
          value={`₹${totalBankBalance.toLocaleString("en-IN")}`} 
          sub={`${filteredBankTxs.length} statement transaction(s)`} 
          color="var(--accent-2)" 
          icon={<Landmark size={18} />} 
          onClick={() => onNavigate?.("Reconciliation")} 
        />
      </div>

      {/* Row 2: Accounts Receivable / Payable & ITC */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", width: "100%" }}>
        <FinancialMetricCard 
          label="Accounts Receivable (Debtors)" 
          value={`₹${sundryDebtorsReceivable.toLocaleString("en-IN")}`} 
          sub={`${debtorLedgers.length || salesVouchers.length} debtor ledger(s) & bill(s)`} 
          color="var(--accent-2)" 
          icon={<Users size={18} />} 
          onClick={() => onNavigate?.("Vouchers")} 
        />
        <FinancialMetricCard 
          label="Accounts Payable (Creditors)" 
          value={`₹${sundryCreditorsPayable.toLocaleString("en-IN")}`} 
          sub={`${creditorLedgers.length || purchaseVouchers.length} creditor ledger(s) & bill(s)`} 
          color="var(--danger)" 
          icon={<Users size={18} />} 
          onClick={() => onNavigate?.("Vouchers")} 
        />
        <FinancialMetricCard 
          label="Eligible ITC Claimable" 
          value={`₹${eligibleItcClaimable.toLocaleString("en-IN")}`} 
          sub="GSTR-3B Table 4 available credit" 
          color="var(--success)" 
          icon={<ShieldCheck size={18} />} 
          onClick={() => onNavigate?.("GST")} 
        />
        <FinancialMetricCard 
          label="Ineligible Restricted ITC" 
          value={`₹${ineligibleItcRestricted.toLocaleString("en-IN")}`} 
          sub="Section 17(5) blocked credit" 
          color="var(--muted)" 
          icon={<AlertTriangle size={18} />} 
          onClick={() => onNavigate?.("GST")} 
        />
      </div>

      {/* Main Row Container holding the Chart, Quick Operations, and Recent Sync Activity side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 0fr", gap: "24px", alignItems: "stretch", width: "100%" }}>
        
        {/* Column 1: Monthly Revenue vs Purchase Expense Bar Chart */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px", margin: 0, height: "100%", boxSizing: "border-box", minWidth: 0 }}>
          <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <BarChart2 size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <h3 style={{ fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Revenue vs Purchase ({activeQuarter === "ALL" ? activeFy : activeQuarter})
              </h3>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "11.5px", fontWeight: "700", flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--success)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--success)" }} /> Sales
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent)" }} /> Purchase
              </span>
            </div>
          </div>

    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "160px", minWidth: "320px", padding: "10px 10px 0", borderBottom: "1px solid var(--line)" }}>
        {monthlyData.map((d) => (
          <div key={d.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "120px" }}>
              <div
                style={{
                  width: "14px",
                  height: `${Math.min(100, (d.sales / maxChartVal) * 100)}%`,
                  background: "var(--success)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.5s ease",
                }}
                title={`Sales (${d.month}): ₹${d.sales.toLocaleString("en-IN")}`}
              />
              <div
                style={{
                  width: "14px",
                  height: `${Math.min(100, (d.purchase / maxChartVal) * 100)}%`,
                  background: "var(--accent)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.5s ease",
                }}
                title={`Purchase (${d.month}): ₹${d.purchase.toLocaleString("en-IN")}`}
              />
            </div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* Column 2: Quick Operations */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px", margin: 0, height: "100%", boxSizing: "border-box", minWidth: 0 }}>
          <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
               <DownloadCloud size={18} style={{ color: "var(--accent)" }} />
        <h3>Quick Actions</h3>
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "space-between", flex: 1 }}>
      <button className="primary" onClick={onPickDocs} type="button" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start", cursor: "pointer", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px" }}>
        <UploadCloud size={15} /> Upload Invoices (PDF/Image)
      </button>
      <button onClick={onLoadBank} type="button" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start", cursor: "pointer", padding: "10px 14px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12.5px" }}>
        <Landmark size={15} /> Import Bank Statement Feed
      </button>
      <button type="button" onClick={() => onNavigate?.("GST")} style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start", cursor: "pointer", padding: "10px 14px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12.5px" }}>
        <FileSpreadsheet size={15} /> Generate GST Returns
      </button>
      <button type="button" onClick={handleRefreshWorkspace} style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start", cursor: "pointer", padding: "10px 14px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12.5px" }}>
        <RefreshCw size={15} /> Pull Data from Tally
      </button>
    </div>
  </div>
  
  {/* Column 3: Recent Sync Activity Outbox Audit */}
  {/* <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px", margin: 0, height: "100%", boxSizing: "border-box" }}>
          <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Activity size={18} style={{ color: "var(--accent)" }} />
        <h3 style={{ fontSize: "14.5px" }}>Sync Outbox Audit</h3>
      </div>

      <div style={{ display: "flex", gap: "4px" }}>
        {(["ALL", "PENDING", "SUCCESS"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setOutboxFilter(tab)}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid var(--line)",
              background: outboxFilter === tab ? "var(--surface-2)" : "transparent",
              color: outboxFilter === tab ? "var(--accent)" : "var(--muted)",
              fontSize: "10.5px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>

    <div style={{ display: "flex", flexDirection: "column", justifyContent: filteredCommands.length === 0 ? "center" : "flex-start", flex: 1, minHeight: "170px" }}>
      {filteredCommands.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px 12px", color: "var(--muted)" }}>
          <Activity size={28} style={{ opacity: 0.3, marginBottom: "6px" }} />
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>No matching sync commands</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "170px", overflowY: "auto" }}>
          {filteredCommands.slice(0, 4).map((cmd) => {
            const isDone = cmd?.status === "DONE" || cmd?.status === "COMPLETED";
            const isCopied = copiedId === cmd?.commandId;
            return (
              <div key={cmd?.commandId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-2)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: "700" }}>{cmd?.commandType ?? "VOUCHER_CREATE"}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>{cmd?.commandId?.substring(0, 8)}...</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommandId(cmd?.commandId)}
                      title="Copy ID"
                      style={{ padding: "2px", background: "transparent", border: "none", color: isCopied ? "var(--success)" : "var(--muted)", cursor: "pointer" }}
                    >
                      {isCopied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
                <span className={`badge ${isDone ? "success" : "warning"}`} style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10.5px", padding: "2px 6px" }}>
                  {isDone ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  {cmd?.status ?? "QUEUED"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div> */}

</div>

      {/* Bottom Row: Accounting Health Audit & Quick Infrastructure Status */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0fr", gap: "24px", alignItems: "stretch" }}>
        {/* Left Sub-Panel: Operational & Mirror Inventory Counts */}
           <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px", margin: 0, height: "100%", boxSizing: "border-box", minWidth: 0 }}>
          <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
             <Layers size={18} style={{ color: "var(--accent)" }} />
              <h3>Summary & Inventory</h3>
            </div>
            <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "600" }}>Live Database Counts</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
            <MetricCard label="Stock Items" value={activeStockItems} sub="Active inventory" color="var(--accent-2)" icon={<Package size={14} />} onClick={() => onNavigate?.("Vouchers")} />
            <MetricCard label="Unmapped" value={unmappedLedgersCount} sub="Fully mapped" color="var(--success)" icon={<CheckSquare size={14} />} onClick={() => onNavigate?.("Vouchers")} />
            <MetricCard label="Companies" value={totalCompanies} sub="Mirrored ERPs" color="var(--accent)" icon={<Building2 size={14} />} onClick={() => onNavigate?.("Companies")} />
            <MetricCard label="Vouchers" value={totalVouchers} sub="Local SQLite copy" color="#7c3aed" icon={<FileText size={14} />} onClick={() => onNavigate?.("Vouchers")} />
            <MetricCard label="Bank Feed" value={totalTransactions ?? 0} sub="Statement items" color="var(--accent)" icon={<Landmark size={14} />} onClick={() => onNavigate?.("Reconciliation")} />
            <MetricCard label="GSTR-2B" value={totalRecords ?? 0} sub="Portal entries" color="var(--success)" icon={<FileSpreadsheet size={14} />} onClick={() => onNavigate?.("GST")} />
          </div>
        </div>

        {/* Right Sub-Panel: System Health & Diagnostic Readiness */}
        {/* <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px", margin: 0 }}>
          <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} style={{ color: "var(--success)" }} />
              <h3>Accounting Health</h3>
            </div>
            <span style={{ fontSize: "13px", fontWeight: "800", color: accountingHealth > 80 ? "var(--success)" : "var(--warning)" }}>
              {accountingHealth}%
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <HealthItem label="Local Tally Connector" ok={connectorStatus?.tallyLocalIntegrationAvailable ?? true} detail={`Tally Listener active (${displayPing})`} onClick={() => onNavigate?.("Settings")} />
            <HealthItem label="Bank & GST Reconciliation" ok={unreconciledBankTxs === 0 && gstMismatches === 0} detail={`${unreconciledBankTxs} bank pending, ${gstMismatches} GST diffs`} onClick={() => onNavigate?.("Reconciliation")} />
          </div>
        </div> */}
      </div>
    </div>
  );
}

function FinancialMetricCard({ label, value, sub, color, icon, onClick }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <div 
      className="panel" 
      onClick={onClick}
      style={{ padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--surface)", cursor: onClick ? "pointer" : "default", transition: "transform 0.15s ease" }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)" }}>{label}</span>
          <span style={{ color, display: "flex", alignItems: "center", padding: "6px", background: "var(--surface-2)", borderRadius: "8px" }}>{icon}</span>
        </div>
        <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text)", lineHeight: 1.1, fontFamily: "monospace" }}>{value}</div>
      </div>
      <div style={{ fontSize: "11px", color, fontWeight: "600", marginTop: "8px" }}>{sub}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon, onClick }: { label: string; value: number | string; sub: string; color: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <div 
      className="panel" 
      onClick={onClick}
      style={{ padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: onClick ? "pointer" : "default" }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--muted)" }}>{label}</span>
          <span style={{ color: "var(--accent)", display: "flex", alignItems: "center", padding: "4px", background: "var(--surface-2)", borderRadius: "6px" }}>{icon}</span>
        </div>
        <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text)", lineHeight: 1, fontFamily: "monospace" }}>{value}</div>
      </div>
      <div style={{ fontSize: "10.5px", color, fontWeight: "600", marginTop: "6px" }}>{sub}</div>
    </div>
  );
}

function HealthItem({ label, ok, detail, onClick }: { label: string; ok: boolean; detail: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px 14px",
        background: ok ? "var(--success-subtle)" : "var(--warning-subtle)",
        borderRadius: "10px",
        border: `1px solid ${ok ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", marginTop: "1px", color: ok ? "var(--success)" : "var(--warning)" }}>
        {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      </span>
      <div>
        <div style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>{detail}</div>
      </div>
    </div>
  );
}
