/**
 * Minimal async SQL driver used by the SQLite repositories.
 *
 * It maps 1:1 onto expo-sqlite's `SQLiteDatabase` (SDK 57), so the mobile adapter is trivial:
 *
 * ```ts
 * const driver = (db: SQLiteDatabase): SqlDriver => ({
 *   exec: (sql) => db.execAsync(sql),
 *   run: async (sql, params = []) => {
 *     const r = await db.runAsync(sql, params);
 *     return { changes: r.changes };
 *   },
 *   all: (sql, params = []) => db.getAllAsync(sql, params),
 *   first: (sql, params = []) => db.getFirstAsync(sql, params),
 *   transaction: (fn) => db.withTransactionAsync(fn),
 * });
 * ```
 *
 * Contract:
 * - `exec`        <-> `db.execAsync(sql)`: one or more statements, no parameters, no result.
 * - `run`         <-> `db.runAsync(sql, params)`: a single write statement; resolves `{ changes }`.
 * - `all`         <-> `db.getAllAsync<T>(sql, params)`: all rows as plain objects.
 * - `first`       <-> `db.getFirstAsync<T>(sql, params)`: first row or `null`.
 * - `transaction` <-> `db.withTransactionAsync(fn)`: runs `fn` between BEGIN and COMMIT and
 *   rolls back (rethrowing) if `fn` rejects. The repositories never nest transactions.
 *
 * Parameters are positional (`?`). Booleans are never passed: the repositories store 0/1.
 */
export type SqlParam = string | number | null;

export interface SqlRunResult {
  /** Rows modified by the statement. */
  changes: number;
}

export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<SqlRunResult>;
  all<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  first<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | null>;
  transaction(fn: () => Promise<void>): Promise<void>;
}

/** Runs `fn` in a transaction and returns its result. */
export async function inTransaction<T>(db: SqlDriver, fn: () => Promise<T>): Promise<T> {
  let result: T | undefined;
  await db.transaction(async () => {
    result = await fn();
  });
  return result as T;
}
