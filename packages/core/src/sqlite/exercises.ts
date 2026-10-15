import {
  LOCAL_USER_ID,
  NotFoundError,
  ValidationError,
  type Exercise,
  type ExerciseRepo,
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
import type { SqliteContext } from './context';
import { EXERCISES, insertRow, selectAll, selectById, updateRow } from './tables';

export function createExerciseRepo({ db, now }: SqliteContext): ExerciseRepo {
  const get = async (id: string): Promise<Exercise> => {
    const found = await selectById(db, EXERCISES, id);
    if (!found) throw new NotFoundError('Exercise', id);
    return found;
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
      await insertRow(db, EXERCISES, exercise);
      return exercise;
    },

    async update(id, patch) {
      const current = await get(id);
      if (!current.isCustom) throw new ValidationError('catalog exercises cannot be modified');
      if (patch.name !== undefined) assertName(patch.name);
      if (patch.muscleGroup !== undefined) assertMuscleGroup(patch.muscleGroup);
      if (patch.equipment !== undefined && patch.equipment !== null) {
        assertEquipment(patch.equipment);
      }
      const next = applyPatch(current, patch);
      next.name = next.name.trim();
      await updateRow(db, EXERCISES, next);
      return next;
    },

    async delete(id) {
      const current = await get(id);
      if (!current.isCustom) throw new ValidationError('catalog exercises cannot be deleted');
      const used = await db.first(
        `SELECT 1 AS one FROM planned_exercises WHERE "exerciseId" = ?
         UNION ALL SELECT 1 FROM workout_exercises WHERE "exerciseId" = ? LIMIT 1`,
        [id, id],
      );
      if (used) throw new ValidationError('exercise is in use by a routine or a workout');
      await db.run('DELETE FROM exercises WHERE "id" = ?', [id]);
    },
  };
}
