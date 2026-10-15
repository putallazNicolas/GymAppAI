import {
  LOCAL_USER_ID,
  NotFoundError,
  ValidationError,
  type Exercise,
  type ExerciseRepo,
  type NewExerciseInput,
} from '../contracts';
import {
  applyPatch,
  assertEquipment,
  assertMuscleGroup,
  assertName,
  compact,
  compareExercises,
  matchesExerciseFilter,
} from '../rules';
import { newId } from '../utils';
import type { MemoryContext } from './state';

export function createExerciseRepo({ state, now }: MemoryContext): ExerciseRepo {
  const get = (id: string): Exercise => {
    const found = state.exercises.get(id);
    if (!found) throw new NotFoundError('Exercise', id);
    return found;
  };

  return {
    async list(filter) {
      return [...state.exercises.values()]
        .filter((e) => matchesExerciseFilter(e, filter))
        .sort(compareExercises)
        .map((e) => ({ ...e }));
    },

    async getById(id) {
      const found = state.exercises.get(id);
      return found ? { ...found } : null;
    },

    async getByIds(ids) {
      const result: Exercise[] = [];
      for (const id of ids) {
        const found = state.exercises.get(id);
        if (found) result.push({ ...found });
      }
      return result;
    },

    async create(input: NewExerciseInput) {
      const exercise: Exercise = compact({
        id: newId(),
        name: assertName(input.name),
        muscleGroup: assertMuscleGroup(input.muscleGroup),
        equipment: input.equipment === undefined ? undefined : assertEquipment(input.equipment),
        isCustom: true,
        createdAt: now(),
        ownerId: LOCAL_USER_ID,
        createdBy: LOCAL_USER_ID,
      });
      state.exercises.set(exercise.id, exercise);
      return { ...exercise };
    },

    async update(id, patch) {
      const current = get(id);
      if (!current.isCustom) throw new ValidationError('catalog exercises cannot be modified');
      if (patch.name !== undefined) assertName(patch.name);
      if (patch.muscleGroup !== undefined) assertMuscleGroup(patch.muscleGroup);
      if (patch.equipment !== undefined && patch.equipment !== null) {
        assertEquipment(patch.equipment);
      }
      const next = applyPatch(current, patch);
      next.name = next.name.trim();
      state.exercises.set(id, next);
      return { ...next };
    },

    async delete(id) {
      const current = get(id);
      if (!current.isCustom) throw new ValidationError('catalog exercises cannot be deleted');
      const inPlan = [...state.plannedExercises.values()].some((p) => p.exerciseId === id);
      const inWorkout = [...state.workoutExercises.values()].some((w) => w.exerciseId === id);
      if (inPlan || inWorkout) {
        throw new ValidationError('exercise is in use by a routine or a workout');
      }
      state.exercises.delete(id);
    },
  };
}
