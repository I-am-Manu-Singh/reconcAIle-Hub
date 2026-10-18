# 100-Point Deep Technical UI Audit: DocumentsView.tsx
## ReconcAILe Hub — Intelligent Invoice OCR & Multi-Document Processing Pipeline

> **Audit Scope**: Comprehensive technical and UI evaluation of `DocumentsView.tsx`, inspecting OCR bounding box overlays, line item tax validation, confidence score indicators, multi-file repository filters, batch document actions, and outbox sync queue triggers.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: AI Ingestion & Line-Item Tax Grid** | Items 1 – 25 | 🔴 High | Add Bounding Box Canvas Overlay, Confidence Badges (`98.5%`), HSN/SAC Code Validation, Tax Head Split (CGST/SGST/IGST), and Line Item Add/Delete actions. |
| **Section 2: Multi-Doc Repository & Filter Controls** | Items 26 – 50 | 🟡 Medium | Add Search input bar, Status Filter (`IMPORTED`, `OCR_PENDING`, `EXTRACTED`), File Type Filter (`INVOICE`, `RECEIPT`, `STATEMENT`), and Bulk Select actions. |
| **Section 3: Document Preview Modal & OCR Confidence Inspector** | Items 51 – 75 | 🟡 Medium | Add Side-by-side Document Preview Drawer, OCR Bounding Box Highlighter Canvas, Raw OCR JSON Inspector, and Re-run OCR action. |
| **Section 4: Visual Polish, UX, Badges & Accessibility** | Items 76 – 100 | 🟢 Polish | Fix line-item table dark background overrides, enforce dark mode contrast, add skeleton shimmers, keyboard navigation, and ARIA screen reader attributes. |

---

### Detailed 100-Item Breakdown

#### Section 1: AI Ingestion & Line-Item Tax Grid (Items 1 – 25)
1. **Document Bounding Box Inspector Canvas**: Render canvas overlay for bounding box highlights on raw invoice images.
2. **Overall Extraction Confidence Score Gauge**: Render circular percentage badge (`98.5%` confidence rating).
3. **Vendor GSTIN Validation Indicator**: Display green checkmark icon badge for verified 15-digit GSTINs.
4. **HSN / SAC Code Column**: Display HSN/SAC code per invoice line item (`8471`, `9983`).
5. **Tax Head Breakdown Column**: Display individual CGST, SGST, and IGST tax splits.
6. **Line Item Add Row Action**: Add "+ Add Line Item" button allowing manual line insertion.
7. **Line Item Delete Row Action**: Add trash button per line item to delete misread OCR lines.
8. **Line Item Rate & Quantity Validation**: Auto-calculate Rate × Quantity = Amount.
9. **Discount Column**: Add item-level discount percentage and amount fields.
10. **Invoice Total vs Debit/Credit Balance Warning**: Highlight warning if line item sum ≠ invoice grand total.
11. **Tally Party Ledger Mapping Dropdown**: Dropdown selecting target Tally ledger (e.g. `Acme Trading Co.`).
12. **Purchase / Sales Voucher Type Selector**: Dropdown selecting voucher type (`Purchase`, `Sales Invoice`, `Expense`).
13. **Invoice Date Picker Input**: Date picker field for extracted bill date (`YYYY-MM-DD`).
14. **Due Date Calculation**: Auto-calculate payment due date based on credit terms (`Net 30`).
15. **Supplier Invoice Number Input**: Text input for original vendor invoice number.
16. **Reverse Charge Applicable Indicator (RCM)**: Toggle checkbox for RCM applicability.
17. **Place of Supply State Code**: Display state code for POS determination (`27-Maharashtra`).
18. **Bill-by-Bill Reference Number**: Input for bill reference allocation tag (`INV-2026-881`).
19. **Cost Center Category Assignment**: Dropdown selecting cost center (`Operations`, `Sales & Marketing`).
20. **AI Model Selection Dropdown**: Dropdown selecting vision model (`AI 2.5 Pro Vision`, `Claude 3.5 Sonnet`).
21. **Confidence Threshold Slider**: Slider setting minimum acceptable extraction confidence (`85%`–`99%`).
22. **Quick Extract by Document ID**: Form input to trigger extraction on any local document ID.
23. **Validation Error List Drawer**: Expandable alert drawer listing validation warnings.
24. **Approve & Push to Sync Outbox Button**: Primary button queuing approved draft directly to outbox.
25. **Reset / Re-Extract Draft Button**: Button discarding draft and triggering clean re-extraction.
