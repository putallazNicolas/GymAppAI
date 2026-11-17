import { EXPORT_FORMAT, EXPORT_VERSION, ValidationError } from '../contracts';
import { legacyPlan, legacyRestSeconds, legacySetReps } from '../legacy';

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Maps the rows of `data[table]` when it is an array; anything else is left for the validator. */
function mapRows(data: Row, table: string, convert: (row: Row) => Row): Row {
  const rows = data[table];
  if (!Array.isArray(rows)) return data;
  return { ...data, [table]: rows.map((row) => (isRow(row) ? convert(row) : row)) };
}

/**
 * v1 -> v2, the same rules as the SQLite migration (see `legacy.ts`):
 * - planned exercises: `sets` + `reps` -> repsMode "same" + `plannedSets`; rest rounded to the
 *   nearest multiple of 15 and clamped to 0..600;
 * - workout exercises: `plannedSetReps` = `plannedSets` copies of `plannedReps`;
 * - exercises: `updatedAt` = `createdAt`.
 * Rows that are malformed are passed through untouched so validation reports them.
 */
export function migrateExportV1ToV2(payload: Row): Row {
  let data = isRow(payload.data) ? payload.data : {};
  data = mapRows(data, 'exercises', (row) =>
    row.updatedAt === undefined && row.createdAt !== undefined
      ? { ...row, updatedAt: row.createdAt }
      : row,
  );
  data = mapRows(data, 'plannedExercises', (row) => {
    const { sets, reps, ...rest } = row;
    if (
      typeof sets !== 'number' ||
      !Number.isInteger(sets) ||
      sets < 1 ||
      typeof reps !== 'string' ||
      reps.trim() === ''
    ) {
      return row;
    }
    const converted: Row = { ...rest, ...legacyPlan(sets, reps) };
    if (typeof row.restSeconds === 'number') {
      converted.restSeconds = legacyRestSeconds(row.restSeconds);
    }
    return converted;
  });
  data = mapRows(data, 'workoutExercises', (row) =>
    typeof row.plannedSets === 'number' &&
    typeof row.plannedReps === 'string' &&
    row.plannedSetReps === undefined
      ? { ...row, plannedSetReps: legacySetReps(row.plannedSets, row.plannedReps) }
      : row,
  );
  return { ...payload, data };
}

/** A step upgrading a payload from version N to N + 1. Receives and returns the whole envelope. */
export type ExportMigrationStep = (payload: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of format upgrades, keyed by the version they upgrade FROM.
 * When bumping EXPORT_VERSION to N + 1, add `N: (payload) => ({ ...payload, data: upgraded })`
 * here; `version` is bumped by the pipeline.
 */
export const EXPORT_MIGRATIONS: Record<number, ExportMigrationStep> = {
  1: migrateExportV1ToV2,
};

/**
 * Validates the envelope (object, format, integer version not newer than `target`) and upgrades
 * older versions step by step to `target`. Does not validate the `data` rows.
 */
export function migrateExportPayload(
  raw: unknown,
  registry: Record<number, ExportMigrationStep> = EXPORT_MIGRATIONS,
  target: number = EXPORT_VERSION,
): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError('payload: must be an object');
  }
  let payload = { ...(raw as Record<string, unknown>) };
  if (payload.format !== EXPORT_FORMAT) {
    throw new ValidationError(`payload.format: expected "${EXPORT_FORMAT}"`);
  }
  let version = payload.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new ValidationError('payload.version: must be a non-negative integer');
  }
  if (version > target) {
    throw new ValidationError(`payload.version: ${version} is newer than supported ${target}`);
  }
  while (version < target) {
    const step = registry[version];
    if (!step) throw new ValidationError(`payload.version: no migration from v${version}`);
    payload = { ...step(payload), version: version + 1 };
    version += 1;
  }
  return payload;
}
