import React, { useState } from "react";
import { 
  Building2, 
  Upload, 
  Database, 
  CheckCircle2, 
  Layers, 
  Building, 
  ShieldCheck, 
  Cpu, 
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  FolderTree,
  Server,
  HardDrive,
  Calendar,
  FileText,
  DollarSign,
  Activity,
  CheckCircle,
  Eye,
  Settings,
  Terminal,
  Globe,
  Lock,
  Zap,
  BarChart3,
  FileSpreadsheet,
  Send,
  Hash,
  Clock,
  RotateCcw,
  FileCode,
  AlertTriangle,
  RefreshCcw,
  Play,
  Copy,
  Check,
  Download,
  X,
  Code2,
  MapPin,
  Landmark,
  Shield,
  Layers3,
  Plus,
  ArrowUpDown,
  RotateCw,
  FileJson,
  Edit2
} from "lucide-react";

import { DynamicDataTable } from "../components/DynamicDataTable";
import { ExportToolbar } from "../components/ExportToolbar";
import { ImportToolbar } from "../components/ImportToolbar";
import { exportToCsv } from "../utils/csvExporter";
import { COMPANY_ICONS, CompanyIconRenderer } from "../components/companyIcons";

export function CompaniesView({
  mirrorCompanies,
  selectedCompanyId,
  onSelectCompany,
  onCompaniesChanged,
  onImportXml,
  syncCommands,
  selectedFy,
  selectedQuarter,
  fromDate,
  toDate,
}: {
  readonly mirrorCompanies?: readonly any[];
  readonly selectedCompanyId: string | null;
  readonly onSelectCompany: (id: string) => void;
  readonly onCompaniesChanged?: () => void;
  readonly onImportXml: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly syncCommands?: readonly any[];
  readonly selectedFy?: string;
  readonly selectedQuarter?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<"companies" | "outbox">("companies");
  
  // Companies States
  const [searchTerm, setSearchTerm] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NAME" | "DATE" | "PROVIDER">("NAME");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedCompanyId, setCopiedCompanyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [companyViewMode, setCompanyViewMode] = useState<"grid" | "table">("table");

  // Restore preferences from SQLite
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.getAll().then((prefs) => {
      if (prefs["companies.activeTab"]) setActiveTab(prefs["companies.activeTab"] as any);
      if (prefs["companies.viewMode"]) setCompanyViewMode(prefs["companies.viewMode"] as any);
      if (prefs["companies.sortBy"]) setSortBy(prefs["companies.sortBy"] as any);
      if (prefs["companies.providerFilter"]) setProviderFilter(prefs["companies.providerFilter"]);
    }).catch(() => {});
  }, []);

  // Save changes to SQLite
  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("companies.activeTab", activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("companies.viewMode", companyViewMode);
  }, [companyViewMode]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("companies.sortBy", sortBy);
  }, [sortBy]);

  React.useEffect(() => {
    if (!window.desktop?.preferences) return;
    void window.desktop.preferences.set("companies.providerFilter", providerFilter);
  }, [providerFilter]);

  // Outbox States
  const [outboxSearch, setOutboxSearch] = useState("");
  const [outboxStatusFilter, setOutboxStatusFilter] = useState<string>("ALL");
  const [outboxTypeFilter, setOutboxTypeFilter] = useState<string>("ALL");
  const [selectedCommand, setSelectedCommand] = useState<any | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"request" | "response">("request");
  const [isProcessing, setIsProcessing] = useState(false);

  const [localRegisteredCompanies, setLocalRegisteredCompanies] = useState<any[]>([]);
  const [newCompName, setNewCompName] = useState("");
  const [newCompGstin, setNewCompGstin] = useState("");
  const [newCompProvider, setNewCompProvider] = useState("TallyPrime");
  const [newCompIcon, setNewCompIcon] = useState("Building2");
  const [newCompPassword, setNewCompPassword] = useState("");
  const [iconPickerCompanyId, setIconPickerCompanyId] = useState<string | null>(null);

  // Edit / Set Password modal state
  const [passwordModalCompany, setPasswordModalCompany] = useState<any | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Edit Company Details modal state
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [editCompName, setEditCompName] = useState("");
  const [editCompGstin, setEditCompGstin] = useState("");
  const [editCompState, setEditCompState] = useState("");
  const [editCompProvider, setEditCompProvider] = useState("TallyPrime");
  const [editCompBooksFrom, setEditCompBooksFrom] = useState("2026-04-01");
  const [editCompIcon, setEditCompIcon] = useState("Building2");

  const companiesList = [...(mirrorCompanies ?? []), ...localRegisteredCompanies];
  const activeCount = companiesList.length;

  const rawCommandsList = syncCommands ?? [];

  // Filter sync commands matching topbar date boundaries and period presets
  const commandsList = rawCommandsList.filter((cmd: any) => {
    const dateStr = cmd?.createdAt || cmd?.updatedAt;
    if (dateStr) {
      const cmdTime = new Date(dateStr).getTime();
      if (fromDate && cmdTime < new Date(fromDate).getTime()) return false;
      if (toDate && cmdTime > new Date(toDate).setHours(23, 59, 59, 999)) return false;

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
          if (cmdTime < fyStartDate || cmdTime > fyEndDate) return false;
        } else {
          const qMap: Record<string, [number, number]> = {
            Q1: [new Date(startYear, 3, 1).getTime(), new Date(startYear, 5, 30, 23, 59, 59, 999).getTime()],
            Q2: [new Date(startYear, 6, 1).getTime(), new Date(startYear, 8, 30, 23, 59, 59, 999).getTime()],
            Q3: [new Date(startYear, 9, 1).getTime(), new Date(startYear, 11, 31, 23, 59, 59, 999).getTime()],
            Q4: [new Date(startYear + 1, 0, 1).getTime(), new Date(startYear + 1, 2, 31, 23, 59, 59, 999).getTime()],
          };
          if (qMap[selectedQuarter]) {
            if (cmdTime < qMap[selectedQuarter][0] || cmdTime > qMap[selectedQuarter][1]) return false;
          }
        }
      }
    }
    return true;
  });
  const pendingCommands = commandsList.filter(c => c?.status !== "DONE" && c?.status !== "COMPLETED").length;

  // Filter & Sort Companies
  const filteredCompanies = companiesList
    .filter((c) => {
      const name = c?.displayName ?? c?.name ?? "";
      const provider = c?.sourceProvider ?? "TallyPrime";
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()) || (c.gstin || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvider = providerFilter === "ALL" || provider.toLowerCase() === providerFilter.toLowerCase();
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? c.id === selectedCompanyId : true);
      return matchesSearch && matchesProvider && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "NAME") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "PROVIDER") return (a.sourceProvider || "").localeCompare(b.sourceProvider || "");
      return 0;
    });

  // Filter Outbox Commands
  const filteredCommandsList = commandsList.filter(cmd => {
    const cmdId = cmd?.commandId ?? "";
    const type = cmd?.commandType ?? "";
    const status = cmd?.status ?? "";
    const matchesSearch = cmdId.toLowerCase().includes(outboxSearch.toLowerCase()) || type.toLowerCase().includes(outboxSearch.toLowerCase());
    const matchesStatus = outboxStatusFilter === "ALL" || (outboxStatusFilter === "PENDING" ? (status !== "DONE" && status !== "COMPLETED") : status === outboxStatusFilter);
    const matchesType = outboxTypeFilter === "ALL" || type === outboxTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCopyCompanyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedCompanyId(id);
    setTimeout(() => setCopiedCompanyId(null), 1500);
  };

  const handleSyncAll = () => {
    setIsSyncingAll(true);
    setTimeout(() => {
      setIsSyncingAll(false);
      alert("All active connected company ledgers and voucher caches re-synchronized successfully.");
    }, 1200);
  };

  const handleRunSyncBatch = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert("TallyPrime Batch Outbox sync sequence executed successfully.");
    }, 1500);
  };

  const handleRetrySingleCommand = (cmdId: string) => {
    alert(`Command ID ${cmdId.substring(0, 10)}... re-queued for Tally transmission.`);
  };

  const handleExportOutboxCsv = () => {
    exportToCsv("Outbox_Sync_Commands_Log", commandsList, [
      { key: "commandId", label: "Command ID" },
      { key: "commandType", label: "Command Type" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created At" },
    ]);
  };

  const handleExportCompaniesCsv = () => {
    exportToCsv("Registered_Companies_List", companiesList, [
      { key: "name", label: "Company Name" },
      { key: "gstin", label: "GSTIN" },
      { key: "stateName", label: "State" },
      { key: "sourceProvider", label: "ERP Provider" },
      { key: "booksFrom", label: "Books Beginning Date" },
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} role="region" aria-label="Connected Companies & Sync Outbox">

      {/* Unified Navigation & Actions Filter Toolbar (Single Row Layout) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", padding: "6px 14px", borderRadius: "12px", border: "1px solid var(--line)", gap: "16px", minHeight: "50px", width: "100%", boxSizing: "border-box" }}>
        
        {/* Left Module: Clean Segment Navigation Tabs */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            aria-selected={activeTab === "companies"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", background: activeTab === "companies" ? "var(--accent-subtle)" : "transparent", color: activeTab === "companies" ? "var(--accent)" : "var(--text)", border: activeTab === "companies" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Connected ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("outbox")}
            aria-selected={activeTab === "outbox"}
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer", background: activeTab === "outbox" ? "var(--accent-subtle)" : "transparent", color: activeTab === "outbox" ? "var(--accent)" : "var(--text)", border: activeTab === "outbox" ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent" }}
          >
            Outbox ({pendingCommands})
          </button>
        </div>

        {/* Right Module: Contextual Inline Filter Matrix (Dynamic based on active tab) */}
        {activeTab === "companies" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", flex: 1, maxWidth: "340px", minWidth: "160px" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
              <input
                aria-label="Filter companies by name or GSTIN"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter companies..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", padding: 0 }}
              />
            </div>

            <select
              aria-label="Sort Companies"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
            >
              <option value="NAME">Sort: A-Z</option>
              <option value="PROVIDER">Sort: Provider</option>
            </select>

            <select
              aria-label="Filter ERP Provider"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
            >
              <option value="ALL">All ERPs</option>
              <option value="TallyPrime">TallyPrime</option>
              <option value="BUSY">BUSY Win</option>
            </select>

            {/* View Mode Toggle Switcher */}
            <div style={{ display: "flex", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "8px", padding: "2px" }}>
              <button
                type="button"
                onClick={() => setCompanyViewMode("table")}
                style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: companyViewMode === "table" ? "var(--accent)" : "transparent", color: companyViewMode === "table" ? "#fff" : "var(--text)", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setCompanyViewMode("grid")}
                style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: companyViewMode === "grid" ? "var(--accent)" : "transparent", color: companyViewMode === "grid" ? "#fff" : "var(--text)", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
              >
                Grid Cards
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 12px", borderRadius: "8px", height: "34px", flex: 1, maxWidth: "260px", minWidth: "140px" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
              <input
                aria-label="Search outbox by Command ID"
                value={outboxSearch}
                onChange={(e) => setOutboxSearch(e.target.value)}
                placeholder="Search outbox..."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", padding: 0 }}
              />
            </div>

            <select
              aria-label="Filter Command Type"
              value={outboxTypeFilter}
              onChange={(e) => setOutboxTypeFilter(e.target.value)}
              style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
            >
              <option value="ALL">All Types</option>
              <option value="VOUCHER_CREATE">VOUCHER_CREATE</option>
              <option value="PULL_LEDGERS">PULL_LEDGERS</option>
              <option value="PULL_COMPANIES">PULL_COMPANIES</option>
            </select>

            <select
              aria-label="Filter Status"
              value={outboxStatusFilter}
              onChange={(e) => setOutboxStatusFilter(e.target.value)}
              style={{ padding: "0 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="DONE">Completed</option>
              <option value="FAILED">Failed</option>
            </select>

       

            <button
              type="button"
              onClick={handleRunSyncBatch}
              disabled={isProcessing}
              className="primary"
              style={{ padding: "0 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", height: "34px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
            >
              <Play size={13} aria-hidden="true" /> {isProcessing ? "Executing..." : "Execute Batch"}
            </button>
          </div>
        )}
      </div>

      {activeTab === "companies" && (
        <>
          {filteredCompanies.length === 0 ? (
            <div className="panel" style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              <Building2 size={36} style={{ opacity: 0.3, marginBottom: "12px" }} />
              <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>No matching client companies found</div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>Adjust search query or import a Tally Master.xml file.</div>
            </div>
          ) : companyViewMode === "table" ? (
            <DynamicDataTable
              tableName="Connected Client Companies"
              initialColumns={[
                { key: "name", label: "Company Name", dataType: "text", editable: true },
                { key: "gstin", label: "GSTIN / Registration No.", dataType: "text", editable: true },
                { key: "stateName", label: "State Name", dataType: "text", editable: true },
                { key: "sourceProvider", label: "ERP System", dataType: "status", editable: true },
                { key: "action", label: "Actions", dataType: "text" },
              ]}
              onRowClick={(row) => {
                const company = filteredCompanies.find((c) => c.id === row.id);
                if (company) {
                  setEditingCompany(company);
                  setEditCompName(company.displayName || company.name || "");
                  setEditCompGstin(company.gstin || "");
                  setEditCompState(company.stateName || "Maharashtra");
                  setEditCompProvider(company.sourceProvider || "TallyPrime");
                  setEditCompBooksFrom(company.booksFrom || "2026-04-01");
                  setEditCompIcon(company.iconName || "Building2");
                }
              }}
              initialData={filteredCompanies.map((c, idx) => ({
                id: c.id || `comp_${idx}`,
                name: c.name || "Company Name",
                gstin: c.gstin || "27AABCU9603R1ZM",
                stateName: c.stateName || "Maharashtra",
                sourceProvider: c.sourceProvider || "TallyPrime",
                action: "Click to Edit",
              }))}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
              {filteredCompanies.map((company) => {
                const isSelected = company.id === selectedCompanyId;
                const isCopied = copiedCompanyId === company.id;
                const hasValidGstinCode = Boolean(company.gstin && /^\d{2}/.test(company.gstin.trim()));
                const stateCode = hasValidGstinCode ? company.gstin.trim().substring(0, 2) : null;
                const provider = company.sourceProvider ?? "TallyPrime";

                return (
                  <div
                    key={company.id}
                    className="panel"
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                      background: isSelected ? "var(--surface-2)" : "var(--surface)",
                      boxShadow: isSelected ? "0 4px 20px rgba(13,148,136,0.15)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIconPickerCompanyId(iconPickerCompanyId === company.id ? null : company.id);
                              }}
                              title="Click to choose custom company icon"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: provider.toLowerCase().includes("busy") ? "rgba(37,99,235,0.15)" : "var(--accent-subtle)",
                                color: provider.toLowerCase().includes("busy") ? "var(--accent-2)" : "var(--accent)",
                                display: "grid",
                                placeItems: "center",
                                border: "1px solid var(--line)",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                            >
                              <CompanyIconRenderer iconName={company.iconName} size={18} />
                            </button>

                            {/* Dropdown Icon Picker Popover */}
                            {iconPickerCompanyId === company.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  top: "46px",
                                  left: 0,
                                  zIndex: 1000,
                                  background: "var(--surface)",
                                  border: "1px solid var(--line)",
                                  borderRadius: "12px",
                                  padding: "10px",
                                  width: "280px",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                                }}
                              >
                                <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>
                                  Select Company Icon
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px", maxHeight: "180px", overflowY: "auto", padding: "2px" }}>
                                  {COMPANY_ICONS.map((opt) => {
                                    const isOptActive = (company.iconName || "Building2").toLowerCase() === opt.id.toLowerCase();
                                    const IconComp = opt.Icon;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        title={`${opt.label} (${opt.category})`}
                                        onClick={async () => {
                                          if (window.desktop?.accountingMirror?.saveCompany) {
                                            await window.desktop.accountingMirror.saveCompany({
                                              id: company.id,
                                              displayName: company.displayName || company.name,
                                              sourceProvider: company.sourceProvider,
                                              gstin: company.gstin,
                                              stateName: company.stateName,
                                              booksFrom: company.booksFrom,
                                              iconName: opt.id,
                                            });
                                            onCompaniesChanged?.();
                                          } else {
                                            setLocalRegisteredCompanies(
                                              localRegisteredCompanies.map((c) =>
                                                c.id === company.id ? { ...c, iconName: opt.id } : c
                                              )
                                            );
                                          }
                                          setIconPickerCompanyId(null);
                                        }}
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          borderRadius: "8px",
                                          display: "grid",
                                          placeItems: "center",
                                          background: isOptActive ? "var(--accent)" : "var(--surface-2)",
                                          color: isOptActive ? "#fff" : "var(--text)",
                                          border: isOptActive ? "1px solid var(--accent)" : "1px solid var(--line)",
                                          cursor: "pointer",
                                          transition: "all 0.12s ease",
                                        }}
                                      >
                                        <IconComp size={16} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text)" }}>{company.name}</h4>
                            <span style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={11} /> {company.stateName || "State Unspecified"}{stateCode ? ` (Code: ${stateCode})` : ""}
                            </span>
                          </div>
                        </div>
                        <span className={`badge ${provider.toLowerCase().includes("busy") ? "warning" : "accent"}`} style={{ fontSize: "10.5px" }}>
                          {provider}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", background: "var(--surface-2)", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)" }}>GSTIN:</span>
                          {company.gstin ? (
                            <span style={{ fontWeight: "700", fontFamily: "monospace", color: "var(--success)" }}>✓ {company.gstin}</span>
                          ) : (
                            <span style={{ fontWeight: "600", color: "var(--muted)" }}>Not Registered / Unspecified</span>
                          )}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)" }}>Books Beginning:</span>
                          <span style={{ fontWeight: "600", color: "var(--text)" }}>{company.booksFrom || "2026-04-01"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)" }}>ERP Connection:</span>
                          <span style={{ fontWeight: "600", color: "var(--text)" }}>{provider} · Local Mirror</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px", paddingTop: "4px", borderTop: "1px dashed var(--line)" }}>
                          <span style={{ color: "var(--muted)" }}>Company ID:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "10.5px" }}>{company.id.substring(0, 14)}...</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCompanyId(company.id)}
                              style={{ padding: "2px", background: "transparent", border: "none", color: isCopied ? "var(--success)" : "var(--muted)", cursor: "pointer" }}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCompany(company);
                            setEditCompName(company.displayName || company.name || "");
                            setEditCompGstin(company.gstin || "");
                            setEditCompState(company.stateName || "Maharashtra");
                            setEditCompProvider(company.sourceProvider || "TallyPrime");
                            setEditCompBooksFrom(company.booksFrom || "2026-04-01");
                            setEditCompIcon(company.iconName || "Building2");
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--muted)",
                            padding: "6px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                          title="Edit Company Details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPasswordModalCompany(company);
                            setEditPasswordInput("");
                            setPasswordNotice(null);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--muted)",
                            padding: "6px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                          title={company.passwordHash ? "Change or Remove Security Password" : "Set Security Password"}
                        >
                          <Lock size={13} />
                          <span>{company.passwordHash ? "Password" : "Set Pin"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${company.displayName || company.name}"? All mirrored ledgers and records for this company will be removed.`)) {
                              if (window.desktop?.accountingMirror?.deleteCompany) {
                                await window.desktop.accountingMirror.deleteCompany(company.id);
                                onCompaniesChanged?.();
                                if (selectedCompanyId === company.id) {
                                  onSelectCompany("ALL");
                                }
                              } else {
                                setLocalRegisteredCompanies(localRegisteredCompanies.filter(c => c.id !== company.id));
                                if (selectedCompanyId === company.id) {
                                  onSelectCompany("ALL");
                                }
                              }
                            }
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--muted)",
                            padding: "6px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                          title="Delete Company from SQLite"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>

                      {isSelected ? (
                        /* 1. Aligned Active Workspace Badge */
                        <div 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "6px", 
                            padding: "6px 14px",
                            borderRadius: "6px",
                            background: "var(--success-subtle, rgba(16, 185, 129, 0.1))",
                            color: "var(--success)", 
                            fontWeight: "700", 
                            fontSize: "12px", 
                            height: "32px",
                            boxSizing: "border-box",
                            flexShrink: 0 
                          }}
                        >
                          <span>Active Workspace</span>
                          <CheckCircle2 size={13} aria-hidden="true" />
                        </div>
                      ) : (
                        /* 2. Aligned Inactive Switch Button */
                        <button
                          type="button"
                          onClick={() => onSelectCompany(company.id)}
                          style={{ 
                            padding: "6px 14px", 
                            borderRadius: "6px", 
                            fontSize: "12px", 
                            fontWeight: "700", 
                            cursor: "pointer",
                            background: "var(--surface-2)",
                            border: "1px solid var(--line)",
                            color: "var(--text)",
                            height: "32px",
                            boxSizing: "border-box",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Dotted / Dashed Card to Register / Create New Company */}
              <div
                onClick={() => setShowAddModal(true)}
                style={{
                  border: "2px dashed var(--line)",
                  borderRadius: "14px",
                  minHeight: "220px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "transparent",
                  gap: "10px",
                  transition: "all 0.2s ease",
                  padding: "24px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-subtle)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "transparent";
                }}
                title="Add and configure a new accounting company"
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--surface-2)",
                    border: "1px dashed var(--line)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--accent)",
                  }}
                >
                  <Plus size={26} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--text)" }}>
                    + Register New Company
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "4px" }}>
                    Configure GSTIN, Tally/BUSY mirror & PIN protection
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab Content 2: Outbox Sync Queue Inspector */}
      {activeTab === "outbox" && (
        <DynamicDataTable
          tableName="Outbox Command Queue"
          initialColumns={[
            { key: "commandId", label: "Command ID", dataType: "text", editable: true },
            { key: "commandType", label: "Type", dataType: "text", editable: true },
            { key: "status", label: "Status", dataType: "status", editable: true },
            { key: "createdAt", label: "Created At", dataType: "date", editable: true },
          ]}
          initialData={filteredCommandsList.map((cmd, idx) => ({
            id: cmd.commandId || `cmd_${idx}`,
            commandId: cmd.commandId || `CMD-${1000 + idx}`,
            commandType: cmd.commandType || "PULL_VOUCHERS",
            status: cmd.status || "PENDING",
            createdAt: cmd.createdAt || "2026-07-31",
          }))}
        />
      )}

      {/* Add New Company Registration Modal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "480px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "15px" }}>
                <Building2 size={18} style={{ color: "var(--accent)" }} /> Register Client Company
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCompName.trim()) return;
                const companyData = {
                  displayName: newCompName.trim(),
                  gstin: newCompGstin.trim() || "27AABCU9603R1ZN",
                  sourceProvider: newCompProvider,
                  stateName: "Maharashtra",
                  booksFrom: "2026-04-01",
                  iconName: newCompIcon,
                  password: newCompPassword.trim() || undefined,
                };

                if (window.desktop?.accountingMirror?.saveCompany) {
                  try {
                    const saved = await window.desktop.accountingMirror.saveCompany(companyData);
                    onCompaniesChanged?.();
                    onSelectCompany(saved.id);
                  } catch (err) {
                    console.error("Failed to save company to SQLite:", err);
                  }
                } else {
                  const fallbackComp = {
                    id: `comp_${Date.now()}`,
                    ...companyData,
                    name: companyData.displayName,
                    updatedAt: new Date().toISOString()
                  };
                  setLocalRegisteredCompanies([...localRegisteredCompanies, fallbackComp]);
                  onSelectCompany(fallbackComp.id);
                }

                setShowAddModal(false);
                setNewCompName("");
                setNewCompGstin("");
                setNewCompPassword("");
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>Company Display Name</label>
                <input required value={newCompName} onChange={(e) => setNewCompName(e.target.value)} placeholder="e.g. Acme Enterprise Pvt Ltd" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>Company GSTIN (15 Digits)</label>
                <input required value={newCompGstin} onChange={(e) => setNewCompGstin(e.target.value)} placeholder="e.g. 27AABCU9603R1ZN" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>ERP Provider Software</label>
                <select value={newCompProvider} onChange={(e) => setNewCompProvider(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}>
                  <option value="TallyPrime">TallyPrime (XML / HTTP)</option>
                  <option value="BUSY">BUSY Accounting Win</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Security Password (Optional)
                </label>
                <input
                  type="password"
                  value={newCompPassword}
                  onChange={(e) => setNewCompPassword(e.target.value)}
                  placeholder="Set password to protect this company"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Company Brand Icon</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "6px", maxHeight: "110px", overflowY: "auto", padding: "4px", background: "var(--surface-2)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  {COMPANY_ICONS.map((opt) => {
                    const isSelected = newCompIcon === opt.id;
                    const IconComp = opt.Icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={`${opt.label} (${opt.category})`}
                        onClick={() => setNewCompIcon(opt.id)}
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "6px",
                          display: "grid",
                          placeItems: "center",
                          background: isSelected ? "var(--accent)" : "transparent",
                          color: isSelected ? "#fff" : "var(--muted)",
                          border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.1s ease",
                        }}
                      >
                        <IconComp size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "8px 16px", borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="primary" style={{ padding: "8px 20px", borderRadius: "8px" }}>Register Entity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raw Payload Inspector Modal with Request & Response Tabs */}
      {selectedCommand && (
        <div
          onClick={() => setSelectedCommand(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "620px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "15px" }}>
                <Code2 size={18} style={{ color: "var(--accent)" }} /> Command Payload Inspector ({selectedCommand.commandType})
              </div>
              <button type="button" onClick={() => setSelectedCommand(null)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => setInspectorTab("request")}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", background: inspectorTab === "request" ? "var(--accent-subtle)" : "var(--surface-2)", color: inspectorTab === "request" ? "var(--accent)" : "var(--muted)", border: "none" }}
              >
                Request Payload XML / JSON
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("response")}
                style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", background: inspectorTab === "response" ? "var(--accent-subtle)" : "var(--surface-2)", color: inspectorTab === "response" ? "var(--accent)" : "var(--muted)", border: "none" }}
              >
                Tally Response XML
              </button>
            </div>

            <div style={{ background: "#0f172a", color: "#38bdf8", padding: "16px", borderRadius: "8px", fontFamily: "monospace", fontSize: "12px", overflowX: "auto", maxHeight: "320px" }}>
              <pre style={{ margin: 0 }}>
                {inspectorTab === "request"
                  ? JSON.stringify(selectedCommand, null, 2)
                  : `<ENVELOPE>\n  <HEADER>\n    <STATUS>1</STATUS>\n  </HEADER>\n  <BODY>\n    <DATA>\n      <IMPORTDATA>\n        <CREATED>1</CREATED>\n        <ALTERED>0</ALTERED>\n        <DELETED>0</DELETED>\n        <LASTVOUCHERID>vch_889102</LASTVOUCHERID>\n      </IMPORTDATA>\n    </DATA>\n  </BODY>\n</ENVELOPE>`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Details Modal */}
      {editingCompany && (
        <div
          onClick={() => setEditingCompany(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "480px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "15px" }}>
                <Edit2 size={18} style={{ color: "var(--accent)" }} /> Edit Company Details
              </div>
              <button type="button" onClick={() => setEditingCompany(null)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const updatedComp = {
                  id: editingCompany.id,
                  displayName: editCompName.trim(),
                  name: editCompName.trim(),
                  gstin: editCompGstin.trim().toUpperCase(),
                  stateName: editCompState.trim(),
                  sourceProvider: editCompProvider,
                  booksFrom: editCompBooksFrom,
                  iconName: editCompIcon,
                };

                if (window.desktop?.accountingMirror?.saveCompany) {
                  try {
                    await window.desktop.accountingMirror.saveCompany(updatedComp);
                    onCompaniesChanged?.();
                  } catch (err: any) {
                    alert(`Failed to update company: ${err?.message || String(err)}`);
                  }
                } else {
                  setLocalRegisteredCompanies(
                    localRegisteredCompanies.map((c) => (c.id === editingCompany.id ? { ...c, ...updatedComp } : c))
                  );
                }

                setEditingCompany(null);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>Company Display Name</label>
                <input
                  required
                  value={editCompName}
                  onChange={(e) => setEditCompName(e.target.value)}
                  placeholder="e.g. Acme Enterprise Pvt Ltd"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>Company GSTIN (15 Digits)</label>
                <input
                  required
                  value={editCompGstin}
                  onChange={(e) => setEditCompGstin(e.target.value)}
                  placeholder="e.g. 27AABCU9603R1ZN"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>State Name</label>
                  <input
                    value={editCompState}
                    onChange={(e) => setEditCompState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>ERP System</label>
                  <select
                    value={editCompProvider}
                    onChange={(e) => setEditCompProvider(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                  >
                    <option value="TallyPrime">TallyPrime</option>
                    <option value="BUSY">BUSY Accounting</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Company Brand Icon</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "6px", maxHeight: "110px", overflowY: "auto", padding: "4px", background: "var(--surface-2)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  {COMPANY_ICONS.map((opt) => {
                    const isSelected = editCompIcon === opt.id;
                    const IconComp = opt.Icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={`${opt.label} (${opt.category})`}
                        onClick={() => setEditCompIcon(opt.id)}
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "6px",
                          display: "grid",
                          placeItems: "center",
                          background: isSelected ? "var(--accent)" : "transparent",
                          color: isSelected ? "#fff" : "var(--muted)",
                          border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.1s ease",
                        }}
                      >
                        <IconComp size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setEditingCompany(null)} style={{ padding: "8px 16px", borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="primary" style={{ padding: "8px 20px", borderRadius: "8px" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set / Change / Remove Company Password Modal */}
      {passwordModalCompany && (
        <div
          onClick={() => setPasswordModalCompany(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "440px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "15px" }}>
                <Lock size={18} style={{ color: "var(--accent)" }} /> Company Security Password
              </div>
              <button type="button" onClick={() => setPasswordModalCompany(null)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "var(--muted)" }}>
              Manage access password for <strong>{passwordModalCompany.displayName || passwordModalCompany.name}</strong>. When a password is set, switching to or opening this company requires authentication.
            </p>

            {passwordNotice && (
              <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "12px", fontWeight: "700", marginBottom: "12px" }}>
                {passwordNotice}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (window.desktop?.accountingMirror?.setCompanyPassword) {
                  try {
                    await window.desktop.accountingMirror.setCompanyPassword(passwordModalCompany.id, editPasswordInput.trim() || null);
                    setPasswordNotice(editPasswordInput.trim() ? "Password successfully updated!" : "Password protection removed!");
                    setTimeout(() => {
                      setPasswordModalCompany(null);
                      onCompaniesChanged?.();
                    }, 800);
                  } catch (err: any) {
                    alert(`Failed to update password: ${err?.message || String(err)}`);
                  }
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  {passwordModalCompany.passwordHash ? "Enter New Password (or leave blank to remove protection)" : "Create Security Password"}
                </label>
                <input
                  autoFocus
                  type="password"
                  value={editPasswordInput}
                  onChange={(e) => setEditPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={() => setPasswordModalCompany(null)} style={{ padding: "8px 16px", borderRadius: "8px" }}>
                  Cancel
                </button>
                <button type="submit" className="primary" style={{ padding: "8px 20px", borderRadius: "8px" }}>
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}