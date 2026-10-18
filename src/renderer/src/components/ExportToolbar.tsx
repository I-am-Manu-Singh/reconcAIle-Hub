import React, { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, Printer, FileSpreadsheet, FileCode, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { exportToCsv } from "../utils/csvExporter";

export function ExportToolbar({
  filename,
  data,
  columns,
  label = "Export",
}: {
  readonly filename?: string;
  readonly data?: readonly any[];
  readonly columns?: readonly { readonly key: string; readonly label: string }[];
  readonly label?: string;
}): React.JSX.Element {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Normalize filename to strip any existing extension and invalid characters
  const rawBase = (filename || "Export_Data").trim().replace(/\.(?:csv|xlsx|xls|xml|json|pdf)$/i, "");
  const safeFilename = rawBase.replace(/[\\/:*?"<>|]+/g, "_") || "Export_Data";
  const safeData = data || [];

  const handleExportCsv = () => {
    setShowDropdown(false);
    if (!safeData || safeData.length === 0) {
      alert("No records available to export.");
      return;
    }
    exportToCsv(safeFilename, safeData, columns);
  };

  const handleExportXlsx = () => {
    setShowDropdown(false);
    if (!safeData || safeData.length === 0) {
      alert("No records available to export.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(safeData as any[]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${safeFilename}.xlsx`);
  };

  const handleExportXml = () => {
    setShowDropdown(false);
    if (!safeData || safeData.length === 0) {
      alert("No records available to export.");
      return;
    }
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <RECORDS_LIST>\n`;
    safeData.forEach((item: any) => {
      xml += `    <RECORD>\n`;
      for (const [k, v] of Object.entries(item)) {
        xml += `      <${k.toUpperCase()}>${typeof v === "object" ? JSON.stringify(v) : String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</${k.toUpperCase()}>\n`;
      }
      xml += `    </RECORD>\n`;
    });
    xml += `  </RECORDS_LIST>\n</ENVELOPE>`;

    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    setShowDropdown(false);
    if (!safeData || safeData.length === 0) {
      alert("No records available to export.");
      return;
    }
    const jsonStr = JSON.stringify(safeData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    setShowDropdown(false);
    window.print();
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button
          type="button"
          onClick={handleExportCsv}
          title="Export CSV document"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            borderRadius: "0",
            fontSize: "12.5px",
            fontWeight: "700",
            background: "var(--surface-2)",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            borderRight: "1px solid var(--line)",
          }}
        >
          <Download size={14} style={{ color: "var(--accent)" }} /> {label}
        </button>

        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Select Export Format (Excel, XML, CSV, JSON, PDF)"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "7px 8px",
            borderRadius: "0",
            background: "var(--surface-2)",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 1000,
            minWidth: "210px",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <button
            type="button"
            onClick={handleExportXlsx}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileSpreadsheet size={14} style={{ color: "var(--success)" }} /> Export Excel Workbook (.xlsx)
          </button>

          <button
            type="button"
            onClick={handleExportXml}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileText size={14} style={{ color: "#f59e0b" }} /> Export Tally XML (.xml)
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileSpreadsheet size={14} style={{ color: "var(--accent)" }} /> Export CSV Sheet (.csv)
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileCode size={14} style={{ color: "var(--accent)" }} /> Export Data JSON (.json)
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <Printer size={14} style={{ color: "var(--accent-2)" }} /> Print / Save PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
}