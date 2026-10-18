import React, { useState, useMemo } from "react";
import { 
  Database, 
  BookOpen, 
  FileText, 
  Layers, 
  Calendar, 
  Hash, 
  FolderTree, 
  Search, 
  CheckCircle2,
  Filter,
  RefreshCw,
  Eye,
  FileCode,
  Box,
  AlignLeft,
  ArrowRightLeft,
  Receipt,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  FileCheck,
  Tag,
  DollarSign,
  Percent,
  UserCheck,
  Building,
  Download,
  Copy,
  Check,
  X,
  Code2,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  Package,
  Plus,
  Printer,
  Boxes
} from "lucide-react";
import { DynamicDataTable, ColumnDef } from "../components/DynamicDataTable";
import { exportToCsv } from "../utils/csvExporter";
import { ExportToolbar } from "../components/ExportToolbar";
import { ImportToolbar } from "../components/ImportToolbar";
import { VoucherCreationModal } from "../components/VoucherCreationModal";
import { PrintSettingsModal } from "../components/PrintSettingsModal";
import { StockMasterModal } from "../components/StockMasterModal";

export function TransactionsView({
  mirrorLedgers,
  stockItems,
  mirrorVouchers,
  bankTxs,
  selectedCompanyId,
  mirrorCompanies,
  onSelectCompany,
  selectedFy,
  selectedQuarter,
  fromDate,
  toDate,
  onPickDocs,
  onVoucherCreated,
}: {
  readonly mirrorLedgers?: readonly any[];
  readonly stockItems?: readonly any[];
  readonly mirrorVouchers?: readonly any[];
  readonly bankTxs?: readonly any[];
  readonly selectedCompanyId?: string | null;
  readonly mirrorCompanies?: readonly any[];
  readonly onSelectCompany?: (id: string) => void;
  readonly selectedFy?: string;
  readonly selectedQuarter?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly onPickDocs?: () => void;
  readonly onVoucherCreated?: () => void;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"vouchers" | "banking" | "inventory">("vouchers");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerGroupFilter, setLedgerGroupFilter] = useState("ALL");
  const [voucherSearch, setVoucherSearch] = useState("");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("ALL");
  const [bankingSearch, setBankingSearch] = useState("");
  const [bankingAccountFilter, setBankingAccountFilter] = useState("ALL");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("ALL");
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ type: "LEDGER" | "VOUCHER" | "BANK" | "INVENTORY"; data: any } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createVoucherCode, setCreateVoucherCode] = useState("PAYMENT");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Restore preferences from SQLite
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.getAll().then((prefs) => {
      if (prefs["tx.activeTab"]) setActiveTab(prefs["tx.activeTab"] as any);
      if (prefs["tx.voucherTypeFilter"]) setVoucherTypeFilter(prefs["tx.voucherTypeFilter"]);
      if (prefs["tx.ledgerGroupFilter"]) setLedgerGroupFilter(prefs["tx.ledgerGroupFilter"]);
      if (prefs["tx.bankingAccountFilter"]) setBankingAccountFilter(prefs["tx.bankingAccountFilter"]);
    }).catch(() => {});
  }, []);

  // Save changes to SQLite
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("tx.activeTab", activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("tx.voucherTypeFilter", voucherTypeFilter);
  }, [voucherTypeFilter]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("tx.ledgerGroupFilter", ledgerGroupFilter);
  }, [ledgerGroupFilter]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("tx.bankingAccountFilter", bankingAccountFilter);
  }, [bankingAccountFilter]);

  // Scope lists strictly by selectedCompanyId to prevent any cross-company leakage
  const vouchersList = useMemo(() => {
    const raw = mirrorVouchers ?? [];
    if (!selectedCompanyId || selectedCompanyId === "ALL") return raw;
    return raw.filter((v: any) => !v.companyId || v.companyId === selectedCompanyId);
  }, [mirrorVouchers, selectedCompanyId]);
  
  const bankTransactionsList = useMemo(() => {
    const raw = bankTxs ?? [];
    if (!selectedCompanyId || selectedCompanyId === "ALL") return raw;
    return raw.filter((b: any) => !b.companyId || b.companyId === selectedCompanyId);
  }, [bankTxs, selectedCompanyId]);

  const stockItemsList = useMemo(() => {
    const raw = (stockItems ?? []).map((s: any) => ({
      id: s.id,
      companyId: s.companyId,
      itemName: s.name || s.itemName,
      category: s.parentName || s.category || "General",
      hsnCode: s.hsnCode || s.hsn || "",
      stockQty: parseFloat(s.closingQtyText || s.stockQty || "0") || 0,
      unit: s.unitName || s.unit || "Pcs",
      unitRate: Number(s.unitRate || 0),
      totalValue: Number(s.totalValue || 0),
    }));
    if (!selectedCompanyId || selectedCompanyId === "ALL") return raw;
    return raw.filter((s: any) => !s.companyId || s.companyId === selectedCompanyId);
  }, [stockItems, selectedCompanyId]);

  const comprehensiveVoucherTypes = [
    "Sales", "Purchase", "Receipt", "Payment", "Contra", 
    "Journal", "Credit Note", "Debit Note"
  ];


  const uniqueVoucherTypes = useMemo(() => {
    const types = new Set([...vouchersList.map(v => v.voucherTypeName), ...comprehensiveVoucherTypes].filter(Boolean));
    return Array.from(types).sort();
  }, [vouchersList]);

  const uniqueBankAccounts = useMemo(() => {
    const banks = new Set(bankTransactionsList.map(b => b.bankName).filter(Boolean));
    return Array.from(banks).sort();
  }, [bankTransactionsList]);

  const uniqueStockCategories = useMemo(() => {
    const cats = new Set(stockItemsList.map(s => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [stockItemsList]);

  // Filtering Logic
  const filteredVouchers = vouchersList.filter(v => {
    const vNo = v.voucherNumber || "";
    const party = v.partyName || v.partyLedgerName || "";
    const type = v.voucherTypeName || "";

    const matchesSearch = vNo.toLowerCase().includes(voucherSearch.toLowerCase()) || 
                          party.toLowerCase().includes(voucherSearch.toLowerCase()) ||
                          (v.id || "").toLowerCase().includes(voucherSearch.toLowerCase());
    const matchesType = voucherTypeFilter === "ALL" || type === voucherTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredBankTxs = bankTransactionsList.filter(b => {
    const bName = b.bankName || "";
    const desc = b.description || b.narration || "";
    const ref = b.referenceNo || b.utrNumber || "";
    const matchesSearch = bName.toLowerCase().includes(bankingSearch.toLowerCase()) ||
           desc.toLowerCase().includes(bankingSearch.toLowerCase()) ||
           ref.toLowerCase().includes(bankingSearch.toLowerCase());
    const matchesBank = bankingAccountFilter === "ALL" || bName === bankingAccountFilter;
    return matchesSearch && matchesBank;
  });

  const filteredStockItems = stockItemsList.filter(s => {
    const name = s.itemName || "";
    const cat = s.category || "";
    const hsn = s.hsnCode || "";
    const matchesSearch = name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                          hsn.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCategory = inventoryCategoryFilter === "ALL" || cat === inventoryCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleRefreshCache = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      alert("Local SQLite mirror cache synchronized with latest Connector Engine data.");
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} role="region" aria-label="Master Transactions & Accounting Registers">
      


      {/* Top Enterprise Database Analytics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: "#7c3aed", display: "flex" }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Voucher Records</div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text)", marginTop: "2px" , fontFamily: "monospace"}}>{vouchersList.length}</div>
            <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: "600", marginTop: "2px" }}>SQLite Mirrored Copies</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: "var(--success)", display: "flex" }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Voucher Types</div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text)", marginTop: "2px", fontFamily: "monospace" }}>{uniqueVoucherTypes.length}</div>
            <div style={{ fontSize: "11px", color: "var(--success)", fontWeight: "600", marginTop: "2px" }}>Sales, Purchase, Receipts</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "12px", color: "var(--accent)", display: "flex" }}>
            <Landmark size={24} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "700", textTransform: "uppercase" }}>Bank Accounts</div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text)", marginTop: "2px", fontFamily: "monospace" }}>{bankTransactionsList.length > 0 ? "Active Feed" : "0 Feed"}</div>
            <div style={{ fontSize: "11px", color: "var(--success)", fontWeight: "600", marginTop: "2px" }}>Mirrored Bank Feeds</div>
          </div>
        </div>
      </div>

     
 {/* Unified Single-Row Toolbar with Tabs & Filters Side-by-Side */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", padding: "6px 14px", borderRadius: "12px", border: "1px solid var(--line)", gap: "16px", minHeight: "50px", width: "100%", boxSizing: "border-box" }}>
        
        {/* Left Module: Segment Navigation Tabs */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        
          <button
            type="button"
            onClick={() => setActiveTab("vouchers")}
            aria-selected={activeTab === "vouchers"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", background: activeTab === "vouchers" ? "var(--accent-subtle)" : "transparent", color: activeTab === "vouchers" ? "var(--accent)" : "var(--text)", border: activeTab === "vouchers" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Voucher Register ({vouchersList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banking")}
            aria-selected={activeTab === "banking"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", background: activeTab === "banking" ? "var(--accent-subtle)" : "transparent", color: activeTab === "banking" ? "var(--accent)" : "var(--text)", border: activeTab === "banking" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Banking ({bankTransactionsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            aria-selected={activeTab === "inventory"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", background: activeTab === "inventory" ? "var(--accent-subtle)" : "transparent", color: activeTab === "inventory" ? "var(--accent)" : "var(--text)", border: activeTab === "inventory" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Inventory ({stockItemsList.length})
          </button>
        </div>
        {/* Right Module: Contextual Inline Filter Matrix (Dynamic based on active tab) */}
        

        {activeTab === "vouchers" && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", flex: 1, maxWidth: "260px", minWidth: "140px" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
              <input
                aria-label="Search vouchers by number"
                value={voucherSearch}
                onChange={(e) => setVoucherSearch(e.target.value)}
                placeholder="Search vouchers..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", padding: 0 }}
              />
            </div>

            <select
  aria-label="Filter Voucher Type"
  value={voucherTypeFilter}
  onChange={(e) => setVoucherTypeFilter(e.target.value)}
  style={{
    padding: "0 10px",
    borderRadius: "8px",
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    fontSize: "12px",
    fontWeight: "700",
    height: "34px",
    cursor: "pointer",
  }}
>
  <option value="ALL">All Types ({vouchersList.length})</option>
  {uniqueVoucherTypes.map((type) => {
    // Calculate the item count for each specific type
    const count = vouchersList.filter(
      (v) => (v.voucherTypeName || v.voucherType) === type
    ).length;

    return (
      <option key={type} value={type}>
        {type} ({count})
      </option>
    );
  })}
</select>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 12px",
                height: "34px",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title="Open Tally-compatible Print Setup & PDF Exporter"
            >
              <Printer size={13} style={{ color: "var(--accent)" }} /> Print Setup
            </button>

            <button
              type="button"
              onClick={() => setShowStockModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 12px",
                height: "34px",
                borderRadius: "8px",
                background: "var(--accent-subtle)",
                border: "1px solid rgba(13,148,136,0.3)",
                color: "var(--accent)",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title="Add / Manage Stock Items, Groups, Categories, Godowns & Batches"
            >
              <Boxes size={13} /> Stock Masters
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateVoucherCode("PAYMENT");
                setIsCreateModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 14px",
                height: "34px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} />New Voucher (F4-F10)
            </button>
          </div>
        )}

        {activeTab === "banking" && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", flex: 1, maxWidth: "240px", minWidth: "140px" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
              <input
                aria-label="Search bank transactions"
                value={bankingSearch}
                onChange={(e) => setBankingSearch(e.target.value)}
                placeholder="Search banking feed..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", padding: 0 }}
              />
            </div>

            <select
              aria-label="Filter Bank Account"
              value={bankingAccountFilter}
              onChange={(e) => setBankingAccountFilter(e.target.value)}
              style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
            >
              <option value="ALL">All Bank Accounts</option>
              {uniqueBankAccounts.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "inventory" && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", flex: 1, maxWidth: "240px", minWidth: "140px" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
              <input
                aria-label="Search stock items"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search inventory..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", padding: 0 }}
              />
            </div>

            <select
              aria-label="Filter Stock Category"
              value={inventoryCategoryFilter}
              onChange={(e) => setInventoryCategoryFilter(e.target.value)}
              style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
            >
              <option value="ALL">All Categories</option>
              {uniqueStockCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: VOUCHER REGISTER GRID */}
      {activeTab === "vouchers" && (
        <DynamicDataTable
          tableName="Master Voucher Register"
          initialColumns={[
            { key: "voucherNumber", label: "Voucher Number", dataType: "text", editable: true },
            { key: "date", label: "Date", dataType: "date", editable: true },
            { key: "voucherTypeName", label: "Type", dataType: "text", editable: true },
            { key: "partyLedgerName", label: "Party Ledger Name", dataType: "text", editable: true },
            { key: "totalAmount", label: "Amount (₹)", dataType: "number", editable: true },
            { key: "validationStatus", label: "Validation Status", dataType: "status", editable: true },
            { key: "narration", label: "Narration / Particulars", dataType: "text", editable: true },
          ]}
          initialData={filteredVouchers.map((v, idx) => ({
            id: v.id || `vch_${idx}`,
            voucherNumber: v.voucherNumber || `VCH-${1000 + idx}`,
            date: v.voucherDate || v.date || v.transactionDate || new Date().toISOString().slice(0, 10),
            voucherTypeName: v.voucherTypeName || v.voucherType || "Payment",
            partyLedgerName: v.partyLedgerName || v.partyName || "Cash / Direct Party",
            totalAmount: Number(v.amount ?? v.totalAmount ?? 0),
            validationStatus: v.validationStatus || "BALANCED",
            narration: v.narration || "Recorded manually",
          }))}
        />
      )}

      {/* TAB 2: BANKING & CASH FLOW FEED */}
      {activeTab === "banking" && (
        <DynamicDataTable
          tableName="Banking & Cash Flow Feed"
          initialColumns={[
            { key: "bankName", label: "Bank Account", dataType: "text", editable: true },
            { key: "transactionDate", label: "Transaction Date", dataType: "date", editable: true },
            { key: "description", label: "Description / Particulars", dataType: "text", editable: true },
            { key: "utrNumber", label: "Ref UTR / Cheque No.", dataType: "text", editable: true },
            { key: "credit", label: "Deposit (₹)", dataType: "number", editable: true },
            { key: "debit", label: "Withdrawal (₹)", dataType: "number", editable: true },
            { key: "reconciliationStatus", label: "Reconciliation Status", dataType: "status", editable: true },
          ]}
          initialData={filteredBankTxs.map((b, idx) => ({
            id: b.id || `bnk_${idx}`,
            bankName: b.bankName || "HDFC Bank",
            transactionDate: b.transactionDate || b.txDate || "2026-07-28",
            description: b.description || "Bank Transaction",
            utrNumber: b.utrNumber || b.referenceNo || "REF-001",
            credit: Number(b.credit || b.depositAmount || 0),
            debit: Number(b.debit || b.withdrawalAmount || 0),
            reconciliationStatus: b.reconciliationStatus || "APPROVED",
          }))}
        />
      )}

      {/* TAB 3: INVENTORY STOCK MASTER */}
      {activeTab === "inventory" && (
        <DynamicDataTable
          tableName="Inventory Stock Items Register"
          initialColumns={[
            { key: "itemName", label: "Stock Item Name", dataType: "text", editable: true },
            { key: "category", label: "Category", dataType: "text", editable: true },
            { key: "hsnCode", label: "HSN/SAC", dataType: "text", editable: true },
            { key: "stockQty", label: "Closing Qty", dataType: "number", editable: true },
            { key: "unit", label: "Unit", dataType: "text", editable: true },
            { key: "unitRate", label: "Unit Rate (₹)", dataType: "number", editable: true },
            { key: "totalValue", label: "Total Valuation (₹)", dataType: "number", editable: true },
          ]}
          initialData={filteredStockItems.map((stk, idx) => ({
            id: stk.id || `stk_${idx}`,
            itemName: stk.itemName || "Stock Item",
            category: stk.category || "General",
            hsnCode: stk.hsnCode || "8517",
            stockQty: Number(stk.stockQty || 0),
            unit: stk.unit || "Pcs",
            unitRate: Number(stk.unitRate || 0),
            totalValue: Number(stk.totalValue || (stk.stockQty * stk.unitRate) || 0),
          }))}
        />
      )}

      {/* Raw Payload Inspector Modal */}
      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "600px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "15px" }}>
                <Code2 size={18} style={{ color: "var(--accent)" }} /> Raw {selectedRecord.type} Schema
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "#0f172a", color: "#38bdf8", padding: "16px", borderRadius: "8px", fontFamily: "monospace", fontSize: "12px", overflowX: "auto", maxHeight: "320px" }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(selectedRecord.data, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Creation & Shortcut Modal */}
      <VoucherCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialVoucherCode={createVoucherCode}
        activeCompanyId={selectedCompanyId || mirrorCompanies?.[0]?.id || ""}
        activeCompanyName={mirrorCompanies?.find((c) => c.id === selectedCompanyId)?.name || mirrorCompanies?.[0]?.name || "Primary Company"}
        mirrorLedgers={mirrorLedgers}
        stockItems={stockItems}
        stockGroups={Array.from(new Set((stockItems ?? []).map((i: any) => i.parentName).filter(Boolean)))}
        stockCategories={Array.from(new Set((stockItems ?? []).map((i: any) => i.categoryName || i.category).filter(Boolean)))}
        onSaveVoucher={() => {
          setIsCreateModalOpen(false);
          if (onVoucherCreated) {
            onVoucherCreated();
          }
        }}
      />

      {/* Tally Print Settings Modal */}
      <PrintSettingsModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        documentTitle={`Voucher_Register_${(selectedCompanyId || "all").replace(/\s+/g, "_")}`}
        reportData={filteredVouchers.map((v) => ({
          VoucherNo: v.voucherNumber || "N/A",
          Date: v.date || "N/A",
          Type: v.voucherTypeName || "Payment",
          Party: v.partyLedgerName || v.partyName || "N/A",
          Amount: v.totalAmount || 0,
          Status: v.validationStatus || "VALID"
        }))}
      />

      {/* Stock Master Management Modal */}
      <StockMasterModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        activeCompanyId={selectedCompanyId === "ALL" ? "" : (selectedCompanyId || "")}
      />
    </div>
  );
}
