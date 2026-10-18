import React, { useState } from "react";
import { Calendar, ChevronDown, CornerDownRight } from "lucide-react";

interface FinancialYearOption {
  value: string;
  label: string;
}

interface PeriodSelectorProps {
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

export default function PeriodSelector({ 
  selectedFy, setSelectedFy,
  selectedQuarter, setSelectedQuarter,
  fromDate, setFromDate,
  toDate, setToDate,
  getFinancialYears
}: PeriodSelectorProps) {
  const [showOverlay, setShowOverlay] = useState<boolean>(false);

  // Custom mode is active only if explicit custom quarter or active dates exist
  const isCustomMode = selectedQuarter === "CUSTOM" || Boolean(fromDate || toDate);

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

  const getDisplayLabel = () => {
    if (isCustomMode) {
      if (fromDate && toDate) return `${fromDate} → ${toDate}`;
      if (fromDate) return `${fromDate} → End`;
      if (toDate) return `Start → ${toDate}`;
      return "Custom Date Range";
    }
    const formattedYear = formatShortYear(selectedFy);
    return selectedQuarter === "ALL" ? `Full Year (${formattedYear})` : `${formattedYear} ${selectedQuarter}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontFamily: "system-ui, sans-serif", position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <button
          type="button"
          onClick={() => setShowOverlay(!showOverlay)}
          style={{ 
            padding: "0 8px", 
            borderRadius: "8px", 
            background: "var(--surface-2)", 
            border: "1px solid var(--line)", 
            color: "var(--text)", 
            fontWeight: "700", 
            fontSize: "11.5px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            outline: "none",
            minWidth: "105px",
            maxWidth: "130px",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
            <Calendar size={14} style={{ color: isCustomMode ? "var(--accent)" : "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatShortYear(selectedFy)}</span>
          </div>
          <ChevronDown size={14} style={{ transform: showOverlay ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", color: "var(--muted)", flexShrink: 0 }} aria-hidden="true" />
        </button>
      </div>

      {showOverlay && (
        <>
          <div onClick={() => setShowOverlay(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
          
          <div style={{
            position: "absolute",
            top: "62px",
            left: 0,
            zIndex: 999,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "12px",
            padding: "10px",
            width: "260px",
            boxShadow: "0 12px 30px -4px rgba(0,0,0,0.12), 0 4px 12px -2px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}>
            {getFinancialYears().map((fy) => (
              <div key={fy.value} style={{ marginBottom: "6px" }}>
                <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {fy.label}
                </div>
                {["ALL", "Q1", "Q2", "Q3", "Q4"].map((q) => {
                  const formattedYear = formatShortYear(fy.value);
                  const isSelected = !isCustomMode && selectedFy === fy.value && selectedQuarter === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                        setSelectedFy(fy.value);
                        setSelectedQuarter(q);
                        setShowOverlay(false); 
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 12px",
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
                      <span>{q === "ALL" ? `• Full Year (${formattedYear})` : `${formattedYear} ${q}`}</span>
                      {isSelected && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />}
                    </button>
                  );
                })}
              </div>
            ))}

            <div style={{ height: "1px", background: "var(--line)", margin: "4px 0" }} />

            <div style={{ padding: "6px 8px 4px 8px" }}>
              <div style={{
                fontSize: "10px", 
                fontWeight: "800", 
                color: isCustomMode ? "var(--accent)" : "var(--muted)", 
                textTransform: "uppercase", 
                letterSpacing: "0.5px"
              }}>
                Custom Boundary Filter
              </div>
            </div>

            <div style={{ padding: "4px 8px 6px 8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div 
                style={{ 
                  position: "relative", 
                  display: "flex", 
                  alignItems: "center",
                  border: isCustomMode ? "1px solid var(--accent)" : "1px solid var(--line)",
                  borderRadius: "6px",
                  background: "var(--surface-2)"
                }}
              >
                <div style={{ position: "absolute", left: "10px", display: "flex", alignItems: "center", gap: "4px", pointerEvents: "none" }}>
                  <CornerDownRight size={11} style={{ color: "var(--muted)" }} aria-hidden="true" />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>From</span>
                </div>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => {
                    setSelectedQuarter("CUSTOM");
                    setFromDate(e.target.value);
                  }} 
                  style={{ width: "100%", padding: "7px 8px 7px 106px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer" }} 
                />
              </div>
              
              <div 
                style={{ 
                  position: "relative", 
                  display: "flex", 
                  alignItems: "center",
                  border: isCustomMode ? "1px solid var(--accent)" : "1px solid var(--line)",
                  borderRadius: "6px",
                  background: "var(--surface-2)"
                }}
              >
                <div style={{ position: "absolute", left: "10px", display: "flex", alignItems: "center", gap: "4px", pointerEvents: "none" }}>
                  <CornerDownRight size={11} style={{ color: "var(--muted)" }} aria-hidden="true" />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>To</span>
                </div>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => {
                    setSelectedQuarter("CUSTOM");
                    setToDate(e.target.value);
                  }} 
                  style={{ width: "100%", padding: "7px 8px 7px 106px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer" }} 
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}