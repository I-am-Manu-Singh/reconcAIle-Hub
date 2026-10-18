import crypto from "node:crypto";
import type { LocalDatabase } from "./database.js";

export type RawPayloadDirection = "REQUEST" | "RESPONSE";

export type RawPayload = {
  readonly id: string;
  readonly commandId: string | null;
  readonly provider: "TALLY";
  readonly direction: RawPayloadDirection;
  readonly contentType: string;
  readonly body: string;
  readonly sha256: string;
  readonly createdAt: string;
};

export class RawPayloadRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public store(payload: {
    readonly commandId: string | null;
    readonly provider: "TALLY";
    readonly direction: RawPayloadDirection;
    readonly contentType: string;
    readonly body: string;
  }): RawPayload {
    const rawPayload: RawPayload = {
      id: `raw_${crypto.randomUUID()}`,
      commandId: payload.commandId,
      provider: payload.provider,
      direction: payload.direction,
      contentType: payload.contentType,
      body: payload.body,
      sha256: crypto.createHash("sha256").update(payload.body).digest("hex"),
      createdAt: new Date().toISOString(),
    };

    this.database
      .prepare(
        `INSERT INTO raw_payloads (id, command_id, provider, direction, content_type, body, sha256, created_at)
         VALUES (@id, @commandId, @provider, @direction, @contentType, @body, @sha256, @createdAt)`,
      )
      .run(rawPayload);

    return rawPayload;
  }
}
