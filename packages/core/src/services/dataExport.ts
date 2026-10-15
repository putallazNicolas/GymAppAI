import {
  DEFAULT_SETTINGS,
  EQUIPMENT,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  MUSCLE_GROUPS,
  ValidationError,
  type DataSnapshot,
  type Exercise,
  type ExportPayload,
  type ImportResult,
  type Settings,
} from '../contracts';
import { buildSeedExercises } from '../memory';
import { migrateExportPayload } from './exportMigrations';

type Row = Record<string, unknown>;

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** Field readers bound to one row, producing messages like `workouts[3].startedAt: ...`. */
class RowReader {
  constructor(
    private readonly row: Row,
    private readonly where: string,
  ) {}

  private fail(field: string, why: string): never {
    throw new ValidationError(`${this.where}.${field}: ${why}`);
  }

  private raw(field: string): unknown {
    const v = this.row[field];
    return v === null ? undefined : v;
  }

  string(field: string, opts: { allowEmpty?: boolean } = {}): string {
    const v = this.raw(field);
    if (typeof v !== 'string' || (!opts.allowEmpty && v.trim() === '')) {
      this.fail(field, opts.allowEmpty ? 'must be a string' : 'must be a non-empty string');
    }
    return v;
  }

  optString(field: string): string | undefined {
    return this.raw(field) === undefined ? undefined : this.string(field, { allowEmpty: true });
  }

  bool(field: string): boolean {
    const v = this.raw(field);
    if (typeof v !== 'boolean') this.fail(field, 'must be a boolean');
    return v;
  }

  iso(field: string): string {
    const v = this.raw(field);
    if (typeof v !== 'string' || !ISO_RE.test(v) || Number.isNaN(Date.parse(v))) {
      this.fail(field, 'must be an ISO 8601 date string');
    }
    return v;
  }

  optIso(field: string): string | undefined {
    return this.raw(field) === undefined ? undefined : this.iso(field);
  }

  int(field: string, min: number): number {
    const v = this.raw(field);
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min) {
      this.fail(field, `must be an integer >= ${min}`);
    }
    return v;
  }

  optInt(field: string, min: number): number | undefined {
    return this.raw(field) === undefined ? undefined : this.int(field, min);
  }

  optNumber(field: string, min: number): number | undefined {
    const v = this.raw(field);
    if (v === undefined) return undefined;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min) {
      this.fail(field, `must be a number >= ${min}`);
    }
    return v;
  }

  oneOf<T extends string>(field: string, allowed: readonly T[]): T {
    const v = this.raw(field);
    if (typeof v !== 'string' || !allowed.includes(v as T)) {
      this.fail(field, `must be one of ${allowed.join(', ')}`);
    }
    return v as T;
  }

  optOneOf<T extends string>(field: string, allowed: readonly T[]): T | undefined {
    return this.raw(field) === undefined ? undefined : this.oneOf(field, allowed);
  }
}

/** Drops keys whose value is undefined so optional fields stay truly absent. */
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Validates every row of one table and returns cleaned copies (unknown keys dropped, `null`
 * turned into absent). Also rejects duplicate ids.
 */
function readTable<T extends { id: string }>(
  data: Row,
  table: string,
  read: (r: RowReader, index: number) => T,
): T[] {
  const rows = data[table];
  if (!Array.isArray(rows)) throw new ValidationError(`data.${table}: must be an array`);
  const seen = new Set<string>();
  return rows.map((raw: unknown, index) => {
    const where = `${table}[${index}]`;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new ValidationError(`${where}: must be an object`);
    }
    const reader = new RowReader(raw as Row, where);
    const entity = clean(read(reader, index));
    if (seen.has(entity.id)) throw new ValidationError(`${where}.id: duplicate id "${entity.id}"`);
    seen.add(entity.id);
    return entity;
  });
}

function requireRef(ids: Set<string>, id: string, where: string, field: string, target: string) {
  if (!ids.has(id)) {
    throw new ValidationError(`${where}.${field}: references missing ${target} "${id}"`);
  }
}

function readSettings(raw: unknown): Settings {
  if (raw === undefined || raw === null) return { ...DEFAULT_SETTINGS };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('data.settings: must be an object');
  }
  const r = new RowReader(raw as Row, 'settings');
  return {
    unit: r.optOneOf('unit', ['kg', 'lb'] as const) ?? DEFAULT_SETTINGS.unit,
    restTimerEnabled:
      (raw as Row).restTimerEnabled === undefined
        ? DEFAULT_SETTINGS.restTimerEnabled
        : r.bool('restTimerEnabled'),
  };
}

export interface ValidateOptions {
  /** createdAt given to catalog exercises re-added because the payload lacks them. */
  seedCreatedAt: string;
}

/**
 * Validates the `data` section row by row and checks referential integrity. Returns a clean
 * snapshot, or throws a ValidationError naming the table and row index. Nothing is written here.
 *
 * - `workouts.routineId` / `dayId` pointing to missing rows are dropped (the routine may have
 *   been deleted before exporting).
 * - Catalog exercises (`seed-<key>`) absent from the payload are re-added, so a backup that
 *   predates a catalog update (or was hand-trimmed) never leaves the user without the catalog.
 */
export function validateSnapshot(rawData: unknown, options: ValidateOptions): DataSnapshot {
  if (typeof rawData !== 'object' || rawData === null || Array.isArray(rawData)) {
    throw new ValidationError('data: must be an object');
  }
  const data = rawData as Row;

  const exercises = readTable<Exercise>(data, 'exercises', (r) => ({
    id: r.string('id'),
    name: r.string('name'),
    muscleGroup: r.oneOf('muscleGroup', MUSCLE_GROUPS),
    equipment: r.optOneOf('equipment', EQUIPMENT),
    isCustom: r.bool('isCustom'),
    createdAt: r.iso('createdAt'),
    ownerId: r.string('ownerId'),
    createdBy: r.string('createdBy'),
  }));
  const present = new Set(exercises.map((e) => e.id));
  for (const seed of buildSeedExercises(options.seedCreatedAt)) {
    if (!present.has(seed.id)) exercises.push(seed);
  }
  const exerciseIds = new Set(exercises.map((e) => e.id));

  const routines = readTable(data, 'routines', (r) => ({
    id: r.string('id'),
    name: r.string('name'),
    isActive: r.bool('isActive'),
    archived: r.bool('archived'),
    createdAt: r.iso('createdAt'),
    updatedAt: r.iso('updatedAt'),
    ownerId: r.string('ownerId'),
    createdBy: r.string('createdBy'),
  }));
  routines.forEach((routine, i) => {
    if (routine.isActive && routine.archived) {
      throw new ValidationError(`routines[${i}]: an archived routine cannot be active`);
    }
  });
  if (routines.filter((r) => r.isActive).length > 1) {
    throw new ValidationError('routines: more than one active routine');
  }
  const routineIds = new Set(routines.map((r) => r.id));

  const routineDays = readTable(data, 'routineDays', (r, i) => {
    const day = {
      id: r.string('id'),
      routineId: r.string('routineId'),
      name: r.string('name'),
      order: r.int('order', 0),
    };
    requireRef(routineIds, day.routineId, `routineDays[${i}]`, 'routineId', 'routine');
    return day;
  });
  const dayIds = new Set(routineDays.map((d) => d.id));

  const plannedExercises = readTable(data, 'plannedExercises', (r, i) => {
    const p = {
      id: r.string('id'),
      dayId: r.string('dayId'),
      exerciseId: r.string('exerciseId'),
      order: r.int('order', 0),
      sets: r.int('sets', 1),
      reps: r.string('reps'),
      restSeconds: r.optInt('restSeconds', 0),
      notes: r.optString('notes'),
    };
    requireRef(dayIds, p.dayId, `plannedExercises[${i}]`, 'dayId', 'routine day');
    requireRef(exerciseIds, p.exerciseId, `plannedExercises[${i}]`, 'exerciseId', 'exercise');
    return p;
  });

  const workouts = readTable(data, 'workouts', (r) => {
    const routineId = r.optString('routineId');
    const dayId = r.optString('dayId');
    return {
      id: r.string('id'),
      // Dangling links are dropped: the workout keeps its dayNameSnapshot.
      routineId: routineId !== undefined && routineIds.has(routineId) ? routineId : undefined,
      dayId: dayId !== undefined && dayIds.has(dayId) ? dayId : undefined,
      dayNameSnapshot: r.string('dayNameSnapshot', { allowEmpty: true }),
      startedAt: r.iso('startedAt'),
      finishedAt: r.optIso('finishedAt'),
      notes: r.optString('notes'),
      ownerId: r.string('ownerId'),
      createdBy: r.string('createdBy'),
    };
  });
  const workoutIds = new Set(workouts.map((w) => w.id));

  const workoutExercises = readTable(data, 'workoutExercises', (r, i) => {
    const we = {
      id: r.string('id'),
      workoutId: r.string('workoutId'),
      exerciseId: r.string('exerciseId'),
      order: r.int('order', 0),
      plannedSets: r.int('plannedSets', 0),
      plannedReps: r.string('plannedReps', { allowEmpty: true }),
      restSeconds: r.optInt('restSeconds', 0),
      notes: r.optString('notes'),
      skipped: r.bool('skipped'),
    };
    requireRef(workoutIds, we.workoutId, `workoutExercises[${i}]`, 'workoutId', 'workout');
    requireRef(exerciseIds, we.exerciseId, `workoutExercises[${i}]`, 'exerciseId', 'exercise');
    return we;
  });
  const workoutExerciseIds = new Set(workoutExercises.map((w) => w.id));

  const workoutSets = readTable(data, 'workoutSets', (r, i) => {
    const s = {
      id: r.string('id'),
      workoutExerciseId: r.string('workoutExerciseId'),
      setIndex: r.int('setIndex', 0),
      weightKg: r.optNumber('weightKg', 0),
      reps: r.optInt('reps', 0),
      completed: r.bool('completed'),
      completedAt: r.optIso('completedAt'),
    };
    requireRef(
      workoutExerciseIds,
      s.workoutExerciseId,
      `workoutSets[${i}]`,
      'workoutExerciseId',
      'workout exercise',
    );
    return s;
  });

  return {
    exercises,
    routines,
    routineDays,
    plannedExercises,
    workouts,
    workoutExercises,
    workoutSets,
    settings: readSettings(data.settings),
  };
}

/** Full pipeline: envelope check + version migration + row validation. */
export function parseImportPayload(payload: unknown, options: ValidateOptions): DataSnapshot {
  const migrated = migrateExportPayload(payload);
  return validateSnapshot(migrated.data, options);
}

export function buildExportPayload(
  data: DataSnapshot,
  exportedAt: string,
  appVersion?: string,
): ExportPayload {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    ...(appVersion !== undefined ? { appVersion } : {}),
    data,
  };
}

export function importResultOf(snapshot: DataSnapshot): ImportResult {
  return {
    exercises: snapshot.exercises.length,
    routines: snapshot.routines.length,
    workouts: snapshot.workouts.length,
  };
}

/** e.g. "gym-app-backup-2026-10-15.json" (the date in the device's local time). */
export function exportFileName(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `gym-app-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
