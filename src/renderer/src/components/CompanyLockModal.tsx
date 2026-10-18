import React, { useState } from "react";
import { Lock, Shield, Check, X, AlertCircle } from "lucide-react";

export interface CompanyLockModalProps {
  isOpen: boolean;
  companyName: string;
  companyId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CompanyLockModal({
  isOpen,
  companyName,
  companyId,
  onSuccess,
  onCancel,
}: CompanyLockModalProps): React.JSX.Element | null {
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Please enter company password");
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      if (window.desktop?.accountingMirror?.verifyCompanyPassword) {
        const isValid = await window.desktop.accountingMirror.verifyCompanyPassword(companyId, password);
        if (isValid) {
          setPassword("");
          setErrorMsg(null);
          onSuccess();
        } else {
          setErrorMsg("Incorrect company password. Access denied.");
        }
      } else {
        // Fallback for browser testing
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100000,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          animation: "fadeIn 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Lock size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
              Company Password Required
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              {companyName} is protected with a security password
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
              Enter Security Password
            </label>
            <input
              autoFocus
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
                fontSize: "14px",
                letterSpacing: "2px",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isVerifying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 20px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: isVerifying ? "not-allowed" : "pointer",
              }}
            >
              <Check size={14} /> {isVerifying ? "Verifying..." : "Unlock Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
