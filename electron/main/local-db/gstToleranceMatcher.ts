/**
 * Audit Item #83: 2-Way GSTR-2B Tolerance Window Matcher
 * Matches portal supplier GSTINs & invoice numbers against books vouchers
 * applying tax rounding tolerance (±₹1.00) and date variance (±3 days).
 */

export type GstInvoiceMatchResult = {
  readonly status: "MATCHED" | "MISMATCHED" | "UNMATCHED";
  readonly confidence: number;
  readonly taxDifference: number;
  readonly dateDifferenceDays: number;
  readonly reason?: string;
};

export function matchGstInvoiceWithTolerance(
  portalInvoice: {
    readonly supplierGstin: string;
    readonly invoiceNumber: string;
    readonly invoiceDate: string;
    readonly taxableValue: number;
    readonly cgst: number;
    readonly sgst: number;
    readonly igst: number;
  },
  bookVoucher: {
    readonly partyGstin?: string;
    readonly voucherNumber?: string;
    readonly voucherDate?: string;
    readonly taxableAmount?: number;
    readonly cgstAmount?: number;
    readonly sgstAmount?: number;
    readonly igstAmount?: number;
  },
  maxTaxTolerance = 1.0,
  maxDateVarianceDays = 3
): GstInvoiceMatchResult {
  const portalTotalTax = portalInvoice.cgst + portalInvoice.sgst + portalInvoice.igst;
  const bookTotalTax = (bookVoucher.cgstAmount ?? 0) + (bookVoucher.sgstAmount ?? 0) + (bookVoucher.igstAmount ?? 0);

  const taxDiff = Math.abs(portalTotalTax - bookTotalTax);
  const taxableDiff = Math.abs(portalInvoice.taxableValue - (bookVoucher.taxableAmount ?? 0));

  let dateDiffDays = 0;
  if (portalInvoice.invoiceDate && bookVoucher.voucherDate) {
    const d1 = new Date(portalInvoice.invoiceDate).getTime();
    const d2 = new Date(bookVoucher.voucherDate).getTime();
    dateDiffDays = Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
  }

  const gstinMatch = !bookVoucher.partyGstin || portalInvoice.supplierGstin.toUpperCase() === bookVoucher.partyGstin.toUpperCase();
  const invNoMatch = !bookVoucher.voucherNumber || portalInvoice.invoiceNumber.toLowerCase().includes(bookVoucher.voucherNumber.toLowerCase());

  if (gstinMatch && invNoMatch && taxDiff <= maxTaxTolerance && dateDiffDays <= maxDateVarianceDays) {
    return {
      status: "MATCHED",
      confidence: taxDiff === 0 && dateDiffDays === 0 ? 1.0 : 0.95,
      taxDifference: taxDiff,
      dateDifferenceDays: dateDiffDays,
    };
  }

  return {
    status: "MISMATCHED",
    confidence: 0.5,
    taxDifference: taxDiff,
    dateDifferenceDays: dateDiffDays,
    reason: `Tax variance ₹${taxDiff.toFixed(2)} or date variance ${dateDiffDays} days exceeds tolerance bounds (±₹${maxTaxTolerance}, ±${maxDateVarianceDays}d).`,
  };
}
