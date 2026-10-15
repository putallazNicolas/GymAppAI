/**
 * Domain services (V1 contract). Owned by the orchestrator.
 *
 * Services are pure orchestration on top of `Repositories`: they never touch storage directly,
 * so they work identically with the in-memory and the SQLite implementations.
 * Created with `createDomainServices(repos, options)`.
 */
import type { Exercise, ID, ISODateString, Routine, Workout, WorkoutSet } from './entities';
import type { DataSnapshot, Repositories, RoutineDayDetail, WorkoutDetail } from './repositories';

export interface ServiceOptions {
  /** Injectable clock for tests. Defaults to () => new Date(). */
  now?: () => Date;
}

export interface SuggestedDay {
  routine: Routine;
  day: RoutineDayDetail;
  /** Exercises of the day, in order (for the "Entrenamiento de hoy" card). */
  exercises: Exercise[];
}

export interface PreviousSet {
  setIndex: number;
  weightKg?: number;
  reps?: number;
}

export interface PreviousPerformance {
  workoutId: ID;
  date: ISODateString;
  /** Completed sets of the last session that included the exercise, by setIndex. */
  sets: PreviousSet[];
}

export interface BestSet {
  weightKg: number;
  reps: number;
  /** Epley estimate of this set. */
  e1rmKg: number;
}

export type PersonalRecordType = 'weight' | 'e1rm';

export interface PersonalRecord {
  exerciseId: ID;
  exerciseName: string;
  type: PersonalRecordType;
  /** New best, in kg. */
  valueKg: number;
  /** Previous best in kg, undefined if this is the first time the exercise is logged. */
  previousKg?: number;
}

export interface WorkoutSummaryExercise {
  workoutExerciseId: ID;
  exerciseId: ID;
  exerciseName: string;
  completedSets: number;
  totalSets: number;
  volumeKg: number;
  skipped: boolean;
  /** Completed set with the highest e1RM (ties: heavier weight). Undefined if none. */
  bestSet?: BestSet;
}

export interface WorkoutSummary {
  workout: Workout;
  /** finishedAt - startedAt (or now - startedAt while in progress), in whole seconds. */
  durationSeconds: number;
  completedSets: number;
  totalSets: number;
  /** Σ weightKg × reps over completed sets with both values. */
  volumeKg: number;
  /** Exercises with at least one completed set. */
  exerciseCount: number;
  exercises: WorkoutSummaryExercise[];
  /**
   * PRs set in this workout vs. all workouts that started before it. Only reported when
   * there is a previous history for that exercise (first session is not a "PR").
   */
  personalRecords: PersonalRecord[];
}

export interface WorkoutListItem {
  workout: Workout;
  durationSeconds: number;
  volumeKg: number;
  completedSets: number;
}

export interface ExerciseProgressPoint {
  workoutId: ID;
  date: ISODateString;
  bestWeightKg: number;
  bestE1rmKg: number;
  volumeKg: number;
  /** Completed sets of that session, for the history list. */
  sets: WorkoutSet[];
}

export interface WeeklyStat {
  /** Monday 00:00 local time of that week, ISO string. */
  weekStart: ISODateString;
  workouts: number;
  volumeKg: number;
}

export const EXPORT_FORMAT = 'gym-app-export';
export const EXPORT_VERSION = 1;

export interface ExportPayload {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: ISODateString;
  /** App version that produced the file (informational). */
  appVersion?: string;
  data: DataSnapshot;
}

export interface ImportResult {
  exercises: number;
  routines: number;
  workouts: number;
}

export interface DomainServices {
  /**
   * Creates a workout from a routine day: one WorkoutExercise per planned exercise and
   * `sets` WorkoutSets each. Each set's weightKg is prefilled from the previous performance
   * of that exercise (same setIndex, else the last previous set); reps are left empty.
   * Rejects with ValidationError if another workout is in progress.
   */
  startWorkoutFromDay(dayId: ID): Promise<WorkoutDetail>;
  /**
   * Day after the one of the last finished workout of the active routine (wrapping around).
   * First day if the routine was never trained or that day no longer exists.
   * null if there is no active routine or it has no days.
   */
  getSuggestedNextDay(): Promise<SuggestedDay | null>;
  /** Last finished session of the exercise (excluding `excludeWorkoutId`). */
  getPreviousPerformance(
    exerciseId: ID,
    options?: { excludeWorkoutId?: ID },
  ): Promise<PreviousPerformance | null>;
  /** Saves values and marks the set completed (completedAt = now). */
  completeSet(setId: ID, values: { weightKg?: number; reps?: number }): Promise<WorkoutSet>;
  /** Marks a set as not completed again (keeps values). */
  uncompleteSet(setId: ID): Promise<WorkoutSet>;
  /** Sets finishedAt = now (and notes, if given). */
  finishWorkout(workoutId: ID, options?: { notes?: string }): Promise<Workout>;
  getWorkoutSummary(workoutId: ID): Promise<WorkoutSummary>;
  /** Last finished workouts with their stats, most recent first. */
  getRecentWorkouts(limit: number): Promise<WorkoutListItem[]>;
  /** One point per finished session including the exercise, oldest first. */
  getExerciseProgress(exerciseId: ID): Promise<ExerciseProgressPoint[]>;
  /** Last `weeks` weeks including the current one, oldest first (empty weeks included). */
  getWeeklyStats(weeks: number): Promise<WeeklyStat[]>;
  exportAllData(options?: { appVersion?: string }): Promise<ExportPayload>;
  /**
   * Validates and replaces all data with the payload. Rejects with ValidationError on an
   * unknown format or a newer version. Older versions are migrated.
   */
  importAllData(payload: unknown): Promise<ImportResult>;
}

/** Shape of the factory implemented in packages/core/src/services. */
export type CreateDomainServices = (
  repos: Repositories,
  options?: ServiceOptions,
) => DomainServices;
