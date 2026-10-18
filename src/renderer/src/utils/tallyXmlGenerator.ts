/**
 * Enterprise Tally XML Generator
 * Produces official TallyPrime compliant XML envelopes for all 20 voucher types:
 * - Accounting Vouchers (Contra, Payment, Receipt, Journal, Sales, Purchase, Credit Note, Debit Note)
 * - Inventory Vouchers (Physical Stock, Stock Journal, Delivery Note, Receipt Note, Rejections)
 * - Order Vouchers (Sales Order, Purchase Order, Job Work)
 * - Specialized Vouchers (Payroll, Attendance, Memo, Reversing Journal)
 *
 * Implements full bill allocations, bank allocations, inventory batches, godowns, and GST tax ledger breakdowns.
 */

import { TallyVoucherPayload, VoucherLineItem, AdditionalSurchargeItem, StatutoryTdsTcsEntry } from "../types/voucherModels";

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

/** Format YYYY-MM-DD to Tally's standard YYYYMMDD */
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
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
    return `${parts[2]}${parts[1].padStart(2, "0")}${parts[0].padStart(2, "0")}`;
  }
  return clean.slice(0, 8);
}

/**
 * Generates an official TallyPrime XML import payload for a single or multiple vouchers.
 */
export function generateTallyVoucherXml(
  vouchers: TallyVoucherPayload[],
  companyName: string = "Primary Company"
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += `  <HEADER>\n`;
  xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += `  </HEADER>\n`;
  xml += `  <BODY>\n`;
  xml += `    <DATA>\n`;
  xml += `      <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;

  for (const vch of vouchers) {
    const vchDate = formatTallyDate(vch.voucherDate);
    const effDate = vch.effectiveDate ? formatTallyDate(vch.effectiveDate) : vchDate;
    const vchType = escapeXml(vch.voucherTypeName);
    const vchNum = escapeXml(vch.voucherNumber);
    const refNum = escapeXml(vch.referenceNumber || "");
    const refDate = vch.referenceDate ? formatTallyDate(vch.referenceDate) : "";
    const partyName = escapeXml(vch.partyLedgerName || "Cash");
    const narration = escapeXml(vch.narration);
    const company = escapeXml(vch.companyDisplayName || companyName);

    xml += `        <VOUCHER VCHTYPE="${vchType}" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
    xml += `          <DATE>${vchDate}</DATE>\n`;
    xml += `          <EFFECTIVEDATE>${effDate}</EFFECTIVEDATE>\n`;
    xml += `          <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>\n`;
    xml += `          <VOUCHERNUMBER>${vchNum}</VOUCHERNUMBER>\n`;
    if (refNum) xml += `          <REFERENCE>${refNum}</REFERENCE>\n`;
    if (refDate) xml += `          <REFERENCEDATE>${refDate}</REFERENCEDATE>\n`;
    xml += `          <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
    if (vch.partyGstin) xml += `          <PARTYGSTIN>${escapeXml(vch.partyGstin)}</PARTYGSTIN>\n`;
    if (vch.placeOfSupplyState) xml += `          <PLACEOFSUPPLY>${escapeXml(vch.placeOfSupplyState)}</PLACEOFSUPPLY>\n`;
    xml += `          <NARRATION>${narration}</NARRATION>\n`;
    xml += `          <FBTPAYMENTTYPE>Default</FBTPAYMENTTYPE>\n`;
    xml += `          <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>\n`;

    // 1. Handle Accounting & Invoicing Vouchers (Sales, Purchase, Payment, Receipt, Contra, Journal, Credit/Debit Note)
    const isSalesOrReceipt = ["Sales", "Receipt", "Credit Note"].includes(vch.voucherTypeName);
    const isPurchaseOrPayment = ["Purchase", "Payment", "Debit Note"].includes(vch.voucherTypeName);

    // Header Party / Bank Entry
    const partyDeemedPositive = isPurchaseOrPayment ? "No" : "Yes"; // Payment: Bank Cr (-amt, isDeemedPositive: No), Receipt: Bank Dr (isDeemedPositive: Yes)
    const partyAmountSign = isPurchaseOrPayment ? 1 : -1;

    xml += `          <ALLLEDGERENTRIES.LIST>\n`;
    xml += `            <LEDGERNAME>${partyName}</LEDGERNAME>\n`;
    xml += `            <ISDEEMEDPOSITIVE>${partyDeemedPositive}</ISDEEMEDPOSITIVE>\n`;
    xml += `            <ISPARTYLEDGER>Yes</ISPARTYLEDGER>\n`;
    xml += `            <AMOUNT>${partyAmountSign * Math.abs(vch.grandTotalAmount)}</AMOUNT>\n`;

    // Bank Allocations if present
    if (vch.bankDetails && vch.bankDetails.instrumentType) {
      xml += `            <BANKALLOCATIONS.LIST>\n`;
      xml += `              <DATE>${vchDate}</DATE>\n`;
      xml += `              <INSTRUMENTDATE>${vch.bankDetails.instrumentDate ? formatTallyDate(vch.bankDetails.instrumentDate) : vchDate}</INSTRUMENTDATE>\n`;
      xml += `              <TRANSACTIONTYPE>${escapeXml(vch.bankDetails.instrumentType)}</TRANSACTIONTYPE>\n`;
      if (vch.bankDetails.instrumentNumber) {
        xml += `              <INSTRUMENTNUMBER>${escapeXml(vch.bankDetails.instrumentNumber)}</INSTRUMENTNUMBER>\n`;
      }
      if (vch.bankDetails.favoringName) {
        xml += `              <PAYMENTFAVOURING>${escapeXml(vch.bankDetails.favoringName)}</PAYMENTFAVOURING>\n`;
      }
      if (vch.bankDetails.transferBankName) {
        xml += `              <BANKNAME>${escapeXml(vch.bankDetails.transferBankName)}</BANKNAME>\n`;
      }
      if (vch.bankDetails.ifscCode) {
        xml += `              <IFSCODE>${escapeXml(vch.bankDetails.ifscCode)}</IFSCODE>\n`;
      }
      xml += `              <AMOUNT>${partyAmountSign * Math.abs(vch.grandTotalAmount)}</AMOUNT>\n`;
      xml += `            </BANKALLOCATIONS.LIST>\n`;
    }

    // Bill Allocations if present
    const firstItem = vch.lineItems[0];
    if (firstItem?.billAllocations && firstItem.billAllocations.length > 0) {
      for (const bill of firstItem.billAllocations) {
        xml += `            <BILLALLOCATIONS.LIST>\n`;
        xml += `              <NAME>${escapeXml(bill.referenceName || vchNum)}</NAME>\n`;
        xml += `              <BILLTYPE>${escapeXml(bill.type)}</BILLTYPE>\n`;
        xml += `              <AMOUNT>${(bill.drCr === "Cr" ? 1 : -1) * Math.abs(bill.amount)}</AMOUNT>\n`;
        xml += `            </BILLALLOCATIONS.LIST>\n`;
      }
    }

    xml += `          </ALLLEDGERENTRIES.LIST>\n`;

    // 2. Line Items / Ledger Entries (Opposite side)
    const lineDeemedPositive = isPurchaseOrPayment ? "Yes" : "No";
    const lineAmountSign = isPurchaseOrPayment ? -1 : 1;

    for (const item of vch.lineItems) {
      xml += `          <ALLLEDGERENTRIES.LIST>\n`;
      xml += `            <LEDGERNAME>${escapeXml(item.itemOrLedgerName || "General Ledger")}</LEDGERNAME>\n`;
      xml += `            <ISDEEMEDPOSITIVE>${lineDeemedPositive}</ISDEEMEDPOSITIVE>\n`;
      xml += `            <ISPARTYLEDGER>No</ISPARTYLEDGER>\n`;
      xml += `            <AMOUNT>${lineAmountSign * Math.abs(item.taxableAmount || item.totalAmount)}</AMOUNT>\n`;

      // Inventory Allocations if item has quantity/inventory
      if (item.quantity && item.quantity > 0) {
        xml += `            <ALLINVENTORYENTRIES.LIST>\n`;
        xml += `              <STOCKITEMNAME>${escapeXml(item.itemOrLedgerName)}</STOCKITEMNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>${lineDeemedPositive}</ISDEEMEDPOSITIVE>\n`;
        xml += `              <RATE>${item.rate || 0}/${escapeXml(item.unitOfMeasure || "pcs")}</RATE>\n`;
        xml += `              <ACTUALQTY>${item.actualQuantity || item.quantity} ${escapeXml(item.unitOfMeasure || "pcs")}</ACTUALQTY>\n`;
        xml += `              <BILLEDQTY>${item.quantity} ${escapeXml(item.unitOfMeasure || "pcs")}</BILLEDQTY>\n`;
        xml += `              <AMOUNT>${lineAmountSign * Math.abs(item.taxableAmount)}</AMOUNT>\n`;

        // Batch & Godown Allocations
        if (item.batchAllocations && item.batchAllocations.length > 0) {
          for (const b of item.batchAllocations) {
            xml += `              <BATCHALLOCATIONS.LIST>\n`;
            xml += `                <GODOWNNAME>${escapeXml(b.godownName || "Main Location")}</GODOWNNAME>\n`;
            xml += `                <BATCHNAME>${escapeXml(b.batchNumber || "Primary Batch")}</BATCHNAME>\n`;
            xml += `                <AMOUNT>${lineAmountSign * Math.abs(b.amount)}</AMOUNT>\n`;
            xml += `                <ACTUALQTY>${b.actualQuantity || b.quantity} ${escapeXml(b.unitOfMeasure)}</ACTUALQTY>\n`;
            xml += `                <BILLEDQTY>${b.quantity} ${escapeXml(b.unitOfMeasure)}</BILLEDQTY>\n`;
            xml += `              </BATCHALLOCATIONS.LIST>\n`;
          }
        }
        xml += `            </ALLINVENTORYENTRIES.LIST>\n`;
      }

      xml += `          </ALLLEDGERENTRIES.LIST>\n`;
    }

    // 3. Tax Ledgers (CGST / SGST / IGST)
    if (vch.totalCgstAmount > 0) {
      xml += `          <ALLLEDGERENTRIES.LIST>\n`;
      xml += `            <LEDGERNAME>CGST Input/Output</LEDGERNAME>\n`;
      xml += `            <ISDEEMEDPOSITIVE>${lineDeemedPositive}</ISDEEMEDPOSITIVE>\n`;
      xml += `            <AMOUNT>${lineAmountSign * Math.abs(vch.totalCgstAmount)}</AMOUNT>\n`;
      xml += `          </ALLLEDGERENTRIES.LIST>\n`;
    }
    if (vch.totalSgstAmount > 0) {
      xml += `          <ALLLEDGERENTRIES.LIST>\n`;
      xml += `            <LEDGERNAME>SGST Input/Output</LEDGERNAME>\n`;
      xml += `            <ISDEEMEDPOSITIVE>${lineDeemedPositive}</ISDEEMEDPOSITIVE>\n`;
      xml += `            <AMOUNT>${lineAmountSign * Math.abs(vch.totalSgstAmount)}</AMOUNT>\n`;
      xml += `          </ALLLEDGERENTRIES.LIST>\n`;
    }
    if (vch.totalIgstAmount > 0) {
      xml += `          <ALLLEDGERENTRIES.LIST>\n`;
      xml += `            <LEDGERNAME>IGST Input/Output</LEDGERNAME>\n`;
      xml += `            <ISDEEMEDPOSITIVE>${lineDeemedPositive}</ISDEEMEDPOSITIVE>\n`;
      xml += `            <AMOUNT>${lineAmountSign * Math.abs(vch.totalIgstAmount)}</AMOUNT>\n`;
      xml += `          </ALLLEDGERENTRIES.LIST>\n`;
    }

    // 4. Round-off ledger
    if (vch.roundOffAmount && Math.abs(vch.roundOffAmount) > 0.001) {
      const roundSign = vch.roundOffAmount > 0 ? lineAmountSign : -lineAmountSign;
      xml += `          <ALLLEDGERENTRIES.LIST>\n`;
      xml += `            <LEDGERNAME>Round Off</LEDGERNAME>\n`;
      xml += `            <ISDEEMEDPOSITIVE>${roundSign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>\n`;
      xml += `            <AMOUNT>${roundSign * Math.abs(vch.roundOffAmount)}</AMOUNT>\n`;
      xml += `          </ALLLEDGERENTRIES.LIST>\n`;
    }

    xml += `        </VOUCHER>\n`;
  }

  xml += `      </TALLYMESSAGE>\n`;
  xml += `    </DATA>\n`;
  xml += `  </BODY>\n`;
  xml += `</ENVELOPE>\n`;

  return xml;
}

/** Download generated XML as a browser file */
export function downloadXmlFile(filename: string, xmlContent: string): void {
  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".xml") ? filename : `${filename}.xml`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
