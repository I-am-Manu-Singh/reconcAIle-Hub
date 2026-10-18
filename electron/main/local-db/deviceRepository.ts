import os from "node:os";
import crypto from "node:crypto";
import type { LocalDatabase } from "./database.js";

export type DeviceIdentity = {
  readonly id: string;
  readonly deviceName: string;
  readonly platform: NodeJS.Platform;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type DeviceIdentityRow = {
  readonly id: string;
  readonly device_name: string;
  readonly platform: NodeJS.Platform;
  readonly created_at: string;
  readonly updated_at: string;
};

export class DeviceRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public getOrCreate(platform: NodeJS.Platform): DeviceIdentity {
    const existing = this.database
      .prepare("SELECT id, device_name, platform, created_at, updated_at FROM device_identity LIMIT 1")
      .get() as DeviceIdentityRow | undefined;

    if (existing) {
      return mapDeviceIdentity(existing);
    }

    const now = new Date().toISOString();
    const device: DeviceIdentity = {
      id: `dev_${crypto.randomUUID()}`,
      deviceName: os.hostname(),
      platform,
      createdAt: now,
      updatedAt: now,
    };

    this.database
      .prepare(
        `INSERT INTO device_identity (id, device_name, platform, created_at, updated_at)
         VALUES (@id, @deviceName, @platform, @createdAt, @updatedAt)`,
      )
      .run(device);

    return device;
  }

  public rename(deviceName: string): DeviceIdentity {
    const trimmedName = deviceName.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      throw new Error("Device name must be between 2 and 80 characters.");
    }

    const existing = this.getOrCreate(process.platform);
    const now = new Date().toISOString();

    this.database
      .prepare("UPDATE device_identity SET device_name = ?, updated_at = ? WHERE id = ?")
      .run(trimmedName, now, existing.id);

    return {
      ...existing,
      deviceName: trimmedName,
      updatedAt: now,
    };
  }
}

function mapDeviceIdentity(row: DeviceIdentityRow): DeviceIdentity {
  return {
    id: row.id,
    deviceName: row.device_name,
    platform: row.platform,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
