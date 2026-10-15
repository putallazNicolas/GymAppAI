import {
  DEFAULT_SETTINGS,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  ValidationError,
  type DataSnapshot,
  type ExportPayload,
  type ImportResult,
} from '../contracts';

const TABLES = [
  'exercises',
  'routines',
  'routineDays',
  'plannedExercises',
  'workouts',
  'workoutExercises',
  'workoutSets',
] as const;

/** Validates an unknown import payload and returns a snapshot ready for `restore`. */
export function parseImportPayload(payload: unknown): DataSnapshot {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('import payload must be an object');
  }
  const p = payload as Record<string, unknown>;
  if (p.format !== EXPORT_FORMAT) throw new ValidationError('unknown export format');
  if (typeof p.version !== 'number' || !Number.isInteger(p.version) || p.version < 1) {
    throw new ValidationError('invalid export version');
  }
  if (p.version > EXPORT_VERSION) {
    throw new ValidationError(`export version ${p.version} is newer than supported`);
  }
  // Migrations from older versions would go here (none yet: only v1 exists).
  const data = p.data;
  if (typeof data !== 'object' || data === null) throw new ValidationError('missing data');
  const d = data as Record<string, unknown>;
  for (const table of TABLES) {
    if (!Array.isArray(d[table])) throw new ValidationError(`data.${table} must be an array`);
  }
  if (d.settings !== undefined && (typeof d.settings !== 'object' || d.settings === null)) {
    throw new ValidationError('data.settings must be an object');
  }
  return {
    ...(d as unknown as DataSnapshot),
    settings: { ...DEFAULT_SETTINGS, ...(d.settings as object | undefined) },
  };
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
