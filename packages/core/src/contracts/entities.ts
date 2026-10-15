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

export interface Exercise extends Owned {
  id: ID;
  /** Display name, in Spanish for the seeded catalog (e.g. "Sentadilla"). */
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
  /** true for exercises created by the user; false for the seeded catalog. */
  isCustom: boolean;
  createdAt: ISODateString;
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

export interface PlannedExercise {
  id: ID;
  dayId: ID;
  exerciseId: ID;
  /** 0-based position inside the day. Contiguous after any mutation. */
  order: number;
  sets: number;
  /** Free text on purpose: "8", "8-10", "AMRAP". */
  reps: string;
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
  plannedSets: number;
  plannedReps: string;
  /** Snapshot of PlannedExercise.restSeconds (drives the rest timer). */
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
