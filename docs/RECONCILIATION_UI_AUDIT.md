# 100-Point Deep Technical UI Audit: ReconciliationView.tsx
## ReconcAILe Hub — Automated Bank Statement Feed & Bank Reconciliation Engine

> **Audit Scope**: Comprehensive technical and UI evaluation of `ReconciliationView.tsx`, evaluating bank feed CSV/OFX imports, auto-matching tolerance windows, ledger mapping rules, contra entries, UTR verification, and BRS audit statement generation.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: Bank Feed Import & Transaction Columns** | Items 1 – 25 | 🔴 High | Add Bank Name, Account Number, Value Date, Transaction Date, Particulars/Description, Instrument Ref UTR, Deposit Amount (₹), Withdrawal Amount (₹), Running Balance, and Ledger Selector. |
| **Section 2: Auto-Matching Tolerance Window & Matching Engine** | Items 26 – 50 | 🟡 Medium | Add Match Confidence Rating Badge (`98.5%`), Date Variance Tolerance (±3 Days), Amount Variance Tolerance (±₹1.00), Auto-Post Match button, and Exception Reason Tag (`Unmapped Vendor`). |
| **Section 3: Bank Reconciliation Statement (BRS) & Export** | Items 51 – 75 | 🟡 Medium | Add Balance as per Bank Statement, Balance as per Tally ERP Books, Amounts Not Reflected in Bank, Amounts Not Reflected in ERP, and Export BRS PDF/CSV Report. |
| **Section 4: Visual Polish, UX, Badges & Accessibility** | Items 76 – 100 | 🟢 Polish | Fix table background dark theme overrides, add click-to-copy UTR buttons, skeleton loading shimmers, ARIA screen reader attributes, and focus rings. |

---

### Detailed 100-Item Breakdown

#### Section 1: Bank Feed Import & Transaction Columns (Items 1 – 25)
1. **Bank Account Selector Dropdown**: Dropdown selecting target bank account (`SBI Current A/c #3889102`, `HDFC Corporate A/c #501002`).
2. **Value Date Column**: Display bank value date (`2026-07-28`).
3. **Transaction Date Column**: Display posting date (`2026-07-28`).
4. **Instrument / Reference UTR Number Column**: Display UTR / Cheque / IMPS reference code with copy button.
5. **Particulars / Raw Description Column**: Display raw bank statement text string.
6. **Deposit Amount Column (Credits)**: Green formatted deposit amount (`₹118,000.00`).
7. **Withdrawal Amount Column (Debits)**: Red formatted withdrawal amount (`₹15,400.00`).
8. **Running Book Balance Column**: Display calculated running balance after transaction.
9. **Target Tally Ledger Selection Dropdown**: Dropdown selecting target ledger to post bank voucher.
10. **Target Voucher Type Dropdown**: Dropdown selecting target voucher type (`Receipt`, `Payment`, `Contra`).
11. **Cost Center Assignment Dropdown**: Dropdown selecting cost center for bank transaction.
12. **Bill Reference Assignment**: Input for bill-by-bill allocation reference.
13. **Bank Statement CSV / OFX / MT940 Importer**: Button to trigger file picker for bank feed statement upload.
14. **Auto-Post Single Bank Voucher Action**: One-click button posting bank entry to Tally outbox.
15. **Batch Post Matched Entries Action**: Primary button posting all 100% matched bank transactions in one click.
16. **Ignore / Skip Transaction Action**: Button marking non-accounting bank entry as skipped.
17. **Split Bank Transaction Action**: Modal drawer to split single bank entry into multiple ledger postings.
18. **Create Contra Entry Action**: One-click action generating Contra voucher between cash & bank.
19. **Bank Feed Refresh Trigger**: Button pulling live bank feed updates via Open Banking API.
20. **Search Input Bar**: Search filter by description, UTR, or bank account name.
21. **Transaction Type Filter Dropdown**: Filter transactions (`All`, `Deposits Only`, `Withdrawals Only`).
22. **Match Status Filter Dropdown**: Filter transactions (`All`, `Matched`, `Pending Exception`).
23. **Export Reconciliation CSV Action**: Button exporting reconciliation statement to CSV.
24. **Total Outflows Analytics Metric**: Card displaying sum of all debits (`₹1,58,000`).
25. **Total Inflows Analytics Metric**: Card displaying sum of all credits (`₹4,85,000`).
