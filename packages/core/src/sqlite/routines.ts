import {
  LOCAL_USER_ID,
  NotFoundError,
  type ID,
  type NewPlannedExerciseInput,
  type PlannedExercise,
  type Routine,
  type RoutineDay,
  type RoutineDayDetail,
  type RoutineDetail,
  type RoutineRepo,
} from '../contracts';
import {
  applyPatch,
  assertName,
  assertNonNegativeInt,
  assertPositiveInt,
  assertSameIds,
  compact,
} from '../rules';
import { newId } from '../utils';
import type { SqliteContext } from './context';
import { inTransaction } from './driver';
import {
  PLANNED_EXERCISES,
  ROUTINES,
  ROUTINE_DAYS,
  exists,
  fromRow,
  insertRow,
  selectAll,
  selectById,
  updateRow,
} from './tables';

export function createRoutineRepo({ db, now }: SqliteContext): RoutineRepo {
  const getRoutine = async (id: ID): Promise<Routine> => {
    const found = await selectById(db, ROUTINES, id);
    if (!found) throw new NotFoundError('Routine', id);
    return found;
  };
  const getDayRow = async (id: ID): Promise<RoutineDay> => {
    const found = await selectById(db, ROUTINE_DAYS, id);
    if (!found) throw new NotFoundError('RoutineDay', id);
    return found;
  };
  const getPlanned = async (id: ID): Promise<PlannedExercise> => {
    const found = await selectById(db, PLANNED_EXERCISES, id);
    if (!found) throw new NotFoundError('PlannedExercise', id);
    return found;
  };

  const touch = async (routineId: ID): Promise<void> => {
    await db.run('UPDATE routines SET "updatedAt" = ? WHERE "id" = ?', [now(), routineId]);
  };

  const daysOf = (routineId: ID) =>
    selectAll(db, ROUTINE_DAYS, '"routineId" = ?', [routineId], '"order", rowid');
  const plannedOf = (dayId: ID) =>
    selectAll(db, PLANNED_EXERCISES, '"dayId" = ?', [dayId], '"order", rowid');

  const dayDetail = async (day: RoutineDay): Promise<RoutineDayDetail> => ({
    ...day,
    exercises: await plannedOf(day.id),
  });

  const detail = async (routine: Routine): Promise<RoutineDetail> => {
    const days = await daysOf(routine.id);
    return { ...routine, days: await Promise.all(days.map(dayDetail)) };
  };

  /** Rewrites `order` as 0..n-1 following the current order. */
  const renumber = async (
    table: 'routine_days' | 'planned_exercises',
    parentCol: string,
    parentId: ID,
  ) => {
    const rows = await db.all<{ id: string; order: number }>(
      `SELECT "id", "order" FROM ${table} WHERE "${parentCol}" = ? ORDER BY "order", rowid`,
      [parentId],
    );
    for (const [i, row] of rows.entries()) {
      if (row.order !== i)
        await db.run(`UPDATE ${table} SET "order" = ? WHERE "id" = ?`, [i, row.id]);
    }
  };

  return {
    async list(options) {
      const rows = await db.all(
        `SELECT r.*, (SELECT COUNT(*) FROM routine_days d WHERE d."routineId" = r."id") AS "dayCount"
         FROM routines r ${options?.includeArchived ? '' : 'WHERE r."archived" = 0'}
         ORDER BY r."isActive" DESC, r."updatedAt" DESC, r.rowid DESC`,
      );
      return rows.map((row) => ({
        ...fromRow(ROUTINES, row),
        dayCount: Number(row.dayCount),
      }));
    },

    async getById(id) {
      const found = await selectById(db, ROUTINES, id);
      return found ? detail(found) : null;
    },

    async getActive() {
      const [found] = await selectAll(db, ROUTINES, '"isActive" = 1 AND "archived" = 0');
      return found ? detail(found) : null;
    },

    async create(input) {
      const ts = now();
      const routine: Routine = {
        id: newId(),
        name: assertName(input.name),
        isActive: false,
        archived: false,
        createdAt: ts,
        updatedAt: ts,
        ownerId: LOCAL_USER_ID,
        createdBy: LOCAL_USER_ID,
      };
      await insertRow(db, ROUTINES, routine);
      return routine;
    },

    async update(id, patch) {
      const routine = await getRoutine(id);
      if (patch.name !== undefined) routine.name = assertName(patch.name);
      if (patch.archived !== undefined) {
        routine.archived = patch.archived;
        if (patch.archived) routine.isActive = false;
      }
      routine.updatedAt = now();
      await updateRow(db, ROUTINES, routine);
      return routine;
    },

    async setActive(id) {
      if (id !== null) await getRoutine(id);
      await inTransaction(db, async () => {
        await db.run('UPDATE routines SET "isActive" = 0');
        if (id !== null) {
          await db.run('UPDATE routines SET "isActive" = 1, "archived" = 0 WHERE "id" = ?', [id]);
        }
      });
    },

    async duplicate(id) {
      const source = await getRoutine(id);
      const ts = now();
      const copy: Routine = {
        ...source,
        id: newId(),
        name: `${source.name} (copia)`,
        isActive: false,
        archived: false,
        createdAt: ts,
        updatedAt: ts,
      };
      const days = await daysOf(id);
      const planned = await Promise.all(days.map((d) => plannedOf(d.id)));
      await inTransaction(db, async () => {
        await insertRow(db, ROUTINES, copy);
        for (const [i, day] of days.entries()) {
          const dayCopy: RoutineDay = { ...day, id: newId(), routineId: copy.id };
          await insertRow(db, ROUTINE_DAYS, dayCopy);
          for (const p of planned[i] ?? []) {
            await insertRow(db, PLANNED_EXERCISES, { ...p, id: newId(), dayId: dayCopy.id });
          }
        }
      });
      return copy;
    },

    async delete(id) {
      await getRoutine(id);
      // ON DELETE CASCADE removes days and planned exercises; workouts keep (routineId -> NULL).
      await db.run('DELETE FROM routines WHERE "id" = ?', [id]);
    },

    async getDay(dayId) {
      const day = await selectById(db, ROUTINE_DAYS, dayId);
      return day ? dayDetail(day) : null;
    },

    async addDay(routineId, input) {
      await getRoutine(routineId);
      const name = assertName(input.name);
      return inTransaction(db, async () => {
        const day: RoutineDay = {
          id: newId(),
          routineId,
          name,
          order: (await daysOf(routineId)).length,
        };
        await insertRow(db, ROUTINE_DAYS, day);
        await touch(routineId);
        return day;
      });
    },

    async updateDay(dayId, patch) {
      const day = await getDayRow(dayId);
      if (patch.name !== undefined) day.name = assertName(patch.name);
      await inTransaction(db, async () => {
        await updateRow(db, ROUTINE_DAYS, day);
        await touch(day.routineId);
      });
      return day;
    },

    async deleteDay(dayId) {
      const day = await getDayRow(dayId);
      await inTransaction(db, async () => {
        await db.run('DELETE FROM routine_days WHERE "id" = ?', [dayId]);
        await renumber('routine_days', 'routineId', day.routineId);
        await touch(day.routineId);
      });
    },

    async reorderDays(routineId, orderedDayIds) {
      await getRoutine(routineId);
      const days = await daysOf(routineId);
      assertSameIds(
        days.map((d) => d.id),
        orderedDayIds,
        'orderedDayIds',
      );
      await inTransaction(db, async () => {
        for (const [i, id] of orderedDayIds.entries()) {
          await db.run('UPDATE routine_days SET "order" = ? WHERE "id" = ?', [i, id]);
        }
        await touch(routineId);
      });
    },

    async addPlannedExercises(dayId, inputs) {
      const day = await getDayRow(dayId);
      // Validate everything before writing so the call is all-or-nothing.
      const rows: { input: NewPlannedExerciseInput; sets: number; reps: string }[] = [];
      for (const input of inputs) {
        if (!(await exists(db, 'exercises', input.exerciseId))) {
          throw new NotFoundError('Exercise', input.exerciseId);
        }
        const reps = input.reps ?? '10';
        if (reps.trim() === '') assertName(reps, 'reps');
        if (input.restSeconds !== undefined) assertNonNegativeInt(input.restSeconds, 'restSeconds');
        rows.push({ input, sets: assertPositiveInt(input.sets ?? 3, 'sets'), reps });
      }
      return inTransaction(db, async () => {
        const start = (await plannedOf(dayId)).length;
        const created: PlannedExercise[] = [];
        for (const [i, { input, sets, reps }] of rows.entries()) {
          const planned: PlannedExercise = compact({
            id: newId(),
            dayId,
            exerciseId: input.exerciseId,
            order: start + i,
            sets,
            reps,
            restSeconds: input.restSeconds,
            notes: input.notes,
          });
          await insertRow(db, PLANNED_EXERCISES, planned);
          created.push(planned);
        }
        await touch(day.routineId);
        return created;
      });
    },

    async updatePlannedExercise(id, patch) {
      const current = await getPlanned(id);
      if (patch.exerciseId !== undefined && !(await exists(db, 'exercises', patch.exerciseId))) {
        throw new NotFoundError('Exercise', patch.exerciseId);
      }
      if (patch.sets !== undefined) assertPositiveInt(patch.sets, 'sets');
      if (patch.reps !== undefined) assertName(patch.reps, 'reps');
      if (patch.restSeconds !== undefined && patch.restSeconds !== null) {
        assertNonNegativeInt(patch.restSeconds, 'restSeconds');
      }
      const next = applyPatch(current, patch);
      const day = await selectById(db, ROUTINE_DAYS, next.dayId);
      await inTransaction(db, async () => {
        await updateRow(db, PLANNED_EXERCISES, next);
        if (day) await touch(day.routineId);
      });
      return next;
    },

    async deletePlannedExercise(id) {
      const current = await getPlanned(id);
      const day = await selectById(db, ROUTINE_DAYS, current.dayId);
      await inTransaction(db, async () => {
        await db.run('DELETE FROM planned_exercises WHERE "id" = ?', [id]);
        await renumber('planned_exercises', 'dayId', current.dayId);
        if (day) await touch(day.routineId);
      });
    },

    async reorderPlannedExercises(dayId, orderedIds) {
      const day = await getDayRow(dayId);
      assertSameIds(
        (await plannedOf(dayId)).map((p) => p.id),
        orderedIds,
        'orderedIds',
      );
      await inTransaction(db, async () => {
        for (const [i, id] of orderedIds.entries()) {
          await db.run('UPDATE planned_exercises SET "order" = ? WHERE "id" = ?', [i, id]);
        }
        await touch(day.routineId);
      });
    },
  };
}
