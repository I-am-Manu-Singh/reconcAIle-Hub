import React from "react";
import { CheckCircle2, Trash2, Download, X } from "lucide-react";

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkApprove,
  onBulkExport,
  onBulkDelete,
}: {
  readonly selectedCount: number;
  readonly onClearSelection: () => void;
  readonly onBulkApprove?: () => void;
  readonly onBulkExport?: () => void;
  readonly onBulkDelete?: () => void;
}): React.JSX.Element | null {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--sidebar-bg)",
        border: "1px solid var(--accent)",
        borderRadius: "14px",
        padding: "10px 20px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 9000,
        color: "var(--sidebar-text)",
        animation: "slideUp 0.15s ease",
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ background: "var(--accent)", color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "11px" }}>
          {selectedCount}
        </span>
        Items Selected
      </span>

      <div style={{ height: "16px", width: "1px", background: "var(--sidebar-border)" }} />

      <div style={{ display: "flex", gap: "8px" }}>
        {onBulkApprove && (
          <button
            type="button"
            onClick={onBulkApprove}
            style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--accent)", color: "#fff", border: "none", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <CheckCircle2 size={13} /> Bulk Approve
          </button>
        )}

        {onBulkExport && (
          <button
            type="button"
            onClick={onBulkExport}
            style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Download size={13} /> Export Selected
          </button>
        )}

        {onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            style={{ padding: "6px 12px", borderRadius: "6px", background: "var(--danger-subtle)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onClearSelection}
        title="Deselect All"
        style={{ background: "transparent", border: "none", color: "var(--sidebar-muted)", cursor: "pointer", padding: "4px" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
