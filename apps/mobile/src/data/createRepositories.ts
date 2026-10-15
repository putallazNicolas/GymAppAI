import type { Repositories } from '@gym/core';

function notImplementedRepo(name: string): never {
  return new Proxy(
    {},
    {
      get(_target, method) {
        return () => {
          throw new Error(`Repositories.${name}.${String(method)} not implemented`);
        };
      },
    },
  ) as never;
}

// TODO(B1): replace with createInMemoryRepositories()
export function createRepositories(): Repositories {
  return {
    exercises: notImplementedRepo('exercises'),
    routines: notImplementedRepo('routines'),
    workouts: notImplementedRepo('workouts'),
    settings: notImplementedRepo('settings'),
    backup: notImplementedRepo('backup'),
  };
}
