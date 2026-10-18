import React, { useEffect } from "react";
import { Command, X } from "lucide-react";

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !/input|textarea/i.test((e.target as HTMLElement).tagName)) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: "Ctrl + K", description: "Global Search across Ledgers, Vouchers, Documents" },
    { key: "Ctrl + U", description: "Upload Invoices / Import Document Repository" },
    { key: "Ctrl + S", description: "Trigger Immediate Sync Run to Tally Outbox" },
    { key: "Ctrl + B", description: "Import Bank Feed Sample Transactions" },
    { key: "Ctrl + Shift + G", description: "Export GSTR-1 GSTN Portal Filing JSON" },
    { key: "?", description: "Toggle Keyboard Shortcuts Helper Modal" },
    { key: "Esc", description: "Close Active Modal or Inspect Drawer" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "16px" }}>
            <Command size={18} style={{ color: "var(--accent)" }} /> Desktop Keyboard Shortcuts
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {shortcuts.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-2)", borderRadius: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>{s.description}</span>
              <kbd style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontFamily: "monospace", color: "var(--accent)", fontWeight: "700" }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
