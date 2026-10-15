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
import type { MemoryContext } from './state';

export function createRoutineRepo({ state, now }: MemoryContext): RoutineRepo {
  const getRoutine = (id: ID): Routine => {
    const found = state.routines.get(id);
    if (!found) throw new NotFoundError('Routine', id);
    return found;
  };
  const getDayRow = (id: ID): RoutineDay => {
    const found = state.routineDays.get(id);
    if (!found) throw new NotFoundError('RoutineDay', id);
    return found;
  };
  const getPlanned = (id: ID): PlannedExercise => {
    const found = state.plannedExercises.get(id);
    if (!found) throw new NotFoundError('PlannedExercise', id);
    return found;
  };

  const touch = (routineId: ID): void => {
    const routine = state.routines.get(routineId);
    if (routine) routine.updatedAt = now();
  };

  const daysOf = (routineId: ID): RoutineDay[] =>
    [...state.routineDays.values()]
      .filter((d) => d.routineId === routineId)
      .sort((a, b) => a.order - b.order);

  const plannedOf = (dayId: ID): PlannedExercise[] =>
    [...state.plannedExercises.values()]
      .filter((p) => p.dayId === dayId)
      .sort((a, b) => a.order - b.order);

  const dayDetail = (day: RoutineDay): RoutineDayDetail => ({
    ...day,
    exercises: plannedOf(day.id).map((p) => ({ ...p })),
  });

  const detail = (routine: Routine): RoutineDetail => ({
    ...routine,
    days: daysOf(routine.id).map(dayDetail),
  });

  const renumberDays = (routineId: ID): void => {
    daysOf(routineId).forEach((d, i) => {
      d.order = i;
    });
  };
  const renumberPlanned = (dayId: ID): void => {
    plannedOf(dayId).forEach((p, i) => {
      p.order = i;
    });
  };

  const deleteDayCascade = (dayId: ID): void => {
    for (const p of plannedOf(dayId)) state.plannedExercises.delete(p.id);
    state.routineDays.delete(dayId);
    // Past workouts survive without the link to the removed day.
    for (const w of state.workouts.values()) {
      if (w.dayId === dayId) delete w.dayId;
    }
  };

  return {
    async list(options) {
      const all = [...state.routines.values()];
      const visible = options?.includeArchived ? all : all.filter((r) => !r.archived);
      // Array.prototype.sort is stable; reverse first so later-created wins ties.
      return visible
        .reverse()
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
        })
        .map((r) => ({ ...r, dayCount: daysOf(r.id).length }));
    },

    async getById(id) {
      const found = state.routines.get(id);
      return found ? detail(found) : null;
    },

    async getActive() {
      const found = [...state.routines.values()].find((r) => r.isActive && !r.archived);
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
      state.routines.set(routine.id, routine);
      return { ...routine };
    },

    async update(id, patch) {
      const routine = getRoutine(id);
      if (patch.name !== undefined) routine.name = assertName(patch.name);
      if (patch.archived !== undefined) {
        routine.archived = patch.archived;
        if (patch.archived) routine.isActive = false;
      }
      routine.updatedAt = now();
      return { ...routine };
    },

    async setActive(id) {
      if (id === null) {
        for (const r of state.routines.values()) r.isActive = false;
        return;
      }
      const target = getRoutine(id);
      for (const r of state.routines.values()) r.isActive = false;
      target.isActive = true;
      target.archived = false;
    },

    async duplicate(id) {
      const source = getRoutine(id);
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
      state.routines.set(copy.id, copy);
      for (const day of daysOf(id)) {
        const dayCopy: RoutineDay = { ...day, id: newId(), routineId: copy.id };
        state.routineDays.set(dayCopy.id, dayCopy);
        for (const planned of plannedOf(day.id)) {
          const plannedCopy: PlannedExercise = { ...planned, id: newId(), dayId: dayCopy.id };
          state.plannedExercises.set(plannedCopy.id, plannedCopy);
        }
      }
      return { ...copy };
    },

    async delete(id) {
      getRoutine(id);
      for (const day of daysOf(id)) deleteDayCascade(day.id);
      state.routines.delete(id);
      for (const w of state.workouts.values()) {
        if (w.routineId === id) delete w.routineId;
      }
    },

    async getDay(dayId) {
      const day = state.routineDays.get(dayId);
      return day ? dayDetail(day) : null;
    },

    async addDay(routineId, input) {
      getRoutine(routineId);
      const day: RoutineDay = {
        id: newId(),
        routineId,
        name: assertName(input.name),
        order: daysOf(routineId).length,
      };
      state.routineDays.set(day.id, day);
      touch(routineId);
      return { ...day };
    },

    async updateDay(dayId, patch) {
      const day = getDayRow(dayId);
      if (patch.name !== undefined) day.name = assertName(patch.name);
      touch(day.routineId);
      return { ...day };
    },

    async deleteDay(dayId) {
      const day = getDayRow(dayId);
      deleteDayCascade(dayId);
      renumberDays(day.routineId);
      touch(day.routineId);
    },

    async reorderDays(routineId, orderedDayIds) {
      getRoutine(routineId);
      const days = daysOf(routineId);
      assertSameIds(
        days.map((d) => d.id),
        orderedDayIds,
        'orderedDayIds',
      );
      orderedDayIds.forEach((id, i) => {
        const day = state.routineDays.get(id);
        if (day) day.order = i;
      });
      touch(routineId);
    },

    async addPlannedExercises(dayId, inputs: NewPlannedExerciseInput[]) {
      const day = getDayRow(dayId);
      // Validate everything before mutating so the call is all-or-nothing.
      const rows = inputs.map((input) => {
        if (!state.exercises.has(input.exerciseId)) {
          throw new NotFoundError('Exercise', input.exerciseId);
        }
        const reps = input.reps ?? '10';
        if (reps.trim() === '') assertName(reps, 'reps');
        if (input.restSeconds !== undefined) assertNonNegativeInt(input.restSeconds, 'restSeconds');
        return { input, sets: assertPositiveInt(input.sets ?? 3, 'sets'), reps };
      });
      const start = plannedOf(dayId).length;
      const created = rows.map(({ input, sets, reps }, i): PlannedExercise => {
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
        state.plannedExercises.set(planned.id, planned);
        return planned;
      });
      touch(day.routineId);
      return created.map((p) => ({ ...p }));
    },

    async updatePlannedExercise(id, patch) {
      const current = getPlanned(id);
      if (patch.exerciseId !== undefined && !state.exercises.has(patch.exerciseId)) {
        throw new NotFoundError('Exercise', patch.exerciseId);
      }
      if (patch.sets !== undefined) assertPositiveInt(patch.sets, 'sets');
      if (patch.reps !== undefined) assertName(patch.reps, 'reps');
      if (patch.restSeconds !== undefined && patch.restSeconds !== null) {
        assertNonNegativeInt(patch.restSeconds, 'restSeconds');
      }
      const next = applyPatch(current, patch);
      state.plannedExercises.set(id, next);
      const day = state.routineDays.get(next.dayId);
      if (day) touch(day.routineId);
      return { ...next };
    },

    async deletePlannedExercise(id) {
      const current = getPlanned(id);
      state.plannedExercises.delete(id);
      renumberPlanned(current.dayId);
      const day = state.routineDays.get(current.dayId);
      if (day) touch(day.routineId);
    },

    async reorderPlannedExercises(dayId, orderedIds) {
      const day = getDayRow(dayId);
      assertSameIds(
        plannedOf(dayId).map((p) => p.id),
        orderedIds,
        'orderedIds',
      );
      orderedIds.forEach((id, i) => {
        const planned = state.plannedExercises.get(id);
        if (planned) planned.order = i;
      });
      touch(day.routineId);
    },
  };
}
