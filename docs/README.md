# ReconcAILe Hub

Electron desktop app for an AI accounting workspace that connects to existing accounting software instead of replacing it.

## Current Status

- `10_PART_EXECUTION_PLAN.md` breaks the work into 10 implementation parts.
- `IMPLEMENTATION_PLAN.md` contains the broader product and architecture plan.
- Part 1 is implemented as a real Electron foundation with main, preload and renderer boundaries.
- Part 2 is implemented with local SQLite migrations, device identity, validated connector settings and OS credential availability checks.
- Part 3 is implemented with real Tally HTTP/XML request builders, parser, service layer and IPC endpoints.
- Part 4 is implemented with a local sync outbox, command events and connector runtime execution.
- Part 5 is implemented with backend URL settings, connector pairing client, pairing state and secure token storage.
- Part 6 is implemented with a provider-independent canonical accounting mirror (Companies, Ledgers, Voucher Types, Vouchers, Parties, Units, Inventory Items, Sync Cursors).
- Part 7 is implemented with document ingestion (PDF, Images, CSV, Excel), OCR text parsing, and extracted invoice field preview.
- Part 8 is implemented with AI draft voucher generation, double-entry validation engine (`Taxable + Tax = Total`), and human review/approval workflow.
- Part 9 is implemented with bank statement line transaction parsing, auto-classification, and GSTR-2B matching against accounting mirror books.
- Part 10 is implemented with support-grade system diagnostics export, multi-provider adapter interface (`BusyConnectorAdapter`), and pilot deployment readiness.


## Product Direction

The app should be built around this platform model:

```text
Organization
  -> Workspace
    -> Company
      -> FinancialYear
```

TallyPrime and BUSY should be treated as interchangeable external accounting engines. The app should use a canonical accounting model internally, then map ledgers, parties, inventory items and vouchers to each external provider.

```text
KMP/Desktop App
  -> Cloud API
    -> Accounting Mirror + OCR/AI + Sync Queue
      -> Windows Connector Agent
        -> TallyPrime / BUSY
```

The connector should support:

- Detect accounting software availability.
- Pull companies, masters and vouchers.
- Push approved vouchers and masters.
- Parse provider responses and store raw sync events.
- Use idempotency keys to avoid duplicate vouchers.
- Handle offline queues, retries, conflicts and external changes.

## Local Run

```bash
npm install
npm run rebuild:native
npm run build
npm run electron
```

## Implemented Parts

### Part 1: Electron Desktop Foundation

- Electron main process.
- Secure preload bridge.
- React renderer.
- Strict TypeScript configuration.
- Secure BrowserWindow defaults.
- Typed desktop API exposure.

### Part 2: Local Storage, Settings and Device Identity

- Local SQLite database in Electron user data.
- Schema migrations.
- Stable desktop device identity.
- Connector settings for Tally host, Tally port, local connector enablement, background sync and raw payload retention.
- Workspace and company cache tables ready for real backend data.
- Sync outbox and raw payload tables ready for real connector commands.
- OS credential store wrapper for cloud and connector tokens.
- IPC handlers validate incoming payloads before writing local state.

### Part 3: Tally Connectivity Proof of Concept

- Configurable Tally host and port.
- Real HTTP POST client for Tally XML integration.
- XML builders for company, ledger, voucher type and voucher summary pulls.
- XML parser for Tally collection responses and line errors.
- IPC endpoints for Tally checks and pull operations.
- UI actions that contact the configured Tally endpoint and report real success/failure.

### Part 4: Connector Runtime and Sync Queue

- Local sync outbox table.
- Sync event table.
- Idempotency key generation.
- Command claiming and status transitions.
- Connector runtime that executes queued Tally pull commands.
- UI for queuing and running local sync commands.
- Failure states are stored and shown without fake success.

### Part 5: Cloud Backend and Pairing

- Backend API/WebSocket URL settings.
- Connector pairing state table.
- Real `/connectors/pair` client.
- Pairing response validation.
- Connector device token stored in OS credential storage.
- UI for saving backend settings and pairing a connector.
- Pairing fails honestly unless a real backend responds with connector IDs and token.

### Part 6: Canonical Accounting Mirror

- Provider-independent accounting data tables (`accounting_companies`, `ledgers`, `voucher_types`, `vouchers`, `parties`, `units`, `inventory_items`, `conflict_records`).
- Tally XML collection parsers for parties (Debtors/Creditors), units, and stock items.
- Outbox commands for `PULL_PARTIES`, `PULL_UNITS`, and `PULL_INVENTORY_ITEMS`.
- Interactive canonical mirror data browser with company selector, ledger list, and recent voucher feed.

### Part 7: Document Ingestion and OCR Pipeline

- Document file upload support for PDF, JPG, PNG, CSV, XLS, XLSX.
- Hash-based deduplication and file storage in Electron `userData/documents`.
- Local OCR text extraction worker and `document_extractions` storage table.
- Document state machine (`IMPORTED` → `OCR_PROCESSING` → `EXTRACTED` → `REVIEWED`).
- Structured field extraction model (Party Name, GSTIN, Invoice Number, Invoice Date, Taxable Amount, Tax Breakdown, Total Amount, Confidence Rating).

### Part 8: AI Voucher Drafting and Human Review

- AI Draft Voucher generator mapping document extractions to internal voucher structures.
- Double-entry validation engine checking that Taxable + Tax amounts equal Total Amount.
- Human review screen requiring explicit human approval before vouchers are queued for sync (AI never posts directly without human approval).
- Push Approved Voucher to Tally Outbox pipeline generating Tally-compliant `ALLLEDGERENTRIES.LIST` XML requests.

### Part 9: Bank, GST and Reconciliation

- Bank statement line item parser with transaction auto-classification (Payments, Receipts, Expense categories).
- GSTR-2B portal entry ingestion and books vs 2B matching.
- ITC availability status tracking.
- Reconciliation UI with status indicators (`✓ MATCHED`, `UNRECONCILED`).

### Part 10: Packaging, BUSY Adapter and Pilot Readiness

- Support-grade `DiagnosticsService` exporting process heap memory, OS platform info, database health, and active tables.
- Provider-agnostic `AccountingConnector` interface.
- `BusyConnectorAdapter` implementation for BUSY Accounting integration alongside TallyPrime.
- Fully verified TypeScript and Vite bundle build (`npm run build`).


## Tally Documentation Checked

Connector behavior was aligned with official Tally documentation and recorded in [docs/TALLY_INTEGRATION_NOTES.md](/Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/docs/TALLY_INTEGRATION_NOTES.md).
