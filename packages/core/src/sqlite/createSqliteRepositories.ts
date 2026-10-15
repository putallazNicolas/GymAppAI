import type { Repositories } from '../contracts';
import { buildSeedExercises } from '../memory';
import type { SqliteContext } from './context';
import { createBackupRepo } from './backup';
import type { SqlDriver } from './driver';
import { inTransaction } from './driver';
import { createExerciseRepo } from './exercises';
import { runMigrations } from './migrations';
import { createRoutineRepo } from './routines';
import { createSettingsRepo } from './settings';
import { EXERCISES } from './tables';
import { createWorkoutRepo } from './workouts';

export interface SqliteRepositoriesOptions {
  /** Insert the exercise catalog if missing (idempotent, by seed id). Default true. */
  seed?: boolean;
  /** Injectable clock for tests. Default `() => new Date()`. */
  now?: () => Date;
}

async function seedExercises(ctx: SqliteContext): Promise<void> {
  const cols = EXERCISES.cols.map((c) => `"${c}"`).join(', ');
  const marks = EXERCISES.cols.map(() => '?').join(', ');
  await inTransaction(ctx.db, async () => {
    for (const e of buildSeedExercises(ctx.now())) {
      await ctx.db.run(`INSERT OR IGNORE INTO exercises (${cols}) VALUES (${marks})`, [
        e.id,
        e.name,
        e.muscleGroup,
        e.equipment ?? null,
        e.isCustom ? 1 : 0,
        e.createdAt,
        e.ownerId,
        e.createdBy,
      ]);
    }
  });
}

/** Runs migrations, optionally seeds the catalog, and returns the repositories. */
export async function createSqliteRepositories(
  driver: SqlDriver,
  options: SqliteRepositoriesOptions = {},
): Promise<Repositories> {
  await runMigrations(driver);
  const clock = options.now ?? (() => new Date());
  const ctx: SqliteContext = { db: driver, now: () => clock().toISOString() };
  if (options.seed ?? true) await seedExercises(ctx);
  return {
    exercises: createExerciseRepo(ctx),
    routines: createRoutineRepo(ctx),
    workouts: createWorkoutRepo(ctx),
    settings: createSettingsRepo(ctx),
    backup: createBackupRepo(ctx),
  };
}
