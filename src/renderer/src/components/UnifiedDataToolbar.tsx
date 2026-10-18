import React, { useState, useRef, useEffect } from "react";
import {
  ArrowDownUp,
  ChevronDown,
  Upload,
  Download,
  Printer,
  FileSpreadsheet,
  FileCode,
  FileText,
  FileJson,
  Layers
} from "lucide-react";
import * as XLSX from "xlsx";
import { exportToCsv } from "../utils/csvExporter";
import { PrintSettingsModal } from "./PrintSettingsModal";

export interface UnifiedDataToolbarProps {
  readonly onImportFile?: (file: File) => void;
  readonly accept?: string;
  readonly filename?: string;
  readonly data?: readonly any[];
  readonly columns?: readonly { readonly key: string; readonly label: string }[];
}

export function UnifiedDataToolbar({
  onImportFile,
  accept = ".xml,.pdf,.xlsx,.xls,.csv,.json,.png,.jpg",
  filename = "Export_Data",
  data = [],
  columns,
}: UnifiedDataToolbarProps): React.JSX.Element {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Normalize filename
  const rawBase = (filename || "Export_Data").trim().replace(/\.(?:csv|xlsx|xls|xml|json|pdf)$/i, "");
  const safeFilename = rawBase.replace(/[\\/:*?"<>|]+/g, "_") || "Export_Data";
  const safeData = data || [];

  const triggerImportPicker = () => {
    setShowDropdown(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportFile) {
      onImportFile(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  // Export handlers
  const handleExportCsv = () => {
    setShowDropdown(false);
    if (!safeData || safeData.length === 0) {
      alert("No records available in current view to export.");
      return;
    }
    exportToCsv(safeFilename, safeData, columns);
  };

  const handleExportXlsx = () => {
    setShowDropdown(false);
    if (!safeData || safeData.length === 0) {
      alert("No records available in current view to export.");
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
      alert("No records available in current view to export.");
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
      alert("No records available in current view to export.");
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

  // Universal Print Service for all screens
  const handlePrintService = () => {
    setShowDropdown(false);
    setIsPrintModalOpen(true);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: "none" }}
      />

      {/* Unified Trigger Button */}
      <div
        style={{
          display: "flex",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "var(--surface-2)",
          height: "36px"
        }}
      >

        {/* More Options / Export Dropdown */}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Export data and more transfer options"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "0 8px",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontSize: "11.5px",
            fontWeight: "700",
            cursor: "pointer"
          }}
        >
          <ChevronDown
            size={12}
            style={{
              transform: showDropdown ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease"
            }}
          />
        </button>
      </div>

      {/* Unified Menu Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: "230px",
            background: "var(--surface)",
            borderRadius: "10px",
            border: "1px solid var(--line)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            zIndex: 999,
            overflow: "hidden",
            padding: "4px"
          }}
        >
          {/* Section: Universal Print Service */}
          <div style={{ padding: "6px 8px 3px 8px", fontSize: "10px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
            Print Service
          </div>
          <button
            type="button"
            onClick={handlePrintService}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Printer size={14} style={{ color: "#3b82f6" }} />
            <span>Print Current Screen (PDF)</span>
          </button>

          <div style={{ height: "1px", background: "var(--line)", margin: "4px 0" }} />

          {/* Section: Import Options */}
          <div style={{ padding: "4px 8px 3px 8px", fontSize: "10px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
            Import Data
          </div>
          <button
            type="button"
            onClick={triggerImportPicker}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Upload size={14} style={{ color: "var(--accent)" }} />
            <span>Upload File (PDF, CSV, Excel)</span>
          </button>

          <div style={{ height: "1px", background: "var(--line)", margin: "4px 0" }} />

          {/* Section: Export Options */}
          <div style={{ padding: "4px 8px 3px 8px", fontSize: "10px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
            Export Current Data ({safeData.length} records)
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FileText size={14} style={{ color: "#10b981" }} />
            <span>Export as CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportXlsx}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FileSpreadsheet size={14} style={{ color: "#059669" }} />
            <span>Export as Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportXml}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FileCode size={14} style={{ color: "#f59e0b" }} />
            <span>Export as Tally XML</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FileJson size={14} style={{ color: "#8b5cf6" }} />
            <span>Export as JSON</span>
          </button>
        </div>
      )}

      {/* Universal Enterprise Print Settings & Discovery Modal */}
      <PrintSettingsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        defaultFileName={safeFilename}
        documentTitle={safeFilename}
        reportData={safeData}
      />
    </div>
  );
}

export default UnifiedDataToolbar;
