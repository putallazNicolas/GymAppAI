import type { SqlDriver } from './driver';

export interface Migration {
  /** Strictly increasing, starting at 1. */
  version: number;
  /** Statements applied in order. */
  up: string[];
}

/**
 * Schema history. Never edit an applied migration: append a new one.
 * Conventions: booleans are INTEGER 0/1, optional values are NULL, timestamps are ISO TEXT,
 * weights are REAL kilograms. Column names match entity property names (quoted).
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE exercises (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "muscleGroup" TEXT NOT NULL,
        "equipment" TEXT,
        "isCustom" INTEGER NOT NULL,
        "createdAt" TEXT NOT NULL,
        "ownerId" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL
      )`,
      `CREATE TABLE routines (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "isActive" INTEGER NOT NULL,
        "archived" INTEGER NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        "ownerId" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL
      )`,
      `CREATE TABLE routine_days (
        "id" TEXT PRIMARY KEY NOT NULL,
        "routineId" TEXT NOT NULL REFERENCES routines("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "order" INTEGER NOT NULL
      )`,
      `CREATE TABLE planned_exercises (
        "id" TEXT PRIMARY KEY NOT NULL,
        "dayId" TEXT NOT NULL REFERENCES routine_days("id") ON DELETE CASCADE,
        "exerciseId" TEXT NOT NULL REFERENCES exercises("id") ON DELETE RESTRICT,
        "order" INTEGER NOT NULL,
        "sets" INTEGER NOT NULL,
        "reps" TEXT NOT NULL,
        "restSeconds" INTEGER,
        "notes" TEXT
      )`,
      `CREATE TABLE workouts (
        "id" TEXT PRIMARY KEY NOT NULL,
        "routineId" TEXT REFERENCES routines("id") ON DELETE SET NULL,
        "dayId" TEXT REFERENCES routine_days("id") ON DELETE SET NULL,
        "dayNameSnapshot" TEXT NOT NULL,
        "startedAt" TEXT NOT NULL,
        "finishedAt" TEXT,
        "notes" TEXT,
        "ownerId" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL
      )`,
      `CREATE TABLE workout_exercises (
        "id" TEXT PRIMARY KEY NOT NULL,
        "workoutId" TEXT NOT NULL REFERENCES workouts("id") ON DELETE CASCADE,
        "exerciseId" TEXT NOT NULL REFERENCES exercises("id") ON DELETE RESTRICT,
        "order" INTEGER NOT NULL,
        "plannedSets" INTEGER NOT NULL,
        "plannedReps" TEXT NOT NULL,
        "restSeconds" INTEGER,
        "notes" TEXT,
        "skipped" INTEGER NOT NULL
      )`,
      `CREATE TABLE workout_sets (
        "id" TEXT PRIMARY KEY NOT NULL,
        "workoutExerciseId" TEXT NOT NULL REFERENCES workout_exercises("id") ON DELETE CASCADE,
        "setIndex" INTEGER NOT NULL,
        "weightKg" REAL,
        "reps" INTEGER,
        "completed" INTEGER NOT NULL,
        "completedAt" TEXT
      )`,
      `CREATE TABLE settings (
        "key" TEXT PRIMARY KEY NOT NULL,
        "value" TEXT NOT NULL
      )`,
      `CREATE INDEX idx_exercises_name ON exercises("name")`,
      `CREATE INDEX idx_routines_active ON routines("isActive", "updatedAt")`,
      `CREATE INDEX idx_routine_days_routine ON routine_days("routineId", "order")`,
      `CREATE INDEX idx_planned_day ON planned_exercises("dayId", "order")`,
      `CREATE INDEX idx_planned_exercise ON planned_exercises("exerciseId")`,
      `CREATE INDEX idx_workouts_started ON workouts("startedAt")`,
      `CREATE INDEX idx_workouts_routine ON workouts("routineId", "startedAt")`,
      `CREATE INDEX idx_workouts_day ON workouts("dayId")`,
      `CREATE INDEX idx_workout_exercises_workout ON workout_exercises("workoutId", "order")`,
      `CREATE INDEX idx_workout_exercises_exercise ON workout_exercises("exerciseId")`,
      `CREATE INDEX idx_workout_sets_we ON workout_sets("workoutExerciseId", "setIndex")`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

/**
 * Brings the database to the latest schema. The applied version is tracked with
 * `PRAGMA user_version` (transactional in SQLite, so a failed migration leaves it untouched).
 * Safe to call on every app start. Throws if the database is newer than this code.
 */
export async function runMigrations(
  db: SqlDriver,
  migrations: Migration[] = MIGRATIONS,
): Promise<number> {
  // Not a no-op in SQLite: it must be set per connection and cannot change inside a transaction.
  await db.exec('PRAGMA foreign_keys = ON');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  const latest = migrations[migrations.length - 1]?.version ?? 0;
  if (current > latest) {
    throw new Error(`database schema v${current} is newer than supported v${latest}`);
  }
  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.transaction(async () => {
      for (const statement of migration.up) await db.run(statement);
      // PRAGMA does not accept bound parameters; version is a trusted integer.
      await db.exec(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }
  return latest;
}
