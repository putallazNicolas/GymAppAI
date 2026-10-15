import type { ExerciseProgressPoint, WorkoutSet } from '@gym/core';

/** Chart ranges of the Progreso screen. */
export type RangeKey = '1M' | '3M' | '6M' | '1A';
export const RANGES: RangeKey[] = ['1M', '3M', '6M', '1A'];
const RANGE_DAYS: Record<RangeKey, number> = { '1M': 30, '3M': 91, '6M': 182, '1A': 365 };

export interface SessionEntry {
  point: ExerciseProgressPoint;
  /** Heaviest completed set (ties: more reps). */
  bestSet: { weightKg: number; reps: number };
  /** e1RM higher than in every earlier session. */
  prE1rm: boolean;
  /** Best weight higher than in every earlier session. */
  prWeight: boolean;
}

const EPS = 1e-6;

function heaviest(sets: WorkoutSet[]): { weightKg: number; reps: number } {
  let best = { weightKg: 0, reps: 0 };
  for (const s of sets) {
    const w = s.weightKg ?? 0;
    const r = s.reps ?? 0;
    if (w > best.weightKg || (w === best.weightKg && r > best.reps))
      best = { weightKg: w, reps: r };
  }
  return best;
}

/**
 * Annotates sessions (oldest first) with their best set and PR flags. The very first session is
 * never a PR: a record needs something earlier to beat.
 */
export function analyzeSessions(points: ExerciseProgressPoint[]): SessionEntry[] {
  let maxE1rm = -Infinity;
  let maxWeight = -Infinity;
  return points.map((point, i) => {
    const prE1rm = i > 0 && point.bestE1rmKg > maxE1rm + EPS;
    const prWeight = i > 0 && point.bestWeightKg > maxWeight + EPS;
    maxE1rm = Math.max(maxE1rm, point.bestE1rmKg);
    maxWeight = Math.max(maxWeight, point.bestWeightKg);
    return { point, bestSet: heaviest(point.sets), prE1rm, prWeight };
  });
}

/** Sessions within the range, counted back from `now`. */
export function inRange(entries: SessionEntry[], range: RangeKey, now: Date): SessionEntry[] {
  const from = now.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.point.date).getTime() >= from);
}

/** Smallest of 3M / 6M / 1A that has at least one session (1A when none does). */
export function defaultRange(entries: SessionEntry[], now: Date): RangeKey {
  for (const r of ['3M', '6M', '1A'] as const) if (inRange(entries, r, now).length > 0) return r;
  return '1A';
}

const NICE_STEPS = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
export const Y_INTERVALS = 5;

export interface YScale {
  min: number;
  max: number;
  ticks: number[];
}

/** Y axis with exactly 5 intervals on a "nice" step that covers every value. */
export function niceScale(values: number[]): YScale {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: Y_INTERVALS, ticks: [] };
  if (hi - lo < 1e-9) {
    const pad = Math.max(hi * 0.03, 1);
    lo -= pad;
    hi += pad;
  }
  let step = NICE_STEPS[NICE_STEPS.length - 1] ?? 1000;
  for (const s of NICE_STEPS) {
    const a = Math.floor(lo / s) * s;
    const b = Math.ceil(hi / s) * s;
    if (Math.round((b - a) / s) <= Y_INTERVALS) {
      step = s;
      break;
    }
  }
  const min = Math.max(0, Math.floor(lo / step) * step);
  const ticks = Array.from({ length: Y_INTERVALS + 1 }, (_, i) => min + i * step);
  return { min, max: min + Y_INTERVALS * step, ticks };
}

/** Length of a polyline, to drive the stroke-dashoffset draw animation. */
export function polylineLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a && b) len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}
