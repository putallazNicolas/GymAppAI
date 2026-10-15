import type { BackupRepo, DataSnapshot } from '../contracts';
import { createEmptyState, fullSettings, type MemoryContext } from './state';

const copyAll = <T extends object>(items: Iterable<T>): T[] => [...items].map((i) => ({ ...i }));

function toMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, { ...i }]));
}

export function createBackupRepo(ctx: MemoryContext): BackupRepo {
  return {
    async snapshot(): Promise<DataSnapshot> {
      const { state } = ctx;
      return {
        exercises: copyAll(state.exercises.values()),
        routines: copyAll(state.routines.values()),
        routineDays: copyAll(state.routineDays.values()),
        plannedExercises: copyAll(state.plannedExercises.values()),
        workouts: copyAll(state.workouts.values()),
        workoutExercises: copyAll(state.workoutExercises.values()),
        workoutSets: copyAll(state.workoutSets.values()),
        settings: fullSettings(state.settings),
      };
    },

    async restore(snapshot) {
      // Build the complete new state first so a malformed snapshot cannot leave a half-restore.
      const next = createEmptyState();
      next.exercises = toMap(snapshot.exercises);
      next.routines = toMap(snapshot.routines);
      next.routineDays = toMap(snapshot.routineDays);
      next.plannedExercises = toMap(snapshot.plannedExercises);
      next.workouts = toMap(snapshot.workouts);
      next.workoutExercises = toMap(snapshot.workoutExercises);
      next.workoutSets = toMap(snapshot.workoutSets);
      next.settings = { ...snapshot.settings };
      Object.assign(ctx.state, next);
    },
  };
}
