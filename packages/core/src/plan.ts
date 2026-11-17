/**
 * Pure helpers for planned sets (contracts v2). Shared by the repositories, the services and the
 * UI so every layer applies the same rules.
 */
import {
  MAX_PLANNED_SETS,
  MAX_REST_SECONDS,
  REPS_MODES,
  REST_STEP_SECONDS,
  ValidationError,
  type PlannedExercise,
  type PlannedSet,
  type RepsMode,
} from './contracts';

/**
 * Normalizes a reps string: trimmed, uppercase, inner spaces collapsed and no spaces around "-"
 * ("8 - 10" -> "8-10", "amrap" -> "AMRAP"). Typographic dashes count as "-".
 */
export function normalizeReps(input: string): string {
  return input
    .replace(/[‐-―]/g, '-')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-');
}

/**
 * The number of reps a planned value stands for, or `null` when there is none: only an integer
 * string ("10" -> 10) has one; ranges, AMRAP and empty strings do not. This is the rule of the
 * "✓" button: with `null` the set is not completed on its own, the user has to enter the reps.
 */
export function plannedRepsToNumber(reps: string): number | null {
  const normalized = normalizeReps(reps);
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
}

/**
 * Short label of a plan: "4 × 8-10" when every set is the same, "5 · 3 · 1 · AMRAP" when each
 * set has its own reps.
 */
export function summarizePlannedSets(
  plan: Pick<PlannedExercise, 'repsMode' | 'plannedSets'>,
): string {
  const { repsMode, plannedSets } = plan;
  if (plannedSets.length === 0) return '';
  if (repsMode === 'same') return `${plannedSets.length} × ${plannedSets[0]?.reps ?? ''}`;
  return plannedSets.map((s) => s.reps).join(' · ');
}

/**
 * Planned reps of the set at `setIndex`. A set beyond the plan repeats the last value; an empty
 * list gives "".
 */
export function plannedRepsForSet(plannedSetReps: readonly string[], setIndex: number): string {
  if (plannedSetReps.length === 0) return '';
  const index = Math.min(Math.max(Math.trunc(setIndex), 0), plannedSetReps.length - 1);
  return plannedSetReps[index] ?? '';
}

/** Validates a rest value (`undefined` is allowed: the app uses its default). */
export function assertRestSeconds(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_REST_SECONDS ||
    value % REST_STEP_SECONDS !== 0
  ) {
    throw new ValidationError(
      `restSeconds must be an integer between 0 and ${MAX_REST_SECONDS}, in steps of ${REST_STEP_SECONDS}`,
    );
  }
  return value;
}

export interface NormalizedPlan {
  repsMode: RepsMode;
  plannedSets: PlannedSet[];
}

/**
 * Validates a plan and returns it normalized (fresh objects, reps normalized, unknown keys
 * dropped). Throws ValidationError unless: repsMode is known, there are 1..MAX_PLANNED_SETS sets,
 * every `reps` is non-empty after normalization and, with "same", all of them are equal.
 */
export function normalizePlan(plan: { repsMode: unknown; plannedSets: unknown }): NormalizedPlan {
  const { repsMode, plannedSets } = plan;
  if (!REPS_MODES.includes(repsMode as RepsMode)) {
    throw new ValidationError(`invalid repsMode: ${String(repsMode)}`);
  }
  if (
    !Array.isArray(plannedSets) ||
    plannedSets.length < 1 ||
    plannedSets.length > MAX_PLANNED_SETS
  ) {
    throw new ValidationError(`plannedSets must have between 1 and ${MAX_PLANNED_SETS} sets`);
  }
  const normalized = (plannedSets as unknown[]).map((set): PlannedSet => {
    const reps = (set as { reps?: unknown } | null)?.reps;
    if (typeof reps !== 'string' || normalizeReps(reps) === '') {
      throw new ValidationError('every planned set needs non-empty reps');
    }
    return { reps: normalizeReps(reps) };
  });
  if (repsMode === 'same' && normalized.some((s) => s.reps !== normalized[0]?.reps)) {
    throw new ValidationError('with repsMode "same" every set must have the same reps');
  }
  return { repsMode: repsMode as RepsMode, plannedSets: normalized };
}

/** Default plan: 3 sets of "10", the same for all. */
export function defaultPlan(): NormalizedPlan {
  return { repsMode: 'same', plannedSets: [{ reps: '10' }, { reps: '10' }, { reps: '10' }] };
}
