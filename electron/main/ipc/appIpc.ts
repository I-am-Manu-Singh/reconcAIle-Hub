import { ipcMain } from "electron";
import type { DesktopRuntimeConfig } from "../appConfig.js";

export type DesktopAppInfo = {
  readonly appName: string;
  readonly appVersion: string;
  readonly platform: NodeJS.Platform;
  readonly mode: DesktopRuntimeConfig["mode"];
  readonly localConnectorAvailable: boolean;
};

import type { DiagnosticsService } from "../connector/diagnosticsService.js";
import { BusyConnectorAdapter } from "../connector/busyAdapter.js";

export function registerAppIpc(config: DesktopRuntimeConfig, diagnosticsService?: DiagnosticsService): void {
  ipcMain.handle("app:get-info", (): DesktopAppInfo => ({
    appName: config.appName,
    appVersion: config.appVersion,
    platform: config.platform,
    mode: config.mode,
    localConnectorAvailable: config.localConnectorAvailable,
  }));

  ipcMain.handle("app:get-diagnostics", () => {
    return diagnosticsService ? diagnosticsService.getDiagnostics() : null;
  });

  ipcMain.handle("app:test-busy", async () => {
    const busy = new BusyConnectorAdapter();
    const conn = await busy.connect();
    const comps = await busy.getCompanies();
    return { conn, comps };
  });
}

