import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Settings,
  FileText,
  Check,
  RefreshCw,
  X,
  Sliders,
  Maximize2,
  FileCode,
  Download,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  Layers,
  Columns
} from "lucide-react";
import { triggerToast } from "./ToastNotification";

export interface PrinterInfo {
  name: string;
  displayName?: string;
  description?: string;
  isDefault?: boolean;
  status?: number;
}

export interface PrintSettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onPrintSuccess?: () => void;
  readonly defaultFileName?: string;
  readonly documentTitle?: string;
  readonly reportData?: readonly any[];
}

export function PrintSettingsModal({
  isOpen,
  onClose,
  onPrintSuccess,
  defaultFileName = "Financial_Statement_Print",
  documentTitle,
  reportData = [],
}: PrintSettingsModalProps): React.JSX.Element | null {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [pageSize, setPageSize] = useState<string>("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<boolean>(true);
  const [printBackground, setPrintBackground] = useState<boolean>(true);
  const [marginType, setMarginType] = useState<string>("default");
  const [scale, setScale] = useState<number>(100);
  const [headerTitle, setHeaderTitle] = useState<string>("");
  const [footerTitle, setFooterTitle] = useState<string>("ReconcAILe Hub — Enterprise Tally Edition");
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"quick" | "tally_setup">("quick");

  // Load available printers
  useEffect(() => {
    if (!isOpen) return;

    const discoverPrinters = async () => {
      setIsDiscovering(true);
      try {
        if ((window as any).desktop?.print?.getPrinters) {
          const list = await (window as any).desktop.print.getPrinters();
          setPrinters(list || []);
          const def = list.find((p: any) => p.isDefault) || list[0];
          if (def) setSelectedPrinter(def.name);
        }
      } catch (err) {
        console.warn("Failed to discover printers:", err);
      } finally {
        setIsDiscovering(false);
      }
    };

    void discoverPrinters();
  }, [isOpen]);

  // Derived effective title
  const effectiveTitle = useMemo(() => {
    return headerTitle.trim() || documentTitle || defaultFileName.replace(/_/g, " ");
  }, [headerTitle, documentTitle, defaultFileName]);

  // Extract columns dynamically from reportData
  const previewColumns = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    const first = reportData[0];
    if (typeof first !== "object" || first === null) return [{ key: "Value", label: "Value" }];
    return Object.keys(first).map((k) => ({
      key: k,
      label: k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim(),
    }));
  }, [reportData]);

  // Generate pure printable HTML for high-resolution PDF rendering
  const generateReportHtml = () => {
    const isLandscape = orientation === "landscape";
    const bgStyle = printBackground
      ? "background: #f8fafc; color: #0f172a;"
      : "background: #ffffff; color: #000000;";
    const filterStyle = !colorMode ? "filter: grayscale(100%);" : "";

    let tableHeaders = "";
    previewColumns.forEach((c) => {
      tableHeaders += `<th style="padding: 9px 12px; border: 1px solid #cbd5e1; background: #e2e8f0; font-size: 11px; text-transform: uppercase; font-weight: 700; text-align: left;">${c.label}</th>`;
    });

    let tableRows = "";
    const renderData = reportData && reportData.length > 0 ? reportData : [{ Status: "No tabular records in current view" }];
    renderData.forEach((row: any, idx: number) => {
      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f1f5f9";
      tableRows += `<tr style="background: ${rowBg};">`;
      previewColumns.forEach((c) => {
        let val = row[c.key];
        if (typeof val === "number") {
          val = val.toLocaleString("en-IN");
        } else if (val === null || val === undefined) {
          val = "-";
        } else if (typeof val === "object") {
          val = JSON.stringify(val);
        }
        tableRows += `<td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11px; font-family: monospace;">${String(val)}</td>`;
      });
      tableRows += `</tr>`;
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${effectiveTitle}</title>
  <style>
    @page {
      size: ${pageSize} ${isLandscape ? "landscape" : "portrait"};
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      ${bgStyle}
      ${filterStyle}
      transform: scale(${scale / 100});
      transform-origin: top left;
    }
    .header-box {
      border-bottom: 2px solid #0d9488;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-box h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .header-box .meta {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .footer-box {
      margin-top: 24px;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <h1>${effectiveTitle}</h1>
      <div class="meta">Format: Tally ${pageSize} ${isLandscape ? "Landscape" : "Portrait"} • Standard Statutory Layout</div>
    </div>
    <div class="meta" style="text-align: right;">
      Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/>
      Records: ${reportData.length}
    </div>
  </div>

  <table>
    <thead>
      <tr>${tableHeaders}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer-box">
    <span>${footerTitle}</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;
  };

  if (!isOpen) return null;

  // Print to PDF native handler
  const handlePrintToPdf = async () => {
    setIsExecuting(true);
    try {
      if ((window as any).desktop?.print?.printToPdf) {
        const reportHtml = generateReportHtml();
        const result = await (window as any).desktop.print.printToPdf({
          landscape: orientation === "landscape",
          pageSize,
          printBackground,
          scaleFactor: scale,
          suggestedFileName: `${defaultFileName.replace(/\s+/g, "_")}.pdf`,
          html: reportHtml,
          header: headerTitle || undefined,
          footer: footerTitle || undefined,
        });

        if (result.success) {
          triggerToast(`Saved PDF to: ${result.filePath}`, "success", "Print to PDF");
          onPrintSuccess?.();
          onClose();
        } else if (result.canceled) {
          // User canceled file dialog
        } else {
          triggerToast(`Print to PDF error: ${result.error || "Unknown"}`, "error", "Print Failed");
        }
      } else {
        window.print();
        onClose();
      }
    } catch (e: any) {
      triggerToast(`PDF generation failed: ${e?.message || String(e)}`, "error", "Error");
    } finally {
      setIsExecuting(false);
    }
  };

  // Direct / Selected Printer native execute
  const handleSendToPrinter = async () => {
    setIsExecuting(true);
    try {
      if ((window as any).desktop?.print?.execute) {
        const result = await (window as any).desktop.print.execute({
          deviceName: selectedPrinter || undefined,
          silent: false,
          color: colorMode,
          landscape: orientation === "landscape",
          printBackground,
          copies,
          pageSize,
          header: headerTitle || undefined,
          footer: footerTitle || undefined,
        });

        if (result.success) {
          triggerToast("Job submitted to printer successfully!", "success", "Printer Service");
          onPrintSuccess?.();
          onClose();
        } else {
          triggerToast(`Printer returned: ${result.failureReason || "Error"}`, "error", "Print Failed");
        }
      } else {
        window.print();
        onClose();
      }
    } catch (e: any) {
      triggerToast(`Printing failed: ${e?.message || String(e)}`, "error", "Printer Error");
    } finally {
      setIsExecuting(false);
    }
  };

  // Paper Aspect Ratio calculation for realistic on-screen rendering
  const isLandscape = orientation === "landscape";
  const paperRatio = isLandscape ? "1.414 / 1" : "1 / 1.414";

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "95vw",
          maxWidth: "1080px",
          height: "90vh",
          maxHeight: "820px",
          background: "var(--surface)",
          borderRadius: "16px",
          border: "1px solid var(--line)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "modalZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-2)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text)" }}>
                Print Service & Live Document Preview
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                Tally Standard Page Setup • Real-Time WYSIWYG Rendering • Vector PDF Export
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Content: Split View (Left: Settings Controls, Right: Live Interactive Preview) */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
          
          {/* LEFT COLUMN: Controls & Page Settings */}
          <div
            style={{
              borderRight: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              background: "var(--surface)",
              overflowY: "auto",
            }}
          >
            {/* Tab Switcher */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", padding: "4px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("quick")}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: activeTab === "quick" ? "var(--surface)" : "transparent",
                  color: activeTab === "quick" ? "var(--text)" : "var(--muted)",
                  boxShadow: activeTab === "quick" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Printer & Destination
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tally_setup")}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: activeTab === "tally_setup" ? "var(--surface)" : "transparent",
                  color: activeTab === "tally_setup" ? "var(--text)" : "var(--muted)",
                  boxShadow: activeTab === "tally_setup" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Tally Page Formatting
              </button>
            </div>

            {/* Tab Controls Content */}
            <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
              {activeTab === "quick" ? (
                <>
                  {/* Destination Printer Discovery */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)" }}>
                        Hardware Printer
                      </label>
                      {isDiscovering && (
                        <span style={{ fontSize: "11px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RefreshCw size={11} className="spin" /> Scanning...
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedPrinter}
                      onChange={(e) => setSelectedPrinter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        color: "var(--text)",
                        fontSize: "12px",
                        fontWeight: "600",
                        outline: "none",
                      }}
                    >
                      <option value="">System Default Printer</option>
                      {printers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? "(Default)" : ""} {p.displayName && p.displayName !== p.name ? `[${p.displayName}]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Orientation & Copies */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                        Orientation
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => setOrientation("portrait")}
                          style={{
                            padding: "8px",
                            borderRadius: "6px",
                            border: `1px solid ${orientation === "portrait" ? "var(--accent)" : "var(--line)"}`,
                            background: orientation === "portrait" ? "var(--accent-subtle)" : "var(--surface-2)",
                            color: orientation === "portrait" ? "var(--accent)" : "var(--text)",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientation("landscape")}
                          style={{
                            padding: "8px",
                            borderRadius: "6px",
                            border: `1px solid ${orientation === "landscape" ? "var(--accent)" : "var(--line)"}`,
                            background: orientation === "landscape" ? "var(--accent-subtle)" : "var(--surface-2)",
                            color: orientation === "landscape" ? "var(--accent)" : "var(--text)",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                        Copies
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={copies}
                        onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--line)",
                          color: "var(--text)",
                          fontSize: "12px",
                          fontWeight: "700",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Paper Format */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                      Paper Format
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        color: "var(--text)",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    >
                      <option value="A4">A4 (210 × 297 mm) — Standard Tally</option>
                      <option value="A5">A5 (148 × 210 mm) — Compact Half-Page</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>

                  {/* Header Title Field */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                      Header Title / Document Subject
                    </label>
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      placeholder={effectiveTitle}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        color: "var(--text)",
                        fontSize: "12px",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Zoom Scale */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)" }}>
                        Zoom Scale Factor
                      </label>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--accent)" }}>{scale}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={5}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>

                  {/* Footer Note */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", marginBottom: "6px" }}>
                      Footer Disclaimer
                    </label>
                    <input
                      type="text"
                      value={footerTitle}
                      onChange={(e) => setFooterTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        color: "var(--text)",
                        fontSize: "12px",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Toggles */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={printBackground}
                        onChange={(e) => setPrintBackground(e.target.checked)}
                        style={{ accentColor: "var(--accent)", width: "16px", height: "16px" }}
                      />
                      <span>Print Grid Lines & Background Shading</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={colorMode}
                        onChange={(e) => setColorMode(e.target.checked)}
                        style={{ accentColor: "var(--accent)", width: "16px", height: "16px" }}
                      />
                      <span>Full Color (Uncheck for B&W Monochrome)</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Real-Time Interactive Live Document Preview */}
          <div
            style={{
              background: "#0b0f19",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflowY: "auto",
              position: "relative",
            }}
          >
            {/* Top Preview Indicator Badge */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 12px",
                borderRadius: "20px",
                background: "rgba(30, 41, 59, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                fontSize: "11px",
                fontWeight: "700",
                zIndex: 2,
              }}
            >
              <Eye size={12} style={{ color: "#38bdf8" }} />
              <span>
                Live Preview: {pageSize} • {isLandscape ? "Landscape" : "Portrait"} • Scale: {scale}% • {colorMode ? "Color" : "Monochrome"}
              </span>
            </div>

            {/* The Virtual Sheet of Paper (WYSIWYG) */}
            <div
              style={{
                width: isLandscape ? "94%" : "72%",
                maxWidth: isLandscape ? "640px" : "480px",
                aspectRatio: paperRatio,
                background: printBackground ? "#ffffff" : "#ffffff",
                borderRadius: "4px",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)",
                padding: "24px 28px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                filter: !colorMode ? "grayscale(100%)" : "none",
                transform: `scale(${Math.min(1.05, Math.max(0.7, scale / 100))})`,
                transformOrigin: "center center",
                transition: "all 0.2s ease",
                color: "#0f172a",
                overflow: "hidden",
              }}
            >
              {/* Document Header in Preview */}
              <div
                style={{
                  borderBottom: "2px solid #0d9488",
                  paddingBottom: "10px",
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>
                    {effectiveTitle}
                  </h4>
                  <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "600", marginTop: "2px" }}>
                    Tally {pageSize} Format • ReconcAILe Hub Sync
                  </div>
                </div>
                <div style={{ fontSize: "9px", color: "#64748b", textAlign: "right" }}>
                  Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/>
                  Total Items: {reportData.length}
                </div>
              </div>

              {/* Document Table Grid in Preview */}
              <div style={{ flex: 1, overflow: "hidden", border: printBackground ? "1px solid #cbd5e1" : "none", borderRadius: "4px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                  <thead>
                    <tr style={{ background: printBackground ? "#e2e8f0" : "#ffffff", borderBottom: "1px solid #cbd5e1" }}>
                      {previewColumns.slice(0, 6).map((c) => (
                        <th
                          key={c.key}
                          style={{
                            padding: "6px 8px",
                            textAlign: "left",
                            fontWeight: "800",
                            color: "#334155",
                            borderRight: printBackground ? "1px solid #cbd5e1" : "none",
                          }}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData && reportData.length > 0 ? reportData.slice(0, 8) : [{ Value: "Sample Ledger Transaction Item" }]).map((row: any, idx: number) => (
                      <tr
                        key={idx}
                        style={{
                          background: printBackground && idx % 2 === 1 ? "#f8fafc" : "#ffffff",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {previewColumns.slice(0, 6).map((c) => {
                          const val = row[c.key];
                          const displayVal = typeof val === "number" ? val.toLocaleString("en-IN") : String(val ?? "-");
                          return (
                            <td
                              key={c.key}
                              style={{
                                padding: "5px 8px",
                                color: "#0f172a",
                                fontFamily: "monospace",
                                borderRight: printBackground ? "1px solid #f1f5f9" : "none",
                              }}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Document Footer in Preview */}
              <div
                style={{
                  marginTop: "12px",
                  borderTop: "1px solid #cbd5e1",
                  paddingTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "8px",
                  color: "#64748b",
                }}
              >
                <span>{footerTitle}</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handlePrintToPdf}
              disabled={isExecuting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--line)",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: isExecuting ? "wait" : "pointer",
              }}
            >
              <Download size={14} style={{ color: "#ef4444" }} />
              <span>{isExecuting ? "Saving..." : "Save as PDF (Pure Data)"}</span>
            </button>

            <button
              type="button"
              onClick={handleSendToPrinter}
              disabled={isExecuting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 20px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#FFFFFF",
                border: "none",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: isExecuting ? "wait" : "pointer",
              }}
            >
              <Printer size={14} />
              <span>{isExecuting ? "Printing..." : "Print Document"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render via createPortal directly into document.body so topbar positioning never shifts the modal
  return createPortal(modalContent, document.body);
}

export default PrintSettingsModal;
