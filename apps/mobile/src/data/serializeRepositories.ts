import type { Repositories } from '@gym/core';

/**
 * Wraps every repository method so calls run one at a time, in call order.
 *
 * expo-sqlite's `withTransactionAsync` is not exclusive: a query issued from elsewhere while a
 * transaction is open runs inside that transaction. The UI fires overlapping writes (e.g. an
 * input's blur save and the ✓ tap), so we queue them. Repository methods never call other public
 * repository methods, so the queue cannot deadlock.
 */
export function serializeRepositories(repos: Repositories): Repositories {
  let tail: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };

  const wrap = <R extends object>(repo: R): R =>
    new Proxy(repo, {
      get(target, prop, receiver) {
        const value: unknown = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) =>
          enqueue(() => (value as (...a: unknown[]) => Promise<unknown>).apply(target, args));
      },
    });

  return {
    exercises: wrap(repos.exercises),
    routines: wrap(repos.routines),
    workouts: wrap(repos.workouts),
    settings: wrap(repos.settings),
    backup: wrap(repos.backup),
  };
}
