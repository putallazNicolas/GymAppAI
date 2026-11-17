/**
 * Backend-agnostic business rules (validation, sorting, patch semantics, ordering).
 * Pure functions so the in-memory and SQLite repositories behave identically.
 */
import {
  EQUIPMENT,
  EXERCISE_NAME_MAX_LENGTH,
  MUSCLE_GROUPS,
  NAME_MAX_LENGTH,
  ValidationError,
  type Equipment,
  type Exercise,
  type ExerciseFilter,
  type ID,
  type MuscleGroup,
  type NewExerciseInput,
  type NewPlannedExerciseInput,
  type Patch,
  type PlannedExercise,
  type PlannedExercisePatch,
  type Settings,
  type WorkoutExercise,
} from '../contracts';
import { normalizeText } from '../utils';

import { assertRestSeconds, defaultPlan, normalizePlan } from '../plan';

/** Trims `name`; it can't be empty nor longer than `max` characters (ValidationError). */
export function assertName(name: unknown, label = 'name', max?: number): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new ValidationError(`${label} must not be empty`);
  }
  const trimmed = name.trim();
  if (max !== undefined && trimmed.length > max) {
    throw new ValidationError(`${label} must be at most ${max} characters`);
  }
  return trimmed;
}

/** Routine and day names: trimmed, 1..NAME_MAX_LENGTH. */
export function assertRoutineName(name: unknown, label = 'name'): string {
  return assertName(name, label, NAME_MAX_LENGTH);
}

const COPY_SUFFIX = ' (copia)';

/**
 * Name of a duplicated routine: "<name> (copia)". The base is truncated so the result still fits
 * NAME_MAX_LENGTH (otherwise duplicating a long name would produce an invalid one).
 */
export function copyName(name: string): string {
  const base = name.slice(0, NAME_MAX_LENGTH - COPY_SUFFIX.length).trimEnd();
  return `${base}${COPY_SUFFIX}`;
}

/** Deduplicated, valid secondary muscle groups without the primary one; `undefined` when none. */
export function normalizeSecondary(
  value: unknown,
  primary: MuscleGroup,
): MuscleGroup[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ValidationError('secondaryMuscleGroups must be an array');
  const result: MuscleGroup[] = [];
  for (const group of value) {
    assertMuscleGroup(group);
    if (group !== primary && !result.includes(group)) result.push(group);
  }
  return result.length > 0 ? result : undefined;
}

/** Trimmed notes; blank notes are treated as absent. */
export function normalizeNotes(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('notes must be a string');
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Builds a new custom exercise (everything validated and normalized). */
export function buildCustomExercise(
  input: NewExerciseInput,
  fixed: { id: ID; now: string; ownerId: ID },
): Exercise {
  const muscleGroup = assertMuscleGroup(input.muscleGroup);
  return compact({
    id: fixed.id,
    name: assertName(input.name, 'name', EXERCISE_NAME_MAX_LENGTH),
    muscleGroup,
    secondaryMuscleGroups: normalizeSecondary(input.secondaryMuscleGroups, muscleGroup),
    equipment: input.equipment === undefined ? undefined : assertEquipment(input.equipment),
    notes: normalizeNotes(input.notes),
    isCustom: true,
    createdAt: fixed.now,
    updatedAt: fixed.now,
    ownerId: fixed.ownerId,
    createdBy: fixed.ownerId,
  });
}

/** Applies a validated patch to a custom exercise and bumps `updatedAt`. */
export function patchCustomExercise(
  current: Exercise,
  patch: Patch<NewExerciseInput>,
  now: string,
): Exercise {
  if (!current.isCustom) throw new ValidationError('catalog exercises cannot be modified');
  const muscleGroup =
    patch.muscleGroup === undefined ? current.muscleGroup : assertMuscleGroup(patch.muscleGroup);
  const secondary =
    patch.secondaryMuscleGroups === undefined
      ? current.secondaryMuscleGroups
      : patch.secondaryMuscleGroups;
  const equipment = patch.equipment === undefined ? current.equipment : patch.equipment;
  const notes = patch.notes === undefined ? current.notes : patch.notes;
  return compact({
    ...current,
    name:
      patch.name === undefined
        ? current.name
        : assertName(patch.name, 'name', EXERCISE_NAME_MAX_LENGTH),
    muscleGroup,
    secondaryMuscleGroups: normalizeSecondary(secondary, muscleGroup),
    equipment: equipment === null ? undefined : equipment && assertEquipment(equipment),
    notes: normalizeNotes(notes),
    updatedAt: now,
  });
}

export function cloneExercise(e: Exercise): Exercise {
  return e.secondaryMuscleGroups
    ? { ...e, secondaryMuscleGroups: [...e.secondaryMuscleGroups] }
    : { ...e };
}

export function clonePlannedExercise(p: PlannedExercise): PlannedExercise {
  return { ...p, plannedSets: p.plannedSets.map((s) => ({ ...s })) };
}

export function cloneWorkoutExercise(w: WorkoutExercise): WorkoutExercise {
  return { ...w, plannedSetReps: [...w.plannedSetReps] };
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

/** `plannedSetReps` of a workout snapshot: an array of strings. */
export function assertSetRepsList(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new ValidationError('plannedSetReps must be an array of strings');
  }
  return value as string[];
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
  if (!filter) return !exercise.archived;
  if (filter.muscleGroup && exercise.muscleGroup !== filter.muscleGroup) return false;
  if (filter.customOnly && !exercise.isCustom) return false;
  if (!filter.includeArchived && exercise.archived) return false;
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

/** Validated plan fields for a new planned exercise (defaults to 3 × "10", "same"). */
export function buildPlannedFields(input: NewPlannedExerciseInput): {
  repsMode: PlannedExercise['repsMode'];
  plannedSets: PlannedExercise['plannedSets'];
  restSeconds: number | undefined;
  notes: string | undefined;
} {
  const plan = normalizePlan({
    repsMode: input.repsMode ?? 'same',
    plannedSets: input.plannedSets ?? defaultPlan().plannedSets,
  });
  return {
    ...plan,
    restSeconds: assertRestSeconds(input.restSeconds),
    notes: input.notes,
  };
}

/**
 * Applies a planned-exercise patch (the caller checks the exerciseId reference). The plan is
 * validated as a whole after merging, so e.g. switching to "same" requires equal reps.
 */
export function patchPlannedExercise(
  current: PlannedExercise,
  patch: PlannedExercisePatch,
): PlannedExercise {
  const plan = normalizePlan({
    repsMode: patch.repsMode ?? current.repsMode,
    plannedSets: patch.plannedSets ?? current.plannedSets,
  });
  if (patch.restSeconds !== undefined && patch.restSeconds !== null) {
    assertRestSeconds(patch.restSeconds);
  }
  return applyPatch(
    { ...current, ...plan },
    { ...patch, repsMode: undefined, plannedSets: undefined },
  );
}
