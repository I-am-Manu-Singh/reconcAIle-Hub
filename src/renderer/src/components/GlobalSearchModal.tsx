import React, { useEffect } from "react";
import { Search, FileText, BookOpen, X } from "lucide-react";

export function GlobalSearchModal({
  isOpen,
  onClose,
  query = "",
  setQuery,
  mirrorLedgers = [],
  mirrorVouchers = [],
  documents = [],
  onNavigate,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly query?: string;
  readonly setQuery?: (val: string) => void;
  readonly mirrorLedgers?: readonly any[];
  readonly mirrorVouchers?: readonly any[];
  readonly documents?: readonly any[];
  readonly onNavigate: (moduleName: string) => void;
}) {

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Toggle view visibility
        if (isOpen) {
          if (onClose) onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const safeQuery = query.trim();

  // Exit early if dropdown shouldn't be active
  if (!isOpen || !safeQuery) return null;

  const matchedLedgers = mirrorLedgers.filter(l => (l.name || "").toLowerCase().includes(safeQuery.toLowerCase())).slice(0, 4);
  const matchedVouchers = mirrorVouchers.filter(v => (v.voucherNumber || v.narration || "").toLowerCase().includes(safeQuery.toLowerCase())).slice(0, 4);
  const matchedDocs = documents.filter(d => (d.originalFileName || "").toLowerCase().includes(safeQuery.toLowerCase())).slice(0, 4);

  const hasResults = matchedLedgers.length > 0 || matchedVouchers.length > 0 || matchedDocs.length > 0;

  return (
    <>
      {/* Click-away backdrop curtain layer overlay block */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent" }} />

      <div style={{
        position: "absolute",
        top: "44px", // Positioned perfectly below the 38px search input wrapper bar
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "12px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
        overflow: "hidden",
        maxHeight: "360px",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Results Header Summary Header Component block */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
            <Search size={12} style={{ color: "var(--accent)" }} />
            <span>Found {matchedLedgers.length + matchedVouchers.length + matchedDocs.length} Matches</span>
          </div>
          <button 
            type="button" 
            onClick={() => { if (setQuery) setQuery(""); if (onClose) onClose(); }} 
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Dynamic Map Listing Node Elements */}
        <div style={{ overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {!hasResults ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "12.5px" }}>
              No matches found for "<strong>{safeQuery}</strong>"
            </div>
          ) : (
            <>
              {/* Ledger Lists Rendering Block */}
              {matchedLedgers.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px", paddingLeft: "4px" }}>Master Accounts</div>
                  {matchedLedgers.map(l => (
                    <div key={l.id} onClick={() => { onNavigate("Vouchers"); onClose(); }} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderRadius: "6px", background: "var(--surface-2)", cursor: "pointer", marginBottom: "2px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <BookOpen size={13} style={{ color: "var(--accent)" }} />
                        <span style={{ fontSize: "12.5px", color: "var(--text)", fontWeight: "600" }}>{l.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matchedVouchers.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px", paddingLeft: "6px", letterSpacing: "0.5px" }}>
                    Vouchers
                  </div>
                  {matchedVouchers.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => { onNavigate("Vouchers"); if (onClose) onClose(); }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "6px", background: "var(--surface-2)", cursor: "pointer", marginBottom: "4px" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={14} style={{ color: "var(--accent-2)" }} />
                        <div>
                          <strong style={{ fontSize: "12.5px", color: "var(--text)" }}>{v.voucherTypeName || "Voucher"} #{v.voucherNumber || v.id?.slice(0, 8)}</strong>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{v.narration || "No narration"}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text)" }}>{v.voucherDate}</span>
                    </div>
                  ))}
                </div>
              )}

              {matchedDocs.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px", paddingLeft: "6px", letterSpacing: "0.5px" }}>
                    Documents & Invoices
                  </div>
                  {matchedDocs.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => { onNavigate("Documents"); if (onClose) onClose(); }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "6px", background: "var(--surface-2)", cursor: "pointer", marginBottom: "4px" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={14} style={{ color: "var(--success)" }} />
                        <strong style={{ fontSize: "12.5px", color: "var(--text)" }}>{d.originalFileName}</strong>
                      </div>
                      <span style={{ fontSize: "11px", background: "var(--accent-subtle)", color: "var(--accent)", padding: "2px 6px", borderRadius: "4px" }}>{d.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
