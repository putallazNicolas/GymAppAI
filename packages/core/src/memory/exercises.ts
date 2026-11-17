import {
  LOCAL_USER_ID,
  NotFoundError,
  ValidationError,
  type Exercise,
  type ExerciseRepo,
} from '../contracts';
import {
  buildCustomExercise,
  cloneExercise,
  compareExercises,
  matchesExerciseFilter,
  patchCustomExercise,
} from '../rules';
import { newId } from '../utils';
import type { MemoryContext } from './state';

export function createExerciseRepo({ state, now }: MemoryContext): ExerciseRepo {
  const get = (id: string): Exercise => {
    const found = state.exercises.get(id);
    if (!found) throw new NotFoundError('Exercise', id);
    return found;
  };
  const getCustom = (id: string, action: string): Exercise => {
    const found = get(id);
    if (!found.isCustom) throw new ValidationError(`catalog exercises cannot be ${action}`);
    return found;
  };
  const isUsed = (id: string): boolean =>
    [...state.plannedExercises.values()].some((p) => p.exerciseId === id) ||
    [...state.workoutExercises.values()].some((w) => w.exerciseId === id);

  const archive = (current: Exercise): Exercise => {
    const next: Exercise = { ...current, archived: true, updatedAt: now() };
    state.exercises.set(next.id, next);
    return cloneExercise(next);
  };

  return {
    async list(filter) {
      return [...state.exercises.values()]
        .filter((e) => matchesExerciseFilter(e, filter))
        .sort(compareExercises)
        .map(cloneExercise);
    },

    async getById(id) {
      const found = state.exercises.get(id);
      return found ? cloneExercise(found) : null;
    },

    async getByIds(ids) {
      const result: Exercise[] = [];
      for (const id of ids) {
        const found = state.exercises.get(id);
        if (found) result.push(cloneExercise(found));
      }
      return result;
    },

    async create(input) {
      const exercise = buildCustomExercise(input, {
        id: newId(),
        now: now(),
        ownerId: LOCAL_USER_ID,
      });
      state.exercises.set(exercise.id, exercise);
      return cloneExercise(exercise);
    },

    async update(id, patch) {
      const next = patchCustomExercise(get(id), patch, now());
      state.exercises.set(id, next);
      return cloneExercise(next);
    },

    async archive(id) {
      return archive(getCustom(id, 'archived'));
    },

    async delete(id) {
      const current = getCustom(id, 'deleted');
      if (isUsed(id)) {
        archive(current);
        return 'archived';
      }
      state.exercises.delete(id);
      return 'deleted';
    },
  };
}
