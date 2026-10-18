import { ipcMain } from "electron";
import { z } from "zod";
import type { DeviceRepository } from "../local-db/deviceRepository.js";

const renameDeviceSchema = z.object({
  deviceName: z.string().trim().min(2).max(80),
});

export function registerDeviceIpc(deviceRepository: DeviceRepository): void {
  ipcMain.handle("device:get-identity", () => deviceRepository.getOrCreate(process.platform));

  ipcMain.handle("device:rename", (_event, payload: unknown) => {
    const parsed = renameDeviceSchema.parse(payload);
    return deviceRepository.rename(parsed.deviceName);
  });
}
