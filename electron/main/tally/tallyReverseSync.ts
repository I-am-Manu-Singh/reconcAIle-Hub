import type { LocalDatabase } from "../local-db/database.js";
import type { TallyService } from "./tallyService.js";
import crypto from "node:crypto";

export type ReverseSyncResult = {
  readonly companyName: string;
  readonly vouchersSynced: number;
  readonly ledgersSynced: number;
  readonly syncedAt: string;
};

/**
 * Reverse Synchronization Engine (Tally/BUSY -> Accounting Mirror)
 * Periodically pulls newly created or modified vouchers directly from local ERP
 * and updates local SQLite tables (vouchers, ledgers) for full bi-directional parity.
 */
export class TallyReverseSyncEngine {
  public constructor(
    private readonly database: LocalDatabase,
    private readonly tallyService: TallyService,
  ) {}

  public async syncCompanyReverse(companyName: string, fromDate?: string, toDate?: string): Promise<ReverseSyncResult> {
    const now = new Date().toISOString();
    const effectiveFrom = fromDate ?? `${new Date().getFullYear()}-04-01`;
    const effectiveTo = toDate ?? now.substring(0, 10);

    const companyId = crypto.createHash("sha256").update(`company:TALLY:${companyName}`).digest("hex");

    // Pull Vouchers from Tally for date range
    const voucherResult = await this.tallyService.listVoucherSummaries(companyName, effectiveFrom, effectiveTo);
    let vouchersSynced = 0;

    if (voucherResult.ok && voucherResult.data) {
      const stmt = this.database.prepare(
        `INSERT INTO vouchers (
          id, company_id, voucher_date, voucher_type_name, voucher_number,
          narration, source_provider, source_hash, created_at, updated_at
        ) VALUES (
          @id, @companyId, @voucherDate, @voucherTypeName, @voucherNumber,
          @narration, 'TALLY', @sourceHash, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          voucher_date = excluded.voucher_date,
          voucher_type_name = excluded.voucher_type_name,
          voucher_number = excluded.voucher_number,
          narration = excluded.narration,
          updated_at = excluded.updated_at`
      );

      const transaction = this.database.transaction((vouchers) => {
        for (const v of vouchers) {
          const rawId = v.guid ?? `vch_${v.voucherNumber}_${v.date}`;
          const id = crypto.createHash("sha256").update(rawId).digest("hex");
          const sourceHash = crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");

          stmt.run({
            id,
            companyId,
            voucherDate: v.date ?? effectiveTo,
            voucherTypeName: v.voucherTypeName ?? "Journal",
            voucherNumber: v.voucherNumber ?? null,
            narration: v.narration ?? null,
            sourceHash,
            createdAt: now,
            updatedAt: now,
          });
          vouchersSynced++;
        }
      });

      transaction(voucherResult.data);
    }

    // Pull Ledgers from Tally
    const ledgerResult = await this.tallyService.listLedgers(companyName);
    let ledgersSynced = 0;

    if (ledgerResult.ok && ledgerResult.data) {
      const stmt = this.database.prepare(
        `INSERT INTO ledgers (
          id, company_id, name, parent_name, opening_balance_text,
          closing_balance_text, source_provider, created_at, updated_at
        ) VALUES (
          @id, @companyId, @name, @parentName, @openingBalanceText,
          @closingBalanceText, 'TALLY', @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          parent_name = excluded.parent_name,
          opening_balance_text = excluded.opening_balance_text,
          closing_balance_text = excluded.closing_balance_text,
          updated_at = excluded.updated_at`
      );

      const transaction = this.database.transaction((ledgers) => {
        for (const l of ledgers) {
          const rawId = l.guid ?? `ldr_${l.name}`;
          const id = crypto.createHash("sha256").update(rawId).digest("hex");

          stmt.run({
            id,
            companyId,
            name: l.name,
            parentName: l.parent ?? null,
            openingBalanceText: l.openingBalance ?? null,
            closingBalanceText: l.closingBalance ?? null,
            createdAt: now,
            updatedAt: now,
          });
          ledgersSynced++;
        }
      });

      transaction(ledgerResult.data);
    }

    return {
      companyName,
      vouchersSynced,
      ledgersSynced,
      syncedAt: now,
    };
  }
}
