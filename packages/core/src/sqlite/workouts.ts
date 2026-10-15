import {
  LOCAL_USER_ID,
  NotFoundError,
  type ExerciseHistoryEntry,
  type ID,
  type Workout,
  type WorkoutDetail,
  type WorkoutExercise,
  type WorkoutRepo,
  type WorkoutSet,
} from '../contracts';
import {
  applyPatch,
  assertNonNegativeInt,
  assertNonNegativeNumber,
  assertPositiveInt,
  compact,
} from '../rules';
import { newId } from '../utils';
import type { SqliteContext } from './context';
import { inTransaction, type SqlParam } from './driver';
import {
  WORKOUTS,
  WORKOUT_EXERCISES,
  WORKOUT_SETS,
  exists,
  fromRow,
  insertRow,
  selectAll,
  selectById,
  updateRow,
} from './tables';

/** Most recent first; ties resolved by creation order (later wins), like the in-memory repo. */
const RECENT_FIRST = '"startedAt" DESC, rowid DESC';

export function createWorkoutRepo({ db, now }: SqliteContext): WorkoutRepo {
  const getWorkout = async (id: ID): Promise<Workout> => {
    const found = await selectById(db, WORKOUTS, id);
    if (!found) throw new NotFoundError('Workout', id);
    return found;
  };
  const getWorkoutExercise = async (id: ID): Promise<WorkoutExercise> => {
    const found = await selectById(db, WORKOUT_EXERCISES, id);
    if (!found) throw new NotFoundError('WorkoutExercise', id);
    return found;
  };
  const getSet = async (id: ID): Promise<WorkoutSet> => {
    const found = await selectById(db, WORKOUT_SETS, id);
    if (!found) throw new NotFoundError('WorkoutSet', id);
    return found;
  };

  const setsOf = (workoutExerciseId: ID) =>
    selectAll(
      db,
      WORKOUT_SETS,
      '"workoutExerciseId" = ?',
      [workoutExerciseId],
      '"setIndex", rowid',
    );

  const detail = async (workout: Workout): Promise<WorkoutDetail> => {
    const exercises = await selectAll(
      db,
      WORKOUT_EXERCISES,
      '"workoutId" = ?',
      [workout.id],
      '"order", rowid',
    );
    const withSets = [];
    for (const e of exercises) withSets.push({ ...e, sets: await setsOf(e.id) });
    return { ...workout, exercises: withSets };
  };

  return {
    async create(input) {
      if (input.routineId !== undefined && !(await exists(db, 'routines', input.routineId))) {
        throw new NotFoundError('Routine', input.routineId);
      }
      if (input.dayId !== undefined && !(await exists(db, 'routine_days', input.dayId))) {
        throw new NotFoundError('RoutineDay', input.dayId);
      }
      for (const e of input.exercises) {
        if (!(await exists(db, 'exercises', e.exerciseId))) {
          throw new NotFoundError('Exercise', e.exerciseId);
        }
        assertNonNegativeInt(e.plannedSets, 'plannedSets');
        if (e.restSeconds !== undefined) assertNonNegativeInt(e.restSeconds, 'restSeconds');
        for (const s of e.sets) {
          if (s.weightKg !== undefined) assertNonNegativeNumber(s.weightKg, 'weightKg');
          if (s.reps !== undefined) assertNonNegativeInt(s.reps, 'reps');
        }
      }

      const workout: Workout = compact({
        id: newId(),
        routineId: input.routineId,
        dayId: input.dayId,
        dayNameSnapshot: input.dayNameSnapshot,
        startedAt: input.startedAt ?? now(),
        ownerId: LOCAL_USER_ID,
        createdBy: LOCAL_USER_ID,
      });
      return inTransaction(db, async () => {
        await insertRow(db, WORKOUTS, workout);
        for (const [order, e] of input.exercises.entries()) {
          const we: WorkoutExercise = compact({
            id: newId(),
            workoutId: workout.id,
            exerciseId: e.exerciseId,
            order,
            plannedSets: e.plannedSets,
            plannedReps: e.plannedReps,
            restSeconds: e.restSeconds,
            notes: e.notes,
            skipped: false,
          });
          await insertRow(db, WORKOUT_EXERCISES, we);
          for (const [setIndex, s] of e.sets.entries()) {
            const set: WorkoutSet = compact({
              id: newId(),
              workoutExerciseId: we.id,
              setIndex,
              weightKg: s.weightKg,
              reps: s.reps,
              completed: false,
            });
            await insertRow(db, WORKOUT_SETS, set);
          }
        }
        return detail(workout);
      });
    },

    async getById(id) {
      const found = await selectById(db, WORKOUTS, id);
      return found ? detail(found) : null;
    },

    async getInProgress() {
      const [found] = await selectAll(db, WORKOUTS, '"finishedAt" IS NULL', [], RECENT_FIRST);
      return found ?? null;
    },

    async listFinished(options) {
      const params: SqlParam[] = [];
      let where = '"finishedAt" IS NOT NULL';
      if (options?.since !== undefined) {
        where += ' AND "startedAt" >= ?';
        params.push(options.since);
      }
      const rows = await db.all(
        `SELECT * FROM workouts WHERE ${where} ORDER BY ${RECENT_FIRST} LIMIT ? OFFSET ?`,
        [...params, options?.limit ?? -1, options?.offset ?? 0],
      );
      return rows.map((r) => fromRow(WORKOUTS, r));
    },

    async getLastFinishedForRoutine(routineId) {
      const [found] = await selectAll(
        db,
        WORKOUTS,
        '"finishedAt" IS NOT NULL AND "routineId" = ?',
        [routineId],
        RECENT_FIRST,
      );
      return found ?? null;
    },

    async update(id, patch) {
      const next = applyPatch(await getWorkout(id), patch);
      await updateRow(db, WORKOUTS, next);
      return next;
    },

    async delete(id) {
      await getWorkout(id);
      // Exercises and sets go with it through ON DELETE CASCADE.
      await db.run('DELETE FROM workouts WHERE "id" = ?', [id]);
    },

    async updateWorkoutExercise(id, patch) {
      const we = await getWorkoutExercise(id);
      if (patch.skipped !== undefined) we.skipped = patch.skipped;
      await updateRow(db, WORKOUT_EXERCISES, we);
      return we;
    },

    async addSet(workoutExerciseId) {
      await getWorkoutExercise(workoutExerciseId);
      return inTransaction(db, async () => {
        const existing = await setsOf(workoutExerciseId);
        const last = existing[existing.length - 1];
        const set: WorkoutSet = compact({
          id: newId(),
          workoutExerciseId,
          setIndex: existing.length,
          weightKg: last?.weightKg,
          completed: false,
        });
        await insertRow(db, WORKOUT_SETS, set);
        return set;
      });
    },

    async removeSet(setId) {
      const set = await getSet(setId);
      await inTransaction(db, async () => {
        await db.run('DELETE FROM workout_sets WHERE "id" = ?', [setId]);
        for (const [i, s] of (await setsOf(set.workoutExerciseId)).entries()) {
          if (s.setIndex !== i) {
            await db.run('UPDATE workout_sets SET "setIndex" = ? WHERE "id" = ?', [i, s.id]);
          }
        }
      });
    },

    async updateSet(setId, patch) {
      const current = await getSet(setId);
      if (patch.weightKg !== undefined && patch.weightKg !== null) {
        assertNonNegativeNumber(patch.weightKg, 'weightKg');
      }
      if (patch.reps !== undefined && patch.reps !== null) {
        assertNonNegativeInt(patch.reps, 'reps');
      }
      const next = applyPatch(current, patch);
      await updateRow(db, WORKOUT_SETS, next);
      return next;
    },

    async getExerciseHistory(exerciseId, options) {
      const limit =
        options?.limit === undefined ? undefined : assertPositiveInt(options.limit, 'limit');
      const params: SqlParam[] = [exerciseId];
      let where = 'we."exerciseId" = ?';
      if (!options?.includeInProgress) where += ' AND w."finishedAt" IS NOT NULL';
      if (options?.excludeWorkoutId !== undefined) {
        where += ' AND w."id" <> ?';
        params.push(options.excludeWorkoutId);
      }
      const rows = await db.all(
        `SELECT we.* FROM workout_exercises we JOIN workouts w ON w."id" = we."workoutId"
         WHERE ${where} ORDER BY w."startedAt" DESC, w.rowid DESC, we."order", we.rowid
         LIMIT ?`,
        [...params, limit ?? -1],
      );
      const workouts = new Map<ID, Workout>();
      const entries: ExerciseHistoryEntry[] = [];
      for (const row of rows) {
        const we = fromRow(WORKOUT_EXERCISES, row);
        let workout = workouts.get(we.workoutId);
        if (!workout) {
          workout = await getWorkout(we.workoutId);
          workouts.set(workout.id, workout);
        }
        entries.push({ workout: { ...workout }, workoutExercise: we, sets: await setsOf(we.id) });
      }
      return entries;
    },
  };
}
