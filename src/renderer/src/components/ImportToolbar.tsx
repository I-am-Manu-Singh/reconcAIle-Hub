import React, { useRef, useState, useEffect } from "react";
import { Upload, ChevronDown, FileCode, FileText, FileSpreadsheet, FileJson } from "lucide-react";

export function ImportToolbar({
  onImportFile,
  accept = ".xml,.pdf,.xlsx,.xls,.csv,.json,.png,.jpg",
  label = "Import",
}: {
  readonly onImportFile?: (file: File) => void;
  readonly accept?: string;
  readonly label?: string;
}): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("ALL");
  const [showDropdown, setShowDropdown] = useState(false);

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

  const getAcceptString = () => {
    switch (selectedFormat) {
      case "PDF":
        return ".pdf,.png,.jpg,.jpeg";
      case "XML":
        return ".xml";
      case "JSON":
        return ".json";
      case "EXCEL":
        return ".xlsx,.xls,.csv";
      default:
        return accept;
    }
  };

  const handleClick = (format?: string) => {
    if (format) setSelectedFormat(format);
    setShowDropdown(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportFile) {
      onImportFile(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--accent)" }}>
        <button
          type="button"
          onClick={() => handleClick()}
          className="primary"
          title="Import files into local SQLite store"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            borderRadius: "0",
            fontSize: "12.5px",
            fontWeight: "700",
            cursor: "pointer",
            borderRight: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Upload size={14} /> {label}
        </button>

        <button
          type="button"
          className="primary"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Select Ingestion Format (XML, PDF, JSON, Excel)"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "7px 8px",
            borderRadius: "0",
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
            minWidth: "190px",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <button
            type="button"
            onClick={() => handleClick("PDF")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileText size={14} style={{ color: "var(--accent)" }} /> Ingest Bills & Scans (.pdf, .png)
          </button>
          <button
            type="button"
            onClick={() => handleClick("XML")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileCode size={14} style={{ color: "var(--warning)" }} /> Import Tally XML Backup (.xml)
          </button>
          <button
            type="button"
            onClick={() => handleClick("EXCEL")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileSpreadsheet size={14} style={{ color: "var(--success)" }} /> Import Statement Feed (.xlsx, .csv)
          </button>
          <button
            type="button"
            onClick={() => handleClick("JSON")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}
          >
            <FileJson size={14} style={{ color: "var(--accent-2)" }} /> Import Return Filing (.json)
          </button>
        </div>
      )}
    </div>
  );
}