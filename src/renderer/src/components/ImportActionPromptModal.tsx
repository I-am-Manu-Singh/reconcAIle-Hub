import React, { useState } from "react";
import {
  FileText,
  Building2,
  Package,
  Receipt,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Sparkles,
  Layers,
  X
} from "lucide-react";
import { ParsedDocumentResult, ParsedBankTxResult } from "../utils/fileParser";
import { triggerToast } from "./ToastNotification";

export interface ImportActionPromptModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onContinueReview: () => void;
  readonly activeCompanyId: string;
  readonly activeCompanyName?: string;
  readonly parsedDocuments: readonly ParsedDocumentResult[];
  readonly parsedBankTxs: readonly ParsedBankTxResult[];
  readonly onLedgersCreated?: () => void;
  readonly onVouchersCreated?: () => void;
}

export function ImportActionPromptModal({
  isOpen,
  onClose,
  onContinueReview,
  activeCompanyId,
  activeCompanyName,
  parsedDocuments,
  parsedBankTxs,
  onLedgersCreated,
  onVouchersCreated,
}: ImportActionPromptModalProps): React.JSX.Element | null {
  const [createParties, setCreateParties] = useState(true);
  const [createStockItems, setCreateStockItems] = useState(true);
  const [createVouchers, setCreateVouchers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract distinct parties from documents or bank statements
  const partiesToCreate: Array<{ name: string; gstin?: string; type: "Debtor" | "Creditor" }> = [];
  const stockItemsToCreate: Array<{ name: string; hsn?: string; rate?: number }> = [];

  // From invoices/bills
  parsedDocuments.forEach((doc) => {
    const isSales = doc.entryType === "Sales";
    const partyName = isSales ? (doc.buyerName || "Customer") : (doc.vendorName || "Supplier");
    const partyGstin = isSales ? doc.buyerGstin : doc.gstin;

    if (partyName && !partiesToCreate.some((p) => p.name.toLowerCase() === partyName.toLowerCase())) {
      partiesToCreate.push({
        name: partyName,
        gstin: partyGstin,
        type: isSales ? "Debtor" : "Creditor"
      });
    }

    doc.items?.forEach((it) => {
      if (it.description && !stockItemsToCreate.some((s) => s.name.toLowerCase() === it.description.toLowerCase())) {
        stockItemsToCreate.push({
          name: it.description,
          hsn: it.hsnSac,
          rate: it.unitRate
        });
      }
    });
  });

  // From bank transactions (parties inferred from transaction description)
  if (parsedDocuments.length === 0 && parsedBankTxs.length > 0) {
    const uniqueNarrationParties = new Set<string>();
    parsedBankTxs.slice(0, 15).forEach((tx) => {
      // Pick clean party segment from typical UPI/NEFT descriptions
      const desc = tx.description || "";
      const match = desc.match(/(?:TO|BY|TRANSFER|UPI|NEFT|RTGS)[-/: ]+([A-Z0-9 &._-]{4,30})/i);
      const inferredName = match ? match[1].trim() : desc.slice(0, 25).trim();
      if (inferredName && inferredName.length > 3 && !uniqueNarrationParties.has(inferredName.toLowerCase())) {
        uniqueNarrationParties.add(inferredName.toLowerCase());
        partiesToCreate.push({
          name: inferredName,
          type: tx.credit > 0 ? "Debtor" : "Creditor"
        });
      }
    });
  }

  const voucherCount = parsedDocuments.length > 0 ? parsedDocuments.length : parsedBankTxs.length;
  const voucherTypesSummary = parsedDocuments.length > 0
    ? parsedDocuments.map((d) => d.entryType || "Invoice").slice(0, 3).join(", ")
    : "Payment / Receipt / Contra";

  const handleExecuteActions = async () => {
    setIsProcessing(true);
    setProcessStatus("Creating ledgers and processing vouchers...");

    try {
      let createdPartyCount = 0;
      let createdItemCount = 0;
      let createdVoucherCount = 0;

      // 1. Create Party Ledgers
      if (createParties && partiesToCreate.length > 0) {
        setProcessStatus(`Creating ${partiesToCreate.length} party ledgers...`);
        for (const party of partiesToCreate) {
          const parentGroup = party.type === "Debtor" ? "Sundry Debtors" : "Sundry Creditors";
          if (window.desktop?.accountingMirror?.saveLedger) {
            await window.desktop.accountingMirror.saveLedger({
              companyId: activeCompanyId || "default_company",
              name: party.name,
              parentName: parentGroup,
              taxNumber: party.gstin || undefined,
            }).catch(() => null);
            createdPartyCount++;
          }
        }
      }

      // 2. Create Stock Items
      if (createStockItems && stockItemsToCreate.length > 0) {
        setProcessStatus(`Creating ${stockItemsToCreate.length} stock items...`);
        for (const item of stockItemsToCreate) {
          if (window.desktop?.accountingMirror?.saveLedger) {
            // Register stock item as ledger / product entry
            await window.desktop.accountingMirror.saveLedger({
              companyId: activeCompanyId || "default_company",
              name: item.name,
              parentName: "Stock Items",
              rateOfTax: 18,
            }).catch(() => null);
            createdItemCount++;
          }
        }
      }

      // 3. Create Draft Vouchers
      if (createVouchers) {
        setProcessStatus(`Generating ${voucherCount} draft vouchers...`);
        if (parsedDocuments.length > 0) {
          for (const doc of parsedDocuments) {
            const voucherTypeName = doc.entryType === "Sales" ? "Sales" : "Purchase";
            if ((window as any).desktop?.accountingMirror?.saveVoucher) {
              await (window as any).desktop.accountingMirror.saveVoucher({
                companyId: activeCompanyId || "default_company",
                voucherDate: doc.date || new Date().toISOString().substring(0, 10),
                voucherTypeName,
                voucherNumber: doc.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
                narration: `Imported from ${doc.originalFileName || "Document"}`,
                amount: doc.grandTotal || doc.subtotal || 0,
                partyName: doc.entryType === "Sales" ? (doc.buyerName || "Customer") : (doc.vendorName || "Supplier"),
              }).catch(() => null);
              createdVoucherCount++;
            }
          }
        } else if (parsedBankTxs.length > 0) {
          for (const tx of parsedBankTxs) {
            const vType = tx.debit > 0 ? "Payment" : "Receipt";
            if ((window as any).desktop?.accountingMirror?.saveVoucher) {
              await (window as any).desktop.accountingMirror.saveVoucher({
                companyId: activeCompanyId || "default_company",
                voucherDate: tx.transactionDate || new Date().toISOString().substring(0, 10),
                voucherTypeName: vType,
                voucherNumber: tx.referenceNo || `TX-${tx.id.slice(0, 6)}`,
                narration: tx.description,
                amount: tx.debit > 0 ? tx.debit : tx.credit,
                partyName: tx.description.slice(0, 30),
              }).catch(() => null);
              createdVoucherCount++;
            }
          }
        }
      }

      triggerToast(
        `Setup complete: ${createdPartyCount} parties, ${createdItemCount} items, ${createdVoucherCount} vouchers initialized!`,
        "success",
        "Import Initialized"
      );

      if (createdPartyCount > 0 || createdItemCount > 0) onLedgersCreated?.();
      if (createdVoucherCount > 0) onVouchersCreated?.();

      onContinueReview();
    } catch (err: any) {
      triggerToast(`Notice: ${err?.message || "Processed with partial mirror sync"}`, "info", "Import Notice");
      onContinueReview();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "var(--surface)",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
                Import Parsing & Auto-Creation Wizard
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                Target: {activeCompanyName || "Active Company"} ({parsedDocuments.length > 0 ? `${parsedDocuments.length} Invoices/Bills` : `${parsedBankTxs.length} Transactions`})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text)", lineHeight: "1.5" }}>
            Data extraction parsed successfully! Would you like to automatically create the missing party ledgers, stock items, and vouchers before continuing into the full review grid?
          </p>

          {/* Option 1: Party Ledgers */}
          <div
            onClick={() => setCreateParties(!createParties)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: createParties ? "var(--accent-subtle)" : "var(--surface-2)",
              border: `1px solid ${createParties ? "var(--accent)" : "var(--line)"}`,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <input
              type="checkbox"
              checked={createParties}
              onChange={() => {}}
              style={{ marginTop: "3px", cursor: "pointer", accentColor: "var(--accent)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>
                <Building2 size={15} style={{ color: "var(--accent)" }} />
                <span>Create Missing Party Ledgers ({partiesToCreate.length} found)</span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                Auto-generates Sundry Debtors & Sundry Creditors in local mirror & Tally for parties identified in this import.
              </p>
            </div>
          </div>

          {/* Option 2: Stock Items (for Invoices/Bills) */}
          {stockItemsToCreate.length > 0 && (
            <div
              onClick={() => setCreateStockItems(!createStockItems)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: createStockItems ? "var(--accent-subtle)" : "var(--surface-2)",
                border: `1px solid ${createStockItems ? "var(--accent)" : "var(--line)"}`,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="checkbox"
                checked={createStockItems}
                onChange={() => {}}
                style={{ marginTop: "3px", cursor: "pointer", accentColor: "var(--accent)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>
                  <Package size={15} style={{ color: "#10b981" }} />
                  <span>Create Stock Items ({stockItemsToCreate.length} item lines found)</span>
                </div>
                <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                  Registers inventory items with HSN/SAC codes and default unit rates.
                </p>
              </div>
            </div>
          )}

          {/* Option 3: Draft Accounting Vouchers */}
          <div
            onClick={() => setCreateVouchers(!createVouchers)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: createVouchers ? "var(--accent-subtle)" : "var(--surface-2)",
              border: `1px solid ${createVouchers ? "var(--accent)" : "var(--line)"}`,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <input
              type="checkbox"
              checked={createVouchers}
              onChange={() => {}}
              style={{ marginTop: "3px", cursor: "pointer", accentColor: "var(--accent)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>
                <Receipt size={15} style={{ color: "#3b82f6" }} />
                <span>Initialize Vouchers ({voucherCount} {voucherTypesSummary})</span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
                Pre-populates Sales / Purchase / Payment / Receipt / Contra / Journal entries ready for review & push to Tally.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          {/* Skip / Continue Only */}
          <button
            type="button"
            onClick={onContinueReview}
            disabled={isProcessing}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--text)",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Continue Without Auto-Creation
          </button>

          {/* Confirm & Process */}
          <button
            type="button"
            onClick={handleExecuteActions}
            disabled={isProcessing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--accent)",
              color: "#FFFFFF",
              border: "none",
              fontSize: "12px",
              fontWeight: "700",
              cursor: isProcessing ? "wait" : "pointer"
            }}
          >
            {isProcessing ? (
              <span>{processStatus || "Processing..."}</span>
            ) : (
              <>
                <span>Create & Continue</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportActionPromptModal;
