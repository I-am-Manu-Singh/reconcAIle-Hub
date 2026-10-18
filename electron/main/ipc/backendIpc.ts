import { ipcMain } from "electron";
import { z } from "zod";
import type { BackendClient } from "../backend/backendClient.js";
import type { BackendRepository } from "../local-db/backendRepository.js";
import type { DeviceRepository } from "../local-db/deviceRepository.js";

const updateBackendSettingsSchema = z.object({
  apiBaseUrl: z.string().trim().nullable(),
  websocketUrl: z.string().trim().nullable(),
});

const pairConnectorSchema = z.object({
  pairingCode: z.string().trim().min(8).max(200),
});

export function registerBackendIpc(
  backendRepository: BackendRepository,
  backendClient: BackendClient,
  deviceRepository: DeviceRepository,
): void {
  ipcMain.handle("backend:get-settings", () => backendRepository.getSettings());
  ipcMain.handle("backend:get-pairing", () => backendRepository.getPairing());

  ipcMain.handle("backend:update-settings", (_event, payload: unknown) => {
    const parsed = updateBackendSettingsSchema.parse(payload);
    return backendRepository.saveSettings(parsed);
  });

  ipcMain.handle("backend:pair-connector", async (_event, payload: unknown) => {
    const parsed = pairConnectorSchema.parse(payload);
    const device = deviceRepository.getOrCreate(process.platform);
    const result = await backendClient.pairConnector(parsed.pairingCode, device.id, device.deviceName);

    return backendRepository.markPaired({
      connectorId: result.connectorId,
      organizationId: result.organizationId,
      workspaceId: result.workspaceId,
    });
  });
}
