import { ipcMain } from "electron";
import type { CredentialStore } from "../secrets/credentialStore.js";

export type CredentialAvailability = {
  readonly cloudAccessToken: boolean;
  readonly cloudRefreshToken: boolean;
  readonly connectorDeviceToken: boolean;
};

export function registerCredentialIpc(credentialStore: CredentialStore): void {
  ipcMain.handle("credentials:get-availability", async (): Promise<CredentialAvailability> => ({
    cloudAccessToken: await credentialStore.hasSecret("cloudAccessToken"),
    cloudRefreshToken: await credentialStore.hasSecret("cloudRefreshToken"),
    connectorDeviceToken: await credentialStore.hasSecret("connectorDeviceToken"),
  }));
}
