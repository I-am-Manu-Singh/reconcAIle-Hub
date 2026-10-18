import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  History, ChevronDown, ChevronRight, Search, Filter, Trash2, Download,
  Edit3, Save, X, CheckCircle, AlertTriangle, RefreshCw, FileText,
  TrendingUp, TrendingDown, Calendar, Building2, SortAsc, SortDesc,
  Check, AlertCircle, ChevronUp, Plus, Minus, Info
} from "lucide-react";
import { BankLogo } from "../components/BankLogo";

type BankSession = {
  id: string;
  companyId: string;
  documentId: string | null;
  bankName: string;
  bankLabel: string;
  originalFileName: string;
  accountNumber: string | null;
  ifscCode: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  financialYear: string | null;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  txCount: number;
  isBalanced: boolean;
  confidence: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type BankTx = {
  id: string;
  companyId: string | null;
  sessionId: string | null;
  bankName: string;
  transactionDate: string;
  description: string;
  referenceNo: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  category: string | null;
  reconciliationStatus: string;
  matchedVoucherId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type SortField = "createdAt" | "bankLabel" | "txCount" | "financialYear";
type SortDir = "ASC" | "DESC";

interface BankStatementHistoryViewProps {
  activeCompanyId: string;
}

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmt = (n: number) => `₹${INR.format(n)}`;
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return s; }
};
const fmtDatetime = (s: string) => {
  try { return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
};

export function BankStatementHistoryView({ activeCompanyId }: BankStatementHistoryViewProps): React.JSX.Element {
  const [sessions, setSessions] = useState<BankSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters / Sort
  const [searchText, setSearchText] = useState("");
  const [fyFilter, setFyFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("DESC");

  // Expanded session
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [sessionTxs, setSessionTxs] = useState<BankTx[]>([]);
  const [txsLoading, setTxsLoading] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txSortField, setTxSortField] = useState("transactionDate");
  const [txSortDir, setTxSortDir] = useState<SortDir>("ASC");

  // Edit tx state — keyed by txId
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingTxValues, setEditingTxValues] = useState<Partial<BankTx>>({});
  const [savingTxId, setSavingTxId] = useState<string | null>(null);

  // Notes editing
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [availableFYs, setAvailableFYs] = useState<string[]>([]);
  const [availableBanks, setAvailableBanks] = useState<string[]>([]);

  const desktop = (window as any).desktop;

  const loadSessions = useCallback(async () => {
    if (!desktop?.bankSessions?.list) return;
    setIsLoading(true);
    setError(null);
    try {
      const data: BankSession[] = await desktop.bankSessions.list(activeCompanyId, {
        sortBy: sortField === "createdAt" ? "created_at" : sortField === "bankLabel" ? "bank_label" : sortField === "txCount" ? "tx_count" : "financial_year",
        sortDir,
        financialYear: fyFilter || undefined,
        bankName: bankFilter || undefined,
        limit: 100,
      });
      setSessions(data);

      // Derive unique FYs & banks for filter dropdowns
      const allFYs = [...new Set(data.map(s => s.financialYear).filter(Boolean) as string[])].sort().reverse();
      const allBanks = [...new Set(data.map(s => s.bankLabel))].sort();
      setAvailableFYs(allFYs);
      setAvailableBanks(allBanks);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load statement history.");
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, sortField, sortDir, fyFilter, bankFilter, desktop]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const loadTxs = useCallback(async (sessionId: string) => {
    if (!desktop?.bankSessions?.getTransactions) return;
    setTxsLoading(true);
    try {
      const data: BankTx[] = await desktop.bankSessions.getTransactions(sessionId, {
        sortBy: txSortField,
        sortDir: txSortDir,
        limit: 1000,
      });
      setSessionTxs(data);
    } catch {
      setSessionTxs([]);
    } finally {
      setTxsLoading(false);
    }
  }, [desktop, txSortField, txSortDir]);

  const toggleExpand = useCallback((sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      setSessionTxs([]);
      setEditingTxId(null);
      setTxSearch("");
    } else {
      setExpandedSessionId(sessionId);
      setEditingTxId(null);
      setTxSearch("");
      void loadTxs(sessionId);
    }
  }, [expandedSessionId, loadTxs]);

  useEffect(() => {
    if (expandedSessionId) {
      void loadTxs(expandedSessionId);
    }
  }, [txSortField, txSortDir]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!desktop?.bankSessions?.deleteSession) return;
    try {
      await desktop.bankSessions.deleteSession(sessionId);
      if (expandedSessionId === sessionId) setExpandedSessionId(null);
      setDeleteConfirmId(null);
      void loadSessions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete session.");
    }
  };

  const startEditTx = (tx: BankTx) => {
    setEditingTxId(tx.id);
    setEditingTxValues({
      description: tx.description,
      referenceNo: tx.referenceNo ?? "",
      debit: tx.debit,
      credit: tx.credit,
      balance: tx.balance ?? undefined,
      category: tx.category ?? "",
    });
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setEditingTxValues({});
  };

  const saveEditTx = async (txId: string) => {
    if (!desktop?.bankSessions?.updateTransaction) return;
    setSavingTxId(txId);
    try {
      const updated = await desktop.bankSessions.updateTransaction(txId, {
        description: editingTxValues.description,
        referenceNo: editingTxValues.referenceNo || null,
        debit: Number(editingTxValues.debit ?? 0),
        credit: Number(editingTxValues.credit ?? 0),
        balance: editingTxValues.balance !== undefined ? Number(editingTxValues.balance) : undefined,
        category: editingTxValues.category || null,
      });
      if (updated) {
        setSessionTxs(prev => prev.map(t => t.id === txId ? updated : t));
      }
      setEditingTxId(null);
    } catch (e: any) {
      alert("Save failed: " + (e?.message ?? "Unknown error"));
    } finally {
      setSavingTxId(null);
    }
  };

  const saveNotes = async (sessionId: string) => {
    if (!desktop?.bankSessions?.updateNotes) return;
    try {
      await desktop.bankSessions.updateNotes(sessionId, notesText);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, notes: notesText, updatedAt: new Date().toISOString() } : s));
      setEditingNotesId(null);
    } catch {}
  };

  const handleTxSort = (field: string) => {
    if (txSortField === field) {
      setTxSortDir(d => d === "ASC" ? "DESC" : "ASC");
    } else {
      setTxSortField(field);
      setTxSortDir("ASC");
    }
  };

  const handleSessionSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortDir("DESC");
    }
  };

  // Filter sessions by local search
  const filteredSessions = sessions.filter(s => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      s.bankLabel.toLowerCase().includes(q) ||
      s.originalFileName.toLowerCase().includes(q) ||
      (s.accountNumber ?? "").toLowerCase().includes(q) ||
      (s.financialYear ?? "").includes(q) ||
      (s.periodFrom ?? "").includes(q) ||
      (s.periodTo ?? "").includes(q)
    );
  });

  const filteredTxs = sessionTxs.filter(tx => {
    if (!txSearch) return true;
    const q = txSearch.toLowerCase();
    return (
      tx.description.toLowerCase().includes(q) ||
      (tx.referenceNo ?? "").toLowerCase().includes(q) ||
      (tx.category ?? "").toLowerCase().includes(q) ||
      tx.transactionDate.includes(q)
    );
  });

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortDir === "ASC" ? <SortAsc size={12} style={{ opacity: 1, color: "var(--accent)" }} /> : <SortDesc size={12} style={{ opacity: 1, color: "var(--accent)" }} />
      : <SortAsc size={12} style={{ opacity: 0.3 }} />;

  const TxSortIcon = ({ field }: { field: string }) =>
    txSortField === field
      ? txSortDir === "ASC" ? <SortAsc size={10} style={{ color: "var(--accent)" }} /> : <SortDesc size={10} style={{ color: "var(--accent)" }} />
      : <SortAsc size={10} style={{ opacity: 0.3 }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} role="region" aria-label="Bank Statement History">

      {/* Header */}
      <div style={{
        padding: "18px 20px", background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ padding: "10px", background: "var(--accent-subtle)", borderRadius: "10px", color: "var(--accent)", display: "flex" }}>
            <History size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)", margin: 0 }}>Bank Statement Import History</h2>
            <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
              {filteredSessions.length} statement{filteredSessions.length !== 1 ? "s" : ""} · Click to view, edit, or delete
            </div>
          </div>
        </div>
        <button
          onClick={() => void loadSessions()}
          disabled={isLoading}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px",
            background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "8px",
            color: "var(--text)", fontSize: "12.5px", fontWeight: "600", cursor: "pointer"
          }}
        >
          <RefreshCw size={14} className={isLoading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "10px",
        padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px"
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search bank, file name, account…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 12px 8px 30px",
              background: "var(--surface-2)", border: "1px solid var(--line)",
              borderRadius: "8px", color: "var(--text)", fontSize: "12.5px", outline: "none"
            }}
          />
        </div>

        {/* FY Filter */}
        <select
          value={fyFilter}
          onChange={e => setFyFilter(e.target.value)}
          style={{
            padding: "8px 28px 8px 10px", background: "var(--surface-2)", border: "1px solid var(--line)",
            borderRadius: "8px", color: fyFilter ? "var(--text)" : "var(--muted)", fontSize: "12.5px", cursor: "pointer",
            appearance: "none", flex: "0 1 145px"
          }}
        >
          <option value="">All Fin. Years</option>
          {availableFYs.map(fy => <option key={fy} value={fy}>{fy}</option>)}
        </select>

        {/* Bank Filter */}
        <select
          value={bankFilter}
          onChange={e => setBankFilter(e.target.value)}
          style={{
            padding: "8px 28px 8px 10px", background: "var(--surface-2)", border: "1px solid var(--line)",
            borderRadius: "8px", color: bankFilter ? "var(--text)" : "var(--muted)", fontSize: "12.5px", cursor: "pointer",
            appearance: "none", flex: "0 1 165px"
          }}
        >
          <option value="">All Banks</option>
          {availableBanks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Sort */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "11.5px", color: "var(--muted)", whiteSpace: "nowrap" }}>Sort:</span>
          {(["createdAt", "bankLabel", "txCount", "financialYear"] as SortField[]).map(f => (
            <button key={f} onClick={() => handleSessionSort(f)} style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", cursor: "pointer",
              background: sortField === f ? "var(--accent-subtle)" : "var(--surface-2)",
              border: sortField === f ? "1px solid var(--accent)" : "1px solid var(--line)",
              color: sortField === f ? "var(--accent)" : "var(--muted)"
            }}>
              {{ createdAt: "Date", bankLabel: "Bank", txCount: "Txns", financialYear: "FY" }[f]}
              <SortIcon field={f} />
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px", background: "rgba(239, 68, 68, 0.07)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: "8px", color: "var(--danger)", fontSize: "12.5px", display: "flex", gap: "8px", alignItems: "flex-start"
        }}>
          <AlertCircle size={14} style={{ marginTop: "1px", flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Sessions List */}
      {isLoading && filteredSessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: "13px" }}>
          <RefreshCw size={20} className="spin" style={{ marginBottom: "10px", display: "block", margin: "0 auto 10px" }} />
          Loading statement history…
        </div>
      ) : filteredSessions.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: "12px",
          color: "var(--muted)"
        }}>
          <History size={40} style={{ opacity: 0.25, marginBottom: "12px", display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>No statements yet</div>
          <div style={{ fontSize: "12.5px" }}>Import a bank statement PDF from the Statement Import tab to see history here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              isExpanded={expandedSessionId === session.id}
              onToggle={() => toggleExpand(session.id)}
              onDelete={() => setDeleteConfirmId(session.id)}
              onEditNotes={() => { setEditingNotesId(session.id); setNotesText(session.notes ?? ""); }}
              deleteConfirmId={deleteConfirmId}
              onConfirmDelete={() => handleDeleteSession(session.id)}
              onCancelDelete={() => setDeleteConfirmId(null)}
              // Notes
              editingNotesId={editingNotesId}
              notesText={notesText}
              onNotesChange={setNotesText}
              onSaveNotes={() => saveNotes(session.id)}
              onCancelNotes={() => setEditingNotesId(null)}
              // Transactions
              txs={filteredTxs}
              txsLoading={txsLoading}
              txSearch={txSearch}
              onTxSearch={setTxSearch}
              txSortField={txSortField}
              txSortDir={txSortDir}
              onTxSort={handleTxSort}
              editingTxId={editingTxId}
              editingTxValues={editingTxValues}
              savingTxId={savingTxId}
              onStartEditTx={startEditTx}
              onCancelEditTx={cancelEditTx}
              onSaveEditTx={saveEditTx}
              onEditingTxValueChange={(k, v) => setEditingTxValues(prev => ({ ...prev, [k]: v }))}
              TxSortIcon={TxSortIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session, isExpanded, onToggle, onDelete, onEditNotes,
  deleteConfirmId, onConfirmDelete, onCancelDelete,
  editingNotesId, notesText, onNotesChange, onSaveNotes, onCancelNotes,
  txs, txsLoading, txSearch, onTxSearch, txSortField, txSortDir, onTxSort,
  editingTxId, editingTxValues, savingTxId,
  onStartEditTx, onCancelEditTx, onSaveEditTx, onEditingTxValueChange,
  TxSortIcon
}: any) {
  const isDeleteConfirming = deleteConfirmId === session.id;
  const isEditingNotes = editingNotesId === session.id;

  const confidencePct = Math.round(session.confidence * 100);
  const confidenceColor = confidencePct >= 80 ? "var(--success)" : confidencePct >= 50 ? "#f59e0b" : "var(--danger)";

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${isExpanded ? "var(--accent)" : "var(--line)"}`,
      borderRadius: "12px", overflow: "hidden",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      boxShadow: isExpanded ? "0 0 0 2px var(--accent-subtle)" : "none",
    }}>
      {/* Session Header Row */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px",
          cursor: "pointer", userSelect: "none",
          background: isExpanded ? "rgba(99, 102, 241, 0.04)" : "transparent",
          transition: "background 0.15s ease"
        }}
      >
        {/* Expand toggle */}
        <div style={{ color: isExpanded ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
        </div>

        {/* Bank icon */}
        <BankLogo bankName={session.bankLabel || session.bankName} size={36} showBadge={false} />

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13.5px", fontWeight: "800", color: "var(--text)" }}>{session.bankLabel}</span>
            {session.financialYear && (
              <span style={{
                fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px",
                background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid var(--accent)"
              }}>FY {session.financialYear}</span>
            )}
            {session.isBalanced ? (
              <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                ✓ Balanced
              </span>
            ) : (
              <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                ⚠ Imbalanced
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span><FileText size={10} style={{ verticalAlign: "middle", marginRight: "3px" }} />{session.originalFileName}</span>
            {session.accountNumber && <span>Acct: ···{session.accountNumber.slice(-4)}</span>}
            {session.periodFrom && <span><Calendar size={10} style={{ verticalAlign: "middle", marginRight: "3px" }} />{fmtDate(session.periodFrom)} → {fmtDate(session.periodTo)}</span>}
          </div>
        </div>

        {/* Stats chips in fixed-width grid column format */}
        <div style={{ display: "grid", gridTemplateColumns: "55px 95px 95px 105px", gap: "14px", flexShrink: 0, alignItems: "center" }}>
          <StatChip label="TXNS" value={String(session.txCount)} width="55px" />
          <StatChip label="DEBITS" value={fmt(session.totalDebits)} colorClass="danger" width="95px" />
          <StatChip label="CREDITS" value={fmt(session.totalCredits)} colorClass="success" width="95px" />
          <StatChip label="CLOSING" value={fmt(session.closingBalance)} width="105px" />
        </div>

        {/* Time */}
        <div style={{ fontSize: "10.5px", color: "var(--muted)", textAlign: "right", flexShrink: 0, width: "95px" }}>
          <div style={{ fontWeight: "600", whiteSpace: "nowrap" }}>{fmtDatetime(session.createdAt).split(",")[0]}</div>
          <div style={{ opacity: 0.75, whiteSpace: "nowrap" }}>{fmtDatetime(session.createdAt).split(",")[1]}</div>
          {session.updatedAt !== session.createdAt && (
            <div style={{ marginTop: "2px", color: "var(--accent)", fontWeight: "600" }}>Edited</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            title="Edit notes"
            onClick={onEditNotes}
            style={{ padding: "6px 8px", borderRadius: "7px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--muted)", cursor: "pointer" }}
          >
            <Edit3 size={13} />
          </button>
          {isDeleteConfirming ? (
            <>
              <button onClick={onConfirmDelete} style={{ padding: "6px 10px", borderRadius: "7px", background: "var(--danger)", border: "none", color: "#fff", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                Confirm Delete
              </button>
              <button onClick={onCancelDelete} style={{ padding: "6px 8px", borderRadius: "7px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--muted)", cursor: "pointer" }}>
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              title="Delete session"
              onClick={onDelete}
              style={{ padding: "6px 8px", borderRadius: "7px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--muted)", cursor: "pointer" }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Notes strip */}
      {(session.notes || isEditingNotes) && (
        <div style={{ padding: "10px 16px 10px 64px", background: "rgba(99,102,241,0.04)", borderTop: "1px solid var(--line)" }} onClick={e => e.stopPropagation()}>
          {isEditingNotes ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <textarea
                value={notesText}
                onChange={e => onNotesChange(e.target.value)}
                placeholder="Add notes about this import…"
                rows={2}
                style={{
                  flex: 1, padding: "8px 10px", background: "var(--surface-2)", border: "1px solid var(--accent)",
                  borderRadius: "7px", color: "var(--text)", fontSize: "12px", resize: "none", outline: "none"
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <button onClick={onSaveNotes} style={{ padding: "6px 10px", borderRadius: "6px", background: "var(--accent)", border: "none", color: "#fff", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Save</button>
                <button onClick={onCancelNotes} style={{ padding: "6px 10px", borderRadius: "6px", background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>
              📝 {session.notes}
            </div>
          )}
        </div>
      )}
      {isEditingNotes && !session.notes && (
        <div style={{ padding: "10px 16px 10px 64px", background: "rgba(99,102,241,0.04)", borderTop: "1px solid var(--line)" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <textarea
              value={notesText}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Add notes about this import…"
              rows={2}
              style={{
                flex: 1, padding: "8px 10px", background: "var(--surface-2)", border: "1px solid var(--accent)",
                borderRadius: "7px", color: "var(--text)", fontSize: "12px", resize: "none", outline: "none"
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button onClick={onSaveNotes} style={{ padding: "6px 10px", borderRadius: "6px", background: "var(--accent)", border: "none", color: "#fff", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Save</button>
              <button onClick={onCancelNotes} style={{ padding: "6px 10px", borderRadius: "6px", background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Transactions */}
      {isExpanded && (
        <div style={{ borderTop: "1px solid var(--line)" }} onClick={e => e.stopPropagation()}>
          {/* Tx Toolbar */}
          <div style={{ padding: "12px 16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", background: "var(--surface-2)" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <Search size={11} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                value={txSearch}
                onChange={e => onTxSearch(e.target.value)}
                placeholder="Search transactions…"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "7px 10px 7px 26px",
                  background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "7px",
                  color: "var(--text)", fontSize: "12px", outline: "none"
                }}
              />
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              {txsLoading ? "Loading…" : `${txs.length} transaction${txs.length !== 1 ? "s" : ""}`}
            </div>
            {/* Summary pills */}
            <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
              <SummaryPill icon={<TrendingDown size={11} />} label="Total Dr." value={fmt(txs.reduce((a, t) => a + t.debit, 0))} color="var(--danger)" />
              <SummaryPill icon={<TrendingUp size={11} />} label="Total Cr." value={fmt(txs.reduce((a, t) => a + t.credit, 0))} color="var(--success)" />
            </div>
          </div>

          {/* Transactions Table */}
          {txsLoading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
              <RefreshCw size={16} className="spin" style={{ display: "block", margin: "0 auto 8px" }} />Loading transactions…
            </div>
          ) : txs.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>No transactions found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                    {[
                      { key: "transactionDate", label: "Date" },
                      { key: "description", label: "Description" },
                      { key: "referenceNo", label: "Ref No." },
                      { key: "debit", label: "Debit (₹)" },
                      { key: "credit", label: "Credit (₹)" },
                      { key: "balance", label: "Balance (₹)" },
                      { key: "category", label: "Category" },
                      { key: "reconciliationStatus", label: "Status" },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => onTxSort(col.key)}
                        style={{
                          padding: "9px 12px", textAlign: col.key === "debit" || col.key === "credit" || col.key === "balance" ? "right" : "left",
                          fontWeight: "700", color: txSortField === col.key ? "var(--accent)" : "var(--muted)",
                          cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
                          fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.04em"
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {col.label} <TxSortIcon field={col.key} />
                        </span>
                      </th>
                    ))}
                    <th style={{ padding: "9px 12px", width: "56px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx: BankTx, idx: number) => {
                    const isEditing = editingTxId === tx.id;
                    const isSaving = savingTxId === tx.id;
                    return (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: "1px solid var(--line)",
                          background: isEditing ? "rgba(99,102,241,0.05)" : idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                          transition: "background 0.15s"
                        }}
                      >
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--muted)", fontSize: "11.5px" }}>
                          {fmtDate(tx.transactionDate)}
                        </td>
                        <td style={{ padding: "8px 12px", maxWidth: "280px" }}>
                          {isEditing ? (
                            <input
                              value={editingTxValues.description ?? ""}
                              onChange={e => onEditingTxValueChange("description", e.target.value)}
                              style={editInputStyle}
                            />
                          ) : (
                            <span title={tx.description} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                              {tx.description}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--muted)", fontSize: "11px" }}>
                          {isEditing ? (
                            <input value={editingTxValues.referenceNo ?? ""} onChange={e => onEditingTxValueChange("referenceNo", e.target.value)} style={editInputStyle} />
                          ) : tx.referenceNo || "—"}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          {isEditing ? (
                            <input type="number" value={editingTxValues.debit ?? 0} onChange={e => onEditingTxValueChange("debit", e.target.value)} style={{ ...editInputStyle, textAlign: "right", width: "90px" }} />
                          ) : (
                            <span style={{ color: tx.debit > 0 ? "var(--danger)" : "var(--muted)", fontWeight: tx.debit > 0 ? "700" : "400", fontVariantNumeric: "tabular-nums" }}>
                              {tx.debit > 0 ? fmt(tx.debit) : "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          {isEditing ? (
                            <input type="number" value={editingTxValues.credit ?? 0} onChange={e => onEditingTxValueChange("credit", e.target.value)} style={{ ...editInputStyle, textAlign: "right", width: "90px" }} />
                          ) : (
                            <span style={{ color: tx.credit > 0 ? "var(--success)" : "var(--muted)", fontWeight: tx.credit > 0 ? "700" : "400", fontVariantNumeric: "tabular-nums" }}>
                              {tx.credit > 0 ? fmt(tx.credit) : "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                          {isEditing ? (
                            <input type="number" value={editingTxValues.balance ?? ""} onChange={e => onEditingTxValueChange("balance", e.target.value)} style={{ ...editInputStyle, textAlign: "right", width: "100px" }} />
                          ) : tx.balance !== null ? fmt(tx.balance) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {isEditing ? (
                            <input value={editingTxValues.category ?? ""} onChange={e => onEditingTxValueChange("category", e.target.value)} placeholder="Category…" style={editInputStyle} />
                          ) : (
                            <span style={{ fontSize: "10.5px", padding: "2px 7px", borderRadius: "4px", background: tx.category ? "var(--accent-subtle)" : "transparent", color: tx.category ? "var(--accent)" : "var(--muted)" }}>
                              {tx.category || "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <ReconcileStatusBadge status={tx.reconciliationStatus} />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => onSaveEditTx(tx.id)}
                                  disabled={isSaving}
                                  title="Save"
                                  style={{ padding: "4px 6px", borderRadius: "5px", background: "var(--accent)", border: "none", color: "#fff", cursor: "pointer" }}
                                >
                                  {isSaving ? <RefreshCw size={11} className="spin" /> : <Check size={11} />}
                                </button>
                                <button onClick={onCancelEditTx} title="Cancel" style={{ padding: "4px 6px", borderRadius: "5px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--muted)", cursor: "pointer" }}>
                                  <X size={11} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => onStartEditTx(tx)} title="Edit transaction" style={{ padding: "4px 6px", borderRadius: "5px", background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--muted)", cursor: "pointer" }}>
                                <Edit3 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const editInputStyle: React.CSSProperties = {
  padding: "4px 7px", background: "var(--surface)", border: "1px solid var(--accent)",
  borderRadius: "5px", color: "var(--text)", fontSize: "12px", outline: "none",
  width: "100%", boxSizing: "border-box"
};

function StatChip({ label, value, colorClass, width }: { label: string; value: string; colorClass?: "danger" | "success"; width?: string }) {
  const color = colorClass === "danger" ? "var(--danger)" : colorClass === "success" ? "var(--success)" : "var(--text)";
  return (
    <div style={{ textAlign: "right", width: width || "auto" }}>
      <div style={{ fontSize: "9.5px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "700" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: "700", color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function SummaryPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px",
      background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "20px",
      fontSize: "11px", color
    }}>
      {icon} <span style={{ fontWeight: "600" }}>{label}:</span> <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function ReconcileStatusBadge({ status }: { status: string }) {
  const s = (status ?? "UNRECONCILED").toUpperCase();
  if (s === "RECONCILED") return <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "4px", background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: "700" }}>✓ Reconciled</span>;
  if (s === "PARTIAL")    return <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "4px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: "700" }}>≈ Partial</span>;
  return <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "4px", background: "rgba(100,116,139,0.1)", color: "var(--muted)", fontWeight: "700" }}>Unreconciled</span>;
}
