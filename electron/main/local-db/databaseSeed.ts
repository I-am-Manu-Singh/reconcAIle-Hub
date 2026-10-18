import type { LocalDatabase } from "./database.js";
import crypto from "node:crypto";

/**
 * Enterprise Sample Database Seeder
 * Populates realistic Indian accounting masters, vouchers, bank transactions,
 * GSTR-2B entries, and document extractions for demo and testing purposes.
 */
export function seedSampleDatabaseData(database: LocalDatabase): void {
  const companyId = crypto.createHash("sha256").update("company:TALLY:Acme Enterprise Private Limited").digest("hex");
  const now = new Date().toISOString();

  // 1. Seed Companies
  database.prepare(`
    INSERT INTO accounting_companies (id, name, state_name, gstin, books_from, source_provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'TALLY', ?, ?)
    ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
  `).run(companyId, "Acme Enterprise Private Limited", "Maharashtra", "27AABCU9603R1ZN", "2026-04-01", now, now);

  // 2. Seed Ledgers
  const ledgers = [
    { name: "SBI Bank Account", parent: "Bank Accounts", opBal: "250000.00 Dr" },
    { name: "HDFC Bank Account", parent: "Bank Accounts", opBal: "180000.00 Dr" },
    { name: "Acme Logistics Pvt Ltd", parent: "Sundry Debtors", opBal: "45000.00 Dr" },
    { name: "TechCorp India Solutions", parent: "Sundry Creditors", opBal: "88000.00 Cr" },
    { name: "Sales Account", parent: "Sales Accounts", opBal: "0.00" },
    { name: "Purchase Account", parent: "Purchase Accounts", opBal: "0.00" },
    { name: "CGST Input Tax", parent: "Duties & Taxes", opBal: "12500.00 Dr" },
    { name: "SGST Input Tax", parent: "Duties & Taxes", opBal: "12500.00 Dr" },
    { name: "IGST Input Tax", parent: "Duties & Taxes", opBal: "24000.00 Dr" },
    { name: "Electricity Expenses", parent: "Indirect Expenses", opBal: "4500.00 Dr" },
  ];

  const ledgerStmt = database.prepare(`
    INSERT INTO ledgers (id, company_id, name, parent_name, opening_balance_text, source_provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'TALLY', ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
  `);

  for (const l of ledgers) {
    const lId = crypto.createHash("sha256").update(`ldr_${l.name}`).digest("hex");
    ledgerStmt.run(lId, companyId, l.name, l.parent, l.opBal, now, now);
  }

  // 3. Seed Vouchers
  const vouchers = [
    { vNo: "INV-2026-001", vDate: "2026-07-15", type: "Sales", narration: "Consulting fees billed to Acme Logistics" },
    { vNo: "INV-2026-002", vDate: "2026-07-18", type: "Sales", narration: "IT Infrastructure Maintenance Service" },
    { vNo: "PUR-2026-101", vDate: "2026-07-20", type: "Purchase", narration: "Office Server Hardware Purchase" },
    { vNo: "RCP-2026-088", vDate: "2026-07-22", type: "Receipt", narration: "Payment received via NEFT from Acme Logistics" },
    { vNo: "PAY-2026-044", vDate: "2026-07-25", type: "Payment", narration: "Electricity bill paid via SBI net banking" },
  ];

  const voucherStmt = database.prepare(`
    INSERT INTO vouchers (id, company_id, voucher_date, voucher_type_name, voucher_number, narration, source_provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'TALLY', ?, ?)
    ON CONFLICT(id) DO UPDATE SET narration = excluded.narration, updated_at = excluded.updated_at
  `);

  for (const v of vouchers) {
    const vId = crypto.createHash("sha256").update(`vch_${v.vNo}`).digest("hex");
    voucherStmt.run(vId, companyId, v.vDate, v.type, v.vNo, v.narration, now, now);
  }

  // 4. Seed Bank Transactions
  const bankTxs = [
    { date: "2026-07-25", narration: "NEFT-INB-ACME LOGISTICS PVT LTD-CR", withdrawal: 0, deposit: 53100.00, bal: 303100.00 },
    { date: "2026-07-26", narration: "ACH-WTR-MAHADISCOM ELECTRICITY BILL-DR", withdrawal: 4500.00, deposit: 0, bal: 298600.00 },
    { date: "2026-07-28", narration: "UPI-TECHCORP INDIA SOLUTIONS-HARDWARE", withdrawal: 118000.00, deposit: 0, bal: 180600.00 },
    { date: "2026-07-29", narration: "CHQ-PAID-BLUE DART EXPRESS-DR", withdrawal: 2450.00, deposit: 0, bal: 178150.00 },
    { date: "2026-07-30", narration: "NEFT-OUT-VERTEX OFFICE SUPPLIES-DR", withdrawal: 14500.00, deposit: 0, bal: 163650.00 },
    { date: "2026-07-31", narration: "IMPS-IN-SHARMA RETAILERS-CR", withdrawal: 0, deposit: 32400.00, bal: 196050.00 },
    { date: "2026-08-01", narration: "UPI-CHAI POINT-REFRESHMENTS", withdrawal: 350.00, deposit: 0, bal: 195700.00 },
    { date: "2026-08-02", narration: "ATM-CASH-WITHDRAWAL-KOTA BR", withdrawal: 10000.00, deposit: 0, bal: 185700.00 },
    { date: "2026-08-03", narration: "ACH-DR-MUTHOOT FINANCE EMI", withdrawal: 8500.00, deposit: 0, bal: 177200.00 },
    { date: "2026-08-04", narration: "NEFT-IN-GLOBAL INFOTECH INVOICE-CR", withdrawal: 0, deposit: 78900.00, bal: 256100.00 },
    { date: "2026-08-05", narration: "UPI-SWIGGY-TEAM LUNCH", withdrawal: 1850.00, deposit: 0, bal: 254250.00 },
    { date: "2026-08-06", narration: "POS-DR-RELIANCE DIGITAL-MONITOR", withdrawal: 15499.00, deposit: 0, bal: 238751.00 },
    { date: "2026-08-07", narration: "CHQ-DEPOSITED-KAPOOR TRADERS-CR", withdrawal: 0, deposit: 45000.00, bal: 283751.00 },
    { date: "2026-08-08", narration: "IMPS-OUT-RELIANCE RETAIL-STATIONERY", withdrawal: 3200.00, deposit: 0, bal: 280551.00 },
    { date: "2026-08-09", narration: "UPI-RECHARGE-JIO FIBER", withdrawal: 1179.00, deposit: 0, bal: 279372.00 },
    { date: "2026-08-10", narration: "NEFT-OUT-LANDLORD RENT AC-DR", withdrawal: 35000.00, deposit: 0, bal: 244372.00 },
    { date: "2026-08-11", narration: "TPT-IN-AJAY ENTERPRISES-CR", withdrawal: 0, deposit: 21500.00, bal: 265872.00 },
    { date: "2026-08-12", narration: "ACH-WTR-MUNICIPAL CORP WATER-DR", withdrawal: 1200.00, deposit: 0, bal: 264672.00 },
    { date: "2026-08-13", narration: "UPI-INTERNET-AIRTEL WORLD", withdrawal: 999.00, deposit: 0, bal: 263673.00 },
    { date: "2026-08-14", narration: "NEFT-IN-ZEAL VENTURES LTD-CR", withdrawal: 0, deposit: 112000.00, bal: 375673.00 },
    { date: "2026-08-15", narration: "IMPS-OUT-REPAIR WORK-MAINTENANCE", withdrawal: 6500.00, deposit: 0, bal: 369173.00 },
    { date: "2026-08-16", narration: "UPI-FUEL-INDIAN OIL CORP", withdrawal: 2500.00, deposit: 0, bal: 366673.00 },
    { date: "2026-08-17", narration: "BANK CHARGES-GST-CONSOLIDATED", withdrawal: 450.00, deposit: 0, bal: 366223.00 },
    { date: "2026-08-18", narration: "NEFT-IN-HINDUSTAN TRADING CO-CR", withdrawal: 0, deposit: 64200.00, bal: 430423.00 },
    { date: "2026-08-19", narration: "UPI-AMAZON PAY-OFFICE CHAIRS", withdrawal: 12800.00, deposit: 0, bal: 417623.00 }
  ];


  const bankStmt = database.prepare(`
    INSERT INTO bank_transactions (id, company_id, bank_name, transaction_date, narration, withdrawal_amount, deposit_amount, balance_amount, created_at, updated_at)
    VALUES (?, ?, 'SBI Bank', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET narration = excluded.narration
  `);

  for (let i = 0; i < bankTxs.length; i++) {
    const tx = bankTxs[i]!;
    const txId = crypto.createHash("sha256").update(`tx_${tx.date}_${i}`).digest("hex");
    bankStmt.run(txId, companyId, tx.date, tx.narration, tx.withdrawal, tx.deposit, tx.bal, now, now);
  }

  // 5. Seed GSTR-2B Records
  const gstr2b = [
    { gstin: "27AABCT8891Q1ZP", supplier: "TechCorp India Solutions", invNo: "TC-2026-901", invDate: "2026-07-20", taxable: 100000.00, cgst: 9000.00, sgst: 9000.00, igst: 0.00, status: "MATCHED" },
    { gstin: "27BBBCL4412K1Z8", supplier: "Global Cloud Tech Pvt Ltd", invNo: "GC-8841", invDate: "2026-07-22", taxable: 40000.00, cgst: 0.00, sgst: 0.00, igst: 7200.00, status: "MATCHED" },
  ];

  const gstrStmt = database.prepare(`
    INSERT INTO gstr2b_records (id, company_id, supplier_gstin, supplier_name, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, match_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET match_status = excluded.match_status
  `);

  for (let i = 0; i < gstr2b.length; i++) {
    const r = gstr2b[i]!;
    const rId = crypto.createHash("sha256").update(`gstr_${r.invNo}`).digest("hex");
    gstrStmt.run(rId, companyId, r.gstin, r.supplier, r.invNo, r.invDate, r.taxable, r.cgst, r.sgst, r.igst, r.status, now, now);
  }
}
