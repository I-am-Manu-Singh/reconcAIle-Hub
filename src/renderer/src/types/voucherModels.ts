/**
 * TallyPrime Enterprise Voucher Models & Data Contracts
 * Covers all 20 voucher types:
 * - Accounting Vouchers (Contra, Payment, Receipt, Journal, Sales, Purchase, Credit Note, Debit Note)
 * - Inventory Vouchers (Physical Stock, Stock Journal, Delivery Note, Receipt Note, Rejections In, Rejections Out)
 * - Order Vouchers (Sales Order, Purchase Order, Job Work In, Job Work Out)
 * - Specialized Vouchers (Payroll, Attendance, Memo, Reversing Journal)
 *
 * Fully supports Indian GST, IGST, CGST, SGST, UTGST, Cess, TDS, TCS, RCM,
 * multi-godown batch allocations, bill references, and cash denominations.
 */

export type VoucherCategory = "ACCOUNTING" | "INVENTORY" | "ORDER" | "SPECIALIZED";

export type VoucherTypeCode =
  // Accounting
  | "CONTRA"
  | "PAYMENT"
  | "RECEIPT"
  | "JOURNAL"
  | "SALES"
  | "PURCHASE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  // Inventory
  | "PHYSICAL_STOCK"
  | "STOCK_JOURNAL"
  | "DELIVERY_NOTE"
  | "RECEIPT_NOTE"
  | "REJECTIONS_IN"
  | "REJECTIONS_OUT"
  // Order
  | "SALES_ORDER"
  | "PURCHASE_ORDER"
  | "JOB_WORK_IN"
  | "JOB_WORK_OUT"
  // Specialized
  | "PAYROLL"
  | "ATTENDANCE"
  | "MEMO"
  | "REVERSING_JOURNAL";

export type GstSupplyType =
  | "REGULAR_TAXABLE"
  | "INTER_STATE_IGST"
  | "EXEMPT"
  | "NIL_RATED"
  | "NON_GST"
  | "SEZ_WITH_PAYMENT"
  | "SEZ_WITHOUT_PAYMENT"
  | "EXPORT_LUT"
  | "DEEMED_EXPORT"
  | "REVERSE_CHARGE_RCM";

export type BillAllocationType = "Agst Ref" | "Advance" | "New Ref" | "On Account";

export interface BillAllocation {
  id: string;
  type: BillAllocationType;
  referenceName: string;
  dueDate?: string;
  amount: number;
  drCr: "Dr" | "Cr";
}

export type BankTransactionInstrument =
  | "Cheque"
  | "e-Fund Transfer"
  | "RTGS"
  | "NEFT"
  | "IMPS"
  | "UPI"
  | "Demand Draft"
  | "Others";

export interface BankAllocationDetails {
  instrumentType: BankTransactionInstrument;
  instrumentNumber?: string;
  instrumentDate?: string;
  favoringName?: string;
  transferBankName?: string;
  ifscCode?: string;
  utrRefNumber?: string;
}

export interface CashDenomination {
  denomination: 2000 | 500 | 200 | 100 | 50 | 20 | 10 | 5 | 2 | 1;
  count: number;
}

export interface ItemBatchAllocation {
  godownName: string;
  godownId?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  quantity: number;
  actualQuantity?: number; // Supports free samples / schemes
  unitOfMeasure: string;
  rate: number;
  amount: number;
}

export interface LineItemTaxBreakdown {
  hsnSacCode: string;
  taxableAmount: number;
  gstRate: number; // e.g. 18
  cgstRate: number; // e.g. 9
  cgstAmount: number;
  sgstRate: number; // e.g. 9
  sgstAmount: number;
  igstRate: number; // e.g. 18
  igstAmount: number;
  cessRate?: number; // e.g. 12%
  cessSpecificRate?: number; // e.g. ₹400 per ton
  cessAmount: number;
  rcmApplicable: boolean;
  rcmTaxAmount?: number;
}

export interface VoucherLineItem {
  id: string;
  itemOrLedgerName: string;
  ledgerGroup?: string;
  drCr: "Dr" | "Cr";
  description?: string;
  hsnSacCode?: string;
  stockGroup?: string;
  stockCategory?: string;
  stockItem?: string;
  godownName?: string;
  batchName?: string;
  batchAllocations?: ItemBatchAllocation[];
  quantity?: number;
  actualQuantity?: number;
  unitOfMeasure?: string;
  rate?: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxableAmount: number;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  totalAmount: number;
  billAllocations?: BillAllocation[];
  costCenter?: string;
}

export interface AdditionalSurchargeItem {
  id: string;
  ledgerName: string; // Freight, Insurance, Packaging, Trade Discount
  isPreGst: boolean; // Pre-tax additions increase taxable value, post-tax add to total
  isDiscount: boolean;
  amount: number;
  gstRate?: number;
}

export interface StatutoryTdsTcsEntry {
  type: "TDS" | "TCS";
  section: string; // "194C", "194J", "194I", "194Q", "206C(1H)"
  deducteeLedger: string;
  natureOfPayment: string;
  ratePercentage: number;
  taxableBaseAmount: number;
  taxWithheldAmount: number;
  certificateRef?: string;
}

export interface EmployeePayHeadAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  payHeadName: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
  attendanceDays?: number;
  overtimeHours?: number;
}

export interface AttendanceRecordingEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceType: "PRESENT" | "ABSENT_LOP" | "PAID_LEAVE" | "OVERTIME";
  value: number; // e.g. 26 days, 14 hours
  unit: "DAYS" | "HOURS" | "PIECES";
}

export interface StockJournalConsumptionProduction {
  sourceConsumption: VoucherLineItem[]; // Raw materials consumed
  destinationProduction: VoucherLineItem[]; // Finished goods / By-products / Scrap generated
  additionalCostAmount?: number;
}

export interface TallyVoucherPayload {
  id: string;
  companyId: string;
  companyDisplayName?: string;
  voucherCategory: VoucherCategory;
  voucherTypeCode: VoucherTypeCode;
  voucherTypeName: string;
  voucherNumber: string;
  voucherDate: string; // ISO YYYY-MM-DD
  effectiveDate?: string; // Applicable for post-dated vouchers
  reversalDate?: string; // Applicable for Reversing Journal
  referenceNumber?: string;
  referenceDate?: string;
  partyLedgerName?: string;
  partyGstin?: string;
  partyState?: string;
  partyAddress?: string;
  partyPinCode?: string;
  placeOfSupplyState?: string;
  consigneeName?: string;
  consigneeGstin?: string;
  consigneeAddress?: string;
  gstSupplyType: GstSupplyType;
  isReverseCharge: boolean;
  orderReferenceNumber?: string;
  orderDueDate?: string;
  dispatchDocumentNumber?: string;
  dispatchedThrough?: string;
  destinationGodown?: string;
  termsOfPayment?: string;
  termsOfDelivery?: string;
  bankAccountLedger?: string;
  bankDetails?: BankAllocationDetails;
  cashDenominations?: CashDenomination[];
  lineItems: VoucherLineItem[];
  additionalSurcharges?: AdditionalSurchargeItem[];
  tdsTcsDetails?: StatutoryTdsTcsEntry[];
  payrollAllocations?: EmployeePayHeadAllocation[];
  attendanceEntries?: AttendanceRecordingEntry[];
  stockJournalData?: StockJournalConsumptionProduction;
  totalTaxableAmount: number;
  totalCgstAmount: number;
  totalSgstAmount: number;
  totalIgstAmount: number;
  totalCessAmount: number;
  totalTdsTcsWithheld: number;
  roundOffAmount: number;
  grandTotalAmount: number;
  narration: string;
  status: "DRAFT" | "READY" | "SYNCED" | "ERROR";
  createdAt: string;
  updatedAt: string;
}

/**
 * Real-time GST & Tax Computation Engine
 */
export function calculateVoucherTaxSummary(
  lineItems: VoucherLineItem[],
  surcharges: AdditionalSurchargeItem[] = [],
  tdsTcsEntries: StatutoryTdsTcsEntry[] = []
): {
  taxableSubtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalPreGstSurcharges: number;
  totalPostGstSurcharges: number;
  totalTdsTcs: number;
  roundOff: number;
  grandTotal: number;
} {
  let taxableSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;

  // 1. Line items base calculations
  for (const item of lineItems) {
    const itemAmt = Number(item.taxableAmount) || 0;
    taxableSubtotal += itemAmt;
    totalCgst += Number(item.cgst) || 0;
    totalSgst += Number(item.sgst) || 0;
    totalIgst += Number(item.igst) || 0;
    totalCess += Number(item.cess) || 0;
  }

  // 2. Pre-GST additions (e.g. freight, insurance) and discounts
  let totalPreGstSurcharges = 0;
  let totalPostGstSurcharges = 0;

  for (const sur of surcharges) {
    const amt = Number(sur.amount) || 0;
    const signedAmt = sur.isDiscount ? -Math.abs(amt) : Math.abs(amt);

    if (sur.isPreGst) {
      totalPreGstSurcharges += signedAmt;
      // If GST is applicable on surcharge
      if (sur.gstRate) {
        const gstHalf = (Math.abs(signedAmt) * sur.gstRate) / 200;
        if (totalIgst > 0) {
          totalIgst += (signedAmt * sur.gstRate) / 100;
        } else {
          totalCgst += (signedAmt > 0 ? 1 : -1) * gstHalf;
          totalSgst += (signedAmt > 0 ? 1 : -1) * gstHalf;
        }
      }
    } else {
      totalPostGstSurcharges += signedAmt;
    }
  }

  // 3. TDS / TCS Withholding calculations
  let totalTdsTcs = 0;
  for (const entry of tdsTcsEntries) {
    totalTdsTcs += Number(entry.taxWithheldAmount) || 0;
  }

  const rawGrandTotal =
    taxableSubtotal +
    totalPreGstSurcharges +
    totalCgst +
    totalSgst +
    totalIgst +
    totalCess +
    totalPostGstSurcharges -
    totalTdsTcs;

  // Round off to nearest whole rupee
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;

  return {
    taxableSubtotal: Math.round((taxableSubtotal + totalPreGstSurcharges) * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    totalCess: Math.round(totalCess * 100) / 100,
    totalPreGstSurcharges: Math.round(totalPreGstSurcharges * 100) / 100,
    totalPostGstSurcharges: Math.round(totalPostGstSurcharges * 100) / 100,
    totalTdsTcs: Math.round(totalTdsTcs * 100) / 100,
    roundOff,
    grandTotal: roundedGrandTotal,
  };
}
