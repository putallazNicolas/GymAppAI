import { epley, type WorkoutDetail, type WorkoutExerciseDetail, type WorkoutSet } from '@gym/core';

/** Minimum e1RM improvement (kg) to count as a record; absorbs float noise. */
const PR_EPSILON = 0.05;

/** e1RM (kg) of a set; 0 when it lacks weight or reps. */
export function setE1rm(set: Pick<WorkoutSet, 'weightKg' | 'reps'>): number {
  if (set.weightKg === undefined || set.reps === undefined) return 0;
  return epley(set.weightKg, set.reps);
}

/** Completed set with the highest e1RM (ties: heavier). Undefined when none has weight and reps. */
export function bestCompletedSet(exercise: WorkoutExerciseDetail): WorkoutSet | undefined {
  let best: WorkoutSet | undefined;
  let bestE = 0;
  for (const s of exercise.sets) {
    if (!s.completed) continue;
    const e = setE1rm(s);
    if (e <= 0) continue;
    if (!best || e > bestE || (e === bestE && (s.weightKg ?? 0) > (best.weightKg ?? 0))) {
      best = s;
      bestE = e;
    }
  }
  return best;
}

/**
 * Ids of the completed sets that beat the exercise's historical best e1RM (a running best, so
 * only a set that improves on every earlier one is flagged). With no history there is no PR.
 */
export function prSetIds(exercise: WorkoutExerciseDetail, historicalBestKg: number): Set<string> {
  const out = new Set<string>();
  if (!(historicalBestKg > 0) || exercise.skipped) return out;
  let running = historicalBestKg;
  for (const s of exercise.sets) {
    if (!s.completed) continue;
    const e = setE1rm(s);
    if (e > running + PR_EPSILON) {
      out.add(s.id);
      running = e;
    }
  }
  return out;
}

export interface WorkoutTotals {
  doneSets: number;
  totalSets: number;
  volumeKg: number;
}

/** Live totals; skipped exercises are left out of both counts. */
export function workoutTotals(workout: WorkoutDetail): WorkoutTotals {
  let doneSets = 0;
  let totalSets = 0;
  let volumeKg = 0;
  for (const e of workout.exercises) {
    if (e.skipped) continue;
    for (const s of e.sets) {
      totalSets += 1;
      if (!s.completed) continue;
      doneSets += 1;
      if (s.weightKg !== undefined && s.reps !== undefined) volumeKg += s.weightKg * s.reps;
    }
  }
  return { doneSets, totalSets, volumeKg };
}

/** First not-skipped exercise with a pending set after `afterIndex`, wrapping around. */
export function firstPendingId(workout: WorkoutDetail, afterIndex = -1): string | null {
  const list = workout.exercises;
  const pick = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const e = list[i];
      if (e && !e.skipped && e.sets.some((s) => !s.completed)) return e.id;
    }
    return null;
  };
  return pick(afterIndex + 1, list.length) ?? pick(0, afterIndex + 1);
}
