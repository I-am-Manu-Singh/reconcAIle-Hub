import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, Plus, Folder, AlertCircle } from "lucide-react";
import Fuse from "fuse.js";
import { CreateLedgerModal } from "./CreateLedgerModal";

export interface LedgerOption {
  id?: string;
  name: string;
  parentName?: string | null;
}

interface SearchableLedgerSelectProps {
  value: string;
  onChange: (ledgerName: string, ledgerId?: string) => void;
  ledgers: readonly LedgerOption[];
  placeholder?: string;
  disabled?: boolean;
  companyId?: string;
  onNewLedgerCreated?: (newLedger: LedgerOption) => void;
  onRequestCreateLedger?: (initialName: string) => void;
}

export function SearchableLedgerSelect({
  value,
  onChange,
  ledgers,
  placeholder = "Select or search ledger...",
  disabled = false,
  companyId = "",
  onNewLedgerCreated,
  onRequestCreateLedger,
}: SearchableLedgerSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fuse.js client-side search indexing
  const fuse = useMemo(() => {
    return new Fuse(ledgers, {
      keys: ["name", "parentName"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [ledgers]);

  // Filtered options
  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      return ledgers.slice(0, 50); // top 50 default
    }
    return fuse.search(query).map(res => res.item).slice(0, 50);
  }, [query, ledgers, fuse]);

  const selectedLedger = ledgers.find(l => l.name.toLowerCase() === value.toLowerCase());

  const handleSelect = (ledger: LedgerOption) => {
    onChange(ledger.name, ledger.id);
    setIsOpen(false);
    setQuery("");
  };

  const handleCreateOnTheFly = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (onRequestCreateLedger) {
      onRequestCreateLedger(trimmed);
      setIsOpen(false);
      setQuery("");
    } else {
      setIsModalOpen(true);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", minWidth: "180px" }}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "8px",
          background: value ? "var(--surface)" : "rgba(239, 68, 68, 0.08)",
          border: value ? "1px solid var(--line)" : "1px dashed rgba(239, 68, 68, 0.5)",
          color: value ? "var(--text)" : "var(--danger)",
          fontSize: "12px",
          fontWeight: "600",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLedger?.parentName && (
            <span style={{ fontSize: "10px", color: "var(--muted)", background: "var(--surface-2)", padding: "1px 5px", borderRadius: "4px" }}>
              {selectedLedger.parentName}
            </span>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            minWidth: "260px",
            maxHeight: "260px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Search Box */}
          <div style={{ padding: "8px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)" }}>
            <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type new ledger..."
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "12px",
                color: "var(--text)",
                fontWeight: "600",
              }}
            />
          </div>

          {/* List Options */}
          <div style={{ overflowY: "auto", flex: 1, padding: "4px" }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.name.toLowerCase() === value.toLowerCase();
                return (
                  <div
                    key={opt.id || opt.name}
                    onClick={() => handleSelect(opt)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: isSelected ? "700" : "500",
                      background: isSelected ? "var(--accent-subtle)" : "transparent",
                      color: isSelected ? "var(--accent)" : "var(--text)",
                      cursor: "pointer",
                      marginBottom: "2px",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = isSelected ? "var(--accent-subtle)" : "var(--surface-2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? "var(--accent-subtle)" : "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <Folder size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {opt.name}
                      </span>
                    </div>
                    {opt.parentName && (
                      <span style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "8px", flexShrink: 0 }}>
                        {opt.parentName}
                      </span>
                    )}
                    {isSelected && <Check size={13} style={{ color: "var(--accent)", marginLeft: "6px", flexShrink: 0 }} />}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "12px", textAlign: "center", fontSize: "11.5px", color: "var(--muted)" }}>
                No existing ledger matches "{query}"
              </div>
            )}

            {/* Create On The Fly Option */}
            {query.trim() && !ledgers.some(l => l.name.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={handleCreateOnTheFly}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px",
                  background: "var(--accent-subtle)",
                  border: "1px dashed var(--accent)",
                  borderRadius: "6px",
                  color: "var(--accent)",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                <Plus size={13} />
                <span>Assign New Ledger: "{query.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Standalone Create Ledger Modal Wired Directly */}
      <CreateLedgerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialName={query.trim()}
        companyId={companyId}
        onLedgerCreated={(created) => {
          onChange(created.name, created.id);
          if (onNewLedgerCreated) {
            onNewLedgerCreated(created);
          }
          setIsModalOpen(false);
          setQuery("");
        }}
      />
    </div>
  );
}
