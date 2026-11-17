/**
 * Conversion of the pre-v2 planned data (`sets` + `reps`) to the per-set plan. Used by the SQLite
 * migration and by the export v1 -> v2 step so both apply exactly the same rules.
 */
import {
  MAX_PLANNED_SETS,
  MAX_REST_SECONDS,
  REST_STEP_SECONDS,
  type PlannedSet,
  type RepsMode,
} from './contracts';
import { normalizeReps } from './plan';

/** Upper bound of `plannedSetReps` copies made for a workout snapshot (more adds nothing). */
export const MAX_SNAPSHOT_SET_REPS = 100;

/**
 * Nearest multiple of REST_STEP_SECONDS, clamped to 0..MAX_REST_SECONDS. A positive value never
 * becomes 0 (0 means "Sin descanso", no timer): it is at least REST_STEP_SECONDS. 0 stays 0.
 */
export function legacyRestSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rounded = Math.round(value / REST_STEP_SECONDS) * REST_STEP_SECONDS;
  return Math.min(Math.max(rounded, REST_STEP_SECONDS), MAX_REST_SECONDS);
}

/**
 * v1 `sets` + `reps` -> v2 plan: repsMode "same" and `sets` copies of `reps`. A set count outside
 * 1..MAX_PLANNED_SETS is clamped; empty reps become "10" (v1 never allowed them).
 */
export function legacyPlan(
  sets: number,
  reps: string,
): { repsMode: RepsMode; plannedSets: PlannedSet[] } {
  const count = Math.min(Math.max(Math.trunc(sets) || 1, 1), MAX_PLANNED_SETS);
  const normalized = normalizeReps(reps) || '10';
  return {
    repsMode: 'same',
    plannedSets: Array.from({ length: count }, () => ({ reps: normalized })),
  };
}

/** v1 workout snapshot (`plannedSets` count + `plannedReps`) -> `plannedSetReps`. */
export function legacySetReps(plannedSets: number, plannedReps: string): string[] {
  const count = Math.min(Math.max(Math.trunc(plannedSets) || 0, 0), MAX_SNAPSHOT_SET_REPS);
  return Array.from({ length: count }, () => plannedReps);
}
