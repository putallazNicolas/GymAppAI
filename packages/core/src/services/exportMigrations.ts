import { EXPORT_FORMAT, EXPORT_VERSION, ValidationError } from '../contracts';

/** A step upgrading a payload from version N to N + 1. Receives and returns the whole envelope. */
export type ExportMigrationStep = (payload: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of format upgrades, keyed by the version they upgrade FROM.
 * Only version 1 exists today, so it is empty. When bumping EXPORT_VERSION to N + 1, add
 * `N: (payload) => ({ ...payload, data: upgraded })` here; `version` is bumped by the pipeline.
 */
export const EXPORT_MIGRATIONS: Record<number, ExportMigrationStep> = {};

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
