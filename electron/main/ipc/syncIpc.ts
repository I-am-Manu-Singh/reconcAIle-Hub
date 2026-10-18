import { ipcMain } from "electron";
import { z } from "zod";
import type { ConnectorRuntime } from "../connector/connectorRuntime.js";
import type { SyncRepository } from "../local-db/syncRepository.js";

const enqueueSchema = z.object({
  workspaceId: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional(),
  commandType: z.enum([
    "PULL_COMPANIES",
    "PULL_LEDGERS",
    "PULL_VOUCHER_TYPES",
    "PULL_VOUCHER_SUMMARIES",
    "PULL_PARTIES",
    "PULL_UNITS",
    "PULL_INVENTORY_ITEMS",
    "PUSH_VOUCHER",
    "PUSH_LEDGER",
  ]),


  payload: z.unknown(),
});


const eventsSchema = z.object({
  commandId: z.string().trim().min(1),
});

export function registerSyncIpc(syncRepository: SyncRepository, connectorRuntime: ConnectorRuntime): void {
  ipcMain.handle("sync:enqueue", (_event, payload: unknown) => {
    const parsed = enqueueSchema.parse(payload);
    return syncRepository.enqueue({
      ...(parsed.workspaceId === undefined ? {} : { workspaceId: parsed.workspaceId }),
      ...(parsed.companyId === undefined ? {} : { companyId: parsed.companyId }),
      commandType: parsed.commandType,
      payload: parsed.payload,
    });
  });

  ipcMain.handle("sync:run-next", () => connectorRuntime.runNext());
  ipcMain.handle("sync:list-recent-commands", () => syncRepository.listRecentCommands(25));

  ipcMain.handle("sync:list-events", (_event, payload: unknown) => {
    const parsed = eventsSchema.parse(payload);
    return syncRepository.listEvents(parsed.commandId);
  });
}
