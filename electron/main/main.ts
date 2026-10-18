import { app, BrowserWindow } from "electron";
import { BackendClient } from "./backend/backendClient.js";
import { ConnectorRuntime } from "./connector/connectorRuntime.js";
import { getRuntimeConfig } from "./appConfig.js";
import { DiagnosticsService } from "./connector/diagnosticsService.js";
import { registerAppIpc } from "./ipc/appIpc.js";

import { registerAccountingMirrorIpc } from "./ipc/accountingMirrorIpc.js";
import { registerBackendIpc } from "./ipc/backendIpc.js";
import { registerConnectorIpc } from "./ipc/connectorIpc.js";
import { registerCredentialIpc } from "./ipc/credentialIpc.js";
import { registerDeviceIpc } from "./ipc/deviceIpc.js";
import { registerDocumentIpc } from "./ipc/documentIpc.js";
import { registerReconciliationIpc } from "./ipc/reconciliationIpc.js";
import { registerSettingsIpc } from "./ipc/settingsIpc.js";
import { registerSyncIpc } from "./ipc/syncIpc.js";
import { registerTallyIpc } from "./ipc/tallyIpc.js";
import { openLocalDatabase } from "./local-db/database.js";
import { BackendRepository } from "./local-db/backendRepository.js";
import { AccountingMirrorRepository } from "./local-db/accountingMirrorRepository.js";
import { DeviceRepository } from "./local-db/deviceRepository.js";
import { DocumentRepository } from "./local-db/documentRepository.js";
import { RawPayloadRepository } from "./local-db/rawPayloadRepository.js";
import { SettingsRepository } from "./local-db/settingsRepository.js";
import { SyncRepository } from "./local-db/syncRepository.js";
import { applySessionSecurityPolicy, installSecurityGuards } from "./security.js";
import { CredentialStore } from "./secrets/credentialStore.js";
import { TallyService } from "./tally/tallyService.js";
import { createMainWindow } from "./windows/mainWindow.js";

installSecurityGuards();

app.name = "ReconcAILe Hub";
if (typeof app.setName === "function") {
  app.setName("ReconcAILe Hub");
}
if (process.platform === "win32") {
  app.setAppUserModelId("com.creativeblisslabs.app");
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const focusedWindow = BrowserWindow.getAllWindows()[0];
    if (!focusedWindow) {
      return;
    }

    if (focusedWindow.isMinimized()) {
      focusedWindow.restore();
    }

    focusedWindow.focus();
  });

  app.whenReady().then(async () => {
    applySessionSecurityPolicy();

    const config = getRuntimeConfig();
    const database = openLocalDatabase(config.userDataPath);
    const deviceRepository = new DeviceRepository(database);
    const backendRepository = new BackendRepository(database);
    const accountingMirrorRepository = new AccountingMirrorRepository(database);
    const documentRepository = new DocumentRepository(database, config.userDataPath);
    const settingsRepository = new SettingsRepository(database);
    const syncRepository = new SyncRepository(database);
    const rawPayloadRepository = new RawPayloadRepository(database);
    const credentialStore = new CredentialStore();
    const backendClient = new BackendClient(backendRepository, credentialStore);
    const tallyService = new TallyService(settingsRepository);
    const connectorRuntime = new ConnectorRuntime(
      syncRepository,
      tallyService,
      rawPayloadRepository,
      accountingMirrorRepository,
    );

    // Ensure stable device identity exists on first boot.
    deviceRepository.getOrCreate(config.platform);
    // backendRepository.getSettings();
    // backendRepository.getPairing();
    // settingsRepository.get();

    const diagnosticsService = new DiagnosticsService(database);
    const preferencesRepository = new (await import("./local-db/preferencesRepository.js")).PreferencesRepository(database);
    const aiChatRepository = new (await import("./local-db/aiChatRepository.js")).AiChatRepository(database);
    const localModelManager = new (await import("./services/localModelManager.js")).LocalModelManager();

    // Asynchronously preload local offline model in background
    void localModelManager.preloadModel("smollm2-135m").catch((err) => {
      console.warn("[main] Model preload deferred:", err);
    });

    registerAppIpc(config, diagnosticsService);

    registerAccountingMirrorIpc(accountingMirrorRepository);
    registerBackendIpc(backendRepository, backendClient, deviceRepository);
    registerConnectorIpc(config.platform);
    registerDeviceIpc(deviceRepository);
    registerDocumentIpc(documentRepository);
    registerReconciliationIpc(accountingMirrorRepository);
    registerSettingsIpc(settingsRepository, preferencesRepository, localModelManager, aiChatRepository, documentRepository, accountingMirrorRepository);
    registerCredentialIpc(credentialStore);
    registerTallyIpc(tallyService);
    registerSyncIpc(syncRepository, connectorRuntime);

    await createMainWindow(config);
  }).catch((error: unknown) => {
    console.error("Failed to start desktop app", error);
    app.quit();
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow(getRuntimeConfig());
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
