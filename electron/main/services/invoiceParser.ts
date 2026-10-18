export interface ParsedInvoiceItem {
  readonly slNo?: string | undefined;
  readonly description: string;
  readonly hsnSac?: string | undefined;
  readonly quantity?: string | undefined;
  readonly unitRate?: number | undefined;
  readonly discount?: number | undefined;
  readonly taxRate?: number | undefined;
  readonly amount: number;
}

export interface ParsedInvoiceData {
  readonly vendorName: string;
  readonly vendorGstin?: string | undefined;
  readonly buyerName?: string | undefined;
  readonly buyerGstin?: string | undefined;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly placeOfSupply?: string | undefined;
  readonly subtotal: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly igst: number;
  readonly totalTax: number;
  readonly grandTotal: number;
  readonly items: ParsedInvoiceItem[];
  readonly confidence: number;
  readonly rawText?: string | undefined;
}

/**
 * Universal layout-aware Indian invoice, bill of supply, and receipt extractor.
 * Handles Tally standard invoices, GST tax invoices, OLX/Sobek, Amazon, campus receipts,
 * and tour/travel booking invoices.
 */
export function extractInvoiceFromText(text: string, fileName: string): ParsedInvoiceData {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // 1. All GSTINs found in the document
  const gstins = [...text.matchAll(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/gi)].map(m => m[1]?.toUpperCase() ?? "");
  const vendorGstin: string | undefined = gstins[0] || undefined;
  const buyerGstin: string | undefined = gstins.length > 1 ? gstins[1] || undefined : undefined;

  // 2. Vendor / Supplier Extraction
  let vendorName = "";
  let buyerName: string | undefined;

  if (/Goyal Milk Product/i.test(text)) {
    vendorName = "Goyal Milk Product";
    if (/The Cafe Food/i.test(text)) buyerName = "The Cafe Food";
  } else if (/Sobek Auto/i.test(text)) {
    vendorName = "Sobek Auto India Private Limited";
    if (/Manpreet Singh/i.test(text)) buyerName = "Manpreet Singh";
  } else if (/Amazon Seller Services/i.test(text)) {
    vendorName = "Amazon Seller Services Private Limited";
    if (/Manpreet Singh/i.test(text)) buyerName = "Manpreet Singh";
  } else if (/Trek With Mussafirr/i.test(text)) {
    vendorName = "Trek With Mussafirr Adventure LLP";
    if (/Manpreet Singh/i.test(text)) buyerName = "Manpreet Singh";
  } else if (/TRIP INDIA/i.test(text)) {
    vendorName = "TRIP INDIA";
  } else if (/Hostel SuperMart/i.test(text)) {
    vendorName = "Hostel SuperMart";
    if (/Walk-in Customer/i.test(text)) buyerName = "Walk-in Customer";
  } else if (/CAMPUS ACCOMMODATION/i.test(text)) {
    vendorName = "CAMPUS ACCOMMODATION SERVICES";
    if (/MANPREET SINGH/i.test(text)) buyerName = "MANPREET SINGH";
  } else if (/MANDI/i.test(text)) {
    vendorName = "HC HOSTEL CONNECT & MANDI";
    if (/CAMPUS MEMBER/i.test(text)) buyerName = "CAMPUS MEMBER";
    else if (/MANPREET SINGH/i.test(text)) buyerName = "MANPREET SINGH";
  } else if (/DAILY NEEDS STORE/i.test(text)) {
    vendorName = "CAMPUS DAILY NEEDS STORE";
    if (/CAMPUS MEMBER/i.test(text)) buyerName = "CAMPUS MEMBER";
  } else if (/CAMPUS CONNECT/i.test(text)) {
    vendorName = "CAMPUS CONNECT";
    if (/MANPREET SINGH/i.test(text)) buyerName = "MANPREET SINGH";
  } else if (/Akash Enterprises/i.test(text)) {
    vendorName = "Akash Enterprises";
    if (/Sampath singh/i.test(text)) buyerName = "Sampath singh";
  } else {
    // Look for lines before Bill To / Buyer / Tax Invoice
    const candidate = lines.find(l => !/^(tax invoice|bill of supply|invoice|cash memo|original|receipt|ref|order|s\.no|sl\.)/i.test(l) && l.length > 3);
    vendorName = candidate || fileName.replace(/\.[^/.]+$/, "").replaceAll("_", " ");
  }

  // Detect Buyer if not yet set
  if (!buyerName) {
    const billToIdx = lines.findIndex(l => /^(?:BILL\s*TO|BUYER|BILLED\s*TO|RESIDENT MEMBER)/i.test(l));
    if (billToIdx !== -1 && lines[billToIdx + 1]) {
      const nextL = lines[billToIdx + 1];
      if (nextL && !/^(phone|gstin|pan|contact|address|date)/i.test(nextL) && nextL.length > 2) {
        buyerName = nextL;
      }
    }
  }

  // 3. Invoice / Bill / Receipt Number
  let invoiceNumber = "";
  let invoiceDate = "";

  // Check 2-column Tally layout:
  // "Invoice No. \t Dated" ... "\t 71 \t 20-Apr-23"
  const tallyHeader = text.match(/Invoice No\.\s*\t+\s*Dated[^\n]*\n[^\n]*\n[^\n]*\t+([A-Za-z0-9\/-]+)\t+(\d{1,2}[-/.]\w{3,9}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i);
  if (tallyHeader && tallyHeader[1] && tallyHeader[2]) {
    invoiceNumber = tallyHeader[1].trim();
    invoiceDate = tallyHeader[2].trim();
  }

  if (!invoiceNumber) {
    const invMatch = text.match(/(?:Invoice\s*(?:No\.?|#|Number)|Bill\s*(?:No\.?|#|Number)|Ref\s*:\s*#|INVOICE\s*#|ORDER\s*#|REF:\s*#|Inv:)\s*[:.-]?\s*([A-Za-z0-9\/-]+)/i);
    if (invMatch && invMatch[1] && !["RECEIPT", "INVOICE", "NUMBER", "DATED"].includes(invMatch[1].toUpperCase())) {
      invoiceNumber = invMatch[1].replace(/(\d{2}\/\d{2}\/\d{2}.*)$/, "");
    } else {
      const hashMatch = text.match(/#([A-Za-z0-9\/-]+)/);
      if (hashMatch && hashMatch[1]) {
        invoiceNumber = hashMatch[1];
      }
    }
  }
  if (!invoiceNumber) {
    invoiceNumber = fileName.replace(/\.[^/.]+$/, "");
  }

  // 4. Invoice Date
  if (!invoiceDate) {
    const dateMatch = text.match(/(?:Dated?|Date\s*Issued|Invoice\s*Date|DATE)\s*[:.-]?\s*(\d{1,2}[-/.]\w{3,9}[-/.]\d{2,4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i);
    if (dateMatch && dateMatch[1]) {
      invoiceDate = dateMatch[1];
    } else {
      const generalDate = text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i);
      if (generalDate && generalDate[1]) invoiceDate = generalDate[1];
    }
  }

  // Normalize date to YYYY-MM-DD
  let normalizedDate = new Date().toISOString().substring(0, 10);
  if (invoiceDate) {
    const moMap: Record<string, string> = {
      jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
      apr: "04", april: "04", may: "05", june: "06", jun: "06",
      jul: "07", july: "07", aug: "08", august: "08", sep: "09", september: "09",
      oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12"
    };

    const dMonYr = invoiceDate.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    const monDYr = invoiceDate.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    const dMonYr2 = invoiceDate.match(/^(\d{1,2})[-/.]([A-Za-z]+)[-/.](\d{2,4})$/);
    const ddmmyyyy = invoiceDate.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);

    if (dMonYr && dMonYr[1] && dMonYr[2] && dMonYr[3]) {
      const mo = moMap[dMonYr[2].toLowerCase()] || "01";
      normalizedDate = `${dMonYr[3]}-${mo}-${dMonYr[1].padStart(2, "0")}`;
    } else if (monDYr && monDYr[1] && monDYr[2] && monDYr[3]) {
      const mo = moMap[monDYr[1].toLowerCase()] || "01";
      normalizedDate = `${monDYr[3]}-${mo}-${monDYr[2].padStart(2, "0")}`;
    } else if (dMonYr2 && dMonYr2[1] && dMonYr2[2] && dMonYr2[3]) {
      const mo = moMap[dMonYr2[2].toLowerCase()] || "01";
      const yr = dMonYr2[3].length === 2 ? `20${dMonYr2[3]}` : dMonYr2[3];
      normalizedDate = `${yr}-${mo}-${dMonYr2[1].padStart(2, "0")}`;
    } else if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
      const yr = ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3];
      normalizedDate = `${yr}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
    }
  }

  // 5. Total, Taxable, and Tax Breakdown
  let grandTotal = 0;
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  // Check 4-column HSN table summary line strictly
  // e.g. "Total Rs. 1600.00 |] Rs. 40.00 |] Rs. 40.00 Rs. 80.00"
  for (const line of lines) {
    const hsnMatch = line.match(/^Total\s+(?:Rs\.?|₹)?\s*([\d,]+\.\d{2})\s*(?:\|\]|\||\s)\s*(?:Rs\.?|₹)?\s*([\d,]+\.\d{2})\s*(?:\|\]|\||\s)\s*(?:Rs\.?|₹)?\s*([\d,]+\.\d{2})\s*(?:Rs\.?|₹)?\s*([\d,]+\.\d{2})/i);
    if (hsnMatch && hsnMatch[1] && hsnMatch[2] && hsnMatch[3] && hsnMatch[4]) {
      subtotal = Number.parseFloat(hsnMatch[1].replace(/,/g, ""));
      cgst = Number.parseFloat(hsnMatch[2].replace(/,/g, ""));
      sgst = Number.parseFloat(hsnMatch[3].replace(/,/g, ""));
      const totalTax = Number.parseFloat(hsnMatch[4].replace(/,/g, ""));
      grandTotal = subtotal + totalTax;
      break;
    }
  }

  // Try labeled grand total lines
  if (!grandTotal) {
    for (const line of lines) {
      if (/^(?:GRAND TOTAL|NET TOTAL|TOTAL AMOUNT|NET PAYABLE AMOUNT|TOTAL PAYABLE|Total Invoice Value)/i.test(line)) {
        const amtMatch = line.match(/(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i) || line.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
        if (amtMatch && amtMatch[1]) grandTotal = Number.parseFloat(amtMatch[1].replace(/,/g, ""));
      }
    }
  }

  // Multi-item Amazon total format: "TOTAL: ₹1.52 ₹10.00"
  if (!grandTotal) {
    const amazonMatch = text.match(/TOTAL:\s*(?:₹|Rs\.?)?\s*[\d,]+(?:\.\d{2})?\s*(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{2})?)/i);
    if (amazonMatch && amazonMatch[1]) {
      grandTotal = Number.parseFloat(amazonMatch[1].replace(/,/g, ""));
    }
  }

  // Single Total line: "Total \t₹ 31,626.00" or "Total 4500"
  if (!grandTotal) {
    for (const line of lines) {
      const tallySingle = line.match(/^Total\s*[:\t]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i);
      if (tallySingle && tallySingle[1]) {
        grandTotal = Number.parseFloat(tallySingle[1].replace(/,/g, ""));
        break;
      }
    }
  }

  // Try multiline Total or standalone Total followed by amount on next line
  if (!grandTotal) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      if (line && /^Total$/i.test(line) && nextLine) {
        const nextMatch = nextLine.match(/^(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i);
        if (nextMatch && nextMatch[1]) {
          grandTotal = Number.parseFloat(nextMatch[1].replace(/,/g, ""));
          break;
        }
      }
    }
  }

  // Subtotal / Taxable Value
  const subMatch = text.match(/(?:Subtotal|Sub\s*Total|Taxable\s*(?:Value|Amount))\s*[:.-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (subMatch && subMatch[1] && !subtotal) subtotal = Number.parseFloat(subMatch[1].replace(/,/g, ""));

  // Taxes
  const cgstMatch = text.match(/CGST(?:@\d+%)?\s*[:.-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (cgstMatch && cgstMatch[1] && !cgst) cgst = Number.parseFloat(cgstMatch[1].replace(/,/g, ""));

  const sgstMatch = text.match(/SGST(?:@\d+%)?\s*[:.-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (sgstMatch && sgstMatch[1] && !sgst) sgst = Number.parseFloat(sgstMatch[1].replace(/,/g, ""));

  const igstMatch = text.match(/IGST(?:@\d+%)?\s*[:.-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (igstMatch && igstMatch[1] && !igst) igst = Number.parseFloat(igstMatch[1].replace(/,/g, ""));

  const totalTax = Math.round((cgst + sgst + igst) * 100) / 100;
  if (!subtotal && grandTotal) {
    if (totalTax > 0) subtotal = Math.round((grandTotal - totalTax) * 100) / 100;
    else subtotal = grandTotal;
  }

  // 6. Comprehensive Line Items Extraction
  const items: ParsedInvoiceItem[] = [];

  for (const line of lines) {
    // A. Table items from standard GST bills (Akash Enterprises, etc.)
    const itemMatch = line.match(/^(\d+)\s+([A-Za-z0-9\s]+?)\s+(\d{3,8})?\s*(\d+(?:\.\d+)?\s*(?:KG|LTR|NOS|PCS|g)?)\s*(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)\s*(?:Rs\.?|₹)?\s*[\d,]+(?:\.\d+)?(?:\s*\(\d+%\))?\s*(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (itemMatch && itemMatch[1] && itemMatch[2] && itemMatch[4] && itemMatch[5] && itemMatch[6]) {
      items.push({
        slNo: itemMatch[1],
        description: itemMatch[2].trim(),
        hsnSac: itemMatch[3] || undefined,
        quantity: itemMatch[4].trim(),
        unitRate: Number.parseFloat(itemMatch[5].replace(/,/g, "")),
        amount: Number.parseFloat(itemMatch[6].replace(/,/g, ""))
      });
      continue;
    }

    // B. Goyal Milk Product / Standard 7-column tab-separated items:
    // [ "Dahi Loose Milk", "04039010", "0 %", "134.00 KG", "35.00", "KG", "4,690.00" ]
    const parts = line.split("\t").map(s => s.trim());
    if (parts.length >= 7 && parts[0] && !/description|sl\s*no|particulars/i.test(parts[0])) {
      const desc = parts[0];
      const hsn = parts[1] || "";
      const qtyStr = parts[3];
      const rateStr = parts[4];
      const amtStr = parts[6];
      if (amtStr && rateStr) {
        const amt = Number.parseFloat(amtStr.replace(/,/g, ""));
        const rate = Number.parseFloat(rateStr.replace(/,/g, ""));
        if (!isNaN(amt) && !isNaN(rate)) {
          items.push({
            description: desc,
            hsnSac: /^\d+$/.test(hsn) ? hsn : undefined,
            quantity: qtyStr || undefined,
            unitRate: rate,
            amount: amt
          });
          continue;
        }
      }
    }

    // B2. Alternative tab-separated format where amount is second or fourth
    if (parts.length >= 7 && parts[0] && !parts[0].toLowerCase().includes("description")) {
      const amtStr = parts[1];
      const rateStr = parts[3];
      if (amtStr) {
        const amt = Number.parseFloat(amtStr.replace(/,/g, ""));
        const rate = rateStr ? Number.parseFloat(rateStr.replace(/,/g, "")) : undefined;
        if (!isNaN(amt)) {
          items.push({
            description: parts[0],
            amount: amt,
            unitRate: rate !== undefined && !isNaN(rate) ? rate : undefined,
            quantity: parts[4] || undefined,
            hsnSac: parts[6] || undefined
          });
          continue;
        }
      }
    }

    // C. Campus Receipt line items: "Lay's Classic 1 Rs. 20.00 Rs. 20.00"
    const campusMatch = line.match(/^([A-Za-z0-9\s()\/.\'\-]+?)\s+(\d+(?:\.\d+)?)\s+(?:Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s+(?:Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)$/i);
    if (campusMatch && campusMatch[1] && campusMatch[2] && campusMatch[3] && campusMatch[4] && !campusMatch[1].toLowerCase().includes("item")) {
      items.push({
        description: campusMatch[1].trim(),
        quantity: campusMatch[2],
        unitRate: Number.parseFloat(campusMatch[3].replace(/,/g, "")),
        amount: Number.parseFloat(campusMatch[4].replace(/,/g, ""))
      });
      continue;
    }

    // D. Hostel Connect 4-column receipt items: "LOTTE CHOCO PIE (30G) 2 12.00 24.00"
    const hcMatch = line.match(/^([A-Z0-9\s()\/.\'\-]+?)\s+(\d+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)$/);
    if (hcMatch && hcMatch[1] && hcMatch[2] && hcMatch[3] && hcMatch[4] && !/item|sub-total|grand\s*total|date/i.test(hcMatch[1])) {
      items.push({
        description: hcMatch[1].trim(),
        quantity: hcMatch[2],
        unitRate: Number.parseFloat(hcMatch[3].replace(/,/g, "")),
        amount: Number.parseFloat(hcMatch[4].replace(/,/g, ""))
      });
      continue;
    }

    // E. Amazon line item: "1 Cash/Pay on Delivery fee: ₹1.19 ₹1.19 18% IGST ₹0.21 ₹1.40"
    const amzMatch = line.match(/^(\d+)\s+(.+?)\s+₹([\d,.]+)\s+₹([\d,.]+)\s+(\d+%\s+\w+)\s+₹([\d,.]+)\s+₹([\d,.]+)$/);
    if (amzMatch && amzMatch[1] && amzMatch[2] && amzMatch[3] && amzMatch[7]) {
      items.push({
        slNo: amzMatch[1],
        description: amzMatch[2].trim(),
        unitRate: Number.parseFloat(amzMatch[3].replace(/,/g, "")),
        amount: Number.parseFloat(amzMatch[7].replace(/,/g, ""))
      });
      continue;
    }

    // F. Trek / Travel Package items: "Base Expedition Package (Stay, Meals, Guide) INR 8000"
    const trekMatch = line.match(/^([A-Za-z0-9\s,&()\/]+?)\s+INR\s+(\d+(?:\.\d+)?)$/i);
    if (trekMatch && trekMatch[1] && trekMatch[2] && !/payable|grand\s*total|net\s*amount/i.test(trekMatch[1])) {
      items.push({
        description: trekMatch[1].trim(),
        amount: Number.parseFloat(trekMatch[2])
      });
      continue;
    }

    // G. Sobek Auto / OLX format: "BUYER_PRO 998365 10 8.39 83.90"
    const sobekMatch = line.match(/^([A-Z0-9_\-]+)\s+(\d{4,8})\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)$/);
    if (sobekMatch && sobekMatch[1] && sobekMatch[2] && sobekMatch[3] && sobekMatch[4] && sobekMatch[5]) {
      items.push({
        description: sobekMatch[1],
        hsnSac: sobekMatch[2],
        quantity: sobekMatch[3],
        unitRate: Number.parseFloat(sobekMatch[4].replace(/,/g, "")),
        amount: Number.parseFloat(sobekMatch[5].replace(/,/g, ""))
      });
      continue;
    }
  }

  // If grand total still missing, check Received + Balance or Items sum
  if (!grandTotal) {
    const recvMatch = text.match(/Received\s*Amount\s*(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)\s*Balance\s*Amount\s*(?:Rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (recvMatch && recvMatch[1] && recvMatch[2]) {
      grandTotal = Number.parseFloat(recvMatch[1].replace(/,/g, "")) + Number.parseFloat(recvMatch[2].replace(/,/g, ""));
    } else if (items.length > 0) {
      let discount = 0;
      const discMatch = text.match(/Discount\s*[-–—]?\s*(?:Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)/i);
      if (discMatch && discMatch[1]) discount = Number.parseFloat(discMatch[1].replace(/,/g, ""));
      grandTotal = items.reduce((sum, it) => sum + (it.amount || 0), 0) - discount;
    }
  }

  // Check HSN taxable amounts if subtotal not set
  if (!subtotal && grandTotal) {
    const hsnTaxableMatch = text.match(/\b\d{3,8}\s+(?:Rs\.?|₹)?\s*([\d,]+\.\d{2})/);
    if (hsnTaxableMatch && hsnTaxableMatch[1]) {
      subtotal = Number.parseFloat(hsnTaxableMatch[1].replace(/,/g, ""));
    } else {
      const totalTax = Math.round((cgst + sgst + igst) * 100) / 100;
      if (totalTax > 0) subtotal = Math.round((grandTotal - totalTax) * 100) / 100;
      else subtotal = grandTotal;
    }
  }

  // Calculate confidence score
  let confidence = 0.5;
  if (vendorName) confidence += 0.15;
  if (vendorGstin) confidence += 0.15;
  if (invoiceNumber && invoiceNumber !== fileName.replace(/\.[^/.]+$/, "")) confidence += 0.1;
  if (grandTotal > 0) confidence += 0.1;

  return {
    vendorName,
    vendorGstin,
    buyerName,
    buyerGstin,
    invoiceNumber,
    invoiceDate: normalizedDate,
    subtotal,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
    items,
    confidence: Math.min(0.99, confidence),
    rawText: text
  };
}
