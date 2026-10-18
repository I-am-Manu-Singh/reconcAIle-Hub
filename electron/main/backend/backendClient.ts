import type { BackendRepository } from "../local-db/backendRepository.js";
import type { CredentialStore } from "../secrets/credentialStore.js";

export type PairConnectorResult = {
  readonly connectorId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly connectorDeviceToken: string;
};

export class BackendClient {
  public constructor(
    private readonly backendRepository: BackendRepository,
    private readonly credentialStore: CredentialStore,
  ) {}

  public async pairConnector(pairingCode: string, deviceId: string, deviceName: string): Promise<PairConnectorResult> {
    const settings = this.backendRepository.getSettings();

    if (!settings.apiBaseUrl) {
      throw new Error("Backend API URL is not configured.");
    }

    const response = await fetch(`${settings.apiBaseUrl}/connectors/pair`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pairingCode,
        deviceId,
        deviceName,
      }),
    });

    const body = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(readBackendError(body, response.status));
    }

    const result = parsePairConnectorResult(body);
    await this.credentialStore.setSecret("connectorDeviceToken", result.connectorDeviceToken);

    return result;
  }
}

function parsePairConnectorResult(value: unknown): PairConnectorResult {
  if (typeof value !== "object" || value === null) {
    throw new Error("Backend pairing response was not an object.");
  }

  const record = value as Record<string, unknown>;
  const connectorId = readString(record, "connectorId");
  const organizationId = readString(record, "organizationId");
  const workspaceId = readString(record, "workspaceId");
  const connectorDeviceToken = readString(record, "connectorDeviceToken");

  return {
    connectorId,
    organizationId,
    workspaceId,
    connectorDeviceToken,
  };
}

function readBackendError(value: unknown, status: number): string {
  if (typeof value === "object" && value !== null) {
    const message = (value as Record<string, unknown>)["message"];
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  }

  return `Backend request failed with status ${status}.`;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Backend pairing response is missing ${key}.`);
  }

  return value.trim();
}
