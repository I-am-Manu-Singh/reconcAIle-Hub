import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Send,
  FileSpreadsheet,
  Download,
  GitFork,
  Printer,
  Boxes
} from "lucide-react";
import { exportToCsv } from "../utils/csvExporter";
import { DynamicDataTable } from "../components/DynamicDataTable";
import { PrintSettingsModal } from "../components/PrintSettingsModal";
import { StockMasterModal } from "../components/StockMasterModal";

export interface LedgerItem {
  id: string;
  companyId: string;
  name: string;
  parentName: string | null;
  openingBalanceText: string | null;
  closingBalanceText: string | null;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  stateName?: string | null;
  pincode?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  creditLimit?: number | null;
  creditDays?: number | null;
  isBillWise?: number | null;
}

export interface LedgersViewProps {
  mirrorLedgers: readonly any[];
  selectedCompanyId?: string | null;
  mirrorCompanies?: readonly any[];
  onSelectCompany?: (id: string) => Promise<void> | void;
  onRefreshLedgers?: () => Promise<void> | void;
  onNavigateToVoucher?: (ledgerName: string) => void;
}

export const TALLY_STANDARD_GROUPS = [
  "Sundry Debtors",
  "Sundry Creditors",
  "Bank Accounts",
  "Bank OCC A/c",
  "Bank OD A/c",
  "Cash-in-Hand",
  "Sales Accounts",
  "Purchase Accounts",
  "Direct Expenses",
  "Indirect Expenses",
  "Direct Incomes",
  "Indirect Incomes",
  "Fixed Assets",
  "Current Assets",
  "Current Liabilities",
  "Duties & Taxes",
  "Capital Account",
  "Loans (Liability)",
  "Investments",
  "Provisions",
  "Stock-in-Hand",
  "Suspense A/c"
];

export function LedgersView({
  mirrorLedgers = [],
  selectedCompanyId = "ALL",
  mirrorCompanies = [],
  onSelectCompany,
  onRefreshLedgers,
  onNavigateToVoucher
}: LedgersViewProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<LedgerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Active Screen Tab ("ledgers" or "mapping")
  const [activeTab, setActiveTab] = useState<"ledgers" | "mapping">("ledgers");

  // Ledger Mapping Rules State
  const [ledgerMappings, setLedgerMappings] = useState<Array<{ id?: string; sourceName: string; tallyLedgerName: string; hitCount?: number; voucherType?: string }>>([]);
  const [newSourceName, setNewSourceName] = useState("");
  const [newTallyName, setNewTallyName] = useState("");
  const [newVoucherType, setNewVoucherType] = useState("Payment");

  // Load ledger mappings from SQLite per selected company
  const loadLedgerMappings = useCallback(async () => {
    if (!window.desktop?.documents?.listLedgerRules) return;
    try {
      const compId = selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : undefined;
      const rules = await window.desktop.documents.listLedgerRules(compId);
      if (rules && rules.length > 0) {
        setLedgerMappings(
          rules.map((r: any) => ({
            id: r.id,
            sourceName: r.narrationPattern,
            tallyLedgerName: r.matchedLedgerName,
            hitCount: r.hitCount || 1,
            voucherType: r.voucherType || "Payment",
          }))
        );
      } else {
        setLedgerMappings([
          { sourceName: "Sales Account", tallyLedgerName: "Sales Account (18% GST)", voucherType: "Sales", hitCount: 1 },
          { sourceName: "Purchase Account", tallyLedgerName: "Purchase Account (18% GST)", voucherType: "Purchase", hitCount: 1 },
          { sourceName: "Input CGST", tallyLedgerName: "CGST Input Account", voucherType: "Journal", hitCount: 1 },
          { sourceName: "Input SGST", tallyLedgerName: "SGST Input Account", voucherType: "Journal", hitCount: 1 },
          { sourceName: "Input IGST", tallyLedgerName: "IGST Input Account", voucherType: "Journal", hitCount: 1 },
          { sourceName: "Apex Digital Solutions", tallyLedgerName: "Apex Digital Solutions Pvt Ltd", voucherType: "Payment", hitCount: 1 },
        ]);
      }
    } catch (err) {
      console.warn("[LedgersView] Failed to load ledger mapping rules:", err);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    void loadLedgerMappings();
  }, [loadLedgerMappings]);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    name: "",
    parentName: "Sundry Debtors",
    openingBalance: "0.00",
    openingBalanceDrCr: "Dr" as "Dr" | "Cr",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
    stateName: "West Bengal (19)",
    pincode: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    creditLimit: 0,
    creditDays: 30,
    isBillWise: true
  });

  const activeCompanyName = useMemo(() => {
    if (!selectedCompanyId || selectedCompanyId === "ALL") return "All Companies (Unified)";
    const comp = mirrorCompanies.find((c: any) => c.id === selectedCompanyId);
    return comp ? (comp.displayName || comp.name) : "Selected Company";
  }, [selectedCompanyId, mirrorCompanies]);

  const filteredLedgers = useMemo(() => {
    return (mirrorLedgers as LedgerItem[]).filter((l) => {
      const matchSearch =
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.parentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.gstin || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.phone || "").includes(searchTerm);
      const matchGroup = selectedGroup === "ALL" || l.parentName === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [mirrorLedgers, searchTerm, selectedGroup]);

  const resetForm = () => {
    setFormData({
      name: "",
      parentName: "Sundry Debtors",
      openingBalance: "0.00",
      openingBalanceDrCr: "Dr",
      gstin: "",
      pan: "",
      email: "",
      phone: "",
      address: "",
      stateName: "West Bengal (19)",
      pincode: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankName: "",
      creditLimit: 0,
      creditDays: 30,
      isBillWise: true
    });
    setEditingLedger(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (ledger: LedgerItem) => {
    setEditingLedger(ledger);
    const opBal = ledger.openingBalanceText || "0.00 Dr";
    const parts = opBal.trim().split(" ");
    const numPart = parts[0]?.replace(/[^\d.-]/g, "") || "0.00";
    const drcrPart = parts[1]?.toUpperCase() === "CR" ? "Cr" : "Dr";

    setFormData({
      name: ledger.name,
      parentName: ledger.parentName || "Sundry Debtors",
      openingBalance: numPart,
      openingBalanceDrCr: drcrPart,
      gstin: ledger.gstin || "",
      pan: ledger.pan || "",
      email: ledger.email || "",
      phone: ledger.phone || "",
      address: ledger.address || "",
      stateName: ledger.stateName || "West Bengal (19)",
      pincode: ledger.pincode || "",
      bankAccountNumber: ledger.bankAccountNumber || "",
      bankIfsc: ledger.bankIfsc || "",
      bankName: ledger.bankName || "",
      creditLimit: ledger.creditLimit || 0,
      creditDays: ledger.creditDays || 30,
      isBillWise: ledger.isBillWise !== 0
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a valid ledger name.");
      return;
    }

    const companyIdToUse = (selectedCompanyId && selectedCompanyId !== "ALL")
      ? selectedCompanyId
      : (mirrorCompanies[0]?.id || "");

    setIsSubmitting(true);
    setFeedbackNotice(null);

    const payload = {
      id: editingLedger ? editingLedger.id : undefined,
      companyId: companyIdToUse,
      name: formData.name.trim(),
      parentName: formData.parentName,
      openingBalanceText: `${formData.openingBalance} ${formData.openingBalanceDrCr}`,
      closingBalanceText: `${formData.openingBalance} ${formData.openingBalanceDrCr}`,
      gstin: formData.gstin.trim().toUpperCase() || undefined,
      pan: formData.pan.trim().toUpperCase() || (formData.gstin.length >= 12 ? formData.gstin.slice(2, 12).toUpperCase() : undefined),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      stateName: formData.stateName,
      pincode: formData.pincode.trim() || undefined,
      bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
      bankIfsc: formData.bankIfsc.trim().toUpperCase() || undefined,
      bankName: formData.bankName.trim() || undefined,
      creditLimit: Number(formData.creditLimit) || 0,
      creditDays: Number(formData.creditDays) || 30,
      isBillWise: formData.isBillWise
    };

    try {
      if (window.desktop?.accountingMirror?.saveLedger) {
        await window.desktop.accountingMirror.saveLedger(payload);
      }
      setFeedbackNotice(`✓ Ledger [${formData.name}] successfully saved & synced across application.`);
      if (onRefreshLedgers) await onRefreshLedgers();
      setTimeout(() => {
        setIsCreateModalOpen(false);
        resetForm();
      }, 1000);
    } catch (err: any) {
      alert(`Failed to save ledger: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLedger = async (ledger: LedgerItem) => {
    if (!confirm(`Are you sure you want to delete ledger "${ledger.name}"?`)) return;
    try {
      if (window.desktop?.accountingMirror?.deleteLedger) {
        await window.desktop.accountingMirror.deleteLedger(ledger.id);
        if (onRefreshLedgers) await onRefreshLedgers();
      }
    } catch (err: any) {
      alert(`Failed to delete ledger: ${err?.message || String(err)}`);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredLedgers.map((l) => ({
      LedgerName: l.name,
      Group: l.parentName,
      OpeningBalance: l.openingBalanceText,
      ClosingBalance: l.closingBalanceText,
      GSTIN: l.gstin || "",
      PAN: l.pan || "",
      Phone: l.phone || "",
      Email: l.email || "",
      State: l.stateName || "",
      BankAccount: l.bankAccountNumber || "",
      BankIFSC: l.bankIfsc || "",
      BankName: l.bankName || ""
    }));
    exportToCsv(`Ledgers_${activeCompanyName.replace(/\s+/g, "_")}.csv`, rows);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner & Control Bar */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "14px",
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--accent-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)"
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "var(--text)" }}>
                Chart of Accounts & Ledgers
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "rgba(13, 148, 136, 0.1)",
                  color: "var(--accent)"
                }}
              >
                {filteredLedgers.length} Ledgers
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "var(--surface-2)",
                  color: "var(--muted)",
                  border: "1px solid var(--line)"
                }}
              >
                {activeCompanyName}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Manage accounts, parties, bank ledgers sync across invoices & vouchers.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
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
              cursor: "pointer"
            }}
            title="Open Tally-compatible Print Setup & PDF Exporter"
          >
            <Printer size={14} style={{ color: "var(--accent)" }} /> Print Setup
          </button>
          <button
            type="button"
            onClick={() => setShowStockModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "var(--accent-subtle)",
              border: "1px solid rgba(13,148,136,0.3)",
              color: "var(--accent)",
              fontSize: "12.5px",
              fontWeight: "700",
              cursor: "pointer"
            }}
            title="Manage Stock Items, Groups, Categories, Godowns, UoM & Batches"
          >
            <Boxes size={14} /> Stock Masters
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
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
              cursor: "pointer"
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          {onRefreshLedgers && (
            <button
              type="button"
              onClick={() => void onRefreshLedgers()}
              title="Refresh Ledgers from Local Database"
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
                cursor: "pointer"
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              borderRadius: "8px",
              background: "var(--accent)",
              border: "none",
              color: "#fff",
              fontSize: "12.5px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)"
            }}
          >
            <Plus size={15} /> Create Ledger
          </button>
        </div>
      </div>

      {/* Segment Navigation Tabs */}
      <div style={{ display: "flex", gap: "6px", background: "var(--surface)", padding: "6px 14px", borderRadius: "12px", border: "1px solid var(--line)", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setActiveTab("ledgers")}
          aria-selected={activeTab === "ledgers"}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: activeTab === "ledgers" ? "var(--accent-subtle)" : "transparent",
            color: activeTab === "ledgers" ? "var(--accent)" : "var(--text)",
            border: activeTab === "ledgers" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
            transition: "all 0.15s ease"
          }}
        >
          <BookOpen size={15} /> Master Ledgers ({filteredLedgers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mapping")}
          aria-selected={activeTab === "mapping"}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: activeTab === "mapping" ? "var(--accent-subtle)" : "transparent",
            color: activeTab === "mapping" ? "var(--accent)" : "var(--text)",
            border: activeTab === "mapping" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
            transition: "all 0.15s ease"
          }}
        >
          <GitFork size={15} /> Ledger Mapping & Aliasing ({ledgerMappings.length})
        </button>
      </div>

      {activeTab === "ledgers" ? (
        <>
          {/* Filter and Search Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: "12px",
              background: "var(--surface)",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid var(--line)"
            }}
          >
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: "12px", top: "11px", color: "var(--muted)" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by ledger name, group, GSTIN, or phone..."
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  fontSize: "12.5px"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={15} color="var(--muted)" />
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  fontSize: "12.5px",
                  fontWeight: "600"
                }}
              >
                <option value="ALL">All Account Groups</option>
                {TALLY_STANDARD_GROUPS.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ledgers Table */}
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "14px",
              border: "1px solid var(--line)",
              overflow: "hidden",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontWeight: "700" }}>Ledger Name</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontWeight: "700" }}>Group / Parent</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontWeight: "700" }}>GSTIN / PAN</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontWeight: "700" }}>State / Contact</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--muted)", fontWeight: "700" }}>Opening Balance</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--muted)", fontWeight: "700" }}>Closing Balance</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: "var(--muted)", fontWeight: "700", width: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                        No ledgers found matching your search. Click "Create Ledger" to add your first master account.
                      </td>
                    </tr>
                  ) : (
                    filteredLedgers.map((l, idx) => (
                      <tr
                        key={l.id || `ledger_${l.name}_${idx}`}
                        style={{
                          borderBottom: "1px solid var(--line)",
                          transition: "background 0.15s ease"
                        }}
                      >

                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: "700", color: "var(--text)" }}>{l.name}</div>
                          {l.bankAccountNumber && (
                            <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                              <CreditCard size={11} /> {l.bankName || "Bank"}: {l.bankAccountNumber} ({l.bankIfsc})
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "var(--surface-2)",
                              border: "1px solid var(--line)",
                              fontSize: "11.5px",
                              fontWeight: "600",
                              color: "var(--text)"
                            }}
                          >
                            {l.parentName || "Primary"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px" }}>
                          {l.gstin ? (
                            <div style={{ color: "var(--text)", fontWeight: "600" }}>{l.gstin}</div>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                          {l.pan && <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>PAN: {l.pan}</div>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ color: "var(--text)", fontSize: "12px" }}>{l.stateName || "—"}</div>
                          {l.phone && (
                            <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                              <Phone size={10} /> {l.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: "600" }}>
                          {l.openingBalanceText || "0.00"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "var(--accent)" }}>
                          {l.closingBalanceText || l.openingBalanceText || "0.00"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => openEditModal(l)}
                              title="Edit Ledger Details"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                padding: "4px"
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLedger(l)}
                              title="Delete Ledger"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "4px"
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Tab Content 2: Company Ledger Aliasing & Auto-Mapping */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "800" }}>Tally ERP Ledger Aliasing & Auto-Mapping</h3>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted)" }}>
                  Map incoming document vendor names, statement narrations & tax ledger strings to official Tally master ledgers for {activeCompanyName}.
                </p>
              </div>
            </div>

            {/* Add New Mapping Row */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", background: "var(--surface-2)", padding: "14px", borderRadius: "10px", border: "1px solid var(--line)", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Source Keyword / Narration Pattern (e.g. Swiggy / UPI / Rent / Zomato)"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                style={{ flex: 1.4, padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
              />
              <input
                type="text"
                placeholder="Mapped Tally Ledger (e.g. Staff Welfare / Bank Charges)"
                value={newTallyName}
                onChange={(e) => setNewTallyName(e.target.value)}
                style={{ flex: 1.4, padding: "9px 12px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px" }}
              />
              <select
                value={newVoucherType}
                onChange={(e) => setNewVoucherType(e.target.value)}
                style={{ width: "120px", padding: "9px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700" }}
              >
                <option value="Payment">Payment</option>
                <option value="Receipt">Receipt</option>
                <option value="Contra">Contra</option>
                <option value="Journal">Journal</option>
                <option value="Sales">Sales</option>
                <option value="Purchase">Purchase</option>
              </select>
              <button
                type="button"
                className="primary"
                onClick={async () => {
                  if (newSourceName.trim() && newTallyName.trim()) {
                    const compId = selectedCompanyId && selectedCompanyId !== "ALL" ? selectedCompanyId : (mirrorCompanies[0]?.id || "");
                    if (window.desktop?.documents?.saveLedgerRule) {
                      await window.desktop.documents.saveLedgerRule(compId, {
                        narrationPattern: newSourceName.trim(),
                        matchedLedgerName: newTallyName.trim(),
                        matchedLedgerId: null,
                        voucherType: newVoucherType,
                      });
                    }
                    await loadLedgerMappings();
                    setNewSourceName("");
                    setNewTallyName("");
                  }
                }}
                style={{ padding: "9px 18px", borderRadius: "6px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + Add Rule
              </button>
            </div>

            <DynamicDataTable
              tableName="Tally ERP Ledger Aliasing & Auto-Mapping Rules"
              initialColumns={[
                { key: "sourceName", label: "Extracted Keyword / Narration Pattern", dataType: "text", editable: true },
                { key: "tallyLedgerName", label: "Mapped Tally Master Ledger Name", dataType: "text", editable: true },
                { key: "voucherType", label: "Default Voucher Type", dataType: "text", editable: false },
                { key: "hitCount", label: "Usage Matches", dataType: "number", editable: false },
              ]}
              initialData={ledgerMappings.map((m, idx) => ({
                id: m.id || `map_${idx}`,
                sourceName: m.sourceName || "Sales Account",
                tallyLedgerName: m.tallyLedgerName || "Sales Account (18% GST)",
                voucherType: m.voucherType || "Payment",
                hitCount: m.hitCount || 1,
              }))}
            />
          </div>
        </div>
      )}

      {/* CREATE / EDIT LEDGER MODAL */}
      {isCreateModalOpen && (
        <div
          onClick={() => setIsCreateModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "92vh",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                background: "var(--surface-2)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BookOpen size={18} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                  {editingLedger ? `Edit Ledger: ${editingLedger.name}` : "Create New Master Ledger"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {feedbackNotice && (
              <div style={{ padding: "10px 20px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "12.5px", fontWeight: "700" }}>
                {feedbackNotice}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveLedger} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Primary Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Ledger Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Kailash Hardware / HDFC Current A/c / IGST Input"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "13px", fontWeight: "700" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Account Group (Under) *
                  </label>
                  <select
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "600" }}
                  >
                    {TALLY_STANDARD_GROUPS.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opening Balance */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", textAlign: "right" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Dr / Cr
                  </label>
                  <select
                    value={formData.openingBalanceDrCr}
                    onChange={(e) => setFormData({ ...formData, openingBalanceDrCr: e.target.value as any })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700" }}
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>

              {/* Statutory GST & PAN */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    GSTIN / UIN
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData({
                        ...formData,
                        gstin: val,
                        pan: val.length >= 12 ? val.slice(2, 12) : formData.pan
                      });
                    }}
                    placeholder="19AGDPK0803A1Z4"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontFamily: "monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="AGDPK0803A"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              {/* Contact & Address */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98300 12345"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="accounts@vendor.com"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px" }}
                  />
                </div>
              </div>

              {/* State & Full Address */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    State / Place of Supply
                  </label>
                  <input
                    type="text"
                    value={formData.stateName}
                    onChange={(e) => setFormData({ ...formData, stateName: e.target.value })}
                    placeholder="West Bengal (19)"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="700001"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Registered Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot #, Street, City, Landmark..."
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", resize: "none" }}
                />
              </div>

              {/* Banking Details (For Bank or Party Beneficiary) */}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--text)", display: "block", marginBottom: "8px" }}>
                  Banking & Settlement Details
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g. State Bank of India"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      placeholder="389920192841"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formData.bankIfsc}
                      onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                      placeholder="SBIN0001824"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", fontFamily: "monospace" }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "var(--accent)",
                    border: "none",
                    color: "#fff",
                    fontSize: "12.5px",
                    fontWeight: "800",
                    cursor: isSubmitting ? "not-allowed" : "pointer"
                  }}
                >
                  <Send size={14} /> {isSubmitting ? "Saving..." : "Save & Sync Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Setup Modal */}
      <PrintSettingsModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        documentTitle={`Ledger_Statement_${activeCompanyName.replace(/\s+/g, "_")}`}
        reportData={filteredLedgers.map((l) => ({
          Name: l.name,
          Group: l.parentName || "Primary",
          GSTIN: l.gstin || "N/A",
          OpeningBalance: l.openingBalanceText || "0.00",
          ClosingBalance: l.closingBalanceText || "0.00",
          State: l.stateName || "N/A"
        }))}
      />

      {/* Stock Master Management Modal */}
      <StockMasterModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        activeCompanyId={selectedCompanyId === "ALL" ? "" : selectedCompanyId}
      />
    </div>
  );
}
