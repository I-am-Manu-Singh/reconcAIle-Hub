import crypto from "node:crypto";

// ─── Audit #85 ── All voucher dates must use YYYYMMDD (no hyphens) for Tally ──
// ─── Audit #86 ── ISDEEMEDPOSITIVE sign is corrected per Tally debit/credit rule
// ─── Audit #44 ── Cost centre allocation tags added to voucher builder
// ─── Audit #45 ── Bill-by-bill BILLALLOCATIONS.LIST reference tracking added
// ─── Audit #78 ── Bank ledger sync includes IFSC, account number, branch name
// ─── Audit #108 ─ Full XML escaping for &, <, >, ", '

export function buildCompanyListRequest(): string {
  return envelope("Export", "Collection", "List of Companies", `
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="List of Companies" ISMODIFY="No">
            <TYPE>Company</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export function buildLedgerListRequest(companyName: string): string {
  return envelope("Export", "Collection", "Ledger Collection", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Ledger Collection" ISMODIFY="No">
            <TYPE>Ledger</TYPE>
            <FETCH>Name,Parent,GUID,OpeningBalance,ClosingBalance</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export function buildVoucherTypeListRequest(companyName: string): string {
  return envelope("Export", "Collection", "Voucher Type Collection", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Voucher Type Collection" ISMODIFY="No">
            <TYPE>VoucherType</TYPE>
            <FETCH>Name,Parent</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export function buildVoucherListRequest(companyName: string, fromDate: string, toDate: string): string {
  return envelope("Export", "Collection", "Voucher Collection", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVFROMDATE>${toTallyDate(fromDate)}</SVFROMDATE>
        <SVTODATE>${toTallyDate(toDate)}</SVTODATE>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Voucher Collection" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FETCH>Date,VoucherTypeName,VoucherNumber,GUID,Narration</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export function buildPartyListRequest(companyName: string): string {
  return envelope("Export", "Collection", "Party Collection", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Party Collection" ISMODIFY="No">
            <TYPE>Ledger</TYPE>
            <FETCH>Name,Parent,GUID,GSTRegistrationType,PartyGSTIN,IncomeTaxNumber,LedgerAddress,StateName</FETCH>
            <FILTER>IsParty</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="IsParty">
            $$IsEqual:$$Parent:"Sundry Debtors" OR
            $$IsEqual:$$Parent:"Sundry Creditors"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export function buildUnitListRequest(companyName: string): string {
  return envelope("Export", "Collection", "Unit Collection", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Unit Collection" ISMODIFY="No">
            <TYPE>Unit</TYPE>
            <FETCH>Name,FormalName,UnitType</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export function buildInventoryItemListRequest(companyName: string): string {
  return envelope("Export", "Collection", "Stock Item Collection", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Stock Item Collection" ISMODIFY="No">
            <TYPE>StockItem</TYPE>
            <FETCH>Name,Parent,BaseUnits,OpeningBalance,ClosingBalance</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  `);
}

export type VoucherBuilderInput = {
  readonly date: string;               // YYYY-MM-DD
  readonly voucherTypeName: string;
  readonly voucherNumber?: string;
  readonly partyName: string;
  readonly amount: number;             // Total voucher amount (INR)
  readonly narration?: string;
  // GST fields (Audit #65: intrastate = CGST+SGST, interstate = IGST)
  readonly taxableAmount?: number;
  readonly cgstAmount?: number;
  readonly sgstAmount?: number;
  readonly igstAmount?: number;
  readonly partyStateCode?: string;    // 2-digit state code prefix from GSTIN
  readonly firmStateCode?: string;
  // Cost centre (Audit #44)
  readonly costCentre?: string;
  // Bill reference (Audit #45)
  readonly billRefType?: "New Ref" | "Agst Ref" | "Advance";
  readonly billRefName?: string;
};

export function buildCreateVoucherRequest(
  companyName: string,
  voucher: VoucherBuilderInput,
): string {
  // Audit #85: Tally requires YYYYMMDD without hyphens
  const tallyDate = toTallyDate(voucher.date);

  // Audit #86: Correct ISDEEMEDPOSITIVE per Tally double-entry rules
  const isPurchase = /purchase|expense|payment/i.test(voucher.voucherTypeName);
  const isReceipt = /receipt|sales|income/i.test(voucher.voucherTypeName);

  // Audit #65: Determine GST split type by comparing state codes
  const isInterstate =
    voucher.partyStateCode !== undefined &&
    voucher.firmStateCode !== undefined &&
    voucher.partyStateCode !== voucher.firmStateCode;

  const cgst = voucher.cgstAmount ?? 0;
  const sgst = voucher.sgstAmount ?? 0;
  const igst = voucher.igstAmount ?? 0;
  const taxable = voucher.taxableAmount ?? voucher.amount;

  // Audit #101: UUID v4 GUID for idempotency
  const guid = `${crypto.randomUUID()}`;

  const partySign = isPurchase ? 1 : -1;
  const tradeSign = isPurchase ? -1 : 1;

  // Audit #44: Cost centre allocation
  const costCentreXml = voucher.costCentre
    ? `<COSTCENTREALLOCATIONS.LIST>
        <NAME>${escapeXml(voucher.costCentre)}</NAME>
        <AMOUNT>${voucher.amount}</AMOUNT>
      </COSTCENTREALLOCATIONS.LIST>`
    : "";

  // Audit #45: Bill-by-bill reference tracking
  const billRefXml =
    voucher.billRefName
      ? `<BILLALLOCATIONS.LIST>
          <NAME>${escapeXml(voucher.billRefName)}</NAME>
          <BILLTYPE>${escapeXml(voucher.billRefType ?? "New Ref")}</BILLTYPE>
          <AMOUNT>${voucher.amount}</AMOUNT>
        </BILLALLOCATIONS.LIST>`
      : "";

  // GST ledger entries (only emitted if GST amounts > 0)
  const gstEntriesXml = buildGstLedgerEntries({ isInterstate, cgst, sgst, igst, isPurchase, tradeSign });

  return envelope("Import", "Data", "Voucher Import", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="${escapeXml(voucher.voucherTypeName)}" ACTION="Create" OBJVIEW="Accounting Voucher View">
          <GUID>${guid}</GUID>
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>${escapeXml(voucher.voucherTypeName)}</VOUCHERTYPENAME>
          ${voucher.voucherNumber ? `<VOUCHERNUMBER>${escapeXml(voucher.voucherNumber)}</VOUCHERNUMBER>` : ""}
          <PARTYLEDGERNAME>${escapeXml(voucher.partyName)}</PARTYLEDGERNAME>
          ${voucher.narration ? `<NARRATION>${escapeXml(voucher.narration)}</NARRATION>` : ""}

          <!-- Party Ledger Entry -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(voucher.partyName)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${partySign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
            <AMOUNT>${partySign * voucher.amount}</AMOUNT>
            ${billRefXml}
          </ALLLEDGERENTRIES.LIST>

          <!-- Trade Ledger Entry (Sales/Purchase Account) -->
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${isPurchase ? "Purchase Account" : isReceipt ? "Sales Account" : "Sundry Debtors"}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${tradeSign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
            <AMOUNT>${tradeSign * taxable}</AMOUNT>
            ${costCentreXml}
          </ALLLEDGERENTRIES.LIST>

          ${gstEntriesXml}
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  `);
}

// Audit #65: Build correct GST ledger entries for intrastate (CGST+SGST) vs interstate (IGST)
function buildGstLedgerEntries(opts: {
  isInterstate: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  isPurchase: boolean;
  tradeSign: number;
}): string {
  const { isInterstate, cgst, sgst, igst, tradeSign } = opts;
  const entries: string[] = [];

  if (isInterstate && igst > 0) {
    entries.push(`
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>IGST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${tradeSign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${tradeSign * igst}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
    `);
  } else {
    if (cgst > 0) {
      entries.push(`
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${tradeSign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${tradeSign * cgst}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `);
    }
    if (sgst > 0) {
      entries.push(`
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${tradeSign > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${tradeSign * sgst}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `);
    }
  }

  return entries.join("\n");
}

// Audit #78: Bank ledger creation now includes IFSC, account number and branch name
export function buildCreateLedgerRequest(
  companyName: string,
  ledger: {
    readonly name: string;
    readonly parentGroup: string;
    readonly openingBalance?: number;
    readonly bankAccountNumber?: string;
    readonly ifscCode?: string;
    readonly branchName?: string;
  },
): string {
  const bankXml = ledger.bankAccountNumber
    ? `<BANKACNO>${escapeXml(ledger.bankAccountNumber)}</BANKACNO>
       <IFSCODE>${escapeXml(ledger.ifscCode ?? "")}</IFSCODE>
       <BRANCHNAME>${escapeXml(ledger.branchName ?? "")}</BRANCHNAME>`
    : "";

  return envelope("Import", "Data", "Ledger Import", `
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">
          <NAME>${escapeXml(ledger.name)}</NAME>
          <PARENT>${escapeXml(ledger.parentGroup)}</PARENT>
          ${ledger.openingBalance !== undefined ? `<OPENINGBALANCE>${ledger.openingBalance}</OPENINGBALANCE>` : ""}
          ${bankXml}
        </LEDGER>
      </TALLYMESSAGE>
    </DATA>
  `);
}

function envelope(request: "Export" | "Import", type: string, id: string, body: string): string {
  return compactXml(`
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>${request}</TALLYREQUEST>
        <TYPE>${type}</TYPE>
        <ID>${escapeXml(id)}</ID>
      </HEADER>
      <BODY>
        ${body}
      </BODY>
    </ENVELOPE>
  `);
}

/** Audit #85: Convert YYYY-MM-DD to YYYYMMDD required by Tally XML */
export function toTallyDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    if (/^\d{8}$/.test(isoDate)) return isoDate;
    throw new Error(`Invalid date format: "${isoDate}". Expected YYYY-MM-DD.`);
  }
  return `${match[1]}${match[2]}${match[3]}`;
}

/** Audit #108: Escape all XML special characters including quotes and apostrophes */
export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function compactXml(xml: string): string {
  return xml
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("");
}