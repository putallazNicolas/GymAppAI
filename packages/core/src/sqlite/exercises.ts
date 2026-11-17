import {
  LOCAL_USER_ID,
  NotFoundError,
  ValidationError,
  type Exercise,
  type ExerciseRepo,
} from '../contracts';
import {
  buildCustomExercise,
  compareExercises,
  matchesExerciseFilter,
  patchCustomExercise,
} from '../rules';
import { newId } from '../utils';
import type { SqliteContext } from './context';
import { EXERCISES, insertRow, selectAll, selectById, updateRow } from './tables';

export function createExerciseRepo({ db, now }: SqliteContext): ExerciseRepo {
  const get = async (id: string): Promise<Exercise> => {
    const found = await selectById(db, EXERCISES, id);
    if (!found) throw new NotFoundError('Exercise', id);
    return found;
  };
  const getCustom = async (id: string, action: string): Promise<Exercise> => {
    const found = await get(id);
    if (!found.isCustom) throw new ValidationError(`catalog exercises cannot be ${action}`);
    return found;
  };
  const archive = async (current: Exercise): Promise<Exercise> => {
    const next: Exercise = { ...current, archived: true, updatedAt: now() };
    await updateRow(db, EXERCISES, next);
    return next;
  };

  return {
    async list(filter) {
      const all = filter?.muscleGroup
        ? await selectAll(db, EXERCISES, '"muscleGroup" = ?', [filter.muscleGroup])
        : await selectAll(db, EXERCISES);
      // Accent-insensitive search and Spanish collation are done in JS (SQLite lacks both).
      return all.filter((e) => matchesExerciseFilter(e, filter)).sort(compareExercises);
    },

    async getById(id) {
      return selectById(db, EXERCISES, id);
    },

    async getByIds(ids) {
      const result: Exercise[] = [];
      for (const id of ids) {
        const found = await selectById(db, EXERCISES, id);
        if (found) result.push(found);
      }
      return result;
    },

    async create(input) {
      const exercise = buildCustomExercise(input, {
        id: newId(),
        now: now(),
        ownerId: LOCAL_USER_ID,
      });
      await insertRow(db, EXERCISES, exercise);
      return exercise;
    },

    async update(id, patch) {
      const next = patchCustomExercise(await get(id), patch, now());
      await updateRow(db, EXERCISES, next);
      return next;
    },

    async archive(id) {
      return archive(await getCustom(id, 'archived'));
    },

    async delete(id) {
      const current = await getCustom(id, 'deleted');
      const used = await db.first(
        `SELECT 1 AS one FROM planned_exercises WHERE "exerciseId" = ?
         UNION ALL SELECT 1 FROM workout_exercises WHERE "exerciseId" = ? LIMIT 1`,
        [id, id],
      );
      if (used) {
        await archive(current);
        return 'archived';
      }
      await db.run('DELETE FROM exercises WHERE "id" = ?', [id]);
      return 'deleted';
    },
  };
}
