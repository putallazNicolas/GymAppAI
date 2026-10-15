import type { BestSet, WorkoutSet } from '../contracts';
import { epley } from '../utils';

/** A completed set that carries both weight and reps (usable for volume / e1RM). */
export interface ScoredSet {
  weightKg: number;
  reps: number;
}

export function completedSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.completed);
}

export function scoredSets(sets: WorkoutSet[]): ScoredSet[] {
  const result: ScoredSet[] = [];
  for (const s of sets) {
    if (s.completed && s.weightKg !== undefined && s.reps !== undefined) {
      result.push({ weightKg: s.weightKg, reps: s.reps });
    }
  }
  return result;
}

/** Σ weightKg × reps over completed sets that have both values. */
export function volumeOf(sets: WorkoutSet[]): number {
  return scoredSets(sets).reduce((sum, s) => sum + s.weightKg * s.reps, 0);
}

/** Completed set with the highest e1RM (ties: heavier weight). Needs reps >= 1. */
export function bestSetOf(sets: WorkoutSet[]): BestSet | undefined {
  let best: BestSet | undefined;
  for (const s of scoredSets(sets)) {
    if (s.reps < 1) continue;
    const e1rmKg = epley(s.weightKg, s.reps);
    if (!best || e1rmKg > best.e1rmKg || (e1rmKg === best.e1rmKg && s.weightKg > best.weightKg)) {
      best = { weightKg: s.weightKg, reps: s.reps, e1rmKg };
    }
  }
  return best;
}

/** Heaviest weight among completed sets with weight and reps >= 1 (0 when none). */
export function maxWeightOf(sets: WorkoutSet[]): number {
  return scoredSets(sets).reduce((m, s) => (s.reps >= 1 ? Math.max(m, s.weightKg) : m), 0);
}

export function maxE1rmOf(sets: WorkoutSet[]): number {
  return bestSetOf(sets)?.e1rmKg ?? 0;
}

export function durationSeconds(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

/** Monday 00:00 local time of the week containing `date`. */
export function weekStartOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
