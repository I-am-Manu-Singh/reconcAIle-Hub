import { ipcMain } from "electron";
import { z } from "zod";
import type { ConnectorSettingsUpdate, SettingsRepository } from "../local-db/settingsRepository.js";

type MutableConnectorSettingsUpdate = {
  -readonly [Key in keyof ConnectorSettingsUpdate]: ConnectorSettingsUpdate[Key];
};

const updateSettingsSchema = z.object({
  tallyHost: z.string().trim().regex(/^[a-zA-Z0-9.-]+$/).optional(),
  tallyPort: z.number().int().min(1).max(65535).optional(),
  enableLocalTallyConnector: z.boolean().optional(),
  enableBackgroundSync: z.boolean().optional(),
  rawPayloadRetentionDays: z.number().int().min(1).max(365).optional(),
});

export function registerSettingsIpc(
  settingsRepository: SettingsRepository,
  preferencesRepository?: import("../local-db/preferencesRepository.js").PreferencesRepository,
  localModelManager?: import("../services/localModelManager.js").LocalModelManager,
  aiChatRepository?: import("../local-db/aiChatRepository.js").AiChatRepository,
  documentRepository?: import("../local-db/documentRepository.js").DocumentRepository,
  accountingMirrorRepository?: import("../local-db/accountingMirrorRepository.js").AccountingMirrorRepository
): void {
  ipcMain.handle("settings:get-connector-settings", () => settingsRepository.get());

  ipcMain.handle("settings:update-connector-settings", (_event, payload: unknown) => {
    const parsed = updateSettingsSchema.parse(payload);
    const update: MutableConnectorSettingsUpdate = {};

    if (parsed.tallyHost !== undefined) {
      update.tallyHost = parsed.tallyHost;
    }

    if (parsed.tallyPort !== undefined) {
      update.tallyPort = parsed.tallyPort;
    }

    if (parsed.enableLocalTallyConnector !== undefined) {
      update.enableLocalTallyConnector = parsed.enableLocalTallyConnector;
    }

    if (parsed.enableBackgroundSync !== undefined) {
      update.enableBackgroundSync = parsed.enableBackgroundSync;
    }

    if (parsed.rawPayloadRetentionDays !== undefined) {
      update.rawPayloadRetentionDays = parsed.rawPayloadRetentionDays;
    }

    return settingsRepository.save(update);
  });

  // User Preferences (UI / Filters / Themes / Window state)
  ipcMain.handle("preferences:get", (_event, payload: { key: string; defaultValue?: string }) => {
    return preferencesRepository?.get(payload.key, payload.defaultValue) ?? null;
  });

  ipcMain.handle("preferences:get-all", (_event, payload?: { category?: string }) => {
    return preferencesRepository?.getAll(payload?.category) ?? {};
  });

  ipcMain.handle("preferences:set", (_event, payload: { key: string; value: string; category?: string }) => {
    preferencesRepository?.set(payload.key, payload.value, payload.category);
    return true;
  });

  ipcMain.handle("preferences:set-batch", (_event, payload: { entries: Record<string, string>; category?: string }) => {
    preferencesRepository?.setBatch(payload.entries, payload.category);
    return true;
  });

  // Local Offline AI Model Manager & Native Engine
  ipcMain.handle("models:get-status", (_event, payload?: { modelId?: string }) => {
    return localModelManager?.getStatus(payload?.modelId ?? "smollm2-135m");
  });

  ipcMain.handle("models:get-engine-status", () => {
    return localModelManager?.getEngineStatus() ?? { status: "UNLOADED", modelName: null, error: null };
  });

  ipcMain.handle("models:preload", async (_event, payload?: { modelId?: string }) => {
    return localModelManager?.preloadModel(payload?.modelId ?? "smollm2-135m");
  });

  ipcMain.handle("models:download", async (_event, payload?: { modelId?: string }) => {
    return localModelManager?.downloadModel(payload?.modelId ?? "smollm2-135m");
  });

  ipcMain.handle("models:cancel-download", () => {
    localModelManager?.cancelDownload();
    return true;
  });

  ipcMain.handle("models:list", () => {
    return localModelManager?.listInstalledModels() ?? [];
  });

  ipcMain.handle("models:pick-import", async () => {
    const { dialog } = await import("electron");
    const res = await dialog.showOpenDialog({
      title: "Import Local GGUF / ONNX Model",
      filters: [
        { name: "AI Models (*.gguf, *.bin, *.onnx)", extensions: ["gguf", "bin", "onnx"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return localModelManager?.importCustomModel(res.filePaths[0]!);
  });

  ipcMain.handle("models:chat", async (_event, payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    options?: any;
  }) => {
    return localModelManager?.chat(payload.messages, payload.options);
  });

  // AI Chat History Persistence (SQLite)
  ipcMain.handle("chat:list-conversations", () => {
    return aiChatRepository?.listConversations() ?? [];
  });

  ipcMain.handle("chat:create-conversation", (_event, payload?: { title?: string; modelId?: string }) => {
    return aiChatRepository?.createConversation(payload?.title, payload?.modelId) ?? null;
  });

  ipcMain.handle("chat:update-title", (_event, payload: { id: string; title: string }) => {
    aiChatRepository?.updateConversationTitle(payload.id, payload.title);
    return true;
  });

  ipcMain.handle("chat:delete-conversation", (_event, payload: { id: string }) => {
    aiChatRepository?.deleteConversation(payload.id);
    return true;
  });

  ipcMain.handle("chat:get-messages", (_event, payload: { conversationId: string }) => {
    return aiChatRepository?.getMessages(payload.conversationId) ?? [];
  });

  ipcMain.handle("chat:save-message", (_event, payload: {
    conversationId: string;
    role: "system" | "user" | "assistant";
    content: string;
    provider?: string | null;
    model?: string | null;
  }) => {
    return aiChatRepository?.appendMessage(payload) ?? null;
  });

  // Context mentions (@docs, @companies, @vouchers)
  ipcMain.handle("chat:get-mentions-context", async () => {
    const docs = documentRepository ? documentRepository.listRecent(30) : [];
    const companies = accountingMirrorRepository ? await accountingMirrorRepository.listCompanies() : [];
    const primaryCompanyId = companies[0]?.id || "comp_1";
    const sessions = documentRepository ? documentRepository.listBankSessions(primaryCompanyId) : [];
    return {
      documents: (docs as any[]).map((d: any) => ({
        id: d.id,
        name: d.originalFileName,
        status: d.status,
        date: d.createdAt,
      })),
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        gstin: c.gstin,
      })),
      bankSessions: (sessions as any[])
        .filter(Boolean)
        .map((s: any) => ({
          id: s.id || "",
          bankName: s.bankName || s.bankLabel || "Bank Statement",
          accountNumber: s.accountNumber || "",
          fileName: s.originalFileName || "statement.pdf",
          txCount: s.txCount || 0,
        })),
    };
  });
}
