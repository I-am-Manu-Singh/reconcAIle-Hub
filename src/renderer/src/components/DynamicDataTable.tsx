import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  X,
  Columns,
  Hash,
  Search,
  ChevronUp,
  ArrowUp,
  ChevronDown,
  ArrowDown,
  Download,
  Copy,
  Star,
  Lock,
  Unlock,
  Settings2,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  SlidersHorizontal,
  ArrowUpDown,
  Receipt,
  FileText
} from "lucide-react";
import { exportToCsv } from "../utils/csvExporter";
import { BankLogo } from "./BankLogo";

export type ColumnDef = {
  key: string;
  label: string;
  dataType: "text" | "number" | "date" | "status" | "boolean" | "tags" | "email" | "phone" | "rating";
  editable?: boolean;
  options?: string[];
  hidden?: boolean;
};

export type DynamicTableProps = {
  readonly initialColumns: ColumnDef[];
  readonly initialData: any[];
  readonly onDataChange?: (newData: any[]) => void;
  readonly onRowClick?: (row: any) => void;
  readonly tableName?: string;
};

export function DynamicDataTable({
  initialColumns,
  initialData,
  onDataChange,
  onRowClick,
  tableName = "Data Register",
}: DynamicTableProps): React.JSX.Element {
  const [columns, setColumns] = useState<ColumnDef[]>(initialColumns);
  const [data, setData] = useState<any[]>(initialData);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  useEffect(() => {
    // If incoming data has dynamic keys not in initialColumns, auto-discover them
    if (initialData.length > 0 && initialColumns.length > 0) {
      const existingKeys = new Set(initialColumns.map(c => c.key));
      const firstRow = initialData[0];
      const discoveredCols: ColumnDef[] = [];

      for (const k in firstRow) {
        if (!existingKeys.has(k) && !/^(?:companyId|rawTextPreview|rawOcrText|previewUrl|previewData|preview_data|preview|items|validationErrors|bankName|bankLabel|isBankSession|sessionId|documentId|matchedVoucherId|reviewFlag)$/i.test(k)) {
          const val = firstRow[k];
          let dataType: ColumnDef["dataType"] = "text";
          if (typeof val === "number") dataType = "number";
          else if (k.toLowerCase().includes("date")) dataType = "date";
          else if (k.toLowerCase().includes("status")) dataType = "status";

          // Prettify label
          const label = k
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .replace(/_/g, " ")
            .trim();

          discoveredCols.push({
            key: k,
            label,
            dataType,
            editable: true,
          });
        }
      }

      if (discoveredCols.length > 0) {
        setColumns([...initialColumns, ...discoveredCols]);
        return;
      }
    }
    setColumns(initialColumns);
  }, [initialColumns, initialData]);

  // Compute common statement account number across the whole dataset (e.g. 545202010002883 -> 2883)
  const datasetDefaultLast4 = useMemo(() => {
    for (const r of data) {
      if (r.accountNumber || r.account_number) {
        const digits = String(r.accountNumber || r.account_number).replace(/\D/g, "");
        if (digits.length >= 4) return digits.slice(-4);
      }
      const text = `${r.description || ""} ${r.narration || ""} ${r.referenceNo || ""}`;
      const m = text.match(/(?:acct|a\/c|account)?[:.\s]*(\d{11,18})/i) || text.match(/\b(\d{12,18})\b/);
      if (m && m[1]) {
        return m[1].slice(-4);
      }
    }
    return "";
  }, [data]);

  // Master Lock State
  const [isLocked, setIsLocked] = useState(false);

  // Sorting state & Advanced Sort Dropdown Toggle
  const [sortColumnKey, setSortColumnKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Column Editor Row Toggle
  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);

  // Inline Add Column mode toggle
  const [showAddColInline, setShowAddColInline] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<ColumnDef["dataType"]>("text");
  const [newColTagOptions, setNewColTagOptions] = useState("Urgent, High, Low");

  // Inline cell editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [cellValueInput, setCellValueInput] = useState("");

  const updateStateAndNotify = (newData: any[]) => {
    setData(newData);
    if (onDataChange) onDataChange(newData);
  };

  // 1. Filtering & Sorting Logic
  const filteredAndSortedData = useMemo(() => {
    let result = data.filter((row) => {
      if (!row || typeof row !== "object") return false;

      if (statusFilter !== "ALL") {
        const rowStatus = String(row.status || row.state || row.matchStatus || "").toUpperCase();
        if (rowStatus !== statusFilter) return false;
      }

      if (!globalSearch.trim()) return true;
      const q = globalSearch.toLowerCase();
      return Object.values(row).some((val) => {
        if (Array.isArray(val)) return val.some(tag => String(tag ?? "").toLowerCase().includes(q));
        return String(val ?? "").toLowerCase().includes(q);
      });
    });

    if (sortColumnKey) {
      result = [...result].sort((a, b) => {
        const valA = a[sortColumnKey];
        const valB = b[sortColumnKey];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        let comparison = 0;
        if (typeof valA === "number" && typeof valB === "number") comparison = valA - valB;
        else comparison = String(valA).localeCompare(String(valB));

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, globalSearch, statusFilter, sortColumnKey, sortDirection]);

  const handleSort = (colKey: string) => {
    if (sortColumnKey === colKey) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumnKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumnKey(colKey);
      setSortDirection("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredAndSortedData.length) setSelectedRowIds(new Set());
    else setSelectedRowIds(new Set(filteredAndSortedData.map((row, idx) => row.id || `row_${idx}`)));
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const handleAddLineItem = () => {
    if (isLocked) return;
    const newId = `row_${Date.now()}`;
    const newRow: any = { id: newId };
    columns.forEach((col) => {
      if (col.dataType === "number") newRow[col.key] = 0;
      else if (col.dataType === "date") newRow[col.key] = new Date().toISOString().substring(0, 10);
      else if (col.dataType === "status") newRow[col.key] = "PENDING";
      else if (col.dataType === "boolean") newRow[col.key] = false;
      else if (col.dataType === "tags") newRow[col.key] = col.options ? [col.options[0]] : ["General"];
      else if (col.dataType === "rating") newRow[col.key] = 3;
      else if (col.dataType === "email") newRow[col.key] = "contact@example.com";
      else if (col.dataType === "phone") newRow[col.key] = "+91 00000 00000";
      else newRow[col.key] = "New Record";
    });
    const nextData = [newRow, ...data];
    updateStateAndNotify(nextData);
  };

  const handleDeleteSelected = () => {
    if (isLocked || selectedRowIds.size === 0) return;
    const nextData = data.filter((row, idx) => !selectedRowIds.has(row.id || `row_${idx}`));
    setSelectedRowIds(new Set());
    updateStateAndNotify(nextData);
  };

  const handleDuplicateSelected = () => {
    if (isLocked || selectedRowIds.size === 0) return;
    const duplicated = data
      .filter((row, idx) => selectedRowIds.has(row.id || `row_${idx}`))
      .map((row) => ({ ...row, id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }));
    updateStateAndNotify([...duplicated, ...data]);
  };

  const handleExportSelectedCsv = () => {
    const exportRows = selectedRowIds.size > 0 
      ? data.filter((row, idx) => selectedRowIds.has(row.id || `row_${idx}`))
      : filteredAndSortedData;
    const cleanBase = (tableName || "Export_Data").trim().replace(/\.(?:csv|xlsx|xls|xml|json|pdf)$/i, "").replace(/[\\/:*?"<>|\s]+/g, "_");
    exportToCsv(`${cleanBase}_Export`, exportRows, columns.map(c => ({ key: c.key, label: c.label })));
  };

  const handleDeleteSingleRow = (id: string) => {
    if (isLocked) return;
    const nextData = data.filter((row, idx) => (row.id || `row_${idx}`) !== id);
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    updateStateAndNotify(nextData);
  };

  const handleMoveRow = (fromIndex: number, toIndex: number) => {
    if (isLocked) return;
    if (toIndex < 0 || toIndex >= data.length || fromIndex === toIndex) return;
    const updated = [...data];
    const [movedRow] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedRow);
    updateStateAndNotify(updated);
  };

  const handleRowDragStart = (e: React.DragEvent, index: number) => {
    if (isLocked) return;
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleRowDragOver = (e: React.DragEvent) => {
    if (isLocked || draggedRowIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (isLocked || draggedRowIndex === null) return;
    handleMoveRow(draggedRowIndex, targetIndex);
    setDraggedRowIndex(null);
  };

  // Drag columns left and right in edit column mode
  const handleMoveColumn = (index: number, direction: "left" | "right") => {
    if (isLocked) return;
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const updatedCols = [...columns];
    const [movedCol] = updatedCols.splice(index, 1);
    updatedCols.splice(targetIndex, 0, movedCol);
    setColumns(updatedCols);
  };

  const handleChangeColumnLabel = (key: string, newLabel: string) => {
    setColumns(columns.map((c) => (c.key === key ? { ...c, label: newLabel } : c)));
  };

  const handleChangeColumnType = (key: string, newDataType: ColumnDef["dataType"]) => {
    setColumns(columns.map(c => c.key === key ? { ...c, dataType: newDataType } : c));
  };

  const handleRemoveColumn = (key: string) => {
    if (isLocked) return;
    const visibleCols = columns.filter(c => !c.hidden);
    if (visibleCols.length <= 1) {
      alert("Table must contain at least one visible column.");
      return;
    }
    setColumns(columns.filter((c) => c.key !== key));
  };

  const handleCreateColumn = () => {
    if (isLocked || !newColLabel.trim()) return;
    const colKey = `custom_${newColLabel.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    const optionsArray = newColType === "tags" ? newColTagOptions.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    
    const newCol: ColumnDef = {
      key: colKey,
      label: newColLabel.trim(),
      dataType: newColType,
      editable: true,
      options: optionsArray,
    };
    setColumns([...columns, newCol]);
    setNewColLabel("");
    setShowAddColInline(false);
  };

  const handleStartCellEdit = (rowId: string, colKey: string, val: any) => {
    if (isLocked) return;
    setEditingCell({ rowId, colKey });
    setCellValueInput(Array.isArray(val) ? val.join(", ") : val !== undefined && val !== null ? String(val) : "");
  };

  const handleSaveCellEdit = (rowId: string, colKey: string, dataType: ColumnDef["dataType"]) => {
    if (isLocked) return;
    let formattedVal: any = cellValueInput;
    if (dataType === "number") formattedVal = Number(cellValueInput) || 0;
    else if (dataType === "boolean") formattedVal = cellValueInput === "true" || cellValueInput === "on";
    else if (dataType === "tags") formattedVal = cellValueInput.split(",").map(s => s.trim()).filter(Boolean);
    else if (dataType === "rating") formattedVal = Math.min(5, Math.max(1, Number(cellValueInput) || 3));

    const nextData = data.map((row, idx) => {
      const currId = row.id || `row_${idx}`;
      if (currId === rowId) return { ...row, [colKey]: formattedVal };
      return row;
    });
    setEditingCell(null);
    updateStateAndNotify(nextData);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", fontFamily: "system-ui, sans-serif" }}>
      
      {/* ACTION & CONTROL BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", background: "var(--surface)", padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--line)" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1, minWidth: "300px" }}>
          
          <button
            type="button"
            onClick={() => {
              setIsLocked(!isLocked);
              setEditingCell(null);
              setIsColumnEditorOpen(false);
              setShowAddColInline(false);
              setIsSortDropdownOpen(false);
            }}
            title={isLocked ? "Unlock Table to Edit" : "Lock Table to Prevent Edits"}
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px",
              background: isLocked ? "rgba(239, 68, 68, 0.1)" : "var(--surface-2)",
              color: isLocked ? "#ef4444" : "var(--text)", border: "1px solid var(--line)",
              fontWeight: "700", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>

          {!isLocked && (
            <button
              type="button"
              onClick={handleAddLineItem}
              style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px",
                background: "var(--accent)", color: "#FFFFFF", fontWeight: "700", fontSize: "12px",
                border: "none", cursor: "pointer"
              }}
            >
              <Plus size={14} /> Add Line
            </button>
          )}

          {!isLocked && showAddColInline ? (
             <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", padding: "2px", borderRadius: "8px", border: "1px solid var(--accent)" }}>
               <input
                 type="text"
                 placeholder="Column Name..."
                 value={newColLabel}
                 onChange={(e) => setNewColLabel(e.target.value)}
                 style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "transparent", color: "var(--text)", fontSize: "11.5px", fontWeight: "600", width: "120px", outline: "none" }}
               />
               <select
                 value={newColType}
                 onChange={(e) => setNewColType(e.target.value as any)}
                 style={{ padding: "4px 6px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", outline: "none" }}
               >
                 <option value="text">Text</option>
                 <option value="number">Number</option>
                 <option value="date">Date</option>
                 <option value="status">Status</option>
                 <option value="tags">Tags</option>
                 <option value="boolean">Check</option>
                 <option value="rating">Rating</option>
               </select>
               <button type="button" onClick={handleCreateColumn} style={{ padding: "5px 10px", borderRadius: "6px", background: "var(--accent)", color: "#fff", fontWeight: "700", border: "none", fontSize: "11.5px", cursor: "pointer" }}>Save</button>
               <button type="button" onClick={() => setShowAddColInline(false)} style={{ padding: "5px 6px", borderRadius: "6px", background: "transparent", color: "var(--muted)", fontWeight: "600", border: "none", fontSize: "11.5px", cursor: "pointer" }}><X size={14} /></button>
             </div>
          ) : (
            !isLocked && (
              <button
                type="button"
                onClick={() => setShowAddColInline(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px",
                  background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)",
                  fontWeight: "600", fontSize: "12px", cursor: "pointer"
                }}
              >
                <Columns size={13} style={{ color: "var(--accent)" }} /> New Column
              </button>
            )
          )}

          {/* ADVANCED SORTING DROPDOWN IN CONTROL ROW */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setIsSortDropdownOpen(!isSortDropdownOpen);
                setIsColumnEditorOpen(false);
                setShowAddColInline(false);
              }}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px",
                background: sortColumnKey ? "var(--accent-subtle)" : "var(--surface-2)",
                border: sortColumnKey ? "1px solid var(--accent)" : "1px solid var(--line)",
                color: sortColumnKey ? "var(--accent)" : "var(--text)",
                fontWeight: "600", fontSize: "12px", cursor: "pointer"
              }}
            >
              <ArrowUpDown size={13} />
              <span>{sortColumnKey ? `Sorted: ${columns.find(c => c.key === sortColumnKey)?.label || sortColumnKey}` : "Sort Options"}</span>
              <ChevronDown size={12} />
            </button>

            {isSortDropdownOpen && (
              <div style={{
                position: "absolute", left: 0, top: "38px", background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 99, width: "220px", padding: "8px", display: "flex", flexDirection: "column", gap: "4px"
              }}>
                <div style={{ padding: "4px 8px", fontSize: "10.5px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
                  Sort Columns
                </div>
                {columns.filter(c => !c.hidden).map((col) => {
                  const isCurrent = sortColumnKey === col.key;
                  return (
                    <div
                      key={`sort_opt_${col.key}`}
                      onClick={() => {
                        handleSort(col.key);
                      }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px",
                        borderRadius: "6px", background: isCurrent ? "var(--accent-subtle)" : "transparent",
                        color: isCurrent ? "var(--accent)" : "var(--text)", fontWeight: isCurrent ? "700" : "600",
                        fontSize: "12px", cursor: "pointer"
                      }}
                    >
                      <span>{col.label}</span>
                      {isCurrent && (
                        <span style={{ fontSize: "11px", fontWeight: "800" }}>
                          {sortDirection === "asc" ? "▲ ASC" : "▼ DESC"}
                        </span>
                      )}
                    </div>
                  );
                })}
                {sortColumnKey && (
                  <div
                    onClick={() => {
                      setSortColumnKey(null);
                      setSortDirection("asc");
                      setIsSortDropdownOpen(false);
                    }}
                    style={{
                      borderTop: "1px solid var(--line)", marginTop: "4px", padding: "6px 10px", borderRadius: "6px",
                      color: "#ef4444", fontWeight: "700", fontSize: "11.5px", cursor: "pointer", textAlign: "center"
                    }}
                  >
                    Clear Sorting
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "0 10px", borderRadius: "8px", height: "32px", flex: 1, maxWidth: "200px", minWidth: "120px" }}>
            <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search data..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "12px", fontWeight: "600", width: "100%", padding: 0 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
          {!isLocked && selectedRowIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleDeleteSelected}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "8px", background: "#ef4444", color: "#FFFFFF", fontWeight: "700", fontSize: "12px", border: "none", cursor: "pointer" }}
              >
                <Trash2 size={13} /> Delete ({selectedRowIds.size})
              </button>
              <button
                type="button"
                onClick={handleDuplicateSelected}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
              >
                <Copy size={13} /> Duplicate
              </button>
            </>
          )}

          {!isLocked && (
            <button
              type="button"
              onClick={() => {
                setIsColumnEditorOpen(!isColumnEditorOpen);
                setIsSortDropdownOpen(false);
                setShowAddColInline(false);
              }}
              style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "8px",
                background: isColumnEditorOpen ? "var(--accent-subtle)" : "var(--surface-2)", 
                border: isColumnEditorOpen ? "1px solid var(--accent)" : "1px solid var(--line)", 
                color: isColumnEditorOpen ? "var(--accent)" : "var(--text)",
                fontWeight: "600", fontSize: "12px", cursor: "pointer", transition: "all 0.15s ease"
              }}
            >
              <Settings2 size={13} /> Edit Columns
            </button>
          )}

          <button
            type="button"
            onClick={handleExportSelectedCsv}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Interactive Grid Table */}
      <div className="table-container" style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "10px", background: "var(--surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: isColumnEditorOpen ? "none" : "1px solid var(--line)" }}>
              <th style={{ width: "40px", padding: "10px 12px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={filteredAndSortedData.length > 0 && selectedRowIds.size === filteredAndSortedData.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer" }}
                />
              </th>
              <th style={{ width: "50px", padding: "10px 8px", color: "var(--muted)", fontWeight: "700", fontSize: "11px", textAlign: "center" }}>
                <Hash size={12} />
              </th>

              {columns.filter(c => !c.hidden).map((col) => {
                const isSorted = sortColumnKey === col.key;
                return (
                  <th 
                    key={col.key} 
                    onClick={() => handleSort(col.key)}
                    style={{ padding: "10px 12px", color: isSorted ? "var(--accent)" : "var(--muted)", fontWeight: "700", fontSize: "11.5px", textTransform: "uppercase", cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{col.label}</span>
                      {isSorted && (
                        <span style={{ display: "flex" }}>
                          {sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              {!isLocked && (
                <th style={{ width: "70px", padding: "10px 12px", textAlign: "center", color: "var(--muted)", fontWeight: "700", fontSize: "11.5px" }}>
                  Actions
                </th>
              )}
            </tr>

            {isColumnEditorOpen && !isLocked && (
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                <th colSpan={2} style={{ borderRight: "1px dashed var(--line)" }}></th>
                
                {columns.filter(c => !c.hidden).map((col) => {
                  const actualColIndex = columns.findIndex(c => c.key === col.key);
                  return (
                    <th key={`edit_${col.key}`} style={{ padding: "6px 12px", borderRight: "1px dashed var(--line)", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            value={col.label}
                            onChange={(e) => handleChangeColumnLabel(col.key, e.target.value)}
                            style={{ width: "100%", fontSize: "11px", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--line)", fontWeight: "600", outline: "none", color: "var(--text)" }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRemoveColumn(col.key)} 
                            title="Delete Column" 
                            style={{ border: "none", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", flexShrink: 0 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                          <select
                            value={col.dataType}
                            onChange={(e) => handleChangeColumnType(col.key, e.target.value as any)}
                            style={{ fontSize: "10.5px", padding: "4px", borderRadius: "4px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", outline: "none", cursor: "pointer", fontWeight: "600", flex: 1 }}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="status">Status</option>
                            <option value="tags">Tags</option>
                            <option value="boolean">Check</option>
                            <option value="rating">Rating</option>
                          </select>
                          <div style={{ display: "flex", gap: "2px" }}>
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(actualColIndex, "left")}
                              disabled={actualColIndex === 0}
                              title="Drag/Move Column Left"
                              style={{ border: "none", background: "var(--surface)", cursor: actualColIndex === 0 ? "not-allowed" : "pointer", color: "var(--text)", opacity: actualColIndex === 0 ? 0.3 : 1, padding: "3px 5px", borderRadius: "4px", fontSize: "10px" }}
                            >
                              <ArrowLeft size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(actualColIndex, "right")}
                              disabled={actualColIndex === columns.length - 1}
                              title="Drag/Move Column Right"
                              style={{ border: "none", background: "var(--surface)", cursor: actualColIndex === columns.length - 1 ? "not-allowed" : "pointer", color: "var(--text)", opacity: actualColIndex === columns.length - 1 ? 0.3 : 1, padding: "3px 5px", borderRadius: "4px", fontSize: "10px" }}
                            >
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </th>
                  );
                })}
                
                {!isLocked && <th></th>}
              </tr>
            )}
          </thead>

          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.filter(c => !c.hidden).length + (isLocked ? 2 : 3)} style={{ padding: "36px", textAlign: "center", color: "var(--muted)" }}>
                  No records available. Click "Add Line" to begin.
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((row, idx) => {
                const rowId = row.id || `row_${idx}`;
                const isSelected = selectedRowIds.has(rowId);
                const isFlagged = Boolean(row.reviewFlag || row.flag);

                return (
                  <tr 
                    key={rowId} 
                    onClick={() => onRowClick?.(row)}
                    onDragOver={handleRowDragOver}
                    onDrop={(e) => handleRowDrop(e, idx)}
                    style={{ 
                      borderBottom: "1px solid var(--line)", 
                      background: draggedRowIndex === idx
                        ? "var(--accent-subtle)"
                        : isSelected 
                        ? "var(--accent-subtle)" 
                        : isFlagged 
                        ? "rgba(239, 68, 68, 0.05)" 
                        : "transparent",
                      borderLeft: isFlagged ? "3px solid #ef4444" : "3px solid transparent",
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background 0.15s ease",
                      opacity: draggedRowIndex === idx ? 0.6 : 1,
                    }}
                  >
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        {isFlagged && (
                          <span
                            title="Flagged for review / warning"
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "#ef4444",
                              boxShadow: "0 0 6px rgba(239, 68, 68, 0.6)",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(rowId)} style={{ cursor: "pointer" }} />
                      </div>
                    </td>

                    {/* DRAG / MOVE ROW UP & DOWN VIA DOUBLE DOTTED ICON */}
                    <td style={{ padding: "10px 4px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                        {!isLocked && (
                          <div
                            draggable
                            onDragStart={(e) => handleRowDragStart(e, idx)}
                            title="Drag to reorder row up or down"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "grab",
                              color: "var(--muted)",
                              padding: "2px",
                              borderRadius: "4px",
                              transition: "color 0.15s ease, background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--accent)";
                              e.currentTarget.style.background = "var(--surface-2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--muted)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <GripVertical size={14} style={{ opacity: 0.8 }} />
                          </div>
                        )}
                        <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: "700" }}>
                          {idx + 1}
                        </span>
                      </div>
                    </td>

                    {columns.filter(c => !c.hidden).map((col) => {
                      const val = row[col.key];
                      const isEditingThisCell = !isLocked && editingCell?.rowId === rowId && editingCell?.colKey === col.key;

                      return (
                        <td
                          key={col.key}
                          onClick={() => !isEditingThisCell && handleStartCellEdit(rowId, col.key, val)}
                          style={{ padding: "10px 12px", cursor: isLocked ? "default" : "pointer" }}
                        >
                          {isEditingThisCell ? (
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <input
                                type={col.dataType === "number" ? "number" : col.dataType === "date" ? "date" : "text"}
                                value={cellValueInput}
                                onChange={(e) => setCellValueInput(e.target.value)}
                                onBlur={() => handleSaveCellEdit(rowId, col.key, col.dataType)}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveCellEdit(rowId, col.key, col.dataType)}
                                autoFocus
                                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--accent)", fontSize: "12px", width: "100%", outline: "none", background: "var(--surface)" }}
                              />
                            </div>
                          ) : (
                            <span style={{ fontSize: "12.5px", color: "var(--text)", display: "flex", alignItems: "center" }}>
                              {/^(?:confidence|confidenceScore|conf|matchConfidence)$/i.test(col.key)
                                ? (() => {
                                    const numVal = Number(val);
                                    if (isNaN(numVal)) return <span style={{ color: "var(--muted)" }}>—</span>;
                                    const pct = Math.round(numVal <= 1.0 ? numVal * 100 : numVal);
                                    const badgeBg = pct >= 85 ? "rgba(16, 185, 129, 0.12)" : pct >= 50 ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)";
                                    const badgeColor = pct >= 85 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                                    return (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "12px", background: badgeBg, color: badgeColor, fontWeight: "700", fontSize: "11px", letterSpacing: "0.2px" }}>
                                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badgeColor }} />
                                        {pct}%
                                      </span>
                                    );
                                  })()
                                : col.dataType === "number"
                                ? (val === 0 || val === "0" || val === null || val === undefined
                                    ? <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>
                                    : /^(?:page|page_?no|page_?number|index|id|serial)$/i.test(col.key)
                                    ? String(val)
                                    : `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
                                : col.key.toLowerCase().includes("bank") && typeof val === "string" && val.trim()
                                ? (() => {
                                    const lowerVal = val.toLowerCase().trim();
                                    const isInvoiceOrDoc = lowerVal.includes("invoice") || lowerVal.includes("bill") || lowerVal.includes("tax_invoice") || lowerVal.includes("challan") || lowerVal.includes("receipt");
                                    if (isInvoiceOrDoc) {
                                      return (
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 8px", borderRadius: "6px", background: "rgba(13, 148, 136, 0.1)", color: "var(--accent)", fontSize: "11.5px", fontWeight: "700" }}>
                                          <Receipt size={14} />
                                          <span>Invoice</span>
                                        </div>
                                      );
                                    }
                                    if (val === "—" || val === "-" || !val) {
                                      return <span style={{ color: "var(--muted)" }}>—</span>;
                                    }
                                    let accNo = row.accountNumber || row.account_number || "";
                                    let ifsc = row.ifscCode || row.ifsc_code || row.ifsc || "";
                                    let bankIdentifier = val;

                                    // Prioritize statement account number for the bank column
                                    const effectiveLast4 =
                                      datasetDefaultLast4 ||
                                      (accNo ? String(accNo).replace(/\D/g, "").slice(-4) : "");
                                    return (
                                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                        <BankLogo bankName={bankIdentifier} ifsc={ifsc} showBadge={false} size={22} />
                                        {effectiveLast4 ? (
                                          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", fontFamily: "monospace" }}>
                                            ••••{effectiveLast4}
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  })()
                                : col.dataType === "status"
                                ? <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10.5px", fontWeight: "800", background: val === "APPROVED" || val === "BALANCED" || val === "MATCHED" ? "var(--accent-subtle)" : "rgba(239, 68, 68, 0.12)", color: val === "APPROVED" || val === "BALANCED" || val === "MATCHED" ? "var(--accent)" : "#ef4444" }}>{String(val || "PENDING")}</span>
                                : col.dataType === "boolean"
                                ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = data.map((r) => (r.id || r._id) === rowId ? { ...r, [col.key]: !val } : r);
                                        setData(updated);
                                        onDataChange?.(updated);
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "2px 4px",
                                        borderRadius: "4px"
                                      }}
                                      title={val ? "Flagged for review (Click to unflag)" : "Unflagged (Click to flag for review)"}
                                    >
                                      {col.key === "reviewFlag" || col.key === "flag" ? (
                                        <div
                                          style={{
                                            width: "15px",
                                            height: "15px",
                                            borderRadius: "50%",
                                            border: val ? "2px solid #ef4444" : "2px solid var(--muted)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: val ? "rgba(239, 68, 68, 0.15)" : "transparent",
                                            transition: "all 0.15s ease",
                                          }}
                                        >
                                          {Boolean(val) && (
                                            <div
                                              style={{
                                                width: "7px",
                                                height: "7px",
                                                borderRadius: "50%",
                                                background: "#ef4444",
                                                boxShadow: "0 0 4px rgba(239, 68, 68, 0.8)",
                                              }}
                                            />
                                          )}
                                        </div>
                                      ) : (
                                        <input type="checkbox" checked={Boolean(val)} readOnly style={{ cursor: "pointer" }} />
                                      )}
                                    </button>
                                  )
                                : col.dataType === "tags"
                                ? <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                    {Array.isArray(val) ? val.map((tag, i) => (
                                      <span key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700" }}>{tag}</span>
                                    )) : String(val || "-")}
                                  </div>
                                : col.dataType === "rating"
                                ? <div style={{ display: "flex", gap: "2px", color: "#f59e0b" }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} size={13} fill={star <= Number(val || 3) ? "#f59e0b" : "none"} />
                                    ))}
                                  </div>
                                : col.dataType === "email"
                                ? <a href={`mailto:${val}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "600" }}>{String(val || "")}</a>
                                : col.dataType === "phone"
                                ? <a href={`tel:${val}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--text)", textDecoration: "none", fontWeight: "600" }}>{String(val || "")}</a>
                                : String(val ?? "-")}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {!isLocked && (
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleRow(rowId)}
                            title="Delete Row"
                            style={{ border: "none", background: "rgba(239, 68, 68, 0.1)", cursor: "pointer", color: "#ef4444", padding: "5px 8px", borderRadius: "6px" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {filteredAndSortedData.length > 0 && (
            <tfoot style={{ background: "var(--surface-2)", borderTop: "2px solid var(--line)", fontWeight: "800" }}>
              <tr>
                <td colSpan={2} style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: "11px" }}>
                  COUNT: {filteredAndSortedData.length}
                </td>
                {columns.filter(c => !c.hidden).map((col) => {
                  if (col.dataType === "number" && !/^(?:page|page_?no|page_?number|index|id|serial|confidence|confidenceScore|conf|matchConfidence)$/i.test(col.key)) {
                    const totalVal = filteredAndSortedData.reduce((sum, row) => sum + Number(row[col.key] || 0), 0);
                    return (
                      <td key={col.key} style={{ padding: "12px", color: "var(--success)", fontFamily: "monospace", fontSize: "12.5px" }}>
                        ₹{totalVal.toLocaleString("en-IN")}
                      </td>
                    );
                  }
                  return (
                    <td key={col.key} style={{ padding: "12px", color: "var(--muted)", fontSize: "11px" }}>
                      —
                    </td>
                  );
                })}
                {!isLocked && <td style={{ padding: "12px" }} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}