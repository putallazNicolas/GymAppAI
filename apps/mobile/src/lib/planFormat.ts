/** "m:ss" for a rest in seconds (0 -> "0:00"); use `restLabel` for the "Sin descanso" wording. */
export function formatMinSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Rest as the plan shows it: "2:00", or "Sin descanso" for 0. */
export function restLabel(seconds: number): string {
  return seconds === 0 ? 'Sin descanso' : formatMinSec(seconds);
}

/** Long wording under the big readout: "2 min", "1 min 30 s", "45 s". */
export function restSpoken(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return [m ? `${m} min` : '', s ? `${s} s` : ''].filter(Boolean).join(' ');
}

/** True when the reps are a number or a range, i.e. the ± buttons can move them. */
export function isStepableReps(value: string): boolean {
  return /^\d+$|^\d+-\d+$/.test(value.trim());
}

/**
 * Moves "10" or "8-10" by `delta` (both ends of a range). Anything else ("AMRAP") or a result
 * below 1 returns the input unchanged.
 */
export function shiftReps(value: string, delta: number): string {
  const v = value.trim();
  const single = /^(\d+)$/.exec(v);
  if (single?.[1]) return String(Math.max(1, parseInt(single[1], 10) + delta));
  const range = /^(\d+)-(\d+)$/.exec(v);
  if (range?.[1] && range[2]) {
    const a = parseInt(range[1], 10) + delta;
    const b = parseInt(range[2], 10) + delta;
    return a < 1 ? v : `${a}-${b}`;
  }
  return v;
}

/** The "Escalera -2" quick fill: starts at the first set (12 when it is not a number), -2 per set. */
export function stairReps(first: string, count: number): string[] {
  const base = parseInt(first, 10);
  const start = Number.isNaN(base) ? 12 : base;
  return Array.from({ length: count }, (_, i) => String(Math.max(1, start - 2 * i)));
}

/** The "5 · 3 · 1" quick fill: 5, 3, 1 and AMRAP for any further set. */
export function fiveThreeOne(count: number): string[] {
  return Array.from({ length: count }, (_, i) => ['5', '3', '1'][i] ?? 'AMRAP');
}
