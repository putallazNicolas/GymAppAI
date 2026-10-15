import type {
  Exercise,
  PlannedExercise,
  Routine,
  RoutineDay,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../contracts';
import type { SqlDriver, SqlParam } from './driver';

/** Maps an entity type to its table. Column names equal property names. */
export interface TableSpec<T> {
  table: string;
  cols: readonly (keyof T & string)[];
  bools: readonly string[];
}

export const EXERCISES: TableSpec<Exercise> = {
  table: 'exercises',
  cols: ['id', 'name', 'muscleGroup', 'equipment', 'isCustom', 'createdAt', 'ownerId', 'createdBy'],
  bools: ['isCustom'],
};
export const ROUTINES: TableSpec<Routine> = {
  table: 'routines',
  cols: ['id', 'name', 'isActive', 'archived', 'createdAt', 'updatedAt', 'ownerId', 'createdBy'],
  bools: ['isActive', 'archived'],
};
export const ROUTINE_DAYS: TableSpec<RoutineDay> = {
  table: 'routine_days',
  cols: ['id', 'routineId', 'name', 'order'],
  bools: [],
};
export const PLANNED_EXERCISES: TableSpec<PlannedExercise> = {
  table: 'planned_exercises',
  cols: ['id', 'dayId', 'exerciseId', 'order', 'sets', 'reps', 'restSeconds', 'notes'],
  bools: [],
};
export const WORKOUTS: TableSpec<Workout> = {
  table: 'workouts',
  cols: [
    'id',
    'routineId',
    'dayId',
    'dayNameSnapshot',
    'startedAt',
    'finishedAt',
    'notes',
    'ownerId',
    'createdBy',
  ],
  bools: [],
};
export const WORKOUT_EXERCISES: TableSpec<WorkoutExercise> = {
  table: 'workout_exercises',
  cols: [
    'id',
    'workoutId',
    'exerciseId',
    'order',
    'plannedSets',
    'plannedReps',
    'restSeconds',
    'notes',
    'skipped',
  ],
  bools: ['skipped'],
};
export const WORKOUT_SETS: TableSpec<WorkoutSet> = {
  table: 'workout_sets',
  cols: ['id', 'workoutExerciseId', 'setIndex', 'weightKg', 'reps', 'completed', 'completedAt'],
  bools: ['completed'],
};

/** DB row -> entity: NULL becomes an absent key, 0/1 becomes boolean. */
export function fromRow<T>(spec: TableSpec<T>, row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const col of spec.cols) {
    const value = row[col];
    if (value === null || value === undefined) continue;
    out[col] = spec.bools.includes(col) ? value === 1 || value === true : value;
  }
  return out as T;
}

function toParams<T>(spec: TableSpec<T>, entity: T): SqlParam[] {
  const record = entity as Record<string, unknown>;
  return spec.cols.map((col) => {
    const value = record[col];
    if (value === undefined || value === null) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value as SqlParam;
  });
}

const q = (name: string): string => `"${name}"`;

export async function insertRow<T>(db: SqlDriver, spec: TableSpec<T>, entity: T): Promise<void> {
  const cols = spec.cols.map(q).join(', ');
  const marks = spec.cols.map(() => '?').join(', ');
  await db.run(`INSERT INTO ${spec.table} (${cols}) VALUES (${marks})`, toParams(spec, entity));
}

/** Overwrites every column of the row with the entity's values (absent optional -> NULL). */
export async function updateRow<T extends { id: string }>(
  db: SqlDriver,
  spec: TableSpec<T>,
  entity: T,
): Promise<void> {
  const sets = spec.cols
    .filter((c) => c !== 'id')
    .map((c) => `${q(c)} = ?`)
    .join(', ');
  const params = toParams(spec, entity);
  const idIndex = spec.cols.indexOf('id');
  const values = params.filter((_, i) => i !== idIndex);
  await db.run(`UPDATE ${spec.table} SET ${sets} WHERE "id" = ?`, [...values, entity.id]);
}

export async function selectById<T>(
  db: SqlDriver,
  spec: TableSpec<T>,
  id: string,
): Promise<T | null> {
  const row = await db.first(`SELECT * FROM ${spec.table} WHERE "id" = ?`, [id]);
  return row ? fromRow(spec, row) : null;
}

export async function selectAll<T>(
  db: SqlDriver,
  spec: TableSpec<T>,
  where = '',
  params: SqlParam[] = [],
  orderBy = 'rowid',
): Promise<T[]> {
  const rows = await db.all(
    `SELECT * FROM ${spec.table} ${where ? `WHERE ${where}` : ''} ORDER BY ${orderBy}`,
    params,
  );
  return rows.map((r) => fromRow(spec, r));
}

export async function exists(db: SqlDriver, table: string, id: string): Promise<boolean> {
  return (await db.first(`SELECT 1 AS one FROM ${table} WHERE "id" = ?`, [id])) !== null;
}
