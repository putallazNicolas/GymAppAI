/**
 * Domain entities (V1 contract). Owned by the orchestrator — do not edit from a feature branch.
 *
 * Conventions:
 * - All ids are opaque strings (UUID v4 generated locally).
 * - All timestamps are ISO 8601 strings in UTC (e.g. "2026-10-15T08:30:00.000Z").
 * - All weights are stored in kilograms. Unit conversion is a presentation concern.
 * - Optional values are `undefined` when absent (never `null`) in entities.
 */

export type ID = string;
export type ISODateString = string;

/** The only user in V1. Both `ownerId` and `createdBy` take this value. */
export const LOCAL_USER_ID = 'local-user';

/** Fields every user-owned entity carries, ready for multi-user in the future. */
export interface Owned {
  /** Who the entity belongs to (e.g. the athlete). */
  ownerId: ID;
  /** Who created it (e.g. a coach creating a routine for an athlete). */
  createdBy: ID;
}

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
  'cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** Max length of user-typed names (routine, day). Names are trimmed and can't be empty. */
export const NAME_MAX_LENGTH = 40;
/** Max length of a custom exercise name. */
export const EXERCISE_NAME_MAX_LENGTH = 60;

export interface Exercise extends Owned {
  id: ID;
  /** Display name, in Spanish for the seeded catalog (e.g. "Sentadilla"). */
  name: string;
  muscleGroup: MuscleGroup;
  /** Other muscle groups it works (never includes `muscleGroup`). */
  secondaryMuscleGroups?: MuscleGroup[];
  equipment?: Equipment;
  /** Technique cues, shown in Entrenando. */
  notes?: string;
  /** true for exercises created by the user; false for the seeded catalog. */
  isCustom: boolean;
  /**
   * Hidden from pickers. Deleting a custom exercise that is already used by a planned exercise or a
   * workout archives it instead, so history keeps working.
   */
  archived?: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  // (propuesta, NOT in V1 until the owner approves) trackingType?: 'weight_reps' | 'bodyweight_load' | 'time';
  // (propuesta, NOT in V1 until the owner approves) unilateral?: boolean;
}

export interface Routine extends Owned {
  id: ID;
  name: string;
  /** At most one non-archived routine is active at a time. */
  isActive: boolean;
  archived: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RoutineDay {
  id: ID;
  routineId: ID;
  /** e.g. "Piernas A". */
  name: string;
  /** 0-based position inside the routine. Contiguous after any mutation. */
  order: number;
}

export const REPS_MODES = ['same', 'perSet'] as const;
/** "same": every set has the same reps. "perSet": each set has its own reps. */
export type RepsMode = (typeof REPS_MODES)[number];

/** Planned sets per exercise: 1..MAX_PLANNED_SETS. */
export const MAX_PLANNED_SETS = 20;
/** Rest is 0..MAX_REST_SECONDS in REST_STEP_SECONDS steps. 0 means "Sin descanso". */
export const MAX_REST_SECONDS = 600;
export const REST_STEP_SECONDS = 15;

/** One planned set. */
export interface PlannedSet {
  /** Free text on purpose: "5", "8-10", "AMRAP". Normalized: trimmed, uppercase, no spaces around "-". */
  reps: string;
  // Reserved for V4 (per-set load planning). V1 never reads or writes it:
  // load?: PlannedLoad;
}
// Reserved for the future (V1 has no RPE or %):
// export type PlannedLoad =
//   | { kind: 'kg'; value: number }
//   | { kind: 'pct1rm'; value: number }
//   | { kind: 'rpe'; value: number };

export interface PlannedExercise {
  id: ID;
  dayId: ID;
  exerciseId: ID;
  /** 0-based position inside the day. Contiguous after any mutation. */
  order: number;
  repsMode: RepsMode;
  /**
   * One entry per planned set (length 1..MAX_PLANNED_SETS). Replaces the old `sets` + `reps`.
   * With repsMode "same", every entry has the same `reps`.
   */
  plannedSets: PlannedSet[];
  /**
   * Rest after each set, in seconds: integer 0..MAX_REST_SECONDS, multiple of REST_STEP_SECONDS.
   * 0 = "Sin descanso" (no rest timer). Undefined = not set (the app uses its default).
   */
  restSeconds?: number;
  notes?: string;
}

/** A training session. In progress while `finishedAt` is undefined. */
export interface Workout extends Owned {
  id: ID;
  routineId?: ID;
  dayId?: ID;
  /** Day name at the time the workout started (survives renames/deletes). */
  dayNameSnapshot: string;
  startedAt: ISODateString;
  finishedAt?: ISODateString;
  notes?: string;
}

export interface WorkoutExercise {
  id: ID;
  workoutId: ID;
  exerciseId: ID;
  /** 0-based position inside the workout. */
  order: number;
  /** Snapshot: number of planned sets when the workout started. */
  plannedSets: number;
  /** Snapshot: summary label of the plan ("8-10" or "5 · 3 · 1"), for display. */
  plannedReps: string;
  /**
   * Snapshot: planned reps for each set, by setIndex. A rule change in the routine never alters a
   * workout in progress. A set added beyond the plan uses the last value as its placeholder.
   */
  plannedSetReps: string[];
  /** Snapshot of PlannedExercise.restSeconds (drives the rest timer; 0 = no timer). */
  restSeconds?: number;
  /** Snapshot of PlannedExercise.notes. */
  notes?: string;
  /** Set via the "saltar ejercicio" menu action. */
  skipped: boolean;
}

export interface WorkoutSet {
  id: ID;
  workoutExerciseId: ID;
  /** 0-based position inside the workout exercise. Contiguous after add/remove. */
  setIndex: number;
  weightKg?: number;
  reps?: number;
  completed: boolean;
  completedAt?: ISODateString;
}

export type WeightUnit = 'kg' | 'lb';

export interface Settings {
  unit: WeightUnit;
  /** Show the non-blocking rest timer after completing a set (when restSeconds is set). */
  restTimerEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  restTimerEnabled: true,
};
