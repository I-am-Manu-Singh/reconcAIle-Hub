import React, { useState } from "react";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SearchableLedgerSelect, LedgerOption } from "./SearchableLedgerSelect";
import { SplitAllocation } from "../types/bankReviewTypes";

interface SplitTransactionRowProps {
  totalAmount: number;
  allocations: SplitAllocation[];
  ledgers: readonly LedgerOption[];
  companyId?: string;
  onChange: (updated: SplitAllocation[]) => void;
  onCancel: () => void;
}

export function SplitTransactionRow({
  totalAmount,
  allocations,
  ledgers,
  companyId = "",
  onChange,
  onCancel,
}: SplitTransactionRowProps): React.JSX.Element {
  const currentTotal = allocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const diff = Math.round((totalAmount - currentTotal) * 100) / 100;
  const isBalanced = Math.abs(diff) < 0.01;

  const handleAddSplit = () => {
    const newAllocation: SplitAllocation = {
      id: `split_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ledgerName: "",
      amount: diff > 0 ? diff : 0,
      narrationRemark: "",
    };
    onChange([...allocations, newAllocation]);
  };

  const handleRemoveSplit = (id: string) => {
    if (allocations.length <= 1) return;
    onChange(allocations.filter(a => a.id !== id));
  };

  const handleUpdateSplit = (id: string, updates: Partial<SplitAllocation>) => {
    onChange(
      allocations.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        borderRadius: "8px",
        marginTop: "8px",
        marginBottom: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)" }}>
          Split Multi-Ledger Allocation (Total Required: ₹{totalAmount.toLocaleString("en-IN")})
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: isBalanced ? "var(--success)" : "var(--danger)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isBalanced ? (
              <>
                <CheckCircle2 size={13} /> Perfectly Balanced
              </>
            ) : (
              <>
                <AlertCircle size={13} /> Variance: ₹{Math.abs(diff).toLocaleString("en-IN")} ({diff > 0 ? "Under" : "Over"})
              </>
            )}
          </span>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Collapse Split
          </button>
        </div>
      </div>

      {/* Split lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {allocations.map((alloc, idx) => (
          <div key={alloc.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", width: "16px", textAlign: "right" }}>
              #{idx + 1}
            </span>

            {/* Ledger Select */}
            <div style={{ flex: 2 }}>
              <SearchableLedgerSelect
                value={alloc.ledgerName}
                onChange={(name, id) => handleUpdateSplit(alloc.id, { ledgerName: name, ledgerId: id })}
                ledgers={ledgers}
                companyId={companyId}
                placeholder="Select target ledger..."
              />
            </div>

            {/* Amount input */}
            <div style={{ width: "140px", display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0 8px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--muted)", marginRight: "4px" }}>₹</span>
              <input
                type="number"
                step="0.01"
                value={alloc.amount === 0 ? "" : alloc.amount}
                onChange={(e) => handleUpdateSplit(alloc.id, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "var(--text)",
                  fontFamily: "monospace",
                }}
              />
            </div>

            {/* Remark */}
            <input
              type="text"
              value={alloc.narrationRemark || ""}
              onChange={(e) => handleUpdateSplit(alloc.id, { narrationRemark: e.target.value })}
              placeholder="Remark / Line Note (optional)"
              style={{
                flex: 1.5,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "11.5px",
                color: "var(--text)",
                outline: "none",
              }}
            />

            {/* Remove */}
            <button
              type="button"
              disabled={allocations.length <= 1}
              onClick={() => handleRemoveSplit(alloc.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--danger)",
                cursor: allocations.length <= 1 ? "not-allowed" : "pointer",
                opacity: allocations.length <= 1 ? 0.3 : 1,
                padding: "4px",
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "4px" }}>
        <button
          type="button"
          onClick={handleAddSplit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: "700",
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          <Plus size={12} /> Add Split Row
        </button>
      </div>
    </div>
  );
}
