import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { CURRENT_SCHEMA_VERSION, migrations } from "./schema.js";

export type LocalDatabase = Database.Database;

// Audit #75: WAL checkpoint interval — run TRUNCATE every 5 minutes
const WAL_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;

export function openLocalDatabase(userDataPath: string): LocalDatabase {
  fs.mkdirSync(userDataPath, { recursive: true });

  const databasePath = path.join(userDataPath, "accounting-hub.sqlite3");
  const database = new Database(databasePath);

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  database.pragma("synchronous = NORMAL");
  database.pragma("cache_size = -8000"); // 8MB page cache

  // Audit #75: Schedule periodic WAL checkpoint to prevent unbounded .wal file growth
  const checkpointTimer = setInterval(() => {
    try {
      database.pragma("wal_checkpoint(TRUNCATE)");
    } catch (err) {
      console.warn("[DB] WAL checkpoint failed (non-critical):", String(err));
    }
  }, WAL_CHECKPOINT_INTERVAL_MS);
  // Prevent Node.js from keeping the process alive for this timer alone
  if (checkpointTimer.unref) checkpointTimer.unref();

  runMigrations(database);

  return database;
}

// Audit #92: Each migration wrapped in a transaction with rollback on failure
function runMigrations(database: LocalDatabase): void {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const appliedVersions = new Set(
    database.prepare("SELECT version FROM schema_migrations").all().map((row) => (row as { version: number }).version),
  );

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      try {
        const applyMigration = database.transaction(() => {
          for (const statement of migration.statements) {
            database.exec(statement);
          }
          database
            .prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
            .run(migration.version, new Date().toISOString());
        });
        applyMigration();
      } catch (err) {
        console.error(`[DB] Migration v${migration.version} failed and was rolled back:`, String(err));
        throw new Error(`Database migration v${migration.version} failed: ${String(err)}`);
      }
    }
  }

  database
    .prepare("INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)")
    .run("schema_version", String(CURRENT_SCHEMA_VERSION), new Date().toISOString());
}

/** Audit #56: Export a hot database online backup cleanly to a target file path */
export async function exportDatabaseBackup(database: LocalDatabase, destinationPath: string): Promise<void> {
  await database.backup(destinationPath);
}
