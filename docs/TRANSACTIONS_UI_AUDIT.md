# 100-Point Deep Technical UI Audit: MasterTransactionGridView.tsx
## ReconcAILe Hub — Chart of Accounts, Multi-Voucher Registers & Banking Grid

> **Audit Scope**: Comprehensive technical and UI evaluation of `MasterTransactionGridView.tsx`, inspecting missing accounting columns, voucher debit/credit balances, GSTIN verification badges, CSV data exporters, raw XML voucher payload drawers, and banking transaction registers.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: Chart of Accounts & Ledger Master Grid** | Items 1 – 25 | 🔴 High | Add Opening Balance (Dr/Cr), Closing Balance (Dr/Cr), Parent Primary Group, GSTIN, State Name, Address, Contact Person, Phone, Email, and CSV Exporter. |
| **Section 2: Multi-Voucher Register & Line-Item Columns** | Items 26 – 50 | 🟡 Medium | Add Voucher Date, Voucher Number, Voucher Type, Party Ledger Name, Debit Amount (₹), Credit Amount (₹), Narration, Tally Master ID, and Raw XML Payload Inspector drawer. |
| **Section 3: Banking, Cash Flow & Financial Books** | Items 51 – 75 | 🟡 Medium | Add Bank Account Number, Bank Name, Instrument Number (Cheque / UTR), Transaction Date, Deposit Amount, Withdrawal Amount, Reconciled Status Badge, and Balance Carried Forward. |
| **Section 4: Visual Polish, UX, Badges & Accessibility** | Items 76 – 100 | 🟢 Polish | Enforce dark mode table overrides, add click-to-copy Voucher GUID buttons, skeleton loading shimmers, keyboard navigation, and ARIA attributes. |

---

### Detailed 100-Item Breakdown

#### Section 1: Chart of Accounts & Ledger Master Grid (Items 1 – 25)
1. **Ledger Opening Balance Column**: Display opening balance formatted with `Dr` or `Cr` indicators.
2. **Ledger Closing Balance Column**: Display closing balance formatted with `Dr` or `Cr` indicators.
3. **Primary Accounting Group Column**: Display top-level group category (`Sundry Debtors`, `Sundry Creditors`, `Bank Accounts`, `Sales Accounts`).
4. **GSTIN Column & Verification Badge**: Display 15-digit GSTIN with green checkmark for verified GSTINs.
5. **State Code Prefix Column**: Display state code prefix (e.g. `27` for Maharashtra, `29` for Karnataka).
6. **Registered Billing Address Column**: Display registered street address and city.
7. **Contact Person Metadata**: Display primary contact name.
8. **Contact Phone Number**: Display phone number formatted.
9. **Contact Email Address**: Display email address.
10. **Pan Number Column**: Display 10-character PAN number (`AABCU9603R`).
11. **Tax Registration Type**: Display GST registration type (`Regular`, `Composition`, `Unregistered`).
12. **Credit Limit Column**: Display configured credit limit (₹).
13. **Credit Days / Terms Column**: Display default credit days (`30 Days`).
14. **Cost Center Applicable Flag**: Display status badge if cost center tracking is active.
15. **Bill-by-Bill Tracking Flag**: Display status badge if bill-by-bill allocation is active.
16. **Ledger Search Input Bar**: Search filter by ledger name, GSTIN, or parent group.
17. **Parent Group Filter Dropdown**: Filter ledgers by parent accounting group category.
18. **Export Chart of Accounts CSV**: Export full chart of accounts to CSV file.
19. **Ledger Detail Drawer Action**: Click-to-open drawer inspecting full ledger JSON schema.
20. **Re-Sync Single Ledger Action**: Trigger one-click re-sync of selected ledger from Tally.
21. **Total Ledgers Count Badge**: Display count badge of active ledgers.
22. **Zero-Balance Hide Toggle**: Toggle switch hiding zero-balance ledgers.
23. **Multi-Select Ledger Checkboxes**: Bulk selection checkboxes for export or batch tagging.
24. **Click-to-Copy Ledger GUID**: Copy button for Tally Master ID GUID.
25. **Ledger Type Icon**: Distinct visual icon for Assets, Liabilities, Income, and Expense ledgers.
