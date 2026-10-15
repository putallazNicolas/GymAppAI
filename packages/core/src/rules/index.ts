/**
 * Backend-agnostic business rules (validation, sorting, patch semantics, ordering).
 * Pure functions so the in-memory and SQLite repositories behave identically.
 */
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  ValidationError,
  type Equipment,
  type Exercise,
  type ExerciseFilter,
  type ID,
  type MuscleGroup,
  type Settings,
} from '../contracts';
import { normalizeText } from '../utils';

export function assertName(name: unknown, label = 'name'): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new ValidationError(`${label} must not be empty`);
  }
  return name.trim();
}

export function assertMuscleGroup(value: unknown): MuscleGroup {
  if (!MUSCLE_GROUPS.includes(value as MuscleGroup)) {
    throw new ValidationError(`invalid muscleGroup: ${String(value)}`);
  }
  return value as MuscleGroup;
}

export function assertEquipment(value: unknown): Equipment {
  if (!EQUIPMENT.includes(value as Equipment)) {
    throw new ValidationError(`invalid equipment: ${String(value)}`);
  }
  return value as Equipment;
}

export function assertPositiveInt(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ValidationError(`${label} must be an integer >= 1`);
  }
  return value;
}

export function assertNonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${label} must be a number >= 0`);
  }
  return value;
}

export function assertNonNegativeInt(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${label} must be an integer >= 0`);
  }
  return value;
}

export function assertSettingsPatch(patch: Partial<Settings>): void {
  if (patch.unit !== undefined && patch.unit !== 'kg' && patch.unit !== 'lb') {
    throw new ValidationError(`invalid unit: ${String(patch.unit)}`);
  }
  if (patch.restTimerEnabled !== undefined && typeof patch.restTimerEnabled !== 'boolean') {
    throw new ValidationError('restTimerEnabled must be a boolean');
  }
}

/**
 * Applies a patch following the repository rules: absent/undefined = unchanged,
 * null = clear (key removed), anything else = set.
 */
export function applyPatch<T extends object>(base: T, patch: object): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) delete result[key];
    else result[key] = value;
  }
  return result as T;
}

/** Copy of an object with `undefined` values dropped (keeps optional fields truly absent). */
export function compact<T extends object>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}

const collator = new Intl.Collator('es', { sensitivity: 'base' });

export function compareExercises(a: Exercise, b: Exercise): number {
  const byName = collator.compare(normalizeText(a.name), normalizeText(b.name));
  return byName !== 0 ? byName : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function matchesExerciseFilter(exercise: Exercise, filter?: ExerciseFilter): boolean {
  if (!filter) return true;
  if (filter.muscleGroup && exercise.muscleGroup !== filter.muscleGroup) return false;
  if (filter.search) {
    const needle = normalizeText(filter.search.trim());
    if (needle && !normalizeText(exercise.name).includes(needle)) return false;
  }
  return true;
}

/** Throws unless `ordered` contains exactly the ids in `expected` (no duplicates, none missing). */
export function assertSameIds(expected: ID[], ordered: ID[], label: string): void {
  const set = new Set(ordered);
  if (
    ordered.length !== expected.length ||
    set.size !== ordered.length ||
    !expected.every((id) => set.has(id))
  ) {
    throw new ValidationError(`${label} must contain exactly the existing ids`);
  }
}
