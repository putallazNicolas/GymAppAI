/** Test-only SqlDriver backed by sql.js (pure WASM SQLite). Not exported from the package. */
import initSqlJs, { type Database } from 'sql.js';
import type { SqlDriver, SqlParam } from '../sqlite/driver';

export async function createSqlJsDriver(): Promise<SqlDriver & { raw: Database }> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  return {
    raw: db,
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params = []) {
      db.run(sql, params as SqlParam[]);
      return { changes: db.getRowsModified() };
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async first<T>(sql: string, params: SqlParam[] = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        return stmt.step() ? (stmt.getAsObject() as T) : null;
      } finally {
        stmt.free();
      }
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
