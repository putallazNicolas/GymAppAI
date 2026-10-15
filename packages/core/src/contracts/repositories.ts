/**
 * Repository interfaces (V1 contract). Owned by the orchestrator.
 *
 * Rules for every implementation (in-memory, SQLite, future remote):
 * - Every method is async and every mutation is persisted before the promise resolves.
 * - Methods that receive an unknown id reject with `NotFoundError`.
 * - `ownerId` / `createdBy` / `id` / timestamps are filled by the implementation
 *   (V1: LOCAL_USER_ID); callers never pass them.
 * - In patch objects: a key that is absent (or `undefined`) means "leave unchanged";
 *   `null` means "clear this optional field".
 * - Returned objects are copies: mutating them never mutates stored state.
 * - Lists are returned in their natural order (`order` / `setIndex` ascending) unless noted.
 */
import type {
  Equipment,
  Exercise,
  ID,
  MuscleGroup,
  PlannedExercise,
  Routine,
  RoutineDay,
  Settings,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from './entities';

/** A patch where optional fields can be cleared with `null`. */
export type Patch<T> = { [K in keyof T]?: undefined extends T[K] ? T[K] | null : T[K] };

export class NotFoundError extends Error {
  constructor(entity: string, id: ID) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export interface ExerciseFilter {
  muscleGroup?: MuscleGroup;
  /** Case- and accent-insensitive substring match on name ("press" matches "Press banca"). */
  search?: string;
}

export interface NewExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
}

export interface ExerciseRepo {
  /** Sorted by name (Spanish locale, accent-insensitive). */
  list(filter?: ExerciseFilter): Promise<Exercise[]>;
  getById(id: ID): Promise<Exercise | null>;
  /** Missing ids are skipped. Order follows `ids`. */
  getByIds(ids: ID[]): Promise<Exercise[]>;
  /** Creates a custom exercise (`isCustom: true`). Rejects with ValidationError on empty name. */
  create(input: NewExerciseInput): Promise<Exercise>;
  update(id: ID, patch: Patch<NewExerciseInput>): Promise<Exercise>;
  /**
   * Deletes a custom exercise. Rejects with ValidationError for catalog exercises or when the
   * exercise is referenced by any planned exercise or workout.
   */
  delete(id: ID): Promise<void>;
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

export interface RoutineListItem extends Routine {
  dayCount: number;
}

export interface RoutineDayDetail extends RoutineDay {
  exercises: PlannedExercise[];
}

export interface RoutineDetail extends Routine {
  days: RoutineDayDetail[];
}

export interface NewPlannedExerciseInput {
  exerciseId: ID;
  /** Defaults to 3. */
  sets?: number;
  /** Defaults to "10". */
  reps?: string;
  restSeconds?: number;
  notes?: string;
}

export type PlannedExercisePatch = Patch<
  Pick<PlannedExercise, 'exerciseId' | 'sets' | 'reps' | 'restSeconds' | 'notes'>
>;

export interface RoutineRepo {
  /** Sorted: active first, then by updatedAt desc. Archived routines excluded unless asked. */
  list(options?: { includeArchived?: boolean }): Promise<RoutineListItem[]>;
  getById(id: ID): Promise<RoutineDetail | null>;
  /** The active (non-archived) routine, if any. */
  getActive(): Promise<RoutineDetail | null>;
  /** New routines start inactive, unarchived, with no days. */
  create(input: { name: string }): Promise<Routine>;
  update(id: ID, patch: { name?: string; archived?: boolean }): Promise<Routine>;
  /**
   * Makes `id` the only active routine (pass null to deactivate all).
   * Activating an archived routine unarchives it. Archiving an active routine deactivates it.
   */
  setActive(id: ID | null): Promise<void>;
  /** Deep copy (days + planned exercises). Name gets " (copia)". The copy is inactive. */
  duplicate(id: ID): Promise<Routine>;
  /** Deletes the routine with its days and planned exercises. Past workouts are kept. */
  delete(id: ID): Promise<void>;

  getDay(dayId: ID): Promise<RoutineDayDetail | null>;
  /** Appends a day at the end. */
  addDay(routineId: ID, input: { name: string }): Promise<RoutineDay>;
  updateDay(dayId: ID, patch: { name?: string }): Promise<RoutineDay>;
  deleteDay(dayId: ID): Promise<void>;
  /** `orderedDayIds` must contain exactly the routine's day ids. */
  reorderDays(routineId: ID, orderedDayIds: ID[]): Promise<void>;

  /** Appends planned exercises at the end of the day, in the given order. */
  addPlannedExercises(dayId: ID, inputs: NewPlannedExerciseInput[]): Promise<PlannedExercise[]>;
  updatePlannedExercise(id: ID, patch: PlannedExercisePatch): Promise<PlannedExercise>;
  deletePlannedExercise(id: ID): Promise<void>;
  /** `orderedIds` must contain exactly the day's planned exercise ids. */
  reorderPlannedExercises(dayId: ID, orderedIds: ID[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export interface WorkoutExerciseDetail extends WorkoutExercise {
  sets: WorkoutSet[];
}

export interface WorkoutDetail extends Workout {
  exercises: WorkoutExerciseDetail[];
}

export interface NewWorkoutInput {
  routineId?: ID;
  dayId?: ID;
  dayNameSnapshot: string;
  /** Defaults to now. */
  startedAt?: string;
  exercises: {
    exerciseId: ID;
    plannedSets: number;
    plannedReps: string;
    restSeconds?: number;
    notes?: string;
    /** One entry per set; length is usually plannedSets. */
    sets: { weightKg?: number; reps?: number }[];
  }[];
}

/** One past session of a given exercise. */
export interface ExerciseHistoryEntry {
  workout: Workout;
  workoutExercise: WorkoutExercise;
  sets: WorkoutSet[];
}

export type WorkoutSetPatch = Patch<
  Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed' | 'completedAt'>
>;

export interface WorkoutRepo {
  /** Creates the workout, its exercises and sets atomically. */
  create(input: NewWorkoutInput): Promise<WorkoutDetail>;
  getById(id: ID): Promise<WorkoutDetail | null>;
  /** The most recent workout without `finishedAt`, if any. */
  getInProgress(): Promise<Workout | null>;
  /** Finished workouts, most recent (startedAt) first. */
  listFinished(options?: { limit?: number; offset?: number; since?: string }): Promise<Workout[]>;
  /** Most recent finished workout of a routine (by startedAt). */
  getLastFinishedForRoutine(routineId: ID): Promise<Workout | null>;
  update(id: ID, patch: Patch<Pick<Workout, 'finishedAt' | 'notes'>>): Promise<Workout>;
  /** Deletes the workout with its exercises and sets (used to discard). */
  delete(id: ID): Promise<void>;

  updateWorkoutExercise(id: ID, patch: { skipped?: boolean }): Promise<WorkoutExercise>;
  /** Appends a set (setIndex = current count). Copies weightKg from the last set. */
  addSet(workoutExerciseId: ID): Promise<WorkoutSet>;
  /** Removes a set and re-indexes the remaining ones. */
  removeSet(setId: ID): Promise<void>;
  updateSet(setId: ID, patch: WorkoutSetPatch): Promise<WorkoutSet>;

  /**
   * Sessions that include `exerciseId`, most recent first. Only finished workouts unless
   * `includeInProgress`. `excludeWorkoutId` skips one workout (e.g. the current one).
   */
  getExerciseHistory(
    exerciseId: ID,
    options?: { limit?: number; excludeWorkoutId?: ID; includeInProgress?: boolean },
  ): Promise<ExerciseHistoryEntry[]>;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SettingsRepo {
  /** Returns DEFAULT_SETTINGS merged with whatever is stored. */
  get(): Promise<Settings>;
  update(patch: Partial<Settings>): Promise<Settings>;
}

// ---------------------------------------------------------------------------
// Backup (raw access for export/import)
// ---------------------------------------------------------------------------

/** Every stored row, grouped by table. Used by export/import. */
export interface DataSnapshot {
  exercises: Exercise[];
  routines: Routine[];
  routineDays: RoutineDay[];
  plannedExercises: PlannedExercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
  settings: Settings;
}

export interface BackupRepo {
  snapshot(): Promise<DataSnapshot>;
  /** Replaces ALL stored data with the snapshot, atomically. */
  restore(snapshot: DataSnapshot): Promise<void>;
}

// ---------------------------------------------------------------------------

export interface Repositories {
  exercises: ExerciseRepo;
  routines: RoutineRepo;
  workouts: WorkoutRepo;
  settings: SettingsRepo;
  backup: BackupRepo;
}
