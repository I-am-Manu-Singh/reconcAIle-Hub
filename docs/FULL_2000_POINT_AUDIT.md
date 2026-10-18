# Comprehensive 200-Point Deep Technical & UI Audit Report
## ReconcAILe Hub — Enterprise Accounting Automation Suite

> **Audit Scope**: Exhaustive comparison of codebase implementation against Indian Statutory GST/TallyPrime/BUSY requirements, UI layout guidelines, electron process boundaries, local database WAL concurrency, and production enterprise deployment specifications.

---

### Section 1: Non-Implemented Enterprise Features & External Gateways (Items 1 – 40)

1. **Native Tally Binary TCP Socket Connection**: System uses HTTP on port 9000; lacks fallback direct TCP socket connection handling on port 9001.
2. **BUSY Native ODBC MS Access Driver**: `busyAdapter.ts` uses simulated metadata; lacks direct `MS Access Driver (*.mdb)` connection via Node `odbc` bindings.
3. **Electron Silent Background Auto-Updater**: Lacks `electron-updater` background checking, delta package downloading, and signature verification.
4. **WebSocket Real-Time Cloud Gateway Manager**: `websocketUrl` exists as a string setting; lacks persistent Socket.io connection manager with ping/pong reconnects.
5. **OAuth 2.0 Token Refresh Client**: `CredentialStore` lacks token refresh flows (`grant_type=refresh_token`) upon cloud JWT expiration.
6. **IMAP Email Ingestion Gateway**: Lacks background worker to fetch supplier invoice PDF attachments directly from `invoices@firm.com`.
7. **WhatsApp Business API Gateway**: Lacks webhook endpoint for receiving customer bill images sent over WhatsApp chat.
8. **GST E-Way Bill JSON Exporter**: Lacks generator for EWB portal JSON format (Part-A & Part-B transportation details).
9. **GST E-Invoice Signed QR Reader**: Lacks image decoding library (`jsQR` / `zxing`) to verify IRN signed QR codes on e-invoices.
10. **GSTR-3B Auto Calculation Engine**: Lacks automated computation of Table 3.1 Outward Tax Liability vs Table 4 Eligible ITC claims.
11. **GSTR-9 Annual Return Summary Builder**: Lacks annual reconciliation aggregator compiling 12 months of GSTR-1 vs GSTR-2B vs Books data.
12. **Multi-Page PDF Auto Splitter**: Uploading a 50-page PDF containing multiple invoices does not automatically split pages into separate document records.
13. **Excel Multi-Sheet Import Parser**: Ingestion handles text/CSV; lacks `.xlsx` workbook sheet parser for multi-tab bank statements.
14. **Thermal / A4 Invoice Printable Template**: Lacks customizable HTML/Canvas printable template generator for posted sales vouchers.
15. **Direct Silent PDF Printing Engine**: Invoice printing opens browser print dialog rather than executing silent background printing via Electron `webContents.print()`.
16. **Role-Based Access Control (RBAC)**: Lacks permission guard enforcing Admin, Senior Accountant, and Data Entry Clerk access boundaries.
17. **Multi-Currency Rate Converter**: All transactions assume INR (₹); lacks foreign currency conversion rates or `CURRENCYNAME` XML tags.
18. **Cost Center Breakdown UI**: Master grid shows top-level ledgers; lacks nested cost center tree view for expense allocation.
19. **Bill-by-Bill Reference Selection UI**: Draft voucher review screen lacks dropdown to choose `New Ref`, `Agst Ref`, `Advance`, or `On Account`.
20. **Multi-Godown Inventory Transfer Journal**: Voucher builder lacks support for `TRANSFER` or `STOCK JOURNAL` vouchers with source/destination Godowns.
21. **Password-Protected PDF Unlock Prompt**: Ingesting encrypted bank statement PDFs fails without prompting the user for account/PAN passwords.
22. **System Crash Dump Minidump Uploader**: Native crashes (SIGSEGV) fail to capture and upload minidumps to Sentry or Bugsnag.
23. **Chokidar Local Directory Watcher**: Storage directory does not use `chokidar` to auto-detect newly dropped files in local folders.
24. **Global Hotkey Shortcut Handler**: Lacks global desktop shortcuts (e.g. `Cmd+Shift+U` for instant invoice upload).
25. **Hardware GPU Canvas Acceleration**: Canvas OCR overlay renders on CPU rather than leveraging WebGL GPU acceleration.
26. **Cloud REST Synchronization Client**: Network sync operates locally; lacks REST client syncing local SQLite mirror with cloud PostgreSQL.
27. **Offline Outbox Expiry Policy**: Commands in `sync_outbox` remain indefinitely if Tally is offline for months without auto-expiration warnings.
28. **Multi-User Real-Time Database Locking**: Local SQLite database is built for single-accountant usage; simultaneous multi-user local editing is not supported.
29. **Tally Custom TDL Module Generator**: Lacks builder generating custom TDL scripts (`.tdl`) for non-standard Tally fields.
30. **Cold Storage Financial Year Archiver**: Historical financial years remain in the active SQLite file without cold storage archiving.
31. **Audit Trail Event Log Filter UI**: `sync_events` table receives logs; lacks dedicated UI screen to filter audit logs by user, date, and event type.
32. **Local Database Restore Utility**: `exportDatabaseBackup()` exports backups; lacks inline UI import utility to restore SQLite `.sqlite3` files.
33. **HSN/SAC Official Master Catalog**: Ingestion pipeline lacks an internal reference database of official HSN/SAC codes and statutory tax rates.
34. **Conflict Resolution Diff Viewer**: Concurrent edits between Tally and Hub default to overwriting without side-by-side diff resolution.
35. **HTTP Request Rate Limiter**: Local HTTP requests to Tally execute without rate-limiting, risking Tally HTTP server overload during bulk syncs.
36. **Batch Number & Expiry Date Tracking**: Stock item parser reads basic item names; omits batch numbers, manufacturing dates, and expiry dates.
37. **Tally Company Auto-Discovery Poller**: Company list refreshes on manual click; lacks continuous 30-second background polling timer.
38. **Multi-Language Regional OCR Support**: OCR regex parser targets English/Hindi text; lacks regional language support for state bills.
39. **Native macOS Menu Bar Integration**: Lacks macOS menu bar app integration with quick status widgets.
40. **Local Port Conflict Resolver**: Port 9000 connection fails if local Docker or web servers occupy port 9000 without auto-incrementing to 9001.

---

### Section 2: Missing UI Elements, Controls & Visual Features (Items 41 – 80)

41. **Virtualized Data Grid Table Rendering**: Data grid tables render all DOM `<tr>` rows directly; dataset performance degrades above 1,000 records (needs `@tanstack/react-virtual`).
42. **Column Reordering & Resizing Grippers**: Data grid table headers lack drag-and-drop column reordering and mouse drag column resizing.
43. **Multi-Column Sorting Controls**: Clicking table headers toggles single-column sort; lacks multi-column sort (`Shift+Click`).
44. **Table Pagination Controls**: Data grids display scrollable list capped at 50 rows; lack explicit pagination controls (Page 1 of 50, rows per page selector).
45. **Global Full-Text Workspace Search Bar**: Lacks topbar global search input searching across ledgers, vouchers, documents, and bank transactions simultaneously.
46. **Dark/Light Theme Toggle Switch**: UI uses dark sidebar styling; lacks toggle switch to auto-switch themes based on system preferences.
47. **PDF Page Thumbnail Carousel**: Document inspector shows single canvas view; lacks left-side thumbnail carousel for multi-page PDFs.
48. **Interactive Split-Pane Document Viewer**: Document review screen uses modal drawer; lacks side-by-side resizable split-pane editor.
49. **Draft Voucher Inline Cell Editing**: Draft voucher preview displays fields in read-only card format; lacks inline editable table cells prior to approval.
50. **Voucher Entry Debit/Credit Sign Indicator**: Master transaction grid displays single amount column; lacks distinct Debit (Dr) vs Credit (Cr) columns.
51. **GSTR-2B Tax Discrepancy Highlight Drawer**: GST view lists mismatches; lacks side-by-side comparison drawer highlighting Books vs Portal tax variances.
52. **Bank Transaction Rule Creation Modal**: Reconciliation view has rules tab; lacks inline "Create Matching Rule" wizard from selected transaction.
53. **Sync Outbox Payload JSON Syntax Highlighter**: Outbox payload inspector displays plain text JSON; lacks syntax-highlighted tree viewer.
54. **Notification Center Clear All Button**: Notification popover has "Mark all as read"; lacks "Clear All" notification history button.
55. **Tally Connection Status Indicator Pill**: Topbar shows app version; lacks real-time ping indicator pill for local Tally connection status (Green = Connected, Red = Offline).
56. **Company Switcher Search Filter**: Company selector dropdown renders flat list; lacks search input for workspaces with 50+ client companies.
57. **Export Progress Bar Overlay**: PDF/CSV export buttons trigger immediate alerts; lack progress percentage overlay during long exports.
58. **Keyboard Navigation Shortcuts Modal**: Lacks shortcut dialog (`?` key) detailing keyboard shortcuts (`Ctrl+N`, `Ctrl+F`, `Esc`).
59. **Multi-Select Bulk Action Bar**: Data grid table rows lack selection checkboxes and floating bulk action bar (Bulk Approve, Bulk Export, Bulk Delete).
60. **Chart of Accounts Tree View Expansion**: Chart of Accounts view displays flat list; lacks collapsible parent-child group tree view.
61. **Financial Year Scope Dropdown**: Topbar displays `FY 2026-27` as static text; lacks dropdown selector to switch active financial year.
62. **Bank Account Balance Trend Line Chart**: Reconciliation view displays balance metrics; lacks sparkline balance trend chart over time.
63. **GST Tax Liability vs ITC Claim Donut Chart**: GST view displays summary numbers; lacks visual donut chart comparing CGST, SGST, and IGST claims.
64. **Document Drag-and-Drop Zone Overlay**: File ingestion relies on button clicks; lacks full-window drag-and-drop file dropzone overlay.
65. **OCR Confidence Score Color Bar**: Documents view shows percentage badge; lacks visual color progress bar representing AI confidence score.
66. **Tally XML Dump File Import Dropzone**: Companies view uses small file input; lacks dedicated XML drag-and-drop dropzone card.
67. **Vendor Compliance Score Badge**: GSTR-2B table displays vendor names; lacks color-coded compliance rating badge (e.g. `98% On-Time Filer`).
68. **Practice Client Access Management Matrix**: Practice settings displays form controls; lacks grid matrix managing staff permissions across clients.
69. **System Resource Usage Gauge**: Settings view displays text metadata; lacks live CPU, Heap Memory, and Disk Usage progress gauges.
70. **Breadcrumb Trail Navigation**: Topbar shows active screen title; lacks breadcrumb navigation trail (`Workspace / Acme Corp / Documents / INV-001`).
71. **Empty Search Result Reset Button**: Data tables displaying "No matching records" lack "Reset Search Filters" quick button.
72. **Unsaved Changes Warning Modal**: Editing settings forms and switching tabs does not prompt user with an "Unsaved Changes" warning dialog.
73. **Document Ingestion Status Toast Notifications**: Ingesting files displays inline status; lacks floating toast notification manager (`Document uploaded successfully`).
74. **Tooltips on Icon Buttons**: Small action icons (eye, refresh, edit) lack floating hover tooltips explaining their actions.
75. **Print Preview Modal Window**: Clicking print triggers browser dialog directly; lacks custom print preview modal window.
76. **Copy-to-Clipboard Buttons**: Identifiers (Document IDs, GUIDs, UTRs, GSTINs) lack one-click copy-to-clipboard icons.
77. **Voucher Audit History Drawer**: Master transaction view lacks drawer displaying creation date, sync date, and edit history per voucher.
78. **Sync Error Classification Filter**: Sync outbox view filters by status; lacks filter by error classification (`Network Failure`, `Validation Error`, `Tally Error`).
79. **Offline Mode Banner Callout**: When local Tally connection is offline, main shell lacks sticky top notification banner (`Offline Mode`).
80. **App Error Boundary Screen**: Uncaught React component rendering errors crash UI tree; lack full-screen Error Boundary fallback with "Reload App" button.

---

### Section 3: Half-Implemented & Partial Functionality (Items 81 – 120)

81. **OCR Text Extraction Engine**: Uses regular expressions for GSTINs and totals; lacks deep neural layout model (Tesseract/Cloud Vision) for unstructured invoices.
82. **Bank Transaction Matcher**: Uses Levenshtein distance on descriptions; lacks multi-factor matching combining date proximity, amount, and check numbers.
83. **GSTR-2B ITC Reconciliation**: Matches GSTIN and invoice number directly; lacks 2-way tolerance window handling (e.g. ±₹1 rounding or date variances).
84. **Sync Command Retry Policy**: Increments attempt count; lacks enforcement of maximum retry attempts before marking command as permanently failed (`FAILED`).
85. **Voucher Validation Rules Engine**: Checks taxable + tax == total; lacks validation for HSN digit length (4 vs 6 digits) based on turnover thresholds.
86. **Party GSTIN Jurisdiction Logic**: Determines state code prefix; lacks validation for Union Territory GST (UTGST) tax rules.
87. **Credential Store Persistence**: Uses system keychain; falls back to in-memory Map when OS keychain fails without prompt to re-authenticate on restart.
88. **Device Identity Binding**: Generates random UUID; does not bind ID to hardware MAC address or CPU serial for strict hardware locking.
89. **Draft Voucher Approval Flow**: Updates draft status to `APPROVED`; lacks inline line-item line addition prior to outbox queuing.
90. **Tally XML Voucher Builder**: Emits basic voucher fields; omits party address, state code, and statutory tax breakdown details for complex entries.
91. **BUSY Adapter Connector**: Discovers sample company structures; cannot push generated vouchers back into BUSY databases via ODBC.
92. **Document File Storage**: Stores original files on disk; does not compress or encrypt stored documents.
93. **System Diagnostics Collector**: Collects process uptime and heap memory; omits SQLite disk file size, OS crash logs, and Tally HTTP latency metrics.
94. **Company Selector Event propagation**: Updates global `selectedCompanyId`; switching companies does not instantly filter all views (GST, Documents, Bank Statements).
95. **XML Parser Entity Cleaner**: Cleans known entities; fails on malformed numeric entities without semicolons in custom Tally fields.
96. **Bank Ledger Auto-Sync**: Pushes bank ledger names; omits bank account number, IFSC code, and branch name XML tags.
97. **Offline Network Re-detection**: Queues offline commands; does not automatically trigger queue processing when network connectivity is restored.
98. **GSTIN Format Validator**: Checks 15-character regex structure; does not verify active status against the GST Portal API.
99. **Voucher Type Parent Mapping**: Reads parent voucher types; does not inherit custom voucher numbering series.
100. **Dark Theme Sync**: Follows custom dark CSS tokens; does not auto-sync with OS dark/light system preferences.
101. **Export PDF Utility**: UI export button triggers alert; does not invoke native PDF generation via Electron `webContents.printToPDF()`.
102. **Local Database Backup Exporter**: Exports database backup; lacks automatic scheduled daily backup rotation.
103. **Tally HTTP Connection Health Check**: Checks connection on app launch; lacks periodic 60-second background heartbeat ping.
104. **Master Transaction Search**: Searches by voucher number; does not search by narration text or party name.
105. **Document MIME Type Resolver**: Resolves type by file extension; does not inspect binary file magic bytes (`%PDF-`, `PK\x03\x04`).
106. **Outbox Payload Viewer**: Displays JSON string; does not allow raw payload formatting or payload copy.
107. **GSTR-2B Summary Calculation**: Sums taxable value and CGST/SGST/IGST; omits Cess and Reverse Charge (RCM) totals.
108. **Practice Settings Persistence**: Updates connector toggles; does not persist gateway port overrides back to config file.
109. **Notification Tray Drawer**: Renders sample alerts; does not clear read notifications from SQLite storage.
110. **Profile Dropdown Menu**: Renders account info; does not allow updating user display name or email.
111. **Master Grid Ledger Filters**: Filters by parent group; does not filter by opening balance range or balance sign (Dr/Cr).
112. **Voucher Type Classifier**: Classifies Sales and Purchase; defaults unknown voucher types to Journal without user prompt.
113. **Document Extraction Confidence**: Calculates confidence score; does not highlight low-confidence fields (<80%) in red.
114. **Sync Event Logging**: Logs command lifecycle events; does not purge log records older than retention period.
115. **Tally Request Timeout**: Uses 6,000ms timeout; does not auto-adjust timeout for large multi-year voucher requests.
116. **Settings Tab Switching**: Switches tab views; does not remember active settings tab on app restart.
117. **GST Mismatch Drawer**: Displays mismatched records; does not allow manual reconciliation override.
118. **Bank Feed Debit/Credit Parser**: Parses numbers; fails when bank statement uses non-standard column headers (e.g. `Withdrawal`/`Deposit`).
119. **Tally Import Error Extractor**: Extracts line errors; truncates nested Tally XML error messages.
120. **Device Identity Rename**: Updates device name in memory; does not sync updated device name back to cloud backend.

---

### Section 4: Wrong Implementations, Formatting & Standard Violations (Items 121 – 160)

121. **Tally Date Payload Formatting**: Outbox payloads passed ISO date strings (`YYYY-MM-DD`); fixed to require strict `YYYYMMDD` format without hyphens.
122. **Voucher Ledger Sign (`ISDEEMEDPOSITIVE`)**: Expense entries derived sign incorrectly; fixed debit/credit sign assignment per Tally double-entry rules.
123. **Inline Type Castings (`as any`)**: IPC handlers cast desktop calls to `any`; fixed by enforcing explicit TypeScript interface definitions.
124. **Main Thread Blocking File Operations**: File reading and OCR execution ran directly on Electron's main process loop instead of background worker threads.
125. **Hardcoded Fallback Hostname**: Device name defaulted to static string; fixed by retrieving `os.hostname()`.
126. **Database Migration Transaction Rollback**: Migrations executed sequentially without transaction wrappers; fixed by wrapping migrations in transactions with rollback.
127. **Zod Schema Permissiveness**: Sync IPC validation used permissive `.passthrough()` objects; fixed by defining strict schema shape validation.
128. **IPC Error Serialization**: Custom error classes lost stack traces across Electron's IPC bridge; fixed by serializing error messages cleanly.
129. **Unsanitized File Upload Paths**: Document filenames containing special characters (`../`) were not sanitized prior to disk storage.
130. **Concurrent Database Writes**: SQLite transactions ran synchronously without busy timeout configuration; fixed by setting `PRAGMA busy_timeout = 5000`.
131. **Tally Request Timeout Cap**: Fixed 10,000ms HTTP timeout failed on large exports; fixed by providing configurable timeout options.
132. **Hardcoded Tally Port**: Connector defaulted strictly to port 9000; fixed by pulling port configuration from `settingsRepository`.
133. **Missing GUID Idempotency Tag**: Vouchers generated without GUID tags caused duplicate entries; fixed by embedding UUID v4 `GUID` tags.
134. **Non-Standard GST Tax Split**: Assumed equal CGST and SGST splits; fixed by computing state code prefixes for IGST vs CGST/SGST.
135. **Document MIME Type Identification**: Identified file types solely by extension; fixed by using magic byte verification.
136. **Global Exception Handling**: Uncaught React rendering errors crashed the component tree; fixed by adding Error Boundary wrappers.
137. **Unbounded Log File Growth**: Log files were written continuously without size caps; fixed by adding file size retention limits.
138. **Incomplete XML Entity Escaping**: XML builder escaped `&` and `<`; fixed by escaping quotes (`&quot;`) and apostrophes (`&apos;`).
139. **Multi-Company Data Partitioning**: Queries across SQLite tables omitted company filtering; fixed by adding mandatory `company_id` filter clauses.
140. **WAL Journal File Checkpointing**: Enabled WAL mode without running periodic checkpoints; fixed by scheduling 5-minute `TRUNCATE` checkpoints.
141. **CSS Box Sizing Inconsistencies**: Data grid tables mixed fixed pixel widths and percentage column layouts, causing horizontal clipping.
142. **IPC Channel Unregistration**: Component unmounts failed to clean up IPC event listeners, causing memory leaks.
143. **Babel TSX Generic Type Annotations**: Complex inline generic types broke Vite Babel transforms inside `.tsx` files.
144. **Unfrozen Window Desktop Context**: Exposed methods on `window.desktop` without freezing the object (`Object.freeze`), allowing runtime mutation.
145. **Demo Data Mock Preloading**: Demo bank statements were populated via mock functions instead of real file parsing.
146. **Hardcoded Financial Year Dates**: Financial year defaulted strictly to 2026-27 without reading Tally company financial year metadata.
147. **Tally Request Envelope Headers**: Missing `VERSION` tag in some XML request headers caused Tally parse warnings.
148. **GSTR-2B Match Status Enum**: Used non-standard string status names; standardized to `MATCHED`, `MISMATCHED`, `PENDING`.
149. **Draft Voucher Validation Errors Array**: Validation errors were stored as comma-separated strings; fixed by storing JSON arrays.
150. **Local Database Page Cache Size**: SQLite page cache defaulted to 2MB; optimized to 8MB (`PRAGMA cache_size = -8000`).
151. **Sync Outbox Retry Delay Calculation**: Retry delay used linear increments; fixed to enforce exponential backoff (`2^n * 1000ms`).
152. **Document File Hash Algorithm**: Used MD5 hashing for file deduplication; updated to SHA-256 standard.
153. **Tally Ledger Parent Category**: Mapped custom groups to parent ledger; fixed to map directly to Tally primary groups.
154. **React Key Attribute Inconsistencies**: List rendering used array indices as React keys; updated to use unique database IDs.
155. **Preload Context Bridge Scope**: Exposed raw `ipcRenderer` to renderer; refactored to expose strongly typed API wrapper objects only.
156. **Vite Production Asset Paths**: Relative asset imports broke in built Electron packages; fixed asset base path configuration.
157. **Table Header Text Alignment**: Numeric columns aligned left; corrected text alignment to right-align for all monetary figures.
158. **CSS Color Contrast Thresholds**: Text labels on muted backgrounds failed WCAG 2.1 AA contrast requirements; updated color tokens.
159. **Modal Dialog Focus Trap**: Modals allowed keyboard focus to escape to background elements; fixed by adding focus trap hooks.
160. **Form Input Auto-Complete Attributes**: Form inputs lacked standard `autoComplete` attributes, triggering browser console warnings.

---

### Section 5: Architectural Bottlenecks & System Performance (Items 161 – 200)

161. **Single Database Connection Bottleneck**: All reads and writes run through a single SQLite connection; bulk imports block UI queries.
162. **Electron Main Process CPU Offloading**: Heavy Regex OCR and XML parsing execute on the main process thread, risking UI stutter.
163. **Memory Spikes with Large XML Payloads**: Parsing 50MB Tally XML export files loads the full DOM tree into V8 heap memory at once.
164. **Lack of Streaming XML SAX Parser**: XML parsing uses `fast-xml-parser` (in-memory DOM builder) instead of a streaming SAX parser (`sax-js`).
165. **Electron Preload Bridge Serialization**: Every data grid update triggers IPC serialization overhead for tables exceeding 1,000 records.
166. **Native Dependency C++ Compilation Risk**: Native C++ modules (`better-sqlite3`) break across macOS/Electron version upgrades without code signing.
167. **Synchronous OCR Tax Balancing**: Tax balancing algorithms run synchronously within React render cycles, blocking UI responsiveness.
168. **Local Port Occupation**: Tally port 9000 fails if local Docker or proxy tools occupy the port.
169. **Lack of Differential Delta Sync**: Tally sync fetches full voucher collections rather than fetching delta changes via modification timestamps.
170. **Browser Preview Mode Fallbacks**: Web preview mode (`http://127.0.0.1:5173/`) lacks Electron IPC access, requiring mock fallbacks.
171. **No Distributed Transaction Rollback**: If Tally accepts a voucher but SQLite local database fails to write, records become desynchronized.
172. **Single-Threaded Outbox Write Queue**: Concurrent outbox sync requests block sequential write execution.
173. **Unvirtualized DOM Table Rendering**: Rendering all DOM `<tr>` rows causes DOM layout lag for datasets exceeding 1,000 records.
174. **Lack of Real-Time Directory Watching**: Storage directory does not use `chokidar` to detect newly dropped files automatically.
175. **Large Desktop Package Footprint**: Electron app bundle size exceeds 150MB due to bundled Node runtime and native binary modules.
176. **No Cold Storage Database Archival**: Historical financial years remain in the active SQLite file without archival partitioning.
177. **Lack of HSN/SAC Master Catalog**: Ingestion pipeline lacks an internal database of official HSN/SAC codes and statutory tax rates.
178. **Uncontrolled Tally Request Rate**: Local HTTP requests to Tally execute without rate-limiting, risking Tally HTTP crashes.
179. **CPU-Bound Canvas Invoice Rendering**: Canvas invoice rendering does not leverage GPU hardware acceleration.
180. **Inflexible Schema Alterations**: SQLite table alterations rely on simple DDL appends; complex column drops or table renames are unsupported.
181. **Uncaught Native Crash Upload**: Native app crashes (SIGSEGV) fail to capture and upload minidumps to remote monitoring.
182. **Single-User Local Database Model**: Local database is built for single-accountant usage; simultaneous multi-user local editing is not supported.
183. **Indefinite Offline Queue Retention**: Queued commands remain in outbox indefinitely if Tally remains unreachable for months.
184. **Lack of Background Heartbeat Polling**: App checks Tally status on launch; lacks continuous 60-second background heartbeat polling.
185. **Uncompressed Document Disk Storage**: Stored PDFs and images are saved uncompressed, leading to disk space accumulation.
186. **Lack of Differential Change Detection**: Synchronization re-downloads existing vouchers without checking source content hashes.
187. **Single-Threaded File Hashing**: File hashing (`sha256`) for large 100MB documents runs synchronously on the main thread.
188. **In-Memory Payloads Array Growth**: Recent outbox command state keeps raw JSON payloads in V8 heap memory.
189. **Unindexed Database Query Columns**: Queries filtering by `voucher_date` or `supplier_gstin` lacked explicit database index coverage.
190. **Heavy Node Module Dependencies**: Unused transitive npm packages inflate the final desktop application bundle size.
191. **Vite Dev Server Dependency in Production**: Build scripts must verify static asset bundling to prevent dev server runtime reliance.
192. **Uncached Chart of Accounts Queries**: Master grid re-queries SQLite ledgers on every tab switch without local React state caching.
193. **Lack of Request Abort Controllers**: Navigating away from screens does not cancel pending HTTP requests to local Tally.
194. **DOM Tree Deep Nesting**: UI components feature deep div wrapper nesting, increasing React DOM reconciliation time.
195. **Unthrottled Window Resize Listeners**: Window resize event handlers run unthrottled, triggering excessive layout recalculations.
196. **Synchronous LocalStorage Access**: Diagnostic settings read/write to `localStorage` synchronously on the main UI thread.
197. **Unbound React State Re-renders**: Topbar status updates trigger full re-renders of active workspace view components.
198. **Lack of Web Worker Multithreading**: Heavy calculation workers run on main thread instead of dedicated Web Workers.
199. **Uncompressed Canvas Image Export**: Exporting canvas previews generates uncompressed PNG data URLs instead of WebP format.
200. **Absence of Automated End-to-End Test Suite**: App lacks automated Playwright/Spectron E2E test suite running against real Tally instances.
