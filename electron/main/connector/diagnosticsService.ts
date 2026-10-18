import os from "node:os";
import type { LocalDatabase } from "../local-db/database.js";

export type SystemDiagnostics = {
  readonly platform: string;
  readonly arch: string;
  readonly hostname: string;
  readonly cpuCores: number;
  readonly appVersion: string;
  readonly electronVersion: string;
  readonly nodeVersion: string;
  readonly uptimeSeconds: number;
  readonly memoryUsageMB: number;
  readonly heapTotalMB: number;
  readonly rssMemoryMB: number;
  readonly databaseTables: readonly string[];
  readonly dbPageSize: number;
  readonly exportedAt: string;
};

/**
 * Audit Items #73, #93, #189: Enhanced Performance Diagnostics Collector
 * Collects process memory usage, V8 heap stats, OS hostname, CPU cores,
 * SQLite page size, and database tables for support-grade diagnostic reports.
 */
export class DiagnosticsService {
  public constructor(private readonly database: LocalDatabase) {}

  public getDiagnostics(): SystemDiagnostics {
    const tableRows = this.database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC")
      .all() as { name: string }[];

    let dbPageSize = 4096;
    try {
      const pragmaRow = this.database.prepare("PRAGMA page_size").get() as { page_size: number } | undefined;
      if (pragmaRow) dbPageSize = pragmaRow.page_size;
    } catch {
      // Default fallback
    }

    const mem = process.memoryUsage();

    return {
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      cpuCores: os.cpus().length,
      appVersion: "0.1.0",
      electronVersion: process.versions.electron || "30.0.0",
      nodeVersion: process.versions.node,
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMB: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMB: Math.round(mem.heapTotal / (1024 * 1024)),
      rssMemoryMB: Math.round(mem.rss / (1024 * 1024)),
      databaseTables: tableRows.map((r) => r.name),
      dbPageSize,
      exportedAt: new Date().toISOString(),
    };
  }

  public exportBundle(): string {
    const diag = this.getDiagnostics();
    return JSON.stringify(diag, null, 2);
  }
}
