import React, { useState } from "react";
import { Building2, Calendar, ChevronDown, Check, CornerDownRight, ShieldCheck } from "lucide-react";
import { CompanyIconRenderer } from "./companyIcons";

export interface CompanyOption {
  id: string;
  name?: string;
  displayName?: string;
  iconName?: string | null;
  passwordHash?: string | null;
}

export interface FinancialYearOption {
  value: string;
  label: string;
}

export interface CompanyPeriodSelectorProps {
  mirrorCompanies?: readonly CompanyOption[];
  selectedCompanyId?: string | null;
  onSelectCompany?: (id: string) => void;
  unlockedCompanyIds?: Set<string>;
  selectedFy: string;
  setSelectedFy: (fy: string) => void;
  selectedQuarter: string;
  setSelectedQuarter: (quarter: string) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  getFinancialYears: () => FinancialYearOption[];
}

export function CompanyPeriodSelector({
  mirrorCompanies = [],
  selectedCompanyId,
  onSelectCompany,
  unlockedCompanyIds,
  selectedFy,
  setSelectedFy,
  selectedQuarter,
  setSelectedQuarter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  getFinancialYears
}: CompanyPeriodSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "period">("company");

  // Valid companies filter
  const validCompanies = mirrorCompanies.filter(
    (c) => c && c.id && c.id !== "default_company" && (c.name || c.displayName)
  );

  const activeCompany = validCompanies.find((c) => c.id === selectedCompanyId);
  const companyLabel =
    selectedCompanyId === "ALL" || !selectedCompanyId
      ? validCompanies.length > 0
        ? "All Synced Companies"
        : "Primary Company"
      : activeCompany?.displayName || activeCompany?.name || "Selected Company";

  // Financial Year format helper
  const formatShortYear = (fyValue: string): string => {
    const clean = fyValue.replace("FY ", "").trim();
    const parts = clean.split("-");
    if (parts.length === 2) {
      const startYear = parts[0].trim().slice(-2);
      const endYear = parts[1].trim().slice(-2);
      return `FY ${startYear}-${endYear}`;
    }
    return fyValue;
  };

  const isCustomMode = selectedQuarter === "CUSTOM" || Boolean(fromDate || toDate);
  const periodLabel = (() => {
    if (isCustomMode) {
      if (fromDate && toDate) return `${fromDate} → ${toDate}`;
      if (fromDate) return `${fromDate} → End`;
      if (toDate) return `Start → ${toDate}`;
      return "Custom Dates";
    }
    const formattedYear = formatShortYear(selectedFy);
    return selectedQuarter === "ALL" ? `${formattedYear}` : `${formattedYear} ${selectedQuarter}`;
  })();

  const quarters = [
    { label: "All Year", value: "ALL" },
    { label: "Q1 (Apr-Jun)", value: "Q1" },
    { label: "Q2 (Jul-Sep)", value: "Q2" },
    { label: "Q3 (Oct-Dec)", value: "Q3" },
    { label: "Q4 (Jan-Mar)", value: "Q4" },
    { label: "Custom Range", value: "CUSTOM" }
  ];

  return (
    <div style={{ position: "relative", fontFamily: "system-ui, sans-serif" }}>
      {/* Consolidated Context Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch Company and Accounting Period"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface-2)",
          padding: "0 10px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
          height: "36px",
          cursor: "pointer",
          outline: "none",
          color: "var(--text)",
          fontWeight: "700",
          fontSize: "11.5px",
          transition: "border-color 0.15s ease",
          maxWidth: "320px",
          boxShadow: isOpen ? "0 0 0 2px var(--accent-subtle)" : "none"
        }}
      >
        {/* Company Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          {selectedCompanyId === "ALL" || !selectedCompanyId ? (
            <Building2 size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
          ) : (
            <CompanyIconRenderer iconName={activeCompany?.iconName} size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
          )}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "120px",
              textAlign: "left"
            }}
          >
            {companyLabel}
          </span>
        </div>

        {/* Divider */}
        <span style={{ color: "var(--line)", fontWeight: "300" }}>|</span>

        {/* Period Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-muted)" }}>
          <Calendar size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", color: "var(--text)" }}>{periodLabel}</span>
        </div>

        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            color: "var(--muted)",
            flexShrink: 0,
            marginLeft: "2px"
          }}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 998, background: "transparent" }}
          />

          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              width: "360px",
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.28)",
              zIndex: 999,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              animation: "slideDown 0.15s ease-out"
            }}
          >
            {/* Header Tabs: Company vs Period */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--line)",
                background: "var(--surface-2)",
                padding: "4px"
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("company")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: activeTab === "company" ? "var(--surface)" : "transparent",
                  color: activeTab === "company" ? "var(--text)" : "var(--muted)",
                  boxShadow: activeTab === "company" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                <Building2 size={13} style={{ color: "var(--accent)" }} />
                <span>Company</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("period")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: activeTab === "period" ? "var(--surface)" : "transparent",
                  color: activeTab === "period" ? "var(--text)" : "var(--muted)",
                  boxShadow: activeTab === "period" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                <Calendar size={13} style={{ color: "var(--accent)" }} />
                <span>Accounting Period</span>
              </button>
            </div>

            {/* TAB CONTENT: COMPANY SELECTOR */}
            {activeTab === "company" && (
              <div style={{ maxHeight: "280px", overflowY: "auto", padding: "6px" }}>
                <div style={{ padding: "6px 10px", fontSize: "10.5px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
                  Active Workspace Company
                </div>

                {/* Option: All Companies */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectCompany?.("ALL");
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background: selectedCompanyId === "ALL" || !selectedCompanyId ? "var(--accent-subtle)" : "transparent",
                    color: selectedCompanyId === "ALL" || !selectedCompanyId ? "var(--accent)" : "var(--text)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Building2 size={14} />
                    <span>All Synced Companies</span>
                  </div>
                  {(selectedCompanyId === "ALL" || !selectedCompanyId) && <Check size={14} />}
                </button>

                {/* Individual Companies */}
                {validCompanies.map((c) => {
                  const isSelected = selectedCompanyId === c.id;
                  const isLocked = Boolean(c.passwordHash && !unlockedCompanyIds?.has(c.id));

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCompany?.(c.id);
                        setIsOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "none",
                        background: isSelected ? "var(--accent-subtle)" : "transparent",
                        color: isSelected ? "var(--accent)" : "var(--text)",
                        fontSize: "12px",
                        fontWeight: isSelected ? "700" : "500",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <CompanyIconRenderer iconName={c.iconName} size={14} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.displayName || c.name}
                        </span>
                        {isLocked && (
                          <span style={{ fontSize: "10px", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "1px 5px", borderRadius: "4px" }}>
                            PIN
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: ACCOUNTING PERIOD */}
            {activeTab === "period" && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Financial Year Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                    Financial Year
                  </label>
                  <select
                    value={selectedFy}
                    onChange={(e) => {
                      setSelectedFy(e.target.value);
                      if (selectedQuarter === "CUSTOM") setSelectedQuarter("ALL");
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                      fontSize: "12px",
                      fontWeight: "700",
                      outline: "none"
                    }}
                  >
                    {getFinancialYears().map((fy) => (
                      <option key={fy.value} value={fy.value}>
                        {fy.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quarters Quick Switcher */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase" }}>
                    Quarter / Scope
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                    {quarters.map((q) => {
                      const isSel = selectedQuarter === q.value;
                      return (
                        <button
                          key={q.value}
                          type="button"
                          onClick={() => {
                            setSelectedQuarter(q.value);
                            if (q.value !== "CUSTOM") {
                              setFromDate("");
                              setToDate("");
                            }
                          }}
                          style={{
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: `1px solid ${isSel ? "var(--accent)" : "var(--line)"}`,
                            background: isSel ? "var(--accent-subtle)" : "var(--surface-2)",
                            color: isSel ? "var(--accent)" : "var(--text)",
                            fontSize: "11px",
                            fontWeight: isSel ? "700" : "500",
                            cursor: "pointer"
                          }}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Range if active */}
                {selectedQuarter === "CUSTOM" && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "600" }}>From:</span>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "5px 8px",
                            borderRadius: "6px",
                            background: "var(--surface-2)",
                            border: "1px solid var(--line)",
                            color: "var(--text)",
                            fontSize: "11px"
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: "600" }}>To:</span>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "5px 8px",
                            borderRadius: "6px",
                            background: "var(--surface-2)",
                            border: "1px solid var(--line)",
                            color: "var(--text)",
                            fontSize: "11px"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      background: "var(--accent)",
                      color: "#FFFFFF",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CompanyPeriodSelector;
