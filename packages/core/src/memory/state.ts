import {
  DEFAULT_SETTINGS,
  type Exercise,
  type ID,
  type PlannedExercise,
  type Routine,
  type RoutineDay,
  type Settings,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from '../contracts';

/** Plain in-memory tables, shared by all in-memory repositories of one instance. */
export interface MemoryState {
  exercises: Map<ID, Exercise>;
  routines: Map<ID, Routine>;
  routineDays: Map<ID, RoutineDay>;
  plannedExercises: Map<ID, PlannedExercise>;
  workouts: Map<ID, Workout>;
  workoutExercises: Map<ID, WorkoutExercise>;
  workoutSets: Map<ID, WorkoutSet>;
  settings: Partial<Settings>;
}

export interface MemoryContext {
  state: MemoryState;
  /** Current time as ISO string. */
  now: () => string;
}

export function createEmptyState(): MemoryState {
  return {
    exercises: new Map(),
    routines: new Map(),
    routineDays: new Map(),
    plannedExercises: new Map(),
    workouts: new Map(),
    workoutExercises: new Map(),
    workoutSets: new Map(),
    settings: {},
  };
}

export function fullSettings(stored: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...stored };
}
