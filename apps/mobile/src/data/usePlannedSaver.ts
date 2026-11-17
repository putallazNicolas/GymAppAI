import type { PlannedExercisePatch } from '@gym/core';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useRepositories } from './DataProvider';

/**
 * Persists patches of one planned exercise right away, in order. Patches that arrive while a write
 * is in flight are merged into one follow-up write (holding a stepper fires many per second).
 * When a write fails (core validates) it alerts, drops what was pending and calls `onFailed` so the
 * screen can reload what is really stored.
 */
export function usePlannedSaver(plannedId: string, onFailed: () => void) {
  const repos = useRepositories();
  const pending = useRef<PlannedExercisePatch | null>(null);
  const running = useRef(false);
  const closed = useRef(false);
  const failed = useRef(onFailed);
  useEffect(() => {
    failed.current = onFailed;
  });

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (pending.current && !closed.current) {
        const patch = pending.current;
        pending.current = null;
        try {
          await repos.routines.updatePlannedExercise(plannedId, patch);
        } catch (e) {
          pending.current = null;
          if (!closed.current) {
            Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Probá de nuevo.');
            failed.current();
          }
        }
      }
    } finally {
      running.current = false;
    }
  }, [repos, plannedId]);

  const save = useCallback(
    (patch: PlannedExercisePatch) => {
      pending.current = { ...pending.current, ...patch };
      void drain();
    },
    [drain],
  );

  /** Stops saving (the exercise is being removed). Leaving the screen does NOT stop pending saves. */
  const close = useCallback(() => {
    closed.current = true;
    pending.current = null;
  }, []);

  return { save, close };
}
