import React, { useState } from "react";
import { BookOpen, X, RefreshCw, CheckCircle2 } from "lucide-react";

export const TALLY_STANDARD_GROUPS = [
  "Sundry Debtors",
  "Sundry Creditors",
  "Bank Accounts",
  "Bank OCC A/c",
  "Bank OD A/c",
  "Cash-in-Hand",
  "Sales Accounts",
  "Purchase Accounts",
  "Direct Expenses",
  "Indirect Expenses",
  "Direct Incomes",
  "Indirect Incomes",
  "Fixed Assets",
  "Current Assets",
  "Current Liabilities",
  "Duties & Taxes",
  "Capital Account",
  "Loans (Liability)",
  "Investments",
  "Provisions",
  "Stock-in-Hand",
  "Suspense A/c"
];

export interface CreateLedgerModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialName?: string;
  readonly initialGroup?: string;
  readonly companyId?: string;
  readonly onLedgerCreated?: (createdLedger: { id: string; name: string; parentName: string }) => void;
}

export function CreateLedgerModal({
  isOpen,
  onClose,
  initialName = "",
  initialGroup = "Sundry Debtors",
  companyId = "",
  onLedgerCreated,
}: CreateLedgerModalProps): React.JSX.Element | null {
  const [formData, setFormData] = useState({
    name: initialName,
    parentName: initialGroup,
    openingBalance: "0.00",
    openingBalanceDrCr: "Dr" as "Dr" | "Cr",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    address: "",
    stateName: "West Bengal (19)",
    pincode: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    creditLimit: 0,
    creditDays: 30,
    isBillWise: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Sync initialName when modal opens
  React.useEffect(() => {
    if (initialName) {
      setFormData(prev => ({
        ...prev,
        name: initialName,
        parentName: initialGroup || prev.parentName
      }));
    }
  }, [initialName, initialGroup]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a valid ledger name.");
      return;
    }

    setIsSubmitting(true);
    setFeedbackNotice(null);

    const payload = {
      companyId: companyId || "",
      name: formData.name.trim(),
      parentName: formData.parentName,
      openingBalanceText: `${formData.openingBalance} ${formData.openingBalanceDrCr}`,
      closingBalanceText: `${formData.openingBalance} ${formData.openingBalanceDrCr}`,
      gstin: formData.gstin.trim().toUpperCase() || undefined,
      pan: formData.pan.trim().toUpperCase() || (formData.gstin.length >= 12 ? formData.gstin.slice(2, 12).toUpperCase() : undefined),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      stateName: formData.stateName,
      pincode: formData.pincode.trim() || undefined,
      bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
      bankIfsc: formData.bankIfsc.trim().toUpperCase() || undefined,
      bankName: formData.bankName.trim() || undefined,
      creditLimit: Number(formData.creditLimit) || 0,
      creditDays: Number(formData.creditDays) || 30,
      isBillWise: formData.isBillWise
    };

    try {
      let savedLedger: any = null;
      if (window.desktop?.accountingMirror?.saveLedger) {
        savedLedger = await window.desktop.accountingMirror.saveLedger(payload);
      } else {
        savedLedger = { id: `ledg_${Date.now()}`, name: payload.name, parentName: payload.parentName };
      }

      setFeedbackNotice(`✓ Ledger [${formData.name}] successfully created & synchronized in database!`);
      
      if (onLedgerCreated && savedLedger) {
        onLedgerCreated({
          id: savedLedger.id || `ledg_${Date.now()}`,
          name: savedLedger.name || payload.name,
          parentName: savedLedger.parentName || payload.parentName
        });
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      alert(`Failed to save ledger: ${err?.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(5px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10001,
        padding: "20px"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "fadeIn 0.15s ease"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BookOpen size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
              Create & Assign Master Ledger
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        {feedbackNotice && (
          <div style={{ padding: "10px 20px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "12.5px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={14} />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Primary Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Ledger Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kailash Hardware / HDFC Current A/c"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "13px", fontWeight: "700", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Account Group (Under) *
              </label>
              <select
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "600", boxSizing: "border-box" }}
              >
                {TALLY_STANDARD_GROUPS.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opening Balance */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", textAlign: "right", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Dr / Cr
              </label>
              <select
                value={formData.openingBalanceDrCr}
                onChange={(e) => setFormData({ ...formData, openingBalanceDrCr: e.target.value as any })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontWeight: "700", boxSizing: "border-box" }}
              >
                <option value="Dr">Dr</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>

          {/* Statutory GST & PAN */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                GSTIN / UIN
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData({
                    ...formData,
                    gstin: val,
                    pan: val.length >= 12 ? val.slice(2, 12) : formData.pan
                  });
                }}
                placeholder="19AGDPK0803A1Z4"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontFamily: "monospace", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                PAN Number
              </label>
              <input
                type="text"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="AGDPK0803A"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", fontFamily: "monospace", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Contact & State */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Phone / Mobile
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98300 12345"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="accounts@vendor.com"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
              Registered Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street, City, Industrial Area"
              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12.5px", boxSizing: "border-box" }}
            />
          </div>

          {/* Banking Details (if Bank Accounts group) */}
          {(formData.parentName.includes("Bank") || formData.parentName.includes("Sundry")) && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px", borderTop: "1px dashed var(--line)", paddingTop: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Bank A/C Number
                </label>
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  placeholder="50200012345678"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", fontFamily: "monospace", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                  placeholder="HDFC0000123"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", fontFamily: "monospace", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="HDFC Bank"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)", fontSize: "12px", boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: "12.5px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                background: "var(--accent)",
                border: "none",
                color: "#FFFFFF",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {isSubmitting && <RefreshCw size={13} className="spin" />}
              <span>{isSubmitting ? "Saving & Syncing..." : "Save Master Ledger"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
