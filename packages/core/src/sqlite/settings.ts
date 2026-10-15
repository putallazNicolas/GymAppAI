import { DEFAULT_SETTINGS, type Settings, type SettingsRepo } from '../contracts';
import { assertSettingsPatch, compact } from '../rules';
import { inTransaction, type SqlDriver } from './driver';
import type { SqliteContext } from './context';

export async function readSettings(db: SqlDriver): Promise<Settings> {
  const rows = await db.all<{ key: string; value: string }>('SELECT "key", "value" FROM settings');
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      stored[row.key] = JSON.parse(row.value);
    } catch {
      // Ignore unreadable values: the default applies.
    }
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function writeSettings(db: SqlDriver, settings: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(compact(settings))) {
    await db.run(
      `INSERT INTO settings ("key", "value") VALUES (?, ?)
       ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"`,
      [key, JSON.stringify(value)],
    );
  }
}

export function createSettingsRepo({ db }: SqliteContext): SettingsRepo {
  return {
    get: () => readSettings(db),
    async update(patch) {
      assertSettingsPatch(patch);
      return inTransaction(db, async () => {
        await writeSettings(db, patch);
        return readSettings(db);
      });
    },
  };
}
