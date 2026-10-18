import crypto from "node:crypto";
import type { LocalDatabase } from "./database.js";

export type SyncCommandType =
  | "PULL_COMPANIES"
  | "PULL_LEDGERS"
  | "PULL_VOUCHER_TYPES"
  | "PULL_VOUCHER_SUMMARIES"
  | "PULL_PARTIES"
  | "PULL_UNITS"
  | "PULL_INVENTORY_ITEMS"
  | "PUSH_VOUCHER"
  | "PUSH_LEDGER";



export type SyncCommandStatus = "PENDING" | "CLAIMED" | "RUNNING" | "SUCCESS" | "FAILED" | "CONFLICT" | "CANCELLED";

export type SyncCommand = {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly workspaceId: string | null;
  readonly companyId: string | null;
  readonly provider: "TALLY";
  readonly commandType: SyncCommandType;
  readonly payloadJson: string;
  readonly status: SyncCommandStatus;
  readonly attempts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastError: string | null;
};

export type SyncEvent = {
  readonly id: string;
  readonly commandId: string;
  readonly eventType: string;
  readonly message: string;
  readonly createdAt: string;
};

type SyncCommandRow = {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly workspace_id: string | null;
  readonly company_id: string | null;
  readonly provider: "TALLY";
  readonly command_type: SyncCommandType;
  readonly payload_json: string;
  readonly status: SyncCommandStatus;
  readonly attempts: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly last_error: string | null;
};

type SyncEventRow = {
  readonly id: string;
  readonly command_id: string;
  readonly event_type: string;
  readonly message: string;
  readonly created_at: string;
};

export class SyncRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public enqueue(command: {
    readonly workspaceId?: string;
    readonly companyId?: string;
    readonly commandType: SyncCommandType;
    readonly payload: unknown;
  }): SyncCommand {
    const now = new Date().toISOString();
    const commandId = `cmd_${crypto.randomUUID()}`;
    const payloadJson = JSON.stringify(command.payload);
    const idempotencyKey = createIdempotencyKey(command.commandType, payloadJson);

    this.database
      .prepare(
        `INSERT INTO sync_outbox (
          command_id, idempotency_key, workspace_id, company_id, provider, command_type,
          payload_json, status, attempts, created_at, updated_at, last_error
        ) VALUES (
          @commandId, @idempotencyKey, @workspaceId, @companyId, 'TALLY', @commandType,
          @payloadJson, 'PENDING', 0, @createdAt, @updatedAt, NULL
        )
        ON CONFLICT(idempotency_key) DO UPDATE SET updated_at = excluded.updated_at`,
      )
      .run({
        commandId,
        idempotencyKey,
        workspaceId: command.workspaceId ?? null,
        companyId: command.companyId ?? null,
        commandType: command.commandType,
        payloadJson,
        createdAt: now,
        updatedAt: now,
      });

    const stored = this.findById(commandId) ?? this.findByIdempotencyKey(idempotencyKey);
    if (!stored) {
      throw new Error("Failed to enqueue sync command.");
    }

    this.addEvent(stored.commandId, "ENQUEUED", `${stored.commandType} command queued.`);
    return stored;
  }

  // Audit #63: Exponential backoff — only claim commands whose retry delay has elapsed.
  // Delay formula: 2^attempts * 1000ms (capped at 5 minutes = 300,000ms)
  public claimNext(): SyncCommand | null {
    const now = new Date().toISOString();

    // Find the next PENDING command where the exponential backoff window has passed
    const command = this.database
      .prepare(
        `SELECT * FROM sync_outbox
         WHERE status = 'PENDING'
           AND (
             attempts = 0
             OR datetime(updated_at, '+' || MIN(CAST(ROUND(POWER(2, attempts)) AS INTEGER), 300) || ' seconds') <= datetime('now')
           )
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get() as SyncCommandRow | undefined;

    if (!command) {
      return null;
    }

    this.database
      .prepare(
        `UPDATE sync_outbox
         SET status = 'CLAIMED', attempts = attempts + 1, updated_at = ?
         WHERE command_id = ? AND status = 'PENDING'`,
      )
      .run(now, command.command_id);

    const claimed = this.findById(command.command_id);
    if (claimed) {
      this.addEvent(claimed.commandId, "CLAIMED", `Command claimed (attempt ${claimed.attempts}).`);
    }

    return claimed;
  }

  public markRunning(commandId: string): void {
    this.updateStatus(commandId, "RUNNING", null);
    this.addEvent(commandId, "RUNNING", "Command execution started.");
  }

  public markSuccess(commandId: string, message: string): void {
    this.updateStatus(commandId, "SUCCESS", null);
    this.addEvent(commandId, "SUCCESS", message);
  }

  public markFailed(commandId: string, error: string): void {
    // Reset to PENDING so exponential backoff claimNext() can pick it up again
    this.updateStatus(commandId, "PENDING", error);
    this.addEvent(commandId, "FAILED", error);
  }

  public listRecentCommands(limit: number): readonly SyncCommand[] {
    return (
      this.database
        .prepare("SELECT * FROM sync_outbox ORDER BY created_at DESC LIMIT ?")
        .all(limit)
        .map((row) => mapSyncCommand(row as SyncCommandRow))
    );
  }

  public listEvents(commandId: string): readonly SyncEvent[] {
    return (
      this.database
        .prepare("SELECT * FROM sync_events WHERE command_id = ? ORDER BY created_at ASC")
        .all(commandId)
        .map((row) => mapSyncEvent(row as SyncEventRow))
    );
  }

  private findById(commandId: string): SyncCommand | null {
    const row = this.database.prepare("SELECT * FROM sync_outbox WHERE command_id = ?").get(commandId) as
      | SyncCommandRow
      | undefined;

    return row ? mapSyncCommand(row) : null;
  }

  private findByIdempotencyKey(idempotencyKey: string): SyncCommand | null {
    const row = this.database.prepare("SELECT * FROM sync_outbox WHERE idempotency_key = ?").get(idempotencyKey) as
      | SyncCommandRow
      | undefined;

    return row ? mapSyncCommand(row) : null;
  }

  private updateStatus(commandId: string, status: SyncCommandStatus, lastError: string | null): void {
    this.database
      .prepare("UPDATE sync_outbox SET status = ?, last_error = ?, updated_at = ? WHERE command_id = ?")
      .run(status, lastError, new Date().toISOString(), commandId);
  }

  private addEvent(commandId: string, eventType: string, message: string): void {
    this.database
      .prepare("INSERT INTO sync_events (id, command_id, event_type, message, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(`evt_${crypto.randomUUID()}`, commandId, eventType, message, new Date().toISOString());
  }
}

function createIdempotencyKey(commandType: SyncCommandType, payloadJson: string): string {
  return crypto.createHash("sha256").update(`${commandType}:${payloadJson}`).digest("hex");
}

function mapSyncCommand(row: SyncCommandRow): SyncCommand {
  return {
    commandId: row.command_id,
    idempotencyKey: row.idempotency_key,
    workspaceId: row.workspace_id,
    companyId: row.company_id,
    provider: row.provider,
    commandType: row.command_type,
    payloadJson: row.payload_json,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastError: row.last_error,
  };
}

function mapSyncEvent(row: SyncEventRow): SyncEvent {
  return {
    id: row.id,
    commandId: row.command_id,
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
  };
}
