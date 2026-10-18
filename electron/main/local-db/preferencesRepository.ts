import type { LocalDatabase } from "./database.js";

export interface UserPreferenceRow {
  readonly key: string;
  readonly value: string;
  readonly category: string;
  readonly updated_at: string;
}

export class PreferencesRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public get(key: string, defaultValue?: string): string | null {
    const row = this.database
      .prepare("SELECT value FROM user_preferences WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row ? row.value : (defaultValue ?? null);
  }

  public getAll(category?: string): Record<string, string> {
    const rows = category
      ? (this.database
          .prepare("SELECT key, value FROM user_preferences WHERE category = ?")
          .all(category) as { key: string; value: string }[])
      : (this.database
          .prepare("SELECT key, value FROM user_preferences")
          .all() as { key: string; value: string }[]);

    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  public set(key: string, value: string, category = "general"): void {
    const now = new Date().toISOString();
    this.database
      .prepare(
        `INSERT INTO user_preferences (key, value, category, updated_at)
         VALUES (@key, @value, @category, @now)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           category = excluded.category,
           updated_at = excluded.updated_at`
      )
      .run({ key, value, category, now });
  }

  public setBatch(entries: Record<string, string>, category = "general"): void {
    const now = new Date().toISOString();
    const stmt = this.database.prepare(
      `INSERT INTO user_preferences (key, value, category, updated_at)
       VALUES (@key, @value, @category, @now)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         category = excluded.category,
         updated_at = excluded.updated_at`
    );

    this.database.transaction(() => {
      for (const [k, v] of Object.entries(entries)) {
        stmt.run({ key: k, value: String(v), category, now });
      }
    })();
  }

  public delete(key: string): void {
    this.database.prepare("DELETE FROM user_preferences WHERE key = ?").run(key);
  }
}
