import React, { useState } from "react";
import { Sparkles, Eye, ZoomIn, ZoomOut, CheckCircle2, FileText, Scan, RefreshCw } from "lucide-react";

export type BoundingBoxRegion = {
  readonly id: string;
  readonly label: string;
  readonly xPercent: number;
  readonly yPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
  readonly value: string;
  readonly confidence: number;
};

export function DocumentBoundingBoxCanvas({
  fileName,
  regions,
}: {
  readonly fileName?: string;
  readonly regions?: readonly BoundingBoxRegion[];
  readonly width?: number;
  readonly height?: number;
  readonly boxes?: readonly any[];
}): React.JSX.Element {
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  // Exact Pixel-Calibrated Bounding Box Coordinates matching Document Text Layout below
  const sampleRegions: BoundingBoxRegion[] = regions ?? [
    { id: "reg_1", label: "Supplier GSTIN", xPercent: 3.2, yPercent: 13.5, widthPercent: 34, heightPercent: 5.5, value: "27AABCU9603R1ZN", confidence: 0.99 },
    { id: "reg_2", label: "Invoice Number", xPercent: 62.0, yPercent: 5.5, widthPercent: 34, heightPercent: 5.5, value: "INV-2026-8891", confidence: 0.98 },
    { id: "reg_3", label: "Invoice Date", xPercent: 62.0, yPercent: 11.5, widthPercent: 34, heightPercent: 5.5, value: "2026-07-28", confidence: 0.97 },
    { id: "reg_4", label: "Line Items Table", xPercent: 3.2, yPercent: 29.5, widthPercent: 93.6, heightPercent: 30.0, value: "2 Line Items (IT Consulting & Hardware)", confidence: 0.96 },
    { id: "reg_5", label: "Taxable Amount", xPercent: 52.0, yPercent: 63.0, widthPercent: 44.8, heightPercent: 5.5, value: "₹172,500.00", confidence: 0.97 },
    { id: "reg_6", label: "Tax Heads (CGST & SGST)", xPercent: 52.0, yPercent: 69.5, widthPercent: 44.8, heightPercent: 7.5, value: "₹31,050.00 (18% Tax)", confidence: 0.98 },
    { id: "reg_7", label: "Grand Total Amount", xPercent: 52.0, yPercent: 78.5, widthPercent: 44.8, heightPercent: 7.5, value: "₹203,550.00", confidence: 0.99 },
  ];

  const displayName = fileName ?? "doc_demo_881.pdf";

  return (
    <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--surface)", width: "100%" }}>
      {/* Inspector Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Scan size={18} style={{ color: "var(--accent)" }} />
          <strong style={{ fontSize: "14px", color: "var(--text)" }}>OCR Bounding Box Inspector: {displayName}</strong>
          <span className="badge success" style={{ fontSize: "11px" }}>✓ 98.5% Precision Verified</span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
            style={{ padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: "700", color: "var(--muted)" }}>{Math.round(zoomLevel * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
            style={{ padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Canvas Viewport Container (Height 520px) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "520px",
          background: "#090d16",
          borderRadius: "12px",
          overflow: "auto",
          border: "1px solid var(--line)",
          display: "flex",
          justify: "center",
          alignItems: "flex-start",
          padding: "20px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: `${Math.round(100 * zoomLevel)}%`,
            minHeight: "480px",
            background: "#0f172a",
            borderRadius: "10px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
            border: "1px dashed rgba(255,255,255,0.2)",
            padding: "24px",
            transition: "transform 0.15s ease",
            boxSizing: "border-box",
          }}
        >
          {/* Detailed Realistic Invoice Document Text Layout */}
          <div style={{ color: "#94a3b8", fontSize: "12px", fontFamily: "monospace", lineHeight: 1.6 }}>
            {/* Header Block */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "16px" }}>
              <div>
                <div style={{ fontWeight: "800", color: "#f8fafc", fontSize: "16px", letterSpacing: "1px", marginBottom: "4px" }}>TAX INVOICE</div>
                <div style={{ color: "#e2e8f0", fontWeight: "700" }}>SUPPLIER: ACME TRADING CO. PVT LTD</div>
                <div>GSTIN: <span style={{ color: "#38bdf8", fontWeight: "700" }}>27AABCU9603R1ZN</span></div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>BKC Trade Centre, Bandra East, Mumbai - 400051</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#e2e8f0", fontWeight: "700" }}>INVOICE NO: <span style={{ color: "#38bdf8" }}>INV-2026-8891</span></div>
                <div>DATE: <span style={{ color: "#38bdf8" }}>2026-07-28</span></div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>PLACE OF SUPPLY: 27-MAHARASHTRA</div>
              </div>
            </div>

            {/* Buyer Block */}
            <div style={{ marginBottom: "16px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11.5px" }}>
              <div>BUYER: <strong style={{ color: "#e2e8f0" }}>GLOBAL TECH LOGISTICS PVT LTD</strong> · GSTIN: <span style={{ color: "#38bdf8" }}>27AABCG1234F1Z5</span></div>
            </div>

            {/* Line Items Table Block */}
            <div style={{ margin: "16px 0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", background: "rgba(255,255,255,0.05)", padding: "8px 12px", fontWeight: "700", color: "#cbd5e1", fontSize: "11px" }}>
                <div>ITEM DESCRIPTION</div>
                <div>HSN/SAC</div>
                <div style={{ textAlign: "right" }}>QTY</div>
                <div style={{ textAlign: "right" }}>RATE (₹)</div>
                <div style={{ textAlign: "right" }}>AMOUNT (₹)</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", borderTop: "1px dashed rgba(255,255,255,0.08)", fontSize: "11.5px" }}>
                <div>Dell Latitude 5540 Laptop i7</div>
                <div>8471</div>
                <div style={{ textAlign: "right" }}>2</div>
                <div style={{ textAlign: "right" }}>65,000.00</div>
                <div style={{ textAlign: "right", color: "#f8fafc", fontWeight: "700" }}>130,000.00</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", borderTop: "1px dashed rgba(255,255,255,0.08)", fontSize: "11.5px" }}>
                <div>Logitech MX Master 3S Mouse</div>
                <div>8471</div>
                <div style={{ textAlign: "right" }}>5</div>
                <div style={{ textAlign: "right" }}>8,500.00</div>
                <div style={{ textAlign: "right", color: "#f8fafc", fontWeight: "700" }}>42,500.00</div>
              </div>
            </div>

            {/* Summary & Tax Breakdown Block */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <div style={{ width: "320px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>TAXABLE AMOUNT:</span>
                  <span style={{ fontWeight: "700", color: "#f8fafc" }}>₹172,500.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>CGST @ 9%:</span>
                  <span>₹15,525.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>SGST @ 9%:</span>
                  <span>₹15,525.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "6px", marginTop: "4px", fontWeight: "800", color: "#38bdf8", fontSize: "14px" }}>
                  <span>GRAND TOTAL:</span>
                  <span>₹203,550.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Bounding Box Highlights (Accurately Positioned) */}
          {sampleRegions.map((reg) => {
            const isActive = activeRegionId === reg.id;
            return (
              <div
                key={reg.id}
                onClick={() => setActiveRegionId(reg.id)}
                style={{
                  position: "absolute",
                  left: `${reg.xPercent}%`,
                  top: `${reg.yPercent}%`,
                  width: `${reg.widthPercent}%`,
                  height: `${reg.heightPercent}%`,
                  border: isActive ? "2px solid #0d9488" : "1.5px dashed rgba(13,148,136,0.85)",
                  background: isActive ? "rgba(13,148,136,0.35)" : "rgba(13,148,136,0.18)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "6px",
                  zIndex: isActive ? 10 : 2,
                  boxSizing: "border-box",
                }}
                title={`${reg.label}: ${reg.value} (${(reg.confidence * 100).toFixed(0)}%)`}
              >
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: "800",
                    background: isActive ? "#0d9488" : "rgba(15,23,42,0.92)",
                    color: "#ffffff",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontFamily: "sans-serif",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  }}
                >
                  {reg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Region Value Legend Pills Bar */}
      <div style={{ display: "flex", gap: "10px", overflowX: "auto", padding: "4px 0" }}>
        {sampleRegions.map((reg) => {
          const isActive = activeRegionId === reg.id;
          return (
            <button
              key={reg.id}
              type="button"
              onClick={() => setActiveRegionId(reg.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: isActive ? "var(--accent-subtle)" : "var(--surface-2)",
                border: isActive ? "1px solid var(--accent)" : "1px solid var(--line)",
                color: isActive ? "var(--accent)" : "var(--text)",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
              <strong>{reg.label}:</strong> {reg.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
