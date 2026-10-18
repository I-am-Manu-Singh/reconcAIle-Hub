import { ipcMain } from "electron";

export type ConnectorCapabilityStatus = {
  readonly localConnectorAvailable: boolean;
  readonly tallyLocalIntegrationAvailable: boolean;
  readonly reason: string | null;
};

export function registerConnectorIpc(platform: NodeJS.Platform): void {
  ipcMain.handle("connector:get-capability-status", (): ConnectorCapabilityStatus => {
    const tallyLocalIntegrationAvailable = platform === "win32";

    return {
      localConnectorAvailable: tallyLocalIntegrationAvailable,
      tallyLocalIntegrationAvailable,
      reason: tallyLocalIntegrationAvailable
        ? null
        : "Local Tally integration is enabled only on Windows devices. This app can still manage cloud workspace, documents, approvals and remote connector status.",
    };
  });
}
