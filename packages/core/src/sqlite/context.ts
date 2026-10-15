import type { SqlDriver } from './driver';

export interface SqliteContext {
  db: SqlDriver;
  /** Current time as ISO string. */
  now: () => string;
}
