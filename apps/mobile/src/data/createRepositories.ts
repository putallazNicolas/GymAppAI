import { createInMemoryRepositories, type Repositories } from '@gym/core';

// In-memory data is lost on reload until the SQLite integration lands.
export function createRepositories(): Repositories {
  return createInMemoryRepositories();
}
