import { createSqliteRepositories, type Repositories } from '@gym/core';

import { openExpoSqliteDriver } from './expoSqliteDriver';
import { serializeRepositories } from './serializeRepositories';

/**
 * Opens the on-device SQLite database, runs pending migrations, seeds the exercise catalog
 * (idempotent) and returns the repositories. Every mutation is persisted immediately.
 */
export async function createRepositories(): Promise<Repositories> {
  const driver = await openExpoSqliteDriver();
  const repos = await createSqliteRepositories(driver);
  return serializeRepositories(repos);
}
