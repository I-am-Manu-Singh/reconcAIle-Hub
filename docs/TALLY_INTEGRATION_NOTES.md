# TallyPrime Integration Notes

This file records the connector behavior verified against official Tally documentation.

## Officially Verified Behavior

- TallyPrime supports XML integration over HTTP.
- TallyPrime can act as an HTTP server for external XML requests.
- The HTTP server must be enabled in TallyPrime settings.
- The common/default HTTP port is `9000`.
- External applications POST XML to `http://<Tally-IP>:9000`.
- XML requests use an `ENVELOPE` root with `HEADER` and `BODY`.
- Request headers identify:
  - `VERSION`
  - `TALLYREQUEST`
  - `TYPE`
  - `ID`
- Response headers include `STATUS`, where `1` means success and `0` means failure.
- Export requests can target `DATA`, `COLLECTION`, `OBJECT` or `FUNCTION`.
- Import requests use `Import Data` style payloads for masters and vouchers.
- Ledger creation requires at minimum:
  - `LEDGER`
  - `NAME`
  - `PARENT`
- Dependent masters must already exist before importing transactions.
- Voucher dates must use `YYYYMMDD`.
- Voucher debit and credit totals must balance.
- Tally import responses report created, altered, deleted, combined, ignored, errors and last voucher/master IDs.
- Tally Connector in TallyPrime Developer can be used to manually test JSON/XML requests against TallyPrime.

## Connector Rules For This App

1. Treat HTTP success as transport success only.
2. Parse Tally response `STATUS` and import counters before marking a sync command successful.
3. Keep raw request and response payloads for support/debugging.
4. Do not retry create commands blindly after uncertain network failure.
5. Do not create vouchers until required ledgers, voucher types and tax ledgers are verified.
6. Use XML first for compatibility.
7. Add JSON later only as a provider capability for newer TallyPrime releases.

---

## Implementation Status & Code Links Matrix

| Integration Rule | Status | Code Implementation Link | Verification & Technical Details |
| :--- | :---: | :--- | :--- |
| **1. HTTP Transport Separation** | ✅ Implemented | [tallyHttpClient.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/tally/tallyHttpClient.ts#L10-L44) | Native `fetch` with `AbortController` signal timeout handling. |
| **2. Response Status & Counter Parsing** | ✅ Implemented | [tallyXmlParser.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/tally/tallyXmlParser.ts#L145-L173) & [connectorRuntime.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/connector/connectorRuntime.ts#L137-L140) | Verifies `STATUS = 1` and `errorsCount === 0` before marking commands as `SUCCESS`. |
| **3. Raw Payload Auditing** | ✅ Implemented | [rawPayloadRepository.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/local-db/rawPayloadRepository.ts) | Stores raw request XML and response XML per command in SQLite `raw_payloads` table. |
| **4. Idempotent Retry Protection** | ✅ Implemented | [syncRepository.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/local-db/syncRepository.ts#L77-L89) | SHA-256 payload idempotency key hashing prevents duplicate command execution. |
| **5. Master & Ledger Pre-verification** | ✅ Implemented | [documentRepository.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/local-db/documentRepository.ts#L244-L253) | Validates party name, tax slab, and ledger presence before queueing draft vouchers. |
| **6. Canonical Tally XML Builder** | ✅ Implemented | [tallyXmlBuilder.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/tally/tallyXmlBuilder.ts) | Formats dates as `YYYYMMDD`, sets `ISDEEMEDPOSITIVE`, and escapes XML special characters. |
| **7. Multi-ERP Adapter Extension** | ✅ Implemented | [busyAdapter.ts](file:///Users/manpreet/Desktop/VSCodeProjects/TallyPlugin/electron/main/connector/busyAdapter.ts) | Establishes provider-agnostic `AccountingConnector` interface for BUSY and future ERP engines. |

---

## Official References

- [Tally XML Integration](https://help.tallysolutions.com/xml-integration/)
- [Tally Sample XML](https://help.tallysolutions.com/sample-xml/)
- [Tally Connector](https://help.tallysolutions.com/tally-prime-developer-tools/tally-connector/)
- [Pre-requisites for Integrations](https://help.tallysolutions.com/pre-requisites-for-integrations/)
- [Import Data from XML or JSON](https://help.tallysolutions.com/import-data-from-xml-or-json/)
