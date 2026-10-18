# 100-Point Deep Technical UI Audit: CompaniesView.tsx
## ReconcAILe Hub — Multi-Tenant Company Management & Connector Outbox

> **Audit Scope**: Comprehensive technical and UI inspection of `CompaniesView.tsx`, evaluating company registration, XML backup imports, ERP endpoint configurations, outbox queue actions, payload inspections, error classification, and practice workspace boundaries.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: Enterprise Company Master Management & Metadata** | Items 1 – 25 | 🔴 High | Add Company Financial Year metadata, State Code Prefix, GSTIN validation indicator, Books Beginning Date, and Tally GUID. |
| **Section 2: Interactive Toolbar, Search, Filters & Bulk Actions** | Items 26 – 50 | 🟡 Medium | Add Search input filter, ERP Provider Filter (`Tally`, `BUSY`), Connection Status Filter (`Active`, `Inactive`), and Bulk Re-Sync button. |
| **Section 3: Outbox Queue Management & Payload Inspector** | Items 51 – 75 | 🟡 Medium | Add Outbox Status Filter (`PENDING`, `SUCCESS`, `FAILED`), Raw Payload Syntax-Highlighted XML/JSON Inspector Modal, and Retry All Failed Commands button. |
| **Section 4: Visual Polish, UX, Badges & Accessibility** | Items 76 – 100 | 🟢 Polish | Fix button hover states, add click-to-copy company ID, enforce dark mode contrast, add skeleton loading state, and ARIA screen reader attributes. |

---

### Detailed 100-Item Breakdown

#### Section 1: Enterprise Company Master Management & Metadata (Items 1 – 25)
1. **State Code Prefix Display**: Show state code prefix (e.g. `27` for Maharashtra, `29` for Karnataka) on company cards.
2. **Books Beginning Date**: Display official accounting books starting date (`01-Apr-2026`).
3. **GSTIN Validity Indicator**: Show green checkmark icon badge for validated 15-digit GSTINs.
4. **ERP Provider Version Badge**: Display detected ERP build version (e.g. `TallyPrime v4.1`, `BUSY 21`).
5. **Tally Unique Company GUID**: Display company Tally GUID identifier with copy-to-clipboard button.
6. **Total Ledger Count Badge**: Show number of active ledgers synced per company.
7. **Total Voucher Count Badge**: Show total number of vouchers mirrored per company.
8. **Last Synced Timestamp**: Display human-readable relative time (`Synced 5 mins ago`).
9. **Primary Bank Account Indicator**: Show configured primary bank account ledger name.
10. **Company Address Metadata**: Display registered pincode, city, and state details.
11. **Statutory Tax Registration Type**: Display GST registration type (`Regular`, `Composition`, `SEZ`).
12. **Financial Year Active Status**: Display active financial year period badge (`FY 2026-27`).
13. **Local HTTP Port Indicator**: Show active connection port per company (`Port 9000`).
14. **Direct XML Import Dropzone**: Add drag-and-drop XML backup file dropzone card.
15. **Company Archival Status**: Display active vs archived workspace status.
16. **Multi-User Lock Indicator**: Display lock status if another accountant is editing the company.
17. **Company Logo / Avatar Icon**: Display custom company initial avatar badge.
18. **Sync Error Count Badge**: Show number of failed sync commands associated with each company.
19. **Default Voucher Type Config**: Display default sales/purchase voucher type series name.
20. **Cost Center Enabled Flag**: Show status badge if cost center tracking is active.
21. **Bill-by-Bill Enabled Flag**: Show status badge if bill-by-bill reference tracking is active.
22. **Auto-Sync Interval Status**: Show configured background auto-sync interval (e.g. `Every 5m`).
23. **Data Mirror Storage Footprint**: Display SQLite storage size occupied per company (MB).
24. **Cloud Mirror Sync Status**: Display cloud PostgreSQL synchronization state (`In Sync`, `Pending Cloud Sync`).
25. **Company Quick Switch Action**: Add "Set as Active Workspace Company" button on company cards.

#### Section 2: Interactive Toolbar, Search, Filters & Bulk Actions (Items 26 – 50)
26. **Search Input Bar**: Add search input filtering companies by name, GSTIN, or ID.
27. **ERP Provider Filter Dropdown**: Add filter dropdown for ERP provider (`All`, `Tally`, `BUSY`).
28. **Status Filter Dropdown**: Add status filter (`All`, `Active Workspace`, `Inactive`).
29. **"Sync All Companies" Trigger**: Add topbar button to re-sync all connected company caches.
30. **"Add New Company" Wizard Trigger**: Add button opening new company registration wizard modal.
31. **XML Master Backup Importer**: Add button to import Tally `Master.xml` backup files directly.
32. **XML Voucher Backup Importer**: Add button to import Tally `DayBook.xml` backup files directly.
33. **Bulk Re-Sync Selected**: Add selection checkboxes and bulk re-sync button.
34. **Bulk Archive Selected**: Add selection checkboxes and bulk archive button.
35. **Export Companies List CSV**: Add button to export registered companies list to CSV.
36. **Company Detail Inspection Modal**: Add modal drawer inspecting full raw company JSON schema.
37. **Tally Connection Diagnostics Trigger**: Add button to run Tally connection diagnostic ping on selected company.
38. **Edit Company Settings Trigger**: Add button opening company configuration settings drawer.
39. **Delete / Disconnect Company Action**: Add button to un-pair or disconnect client company with confirm dialog.
40. **Toggle Compact Table View**: Add toggle switch between Card Grid and Compact Table view.
41. **Company Sorting Controls**: Add sort dropdown (`Name A-Z`, `Last Synced`, `Voucher Count`).
42. **Outbox Filter Tabs**: Add tabs in Outbox tab (`All`, `Pending`, `Success`, `Failed`).
43. **Outbox Command Type Filter**: Add filter dropdown by command type (`VOUCHER_CREATE`, `PULL_LEDGERS`).
44. **Outbox Search Input Bar**: Add search input filtering outbox by Command ID or error message.
45. **Run Batch Outbox Execution**: Add button to execute all pending outbox commands sequentially.
46. **Retry Failed Outbox Commands**: Add button to re-queue all failed outbox commands.
47. **Purge Completed Outbox Commands**: Add button to clear all successfully executed outbox records.
48. **Outbox Payload Copy Button**: Add button to copy raw command payload JSON to clipboard.
49. **Outbox Execution Latency Display**: Display time taken for Tally to execute command (ms).
50. **Auto-Refresh Outbox Toggle**: Add 5-second auto-refresh toggle switch for outbox monitoring.

#### Section 3: Outbox Queue Management & Payload Inspector (Items 51 – 75)
51. **Raw Payload XML/JSON Inspector Modal**: Modal inspecting full raw request XML and response XML per command.
52. **Syntax-Highlighted Payload Viewer**: Highlight XML tags and JSON keys in payload inspector.
53. **Command Attempt Counter Badge**: Show current attempt count (e.g. `Attempt 2 of 5`).
54. **Exponential Backoff Delay Badge**: Display calculated retry backoff delay (seconds).
55. **Tally Error Message Extractor**: Display extracted Tally XML error response text cleanly.
56. **Idempotency Key Display**: Display SHA-256 idempotency key generated for the command.
57. **Command Created Timestamp**: Display exact ISO timestamp when command was queued.
58. **Command Executed Timestamp**: Display exact ISO timestamp when command finished.
59. **Source Module Origin Tag**: Display originating module tag (`Invoice OCR`, `Bank Feed`, `Manual`).
60. **Command Priority Indicator**: Display priority badge (`High`, `Normal`, `Low`).
61. **Manual Command Cancellation**: Add button to cancel pending queued command before execution.
62. **Edit Command Payload Action**: Add capability to tweak draft JSON payload before retrying failed command.
63. **Re-queue Single Command Action**: Add one-click "Retry Command" button per outbox row.
64. **Export Outbox Log CSV**: Add button to export sync outbox log history to CSV.
65. **Filter Outbox by Date Range**: Add start date and end date picker controls for outbox history.
66. **Tally HTTP Port Inspector**: Display target HTTP host/port used during execution.
67. **Response Status Code Badge**: Display HTTP response status code (`200 OK`, `500 Error`).
68. **Xml Response Import Counters**: Display `Created`, `Altered`, `Deleted`, and `Errors` counters from Tally XML.
69. **Download Raw Payload XML File**: Add button to download request XML payload file.
70. **Download Tally Response XML File**: Add button to download Tally response XML file.
71. **Outbox Queue Empty State Illustration**: Display custom empty outbox vector graphic.
72. **Outbox Execution Progress Bar**: Display progress percentage overlay during batch outbox runs.
73. **Filter Outbox by Target Company**: Dropdown filtering outbox commands by client company.
74. **Command Retries Left Badge**: Display remaining retries count before permanent failure.
75. **Outbox Audit Event Log Link**: Direct click link opening detailed `sync_events` audit trail.

#### Section 4: Visual Polish, UX, Badges & Accessibility (Items 76 – 100)
76. **Dark Mode OLED Background Alignment**: Ensure panels match deep OLED dark theme variables (`#090d16`).
77. **Company Card Hover Elevation**: Add smooth CSS transform hover lift (`translateY(-2px)`) on company cards.
78. **Active Workspace Border Highlight**: Add prominent teal border accent on active workspace company card.
79. **Click-to-Copy Company ID**: Add click-to-copy button for company ID and GSTIN.
80. **Contrast Ratio Compliance (WCAG 2.1 AA)**: Ensure muted text color (`#9ca3af`) satisfies AA contrast.
81. **Status Badge Pulse Indicator**: Add pulsing green dot (`animation: pulse 2s infinite`) for connected companies.
82. **Skeleton Shimmer Loading Cards**: Add skeleton shimmer loading states during initial state hydration.
83. **Interactive Focus Ring Indicators**: Ensure all buttons display visible keyboard focus rings (`outline`).
84. **Tooltip Hover Explanations**: Add floating tooltips over company action icons explaining their behavior.
85. **Typography Scale Standardization**: Enforce strict font scale (Headers `18px`, Labels `13px`, Subtext `11.5px`).
86. **ARIA Screen Reader Attributes**: Add `aria-label`, `role="region"`, and `aria-selected` attributes.
87. **Truncated ID Copy Feedback**: Display inline "Copied!" checkmark feedback on ID copy click.
88. **Responsive Card Grid Breakpoints**: Ensure company cards collapse smoothly on smaller desktop screens.
89. **High-Contrast Dark Mode Badges**: Fix badge text colors in dark mode for maximum readability.
90. **Keyboard Navigation Roving Index**: Enable `Tab` key navigation across tab navigation toolbar.
91. **No Horizontal Scrollbar Overflow**: Fix table containers to prevent horizontal scrollbars on desktop viewports.
92. **Consistent Button Border Radii**: Standardize button border radius across all cards (`10px`).
93. **Smooth Refresh Spinner CSS**: Standardize `.spin` animation keyframes (`transform: rotate(360deg)`).
94. **Distinct Provider Color Badges**: Tally (Teal `#0d9488`), BUSY (Blue `#2563eb`), Zoho (Purple `#7c3aed`).
95. **Company Card Mouse Hover Highlight**: Highlight company card background on mouse hover (`var(--surface-hover)`).
96. **Card Shadows in Light Theme**: Add elevation shadow (`box-shadow: 0 4px 14px rgba(0,0,0,0.04)`) in light mode.
97. **Empty Search Results Illustration**: Display clean vector illustration when search returns zero companies.
98. **Outbox Row Hover Highlight**: Add subtle background hover highlight on outbox table rows.
99. **Tab Badge Count Formatting**: Format tab count badges (`Connected Companies (2)`, `Outbox (15)`).
100. **Unsaved Settings Warning Banner**: Display sticky banner if modified company settings exist in draft state.
