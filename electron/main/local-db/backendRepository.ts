import type { LocalDatabase } from "./database.js";

export type BackendSettings = {
  readonly apiBaseUrl: string | null;
  readonly websocketUrl: string | null;
  readonly updatedAt: string;
};

export type ConnectorPairing = {
  readonly connectorId: string | null;
  readonly organizationId: string | null;
  readonly workspaceId: string | null;
  readonly pairedAt: string | null;
  readonly lastHeartbeatAt: string | null;
  readonly status: "UNPAIRED" | "PAIRED" | "ERROR";
  readonly updatedAt: string;
};

type BackendSettingsRow = {
  readonly api_base_url: string | null;
  readonly websocket_url: string | null;
  readonly updated_at: string;
};

type ConnectorPairingRow = {
  readonly connector_id: string | null;
  readonly organization_id: string | null;
  readonly workspace_id: string | null;
  readonly paired_at: string | null;
  readonly last_heartbeat_at: string | null;
  readonly status: "UNPAIRED" | "PAIRED" | "ERROR";
  readonly updated_at: string;
};

export class BackendRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public getSettings(): BackendSettings {
    const row = this.database
      .prepare("SELECT api_base_url, websocket_url, updated_at FROM backend_settings WHERE id = 'default'")
      .get() as BackendSettingsRow | undefined;

    if (row) {
      return mapBackendSettings(row);
    }

    const now = new Date().toISOString();
    this.database
      .prepare("INSERT INTO backend_settings (id, api_base_url, websocket_url, updated_at) VALUES ('default', NULL, NULL, ?)")
      .run(now);

    return {
      apiBaseUrl: null,
      websocketUrl: null,
      updatedAt: now,
    };
  }

  public saveSettings(settings: { readonly apiBaseUrl: string | null; readonly websocketUrl: string | null }): BackendSettings {
    const apiBaseUrl = normalizeOptionalUrl(settings.apiBaseUrl, "API base URL");
    const websocketUrl = normalizeOptionalUrl(settings.websocketUrl, "WebSocket URL");
    const now = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO backend_settings (id, api_base_url, websocket_url, updated_at)
         VALUES ('default', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           api_base_url = excluded.api_base_url,
           websocket_url = excluded.websocket_url,
           updated_at = excluded.updated_at`,
      )
      .run(apiBaseUrl, websocketUrl, now);

    return {
      apiBaseUrl,
      websocketUrl,
      updatedAt: now,
    };
  }

  public getPairing(): ConnectorPairing {
    const row = this.database
      .prepare(
        `SELECT connector_id, organization_id, workspace_id, paired_at, last_heartbeat_at, status, updated_at
         FROM connector_pairing
         WHERE id = 'default'`,
      )
      .get() as ConnectorPairingRow | undefined;

    if (row) {
      return mapConnectorPairing(row);
    }

    const now = new Date().toISOString();
    this.database
      .prepare(
        `INSERT INTO connector_pairing (
          id, connector_id, organization_id, workspace_id, paired_at, last_heartbeat_at, status, updated_at
        ) VALUES ('default', NULL, NULL, NULL, NULL, NULL, 'UNPAIRED', ?)`,
      )
      .run(now);

    return {
      connectorId: null,
      organizationId: null,
      workspaceId: null,
      pairedAt: null,
      lastHeartbeatAt: null,
      status: "UNPAIRED",
      updatedAt: now,
    };
  }

  public markPaired(pairing: {
    readonly connectorId: string;
    readonly organizationId: string;
    readonly workspaceId: string;
  }): ConnectorPairing {
    const now = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO connector_pairing (
          id, connector_id, organization_id, workspace_id, paired_at, last_heartbeat_at, status, updated_at
        ) VALUES ('default', ?, ?, ?, ?, NULL, 'PAIRED', ?)
        ON CONFLICT(id) DO UPDATE SET
          connector_id = excluded.connector_id,
          organization_id = excluded.organization_id,
          workspace_id = excluded.workspace_id,
          paired_at = excluded.paired_at,
          status = excluded.status,
          updated_at = excluded.updated_at`,
      )
      .run(pairing.connectorId, pairing.organizationId, pairing.workspaceId, now, now);

    return this.getPairing();
  }
}

function normalizeOptionalUrl(value: string | null, label: string): string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  const parsed = new URL(trimmed);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http or https.`);
  }

  return trimmed.replace(/\/+$/, "");
}

function mapBackendSettings(row: BackendSettingsRow): BackendSettings {
  return {
    apiBaseUrl: row.api_base_url,
    websocketUrl: row.websocket_url,
    updatedAt: row.updated_at,
  };
}

function mapConnectorPairing(row: ConnectorPairingRow): ConnectorPairing {
  return {
    connectorId: row.connector_id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    pairedAt: row.paired_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    status: row.status,
    updatedAt: row.updated_at,
  };
}
