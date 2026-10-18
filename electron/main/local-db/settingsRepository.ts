import type { LocalDatabase } from "./database.js";

export type ConnectorSettings = {
  readonly tallyHost: string;
  readonly tallyPort: number;
  readonly enableLocalTallyConnector: boolean;
  readonly enableBackgroundSync: boolean;
  readonly rawPayloadRetentionDays: number;
  readonly updatedAt: string;
};

export type ConnectorSettingsUpdate = Partial<Omit<ConnectorSettings, "updatedAt">>;

type ConnectorSettingsRow = {
  readonly tally_host: string;
  readonly tally_port: number;
  readonly enable_local_tally_connector: 0 | 1;
  readonly enable_background_sync: 0 | 1;
  readonly raw_payload_retention_days: number;
  readonly updated_at: string;
};

const defaultSettings = {
  tallyHost: "127.0.0.1",
  tallyPort: 9000,
  enableLocalTallyConnector: process.platform === "win32",
  enableBackgroundSync: true,
  rawPayloadRetentionDays: 30,
} satisfies Omit<ConnectorSettings, "updatedAt">;

export class SettingsRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public get(): ConnectorSettings {
    const existing = this.database
      .prepare(
        `SELECT tally_host, tally_port, enable_local_tally_connector, enable_background_sync,
                raw_payload_retention_days, updated_at
         FROM connector_settings
         WHERE id = 'default'`,
      )
      .get() as ConnectorSettingsRow | undefined;

    if (existing) {
      return mapConnectorSettings(existing);
    }

    return this.save(defaultSettings);
  }

  public save(update: ConnectorSettingsUpdate): ConnectorSettings {
    const current = this.getExistingWithoutCreating();
    const merged = validateSettings({ ...defaultSettings, ...current, ...update });
    const now = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO connector_settings (
          id, tally_host, tally_port, enable_local_tally_connector, enable_background_sync,
          raw_payload_retention_days, updated_at
        ) VALUES (
          'default', @tallyHost, @tallyPort, @enableLocalTallyConnector, @enableBackgroundSync,
          @rawPayloadRetentionDays, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          tally_host = excluded.tally_host,
          tally_port = excluded.tally_port,
          enable_local_tally_connector = excluded.enable_local_tally_connector,
          enable_background_sync = excluded.enable_background_sync,
          raw_payload_retention_days = excluded.raw_payload_retention_days,
          updated_at = excluded.updated_at`,
      )
      .run({
        tallyHost: merged.tallyHost,
        tallyPort: merged.tallyPort,
        enableLocalTallyConnector: merged.enableLocalTallyConnector ? 1 : 0,
        enableBackgroundSync: merged.enableBackgroundSync ? 1 : 0,
        rawPayloadRetentionDays: merged.rawPayloadRetentionDays,
        updatedAt: now,
      });

    return { ...merged, updatedAt: now };
  }

  private getExistingWithoutCreating(): Omit<ConnectorSettings, "updatedAt"> | null {
    const existing = this.database
      .prepare(
        `SELECT tally_host, tally_port, enable_local_tally_connector, enable_background_sync,
                raw_payload_retention_days, updated_at
         FROM connector_settings
         WHERE id = 'default'`,
      )
      .get() as ConnectorSettingsRow | undefined;

    if (!existing) {
      return null;
    }

    const mapped = mapConnectorSettings(existing);
    return {
      tallyHost: mapped.tallyHost,
      tallyPort: mapped.tallyPort,
      enableLocalTallyConnector: mapped.enableLocalTallyConnector,
      enableBackgroundSync: mapped.enableBackgroundSync,
      rawPayloadRetentionDays: mapped.rawPayloadRetentionDays,
    };
  }
}

function validateSettings(settings: Omit<ConnectorSettings, "updatedAt">): Omit<ConnectorSettings, "updatedAt"> {
  const tallyHost = settings.tallyHost.trim();

  if (!/^[a-zA-Z0-9.-]+$/.test(tallyHost)) {
    throw new Error("Tally host can contain only letters, numbers, dots and hyphens.");
  }

  if (!Number.isInteger(settings.tallyPort) || settings.tallyPort < 1 || settings.tallyPort > 65535) {
    throw new Error("Tally port must be a whole number from 1 to 65535.");
  }

  if (
    !Number.isInteger(settings.rawPayloadRetentionDays) ||
    settings.rawPayloadRetentionDays < 1 ||
    settings.rawPayloadRetentionDays > 365
  ) {
    throw new Error("Raw payload retention must be between 1 and 365 days.");
  }

  return {
    tallyHost,
    tallyPort: settings.tallyPort,
    enableLocalTallyConnector: settings.enableLocalTallyConnector,
    enableBackgroundSync: settings.enableBackgroundSync,
    rawPayloadRetentionDays: settings.rawPayloadRetentionDays,
  };
}

function mapConnectorSettings(row: ConnectorSettingsRow): ConnectorSettings {
  return {
    tallyHost: row.tally_host,
    tallyPort: row.tally_port,
    enableLocalTallyConnector: row.enable_local_tally_connector === 1,
    enableBackgroundSync: row.enable_background_sync === 1,
    rawPayloadRetentionDays: row.raw_payload_retention_days,
    updatedAt: row.updated_at,
  };
}
