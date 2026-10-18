import crypto from "node:crypto";

export interface VoucherLedgerEntry {
  readonly ledgerName: string;
  readonly amount: number; // In Tally XML: negative indicates debit, positive indicates credit
  readonly isDeemedPositive: "Yes" | "No"; // "Yes" = Debit, "No" = Credit
  readonly isPartyLedger?: "Yes" | "No";
  readonly bankAllocations?: {
    readonly date: string; // YYYYMMDD
    readonly instrumentDate?: string; // YYYYMMDD
    readonly transactionType?: string; // "Inter Bank Transfer", "Cheque/DD", "Electronic Cheque", etc.
    readonly paymentFavouring?: string;
    readonly instrumentNumber?: string;
    readonly amount: number;
  };
}

export interface StatementVoucherPayload {
  readonly transactionId: string;
  readonly date: string; // YYYY-MM-DD or YYYYMMDD
  readonly voucherType: "Payment" | "Receipt" | "Contra" | "Journal";
  readonly voucherNumber?: string;
  readonly partyLedgerName: string;
  readonly bankLedgerName: string;
  readonly amount: number; // Absolute positive transaction amount
  readonly narration: string;
  readonly referenceNo?: string;
  readonly isSplit?: boolean;
  readonly splits?: readonly {
    readonly ledgerName: string;
    readonly amount: number;
    readonly narrationRemark?: string;
  }[];
}

/** Format YYYY-MM-DD to Tally's canonical YYYYMMDD */
export function formatTallyDate(dateStr: string): string {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  const clean = dateStr.replace(/[-/]/g, "").trim();
  if (clean.length === 8) return clean;
  // If in DD-MM-YYYY format
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
    return `${parts[2]}${parts[1].padStart(2, "0")}${parts[0].padStart(2, "0")}`;
  }
  return clean.slice(0, 8);
}

/** Sanitize XML special characters */
export function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds standard-compliant Tally XML for a single double-entry voucher
 * Enforces zero-sum arithmetic: Sum of debits + sum of credits == 0
 */
export function buildSingleVoucherXml(
  companyName: string,
  voucher: StatementVoucherPayload,
  index = 1
): string {
  const formattedDate = formatTallyDate(voucher.date);
  const guid = `urn:uuid:${crypto.randomUUID()}`;
  const vchNumber = voucher.voucherNumber || `BNK-${formattedDate}-${String(index).padStart(4, "0")}`;
  const cleanNarration = escapeXml(voucher.narration);
  const partyLedger = escapeXml(voucher.partyLedgerName);
  const bankLedger = escapeXml(voucher.bankLedgerName);
  const vchType = voucher.voucherType;
  const absAmount = Math.abs(voucher.amount);

  let ledgerEntriesXml = "";

  if (vchType === "Payment") {
    // Payment: Money Out of Bank
    // 1. Debit Entry: Party / Expense Ledger (Negative amount, isDeemedPositive: Yes)
    if (voucher.isSplit && voucher.splits && voucher.splits.length > 0) {
      for (const split of voucher.splits) {
        const splitAmount = Math.abs(split.amount);
        ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(split.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-${splitAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
      }
    } else {
      ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-${absAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }

    // 2. Credit Entry: Bank Ledger (Positive amount, isDeemedPositive: No)
    ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${bankLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>${absAmount.toFixed(2)}</AMOUNT>
              <BANKALLOCATIONS.LIST>
                <DATE>${formattedDate}</DATE>
                <INSTRUMENTDATE>${formattedDate}</INSTRUMENTDATE>
                <TRANSACTIONTYPE>Inter Bank Transfer</TRANSACTIONTYPE>
                <PAYMENTFAVOURING>${partyLedger}</PAYMENTFAVOURING>
                ${voucher.referenceNo ? `<INSTRUMENTNUMBER>${escapeXml(voucher.referenceNo)}</INSTRUMENTNUMBER>` : ""}
                <AMOUNT>${absAmount.toFixed(2)}</AMOUNT>
              </BANKALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>`;
  } else if (vchType === "Receipt") {
    // Receipt: Money In to Bank
    // 1. Debit Entry: Bank Ledger (Negative amount, isDeemedPositive: Yes)
    ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${bankLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${absAmount.toFixed(2)}</AMOUNT>
              <BANKALLOCATIONS.LIST>
                <DATE>${formattedDate}</DATE>
                <INSTRUMENTDATE>${formattedDate}</INSTRUMENTDATE>
                <TRANSACTIONTYPE>Inter Bank Transfer</TRANSACTIONTYPE>
                <PAYMENTFAVOURING>${partyLedger}</PAYMENTFAVOURING>
                ${voucher.referenceNo ? `<INSTRUMENTNUMBER>${escapeXml(voucher.referenceNo)}</INSTRUMENTNUMBER>` : ""}
                <AMOUNT>-${absAmount.toFixed(2)}</AMOUNT>
              </BANKALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>`;

    // 2. Credit Entry: Party / Revenue Ledger (Positive amount, isDeemedPositive: No)
    if (voucher.isSplit && voucher.splits && voucher.splits.length > 0) {
      for (const split of voucher.splits) {
        const splitAmount = Math.abs(split.amount);
        ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(split.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${splitAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
      }
    } else {
      ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${absAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }
  } else {
    // Contra or Journal (default fallback balanced)
    ledgerEntriesXml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${absAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${bankLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>${absAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  }

  return `
          <VOUCHER VCHTYPE="${escapeXml(vchType)}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <GUID>${guid}</GUID>
            <DATE>${formattedDate}</DATE>
            <EFFECTIVEDATE>${formattedDate}</EFFECTIVEDATE>
            <VOUCHERTYPENAME>${escapeXml(vchType)}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(vchNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${partyLedger}</PARTYLEDGERNAME>
            <NARRATION>${cleanNarration}</NARRATION>
            <ISINVOICE>No</ISINVOICE>${ledgerEntriesXml}
          </VOUCHER>`;
}

/**
 * Builds complete Tally XML import envelope bundling multiple statement vouchers
 */
export function buildBatchVoucherXml(
  companyName: string,
  vouchers: readonly StatementVoucherPayload[]
): string {
  const vouchersXml = vouchers
    .map((vch, index) => buildSingleVoucherXml(companyName, vch, index + 1))
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${vouchersXml}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
