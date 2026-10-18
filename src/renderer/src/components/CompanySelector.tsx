import React, { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { CompanyIconRenderer } from "./companyIcons";

interface CompanyOption {
  id: string;
  name?: string;
  displayName?: string;
  iconName?: string | null;
  passwordHash?: string | null;
}

interface CompanySwitcherProps {
  mirrorCompanies?: readonly CompanyOption[];
  selectedCompanyId?: string | null;
  onSelectCompany?: (id: string) => void;
  unlockedCompanyIds?: Set<string>;
}

export default function CompanySwitcher({
  mirrorCompanies = [],
  selectedCompanyId,
  onSelectCompany,
  unlockedCompanyIds,
}: CompanySwitcherProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter out any fake/placeholder legacy default IDs unless they genuinely exist in the sync list
  const validCompanies = mirrorCompanies.filter(
    (c) => c && c.id && c.id !== "default_company" && (c.name || c.displayName)
  );

  // Resolve active display parameters matching your schema layers
  const activeCompany = validCompanies.find((c) => c.id === selectedCompanyId);
  const displayLabel = selectedCompanyId === "ALL" || !selectedCompanyId
    ? (validCompanies.length > 0 ? "All Synced Companies" : "Primary Company")
    : activeCompany?.displayName || activeCompany?.name || "Selected Company";

  return (
    <div style={{ position: "relative", fontFamily: "system-ui, sans-serif" }}>
      
      {/* Main Interactive Custom Button Row Wrapper */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
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
          minWidth: "115px",
          maxWidth: "150px",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
          {selectedCompanyId === "ALL" || !selectedCompanyId ? (
            <Building2 size={14} style={{ color: "var(--accent)", flexShrink: 0 }} aria-hidden="true" />
          ) : (
            <CompanyIconRenderer iconName={activeCompany?.iconName} size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
          )}
          <span style={{ 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            textAlign: "left"
          }}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          style={{ 
            transform: showDropdown ? "rotate(180deg)" : "none", 
            transition: "transform 0.15s ease", 
            color: "var(--muted)",
            flexShrink: 0 
          }} 
          aria-hidden="true"
        />
      </button>

      {/* Custom Dropdown Card Popover Overlay */}
      {showDropdown && (
        <>
          {/* Safe transparent overlay to capture clicks anywhere outside to dismiss the menu */}
          <div 
            onClick={() => setShowDropdown(false)} 
            style={{ position: "fixed", inset: 0, zIndex: 998, background: "transparent" }} 
          />

          <div style={{
            position: "absolute",
            top: "42px",
            left: 0,
            zIndex: 999,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            padding: "6px",
            width: "260px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}>
            {/* Context group label header tracking node elements */}
            <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Select Client Context
            </div>

            {/* Default consolidated all option row trigger */}
            <button
              type="button"
              onClick={() => {
                onSelectCompany?.("ALL");
                setShowDropdown(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                background: (!selectedCompanyId || selectedCompanyId === "ALL") ? "var(--surface-2)" : "transparent",
                color: (!selectedCompanyId || selectedCompanyId === "ALL") ? "var(--accent)" : "var(--text)",
                fontWeight: (!selectedCompanyId || selectedCompanyId === "ALL") ? "700" : "500",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>Combined Corporate View</span>
              {(!selectedCompanyId || selectedCompanyId === "ALL") && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />}
            </button>

            {/* Fallback if no synced companies exist */}
            {validCompanies.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: "12px", color: "var(--muted)", textAlign: "center" }}>
                No active companies synced
              </div>
            )}

            {/* Map iterative instances matching operational profiles */}
            {validCompanies.map((c) => {
              const isSelected = selectedCompanyId === c.id;
              const hasPassword = Boolean(c.passwordHash);
              const isUnlocked = hasPassword && unlockedCompanyIds?.has(c.id);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCompany?.(c.id);
                    setShowDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: isSelected ? "var(--surface-2)" : "transparent",
                    color: isSelected ? "var(--accent)" : "var(--text)",
                    fontWeight: isSelected ? "700" : "500",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                    <CompanyIconRenderer iconName={c.iconName} size={14} style={{ color: isSelected ? "var(--accent)" : "var(--muted)", flexShrink: 0 }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.displayName || c.name}
                    </span>
                    {hasPassword && (
                      <span
                        title={isUnlocked ? "Password protected (Unlocked)" : "Password protected (Locked)"}
                        style={{
                          fontSize: "10px",
                          padding: "1px 4px",
                          borderRadius: "4px",
                          background: isUnlocked ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: isUnlocked ? "#10b981" : "#f59e0b",
                          fontWeight: "700",
                        }}
                      >
                        {isUnlocked ? "🔓" : "🔒"}
                      </span>
                    )}
                  </div>
                  {isSelected && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                </button>
              );
            })}

          </div>
        </>
      )}
    </div>
  );
}