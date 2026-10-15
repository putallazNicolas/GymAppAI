import { LOCAL_USER_ID, type Exercise, type Repositories } from '../contracts';
import { EXERCISE_SEED, seedExerciseId } from '../seed';
import { createBackupRepo } from './backup';
import { createExerciseRepo } from './exercises';
import { createRoutineRepo } from './routines';
import { createSettingsRepo } from './settings';
import { createEmptyState, type MemoryContext } from './state';
import { createWorkoutRepo } from './workouts';

export interface InMemoryRepositoriesOptions {
  /** Preload the exercise catalog. Default true. */
  seed?: boolean;
  /** Injectable clock for tests. Default `() => new Date()`. */
  now?: () => Date;
}

/** Builds the catalog rows for the seed (deterministic ids `seed-<key>`). */
export function buildSeedExercises(createdAt: string): Exercise[] {
  return EXERCISE_SEED.map((item) => ({
    id: seedExerciseId(item.key),
    name: item.name,
    muscleGroup: item.muscleGroup,
    equipment: item.equipment,
    isCustom: false,
    createdAt,
    ownerId: LOCAL_USER_ID,
    createdBy: LOCAL_USER_ID,
  }));
}

export function createInMemoryRepositories(
  options: InMemoryRepositoriesOptions = {},
): Repositories {
  const clock = options.now ?? (() => new Date());
  const ctx: MemoryContext = {
    state: createEmptyState(),
    now: () => clock().toISOString(),
  };
  if (options.seed ?? true) {
    for (const exercise of buildSeedExercises(ctx.now())) {
      ctx.state.exercises.set(exercise.id, exercise);
    }
  }
  return {
    exercises: createExerciseRepo(ctx),
    routines: createRoutineRepo(ctx),
    workouts: createWorkoutRepo(ctx),
    settings: createSettingsRepo(ctx),
    backup: createBackupRepo(ctx),
  };
}
