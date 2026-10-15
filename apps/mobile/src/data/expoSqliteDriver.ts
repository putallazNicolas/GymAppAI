import type { SqlDriver } from '@gym/core';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'gym-app.db';

/** Adapts expo-sqlite's `SQLiteDatabase` to the core `SqlDriver` (1:1, see core sqlite/driver.ts). */
export function createExpoSqliteDriver(db: SQLiteDatabase): SqlDriver {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes };
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    transaction: (fn) => db.withTransactionAsync(fn),
  };
}

export async function openExpoSqliteDriver(name = DATABASE_NAME): Promise<SqlDriver> {
  const db = await openDatabaseAsync(name);
  return createExpoSqliteDriver(db);
}
