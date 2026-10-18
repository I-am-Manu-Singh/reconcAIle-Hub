# 100-Point Deep Technical UI Audit: GstView.tsx
## ReconcAILe Hub — GSTR-2B Auto-Reconciliation, GSTR-1 JSON Export & ITC Compliance Engine

> **Audit Scope**: Comprehensive technical and UI evaluation of `GstView.tsx`, evaluating GSTR-2B portal invoice matching, GSTR-1 sales return JSON generation, CGST/SGST/IGST breakdown columns, Rule 36(4) ITC restriction flags, supplier GSTIN verification, and CSV export capabilities.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: GSTR-2B Inward Register & Tax Columns** | Items 1 – 25 | 🔴 High | Add Supplier Name, Supplier GSTIN, Invoice Number, Invoice Date, Invoice Type, HSN/SAC Code, Taxable Value (₹), CGST (₹), SGST (₹), IGST (₹), Gross Invoice Value (₹), ITC Eligibility Status, and Match Rating Badge. |
| **Section 2: GSTR-1 Sales Return Portal Filer & Outward Grid** | Items 26 – 50 | 🟡 Medium | Add B2B Sales, B2CL Large Sales, B2CS Small Sales, CDNR Credit Notes, HSN Summary Table, NIL Rated Supplies, and Export GSTR-1 Portal JSON Filer. |
| **Section 3: GSTR-3B Tax Liability Computation & Discrepancy** | Items 51 – 75 | 🟡 Medium | Add Output Tax Payable, Eligible ITC Claimable, Reverse Charge Liability (RCM), Net Cash Tax Payable via Electronic Cash Ledger, and Rule 36(4) 5% Cap Restriction Alert. |
| **Section 4: Visual Polish, UX, Badges & Accessibility** | Items 76 – 100 | 🟢 Polish | Fix dark mode table backgrounds, add click-to-copy GSTIN handler with checkmark feedback, skeleton loading shimmers, ARIA screen reader attributes, and focus rings. |

---

### Detailed 100-Item Breakdown

#### Section 1: GSTR-2B Inward Register & Tax Columns (Items 1 – 25)
1. **Supplier Business Name Column**: Display supplier registered business name.
2. **Supplier GSTIN Column & Badge**: Display 15-digit GSTIN with green checkmark for active status.
3. **Invoice / Credit Note Number Column**: Monospace invoice number (`INV-2026-8891`).
4. **Invoice Date Column**: Document date (`2026-07-28`).
5. **Invoice Type Category**: Category tag (`B2B Regular`, `SEZ Supplies`, `Deemed Export`).
6. **HSN / SAC Code Summary**: Display primary HSN code (`8471`).
7. **Taxable Amount Column**: Formatted taxable amount (`₹172,500.00`).
8. **CGST Tax Amount Column**: Central GST tax amount (`₹15,525.00`).
9. **SGST Tax Amount Column**: State GST tax amount (`₹15,525.00`).
10. **IGST Tax Amount Column**: Integrated GST tax amount (`₹0.00`).
11. **CESS Tax Amount Column**: Compensation CESS tax amount.
12. **Gross Invoice Total Column**: Formatted total invoice value (`₹203,550.00`).
13. **ITC Availability Flag**: Badge (`✓ Available`, `⚠ Restricted Rule 36(4)`).
14. **Reason for Ineligibility**: Explanation text string for blocked ITC (e.g. `Section 17(5) Motor Vehicle`).
15. **Reconciliation Match Status Rating**: Badge (`MATCHED`, `TAX_MISMATCH`, `NOT_IN_BOOKS`, `NOT_IN_PORTAL`).
16. **Tally Voucher Master ID Link**: Clickable link to internal Tally voucher record.
17. **Search Filter Bar**: Search by supplier name, GSTIN, or invoice number.
18. **ITC Eligibility Filter Dropdown**: Filter (`All`, `Available ITC`, `Restricted ITC`, `Mismatches`).
19. **Financial Year & Month Period Selector**: Dropdown selecting period (`FY 2026-27`, `July 2026`).
20. **Pull GST Portal Data Action Button**: Trigger live fetch of GSTR-2B from GSTN portal API.
21. **Export GSTR-2B CSV Report Action**: Export full GSTR-2B reconciliation table to CSV.
22. **Export GSTR-1 Official JSON Filer Action**: Download JSON payload formatted for GST portal offline tool.
23. **Total Portal Records Metric Card**: Count of GSTR-2B invoices fetched.
24. **Total Gross ITC Metric Card**: Sum of all CGST + SGST + IGST tax amounts.
25. **Eligible ITC Pool Metric Card**: Sum of valid claimable ITC pool.
