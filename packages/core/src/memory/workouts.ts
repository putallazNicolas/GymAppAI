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
import type { MemoryContext } from './state';

export function createWorkoutRepo({ state, now }: MemoryContext): WorkoutRepo {
  const getWorkout = (id: ID): Workout => {
    const found = state.workouts.get(id);
    if (!found) throw new NotFoundError('Workout', id);
    return found;
  };
  const getWorkoutExercise = (id: ID): WorkoutExercise => {
    const found = state.workoutExercises.get(id);
    if (!found) throw new NotFoundError('WorkoutExercise', id);
    return found;
  };
  const getSet = (id: ID): WorkoutSet => {
    const found = state.workoutSets.get(id);
    if (!found) throw new NotFoundError('WorkoutSet', id);
    return found;
  };

  const exercisesOf = (workoutId: ID): WorkoutExercise[] =>
    [...state.workoutExercises.values()]
      .filter((e) => e.workoutId === workoutId)
      .sort((a, b) => a.order - b.order);

  const setsOf = (workoutExerciseId: ID): WorkoutSet[] =>
    [...state.workoutSets.values()]
      .filter((s) => s.workoutExerciseId === workoutExerciseId)
      .sort((a, b) => a.setIndex - b.setIndex);

  const detail = (workout: Workout): WorkoutDetail => ({
    ...workout,
    exercises: exercisesOf(workout.id).map((e) => ({
      ...e,
      sets: setsOf(e.id).map((s) => ({ ...s })),
    })),
  });

  /** Most recent first; ties resolved by creation order (later wins). */
  const byStartedDesc = (workouts: Workout[]): Workout[] =>
    workouts
      .reverse()
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));

  const finished = (): Workout[] =>
    byStartedDesc([...state.workouts.values()].filter((w) => w.finishedAt !== undefined));

  return {
    async create(input) {
      if (input.routineId !== undefined && !state.routines.has(input.routineId)) {
        throw new NotFoundError('Routine', input.routineId);
      }
      if (input.dayId !== undefined && !state.routineDays.has(input.dayId)) {
        throw new NotFoundError('RoutineDay', input.dayId);
      }
      for (const e of input.exercises) {
        if (!state.exercises.has(e.exerciseId)) throw new NotFoundError('Exercise', e.exerciseId);
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
      state.workouts.set(workout.id, workout);

      input.exercises.forEach((e, order) => {
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
        state.workoutExercises.set(we.id, we);
        e.sets.forEach((s, setIndex) => {
          const set: WorkoutSet = compact({
            id: newId(),
            workoutExerciseId: we.id,
            setIndex,
            weightKg: s.weightKg,
            reps: s.reps,
            completed: false,
          });
          state.workoutSets.set(set.id, set);
        });
      });
      return detail(workout);
    },

    async getById(id) {
      const found = state.workouts.get(id);
      return found ? detail(found) : null;
    },

    async getInProgress() {
      const open = byStartedDesc([...state.workouts.values()].filter((w) => !w.finishedAt));
      const first = open[0];
      return first ? { ...first } : null;
    },

    async listFinished(options) {
      let list = finished();
      if (options?.since !== undefined) {
        const since = options.since;
        list = list.filter((w) => w.startedAt >= since);
      }
      const offset = options?.offset ?? 0;
      const end = options?.limit === undefined ? undefined : offset + options.limit;
      return list.slice(offset, end).map((w) => ({ ...w }));
    },

    async getLastFinishedForRoutine(routineId) {
      const found = finished().find((w) => w.routineId === routineId);
      return found ? { ...found } : null;
    },

    async update(id, patch) {
      const next = applyPatch(getWorkout(id), patch);
      state.workouts.set(id, next);
      return { ...next };
    },

    async delete(id) {
      getWorkout(id);
      for (const we of exercisesOf(id)) {
        for (const s of setsOf(we.id)) state.workoutSets.delete(s.id);
        state.workoutExercises.delete(we.id);
      }
      state.workouts.delete(id);
    },

    async updateWorkoutExercise(id, patch) {
      const we = getWorkoutExercise(id);
      if (patch.skipped !== undefined) we.skipped = patch.skipped;
      return { ...we };
    },

    async addSet(workoutExerciseId) {
      getWorkoutExercise(workoutExerciseId);
      const existing = setsOf(workoutExerciseId);
      const last = existing[existing.length - 1];
      const set: WorkoutSet = compact({
        id: newId(),
        workoutExerciseId,
        setIndex: existing.length,
        weightKg: last?.weightKg,
        completed: false,
      });
      state.workoutSets.set(set.id, set);
      return { ...set };
    },

    async removeSet(setId) {
      const set = getSet(setId);
      state.workoutSets.delete(setId);
      setsOf(set.workoutExerciseId).forEach((s, i) => {
        s.setIndex = i;
      });
    },

    async updateSet(setId, patch) {
      const current = getSet(setId);
      if (patch.weightKg !== undefined && patch.weightKg !== null) {
        assertNonNegativeNumber(patch.weightKg, 'weightKg');
      }
      if (patch.reps !== undefined && patch.reps !== null) {
        assertNonNegativeInt(patch.reps, 'reps');
      }
      const next = applyPatch(current, patch);
      state.workoutSets.set(setId, next);
      return { ...next };
    },

    async getExerciseHistory(exerciseId, options) {
      const limit =
        options?.limit === undefined ? undefined : assertPositiveInt(options.limit, 'limit');
      const workouts = byStartedDesc(
        [...state.workouts.values()].filter(
          (w) =>
            w.id !== options?.excludeWorkoutId &&
            (options?.includeInProgress || w.finishedAt !== undefined),
        ),
      );
      const entries: ExerciseHistoryEntry[] = [];
      for (const workout of workouts) {
        for (const we of exercisesOf(workout.id)) {
          if (we.exerciseId !== exerciseId) continue;
          entries.push({
            workout: { ...workout },
            workoutExercise: { ...we },
            sets: setsOf(we.id).map((s) => ({ ...s })),
          });
        }
        if (limit !== undefined && entries.length >= limit) break;
      }
      return limit === undefined ? entries : entries.slice(0, limit);
    },
  };
}
