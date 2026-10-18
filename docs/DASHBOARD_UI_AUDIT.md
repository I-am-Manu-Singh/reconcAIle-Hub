# 100-Point Deep Technical UI Audit: DashboardView.tsx
## ReconcAILe Hub — Enterprise Dashboard & Workspace Intelligence

> **Audit Scope**: Deep technical and visual design inspection of `DashboardView.tsx`, evaluating layout alignment, reactivity, missing metrics, interactive controls, responsiveness, state fallback, keyboard navigation, and enterprise practice workflows.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: Missing KPI Cards & Executive Financial Metrics** | Items 1 – 25 | 🔴 High | Add Total Sales Revenue, Total Purchases, Net GST Liability (CGST+SGST+IGST), Cash & Bank Balance, and Total Outstanding Accounts Receivable/Payable. |
| **Section 2: Interactive Controls, Filters & Period Selectors** | Items 26 – 50 | 🟡 Medium | Add Financial Year Selector (`FY 2026-27`), Quarter/Month Scope Pills (`Q1`, `Q2`, `Q3`, `Q4`), Company Multi-Select Filter, and Auto-Refresh Interval Switcher. |
| **Section 3: Missing Charts, Visual Trends & Sparklines** | Items 51 – 75 | 🟡 Medium | Add Monthly Sales vs Purchase Bar Chart, Bank Balance Trend Line Chart, GST Liability Donut Chart, and OCR Processing Speed Velocity Gauge. |
| **Section 4: Visual Polish, Typography, Accessibility & UX** | Items 76 – 100 | 🟢 Polish | Fix button hover contrast, add skeleton loading shimmer states, implement tooltips on icon buttons, add keyboard navigation shortcuts, and enforce ARIA tags. |

---

### Detailed 100-Item Breakdown

#### Section 1: Missing KPI Cards & Financial Metrics (Items 1 – 25)
1. **Total Sales Revenue Metric**: Missing KPI card showing YTD total sales revenue (₹).
2. **Total Purchase Expense Metric**: Missing KPI card displaying total purchase bills processed (₹).
3. **Net GST Tax Liability Metric**: Missing KPI displaying combined CGST + SGST + IGST tax liability.
4. **Combined Bank Balance KPI**: Missing card displaying total liquid cash and bank balance across all accounts.
5. **Sundry Debtors Outstanding**: Missing metric for total receivables owed by customers.
6. **Sundry Creditors Payable**: Missing metric for total payables owed to vendors.
7. **Input Tax Credit (ITC) Available**: Missing KPI displaying total eligible ITC claimable in GSTR-3B.
8. **Ineligible ITC Amount**: Missing metric showing blocked/restricted ITC under Section 17(5).
9. **Average OCR Extraction Time**: Missing metric tracking average document processing latency (seconds/page).
10. **Tally Connection Latency Pill**: Missing KPI displaying real-time ping latency to local Tally HTTP port (ms).
11. **Total Master Stock Items**: Missing KPI count of inventory items mirrored from Tally/BUSY.
12. **Pending Bill Allocations Count**: Missing KPI count of vouchers lacking bill-by-bill reference links.
13. **Cost Center Unallocated Expenses**: Missing metric for unassigned cost center expenses.
14. **Overdue Invoices Count**: Missing KPI count of sales invoices past payment due date.
15. **E-Way Bill Generation Pending**: Missing metric showing high-value invoices ( > ₹50,000) needing EWB.
16. **E-Invoice IRN Pending**: Missing metric tracking B2B invoices awaiting E-Invoice IRN registration.
17. **Duplicate Invoice Flag Count**: Missing KPI showing duplicate invoice numbers detected during OCR.
18. **Unmapped Party Ledgers Count**: Missing metric showing extracted supplier names needing Tally ledger mapping.
19. **Unmapped Expense Ledgers Count**: Missing KPI tracking extracted line items lacking default expense ledgers.
20. **Reconciliation Variance Amount**: Missing metric for total bank statement vs book balance discrepancy (₹).
21. **Active Tally Company Name Badge**: Top header shows generic title; lacks prominent active Tally company badge.
22. **Sync Outbox Retry Failures**: Missing KPI tracking commands that reached max retry limit (`FAILED`).
23. **Practice Client Count KPI**: Missing count of active practice client companies managed.
24. **Document Ingestion Storage Used**: Missing KPI displaying disk space occupied by PDF/image storage (MB).
25. **AI Extraction Accuracy Score**: Missing aggregate AI accuracy percentage across processed documents (%).

#### Section 2: Interactive Controls, Filters & Period Selectors (Items 26 – 50)
26. **Financial Year Scope Dropdown**: Missing topbar dropdown selector for financial period (`FY 2026-27`, `FY 2025-26`).
27. **Quarterly Filter Pills**: Missing quick toggle pills (`Q1`, `Q2`, `Q3`, `Q4`, `Custom Date Range`).
28. **Multi-Company Filter Dropdown**: Missing multi-select dropdown to filter dashboard metrics by client company.
29. **Auto-Sync Interval Toggle**: Missing toggle switch to enable 30-second continuous background polling.
30. **Manual Tally Re-Sync Button Loading State**: Button alert triggers native popup; needs inline spinner toast.
31. **"Ingest Bills" File Dropzone Overlay**: Button triggers native file picker; needs drag-and-drop file dropzone.
32. **Clear Outbox Queue Action**: Missing "Purge Completed Sync Commands" quick action button.
33. **Export Dashboard Summary PDF**: Missing "Export Executive Summary PDF" report button.
34. **Export KPI CSV Data**: Missing button to export dashboard KPI metrics into Excel/CSV.
35. **Quick Voucher Entry Trigger**: Missing "Create Manual Entry" quick action button.
36. **Quick Party Ledger Builder Trigger**: Missing "Add New Customer/Vendor" modal trigger.
37. **Bank Feed Upload Modal Trigger**: "Import Bank Feed" relies on alert; needs inline modal trigger.
38. **GST Portal Fetch Trigger**: Missing "Fetch Latest GSTR-2B from Portal" quick button.
39. **Toggle Compact View Layout**: Missing view mode toggle (Standard Cards vs Compact List).
40. **Health Score Category Filter**: Clicking health score categories does not filter recent activity list.
41. **Outbox Status Filter Tabs**: Recent sync outbox list lacks filter tabs (`All`, `Pending`, `Success`, `Failed`).
42. **Search Activity Outbox Bar**: Missing search bar to filter recent sync activity by command ID or type.
43. **Activity Log Timeframe Filter**: Activity list shows top 5; lacks timeframe filter (`Today`, `This Week`, `All`).
44. **Health Optimization Action Buttons**: Health items display status text; lack direct "Fix Now" navigation links.
45. **Sync Queue Retry All Button**: Missing "Retry All Failed Commands" bulk action button.
46. **Company Switcher Quick Links**: KPI cards lack direct click navigation to selected company settings.
47. **Document Queue Quick Filter**: Clicking "Pending OCR" KPI card does not navigate to filtered Documents View.
48. **Unsynced Commands Quick Link**: Clicking "Unsynced Commands" KPI card does not navigate to Sync Center.
49. **GST Mismatch Quick Link**: Clicking GST Health item does not navigate directly to GSTR-2B Mismatch Drawer.
50. **Bank Unreconciled Quick Link**: Clicking Bank Health item does not navigate directly to Bank Reconciliation.

#### Section 3: Missing Charts, Visual Trends & Sparklines (Items 51 – 75)
51. **Sales vs Purchase Trend Bar Chart**: Missing stacked bar chart comparing monthly Sales vs Purchase volume.
52. **Bank Balance Trend Line Chart**: Missing smooth area sparkline chart tracking liquid balance over time.
53. **GST Tax Split Donut Chart**: Missing donut chart displaying CGST, SGST, IGST, and Cess distribution.
54. **Document Processing Speed Velocity Chart**: Missing line chart tracking bills ingested per day.
55. **Sync Success Rate Gauge**: Missing radial progress gauge displaying sync command success percentage.
56. **Party Turnover Leaderboard Bar**: Missing horizontal bar chart ranking top 5 customers by revenue.
57. **Expense Category Breakdown Pie**: Missing pie chart displaying top 5 expense ledger classifications.
58. **Monthly Cash Flow Waterfall Chart**: Missing waterfall chart showing net cash inflow vs outflow.
59. **OCR Confidence Score Histogram**: Missing distribution chart showing AI confidence score brackets.
60. **GSTR-2B Match Status Progress Ring**: Missing ring chart displaying Matched vs Mismatched invoice ratio.
61. **Outbox Processing Queue Timeline**: Missing timeline chart illustrating peak sync command execution hours.
62. **Stock Item Movement Heatmap**: Missing activity heatmap showing daily inventory transactions.
63. **Vendor Compliance Rating Radar**: Missing radar chart evaluating supplier filing timeliness.
64. **Working Capital Ratio Gauge**: Missing gauge chart displaying Current Ratio (Assets / Liabilities).
65. **Days Sales Outstanding (DSO) Metric**: Missing DSO metric tracking average customer payment collection days.
66. **Days Payable Outstanding (DPO) Metric**: Missing DPO metric tracking average supplier payment turnaround days.
67. **Sparkline on Sales KPI Card**: KPI card lacks micro sparkline trend indicator (+12% vs last month).
68. **Sparkline on Purchase KPI Card**: KPI card lacks micro sparkline trend indicator (-5% vs last month).
69. **Sparkline on Bank KPI Card**: KPI card lacks micro sparkline showing 7-day balance trajectory.
70. **Interactive Chart Tooltips**: Missing custom hover tooltips detailing exact monetary amounts on charts.
71. **Chart Legend Toggle Switch**: Charts lack interactive legend toggles to show/hide specific data series.
72. **Chart Zoom & Pan Controls**: Charts lack zoom and reset controls for detailed period inspection.
73. **Export Chart as Image (PNG/SVG)**: Charts lack context menu options to download image previews.
74. **Empty Chart Skeleton State**: Missing animated skeleton loaders while chart data hydrates.
75. **High-DPI Retina Canvas Crispness**: Canvas chart elements lack device pixel ratio scaling for 4K displays.

#### Section 4: Visual Polish, Typography, Accessibility & UX (Items 76 – 100)
76. **Dark Theme OLED Background Alignment**: Ensure panels match deep OLED dark theme variables (`#090d16`).
77. **Metric Card Hover Lift Effect**: Add smooth CSS transform hover lift (`translateY(-2px)`) on KPI cards.
78. **Border Gradient Accents**: Add subtle top border gradient accents to KPI cards (`var(--accent)`).
79. **Contrast Ratio Compliance (WCAG 2.1 AA)**: Ensure muted text color (`#9ca3af`) satisfies AA contrast standards.
80. **Interactive Focus Ring Indicators**: Ensure all action buttons display visible keyboard focus rings (`outline`).
81. **Icon Alignment Invariance**: Standardize icon size (`18px`) and flex alignment across panel headings.
82. **Skeleton Shimmer Loading Cards**: Add skeleton shimmer loading states during initial state hydration.
83. **Empty Outbox State Graphic**: Replace text with custom SVG vector illustration for empty outbox queue.
84. **Animated Health Bar Transitions**: Enforce CSS `transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1)`.
85. **Status Badge Pulse Indicator**: Add subtle pulsing dot (`animation: pulse 2s infinite`) on active sync badges.
86. **Tooltip Hover Explanations**: Add floating tooltips over health score items explaining scoring criteria.
87. **Typography Scale Standardization**: Enforce strict font scale (Headers `18px`, Labels `13px`, Subtext `11.5px`).
88. **Number Formatting Localization**: Format monetary numbers using Indian numbering system (`₹1,00,000` via `en-IN`).
89. **Truncated Command ID Copy Button**: Add click-to-copy button beside truncated command IDs (`ID: vch_8891...`).
90. **Responsive Grid Breakpoints**: Ensure KPI grid collapses smoothly on smaller screen widths (1024px, 768px).
91. **High-Contrast Dark Mode Badges**: Fix badge text colors in dark mode for maximum readability.
92. **ARIA Screen Reader Attributes**: Add `aria-label`, `role="region"`, and `aria-valuenow` attributes to health bars.
93. **Keyboard Navigation Roving Index**: Enable `Tab` and Arrow Key navigation across quick action buttons.
94. **No Horizontal Scrollbar Overflow**: Fix table containers to prevent horizontal scrollbars on desktop viewports.
95. **Consistent Button Border Radii**: Standardize button border radius across all cards (`10px`).
96. **Smooth Refresh Icon Spinner CSS**: Standardize `.spin` animation keyframes (`transform: rotate(360deg)`).
97. **Distinct Success vs Warning Colors**: Ensure green (`#10b981`) and amber (`#f59e0b`) are visually distinct.
98. **Outbox Item Mouse Hover Highlight**: Highlight outbox item rows on mouse hover (`var(--surface-hover)`).
99. **Card Shadows in Light Theme**: Add subtle elevation shadow (`box-shadow: 0 4px 14px rgba(0,0,0,0.04)`) in light mode.
100. **Unsaved Workspace Banner Warning**: Display sticky banner if unposted local vouchers exist in memory.
