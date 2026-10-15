import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
}

interface Settled<T> {
  /** Which request produced this result. */
  request: number;
  data?: T;
  error?: Error;
}

/**
 * Runs `fn` on mount and whenever `deps` change; `reload()` runs it again.
 * Stale results from superseded calls are ignored. Keeps previous data while reloading.
 * `fn` is read at effect time, so it may close over current props/state; list those in `deps`.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[] = []): AsyncState<T> {
  const [request, setRequest] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ request: -1 });
  const [depsKey, setDepsKey] = useState<readonly unknown[]>(deps);

  // Re-render-time deps comparison: bump the request when deps change (no setState in effects).
  if (depsKey.length !== deps.length || depsKey.some((d, i) => !Object.is(d, deps[i]))) {
    setDepsKey(deps);
    setRequest((r) => r + 1);
  }

  useEffect(() => {
    let cancelled = false;
    let promise: Promise<T>;
    try {
      promise = fn();
    } catch (e) {
      promise = Promise.reject(e);
    }
    promise.then(
      (data) => {
        if (!cancelled) setSettled({ request, data });
      },
      (e: unknown) => {
        if (!cancelled)
          setSettled({ request, error: e instanceof Error ? e : new Error(String(e)) });
      },
    );
    return () => {
      cancelled = true;
    };
    // `fn` intentionally excluded: callers declare re-run triggers via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const reload = useCallback(() => setRequest((r) => r + 1), []);
  return {
    data: settled.data,
    loading: settled.request !== request,
    error: settled.request === request ? settled.error : undefined,
    reload,
  };
}
