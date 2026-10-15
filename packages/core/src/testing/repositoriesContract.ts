/**
 * Reusable behavioural suite for any `Repositories` implementation (in-memory, SQLite, ...).
 * Not exported from the package index: it relies on Jest globals.
 */
import {
  DEFAULT_SETTINGS,
  LOCAL_USER_ID,
  NotFoundError,
  ValidationError,
  type Repositories,
  type NewWorkoutInput,
} from '../contracts';

export interface RepositoriesFactoryOptions {
  seed: boolean;
  /** Strictly increasing clock (one second per call). */
  now: () => Date;
}

export type RepositoriesFactory = (
  options: RepositoriesFactoryOptions,
) => Repositories | Promise<Repositories>;

function makeClock(): () => Date {
  let tick = 0;
  const base = Date.UTC(2026, 0, 1);
  return () => new Date(base + 1000 * tick++);
}

export function describeRepositoriesContract(name: string, factory: RepositoriesFactory): void {
  describe(`Repositories contract: ${name}`, () => {
    const make = async (seed = false): Promise<Repositories> => factory({ seed, now: makeClock() });

    // -----------------------------------------------------------------------
    describe('exercises', () => {
      it('create makes a custom exercise owned by the local user', async () => {
        const r = await make();
        const e = await r.exercises.create({
          name: '  Curl 21  ',
          muscleGroup: 'biceps',
          equipment: 'barbell',
        });
        expect(e).toMatchObject({
          name: 'Curl 21',
          muscleGroup: 'biceps',
          equipment: 'barbell',
          isCustom: true,
          ownerId: LOCAL_USER_ID,
          createdBy: LOCAL_USER_ID,
        });
        expect(e.id).toBeTruthy();
        expect(new Date(e.createdAt).toISOString()).toBe(e.createdAt);
        expect(await r.exercises.getById(e.id)).toEqual(e);
      });

      it('create without equipment leaves it absent', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'X', muscleGroup: 'core' });
        expect('equipment' in e).toBe(false);
      });

      it('create rejects an empty name', async () => {
        const r = await make();
        await expect(
          r.exercises.create({ name: '   ', muscleGroup: 'core' }),
        ).rejects.toBeInstanceOf(ValidationError);
      });

      it('getById returns null for unknown ids; getByIds skips them and keeps order', async () => {
        const r = await make();
        const a = await r.exercises.create({ name: 'A', muscleGroup: 'core' });
        const b = await r.exercises.create({ name: 'B', muscleGroup: 'core' });
        expect(await r.exercises.getById('nope')).toBeNull();
        const got = await r.exercises.getByIds([b.id, 'nope', a.id]);
        expect(got.map((e) => e.id)).toEqual([b.id, a.id]);
      });

      it('list sorts by name, accent- and case-insensitively', async () => {
        const r = await make();
        for (const name of ['zeta', 'Ábaco', 'beta', 'Alfa']) {
          await r.exercises.create({ name, muscleGroup: 'core' });
        }
        expect((await r.exercises.list()).map((e) => e.name)).toEqual([
          'Ábaco',
          'Alfa',
          'beta',
          'zeta',
        ]);
      });

      it('list filters by muscle group and by accent-insensitive search', async () => {
        const r = await make();
        await r.exercises.create({ name: 'Press banca', muscleGroup: 'chest' });
        await r.exercises.create({ name: 'Press militar', muscleGroup: 'shoulders' });
        await r.exercises.create({ name: 'Curl de bíceps', muscleGroup: 'biceps' });
        expect((await r.exercises.list({ search: 'PRESS' })).map((e) => e.name)).toEqual([
          'Press banca',
          'Press militar',
        ]);
        expect((await r.exercises.list({ search: 'biceps' })).map((e) => e.name)).toEqual([
          'Curl de bíceps',
        ]);
        expect(
          (await r.exercises.list({ search: 'press', muscleGroup: 'chest' })).map((e) => e.name),
        ).toEqual(['Press banca']);
        expect(await r.exercises.list({ muscleGroup: 'calves' })).toEqual([]);
        expect(await r.exercises.list({ search: 'zzz' })).toEqual([]);
      });

      it('update patches fields; null clears equipment; absent leaves unchanged', async () => {
        const r = await make();
        const e = await r.exercises.create({
          name: 'Old',
          muscleGroup: 'core',
          equipment: 'cable',
        });
        const u1 = await r.exercises.update(e.id, { name: 'New' });
        expect(u1).toMatchObject({ name: 'New', muscleGroup: 'core', equipment: 'cable' });
        const u2 = await r.exercises.update(e.id, { equipment: null, muscleGroup: 'back' });
        expect(u2.muscleGroup).toBe('back');
        expect(u2.equipment).toBeUndefined();
        expect((await r.exercises.getById(e.id))?.equipment).toBeUndefined();
      });

      it('update validates and reports unknown ids', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'A', muscleGroup: 'core' });
        await expect(r.exercises.update(e.id, { name: ' ' })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.exercises.update('nope', { name: 'B' })).rejects.toBeInstanceOf(
          NotFoundError,
        );
      });

      it('catalog exercises cannot be updated or deleted', async () => {
        const r = await make(true);
        const squat = (await r.exercises.list({ search: 'sentadilla' }))[0];
        expect(squat).toBeDefined();
        expect(squat?.isCustom).toBe(false);
        await expect(r.exercises.update(squat!.id, { name: 'x' })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.exercises.delete(squat!.id)).rejects.toBeInstanceOf(ValidationError);
      });

      it('delete removes unused custom exercises and rejects unknown ids', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'A', muscleGroup: 'core' });
        await r.exercises.delete(e.id);
        expect(await r.exercises.getById(e.id)).toBeNull();
        await expect(r.exercises.delete(e.id)).rejects.toBeInstanceOf(NotFoundError);
      });

      it('delete rejects exercises used by a planned exercise or a workout', async () => {
        const r = await make();
        const inPlan = await r.exercises.create({ name: 'P', muscleGroup: 'core' });
        const inWorkout = await r.exercises.create({ name: 'W', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        const [planned] = await r.routines.addPlannedExercises(day.id, [{ exerciseId: inPlan.id }]);
        await expect(r.exercises.delete(inPlan.id)).rejects.toBeInstanceOf(ValidationError);
        await r.routines.deletePlannedExercise(planned!.id);
        await r.exercises.delete(inPlan.id);

        const w = await r.workouts.create(workoutInput([inWorkout.id]));
        await expect(r.exercises.delete(inWorkout.id)).rejects.toBeInstanceOf(ValidationError);
        await r.workouts.delete(w.id);
        await r.exercises.delete(inWorkout.id);
      });

      it('returned objects are copies', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'A', muscleGroup: 'core' });
        e.name = 'mutated';
        (await r.exercises.list())[0]!.name = 'mutated';
        (await r.exercises.getById(e.id))!.name = 'mutated';
        expect((await r.exercises.getById(e.id))?.name).toBe('A');
      });
    });

    // -----------------------------------------------------------------------
    describe('routines', () => {
      it('create starts inactive, unarchived and empty', async () => {
        const r = await make();
        const routine = await r.routines.create({ name: ' Push Pull ' });
        expect(routine).toMatchObject({
          name: 'Push Pull',
          isActive: false,
          archived: false,
          ownerId: LOCAL_USER_ID,
          createdBy: LOCAL_USER_ID,
        });
        const detail = await r.routines.getById(routine.id);
        expect(detail?.days).toEqual([]);
        expect(await r.routines.getById('nope')).toBeNull();
        await expect(r.routines.create({ name: '' })).rejects.toBeInstanceOf(ValidationError);
      });

      it('list: active first, then updatedAt desc; archived excluded unless asked', async () => {
        const r = await make();
        const a = await r.routines.create({ name: 'A' });
        const b = await r.routines.create({ name: 'B' });
        const c = await r.routines.create({ name: 'C' });
        expect((await r.routines.list()).map((x) => x.name)).toEqual(['C', 'B', 'A']);
        await r.routines.update(a.id, { name: 'A2' }); // A becomes most recently updated
        expect((await r.routines.list()).map((x) => x.name)).toEqual(['A2', 'C', 'B']);
        await r.routines.setActive(b.id);
        expect((await r.routines.list()).map((x) => x.name)).toEqual(['B', 'A2', 'C']);
        await r.routines.update(c.id, { archived: true });
        expect((await r.routines.list()).map((x) => x.name)).toEqual(['B', 'A2']);
        const all = await r.routines.list({ includeArchived: true });
        expect(all.map((x) => x.name)).toEqual(['B', 'C', 'A2']); // archiving C bumped updatedAt
      });

      it('list reports dayCount', async () => {
        const r = await make();
        const a = await r.routines.create({ name: 'A' });
        await r.routines.addDay(a.id, { name: 'D1' });
        await r.routines.addDay(a.id, { name: 'D2' });
        expect((await r.routines.list())[0]?.dayCount).toBe(2);
      });

      it('update changes name/archived and validates', async () => {
        const r = await make();
        const a = await r.routines.create({ name: 'A' });
        const updated = await r.routines.update(a.id, { name: 'B', archived: true });
        expect(updated).toMatchObject({ name: 'B', archived: true });
        expect(updated.updatedAt > a.updatedAt).toBe(true);
        await expect(r.routines.update(a.id, { name: '  ' })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.routines.update('nope', { name: 'x' })).rejects.toBeInstanceOf(
          NotFoundError,
        );
      });

      it('setActive is exclusive, can deactivate all, and unarchives', async () => {
        const r = await make();
        const a = await r.routines.create({ name: 'A' });
        const b = await r.routines.create({ name: 'B' });
        expect(await r.routines.getActive()).toBeNull();
        await r.routines.setActive(a.id);
        expect((await r.routines.getActive())?.id).toBe(a.id);
        await r.routines.setActive(b.id);
        expect((await r.routines.getActive())?.id).toBe(b.id);
        expect((await r.routines.getById(a.id))?.isActive).toBe(false);
        await r.routines.setActive(null);
        expect(await r.routines.getActive()).toBeNull();

        await r.routines.update(a.id, { archived: true });
        await r.routines.setActive(a.id);
        const detail = await r.routines.getById(a.id);
        expect(detail).toMatchObject({ isActive: true, archived: false });
        await expect(r.routines.setActive('nope')).rejects.toBeInstanceOf(NotFoundError);
      });

      it('archiving the active routine deactivates it', async () => {
        const r = await make();
        const a = await r.routines.create({ name: 'A' });
        await r.routines.setActive(a.id);
        await r.routines.update(a.id, { archived: true });
        expect(await r.routines.getActive()).toBeNull();
        expect(await r.routines.getById(a.id)).toMatchObject({ isActive: false, archived: true });
      });

      it('days are appended, renamed, reordered and deleted keeping order contiguous', async () => {
        const r = await make();
        const routine = await r.routines.create({ name: 'R' });
        const d1 = await r.routines.addDay(routine.id, { name: 'D1' });
        const d2 = await r.routines.addDay(routine.id, { name: 'D2' });
        const d3 = await r.routines.addDay(routine.id, { name: 'D3' });
        expect([d1.order, d2.order, d3.order]).toEqual([0, 1, 2]);
        expect(d1.routineId).toBe(routine.id);

        const renamed = await r.routines.updateDay(d2.id, { name: 'Piernas' });
        expect(renamed.name).toBe('Piernas');

        await r.routines.reorderDays(routine.id, [d3.id, d1.id, d2.id]);
        const days = (await r.routines.getById(routine.id))!.days;
        expect(days.map((d) => [d.name, d.order])).toEqual([
          ['D3', 0],
          ['D1', 1],
          ['Piernas', 2],
        ]);

        await r.routines.deleteDay(d1.id);
        const after = (await r.routines.getById(routine.id))!.days;
        expect(after.map((d) => [d.name, d.order])).toEqual([
          ['D3', 0],
          ['Piernas', 1],
        ]);
        expect(await r.routines.getDay(d1.id)).toBeNull();
      });

      it('day operations validate input', async () => {
        const r = await make();
        const routine = await r.routines.create({ name: 'R' });
        const d1 = await r.routines.addDay(routine.id, { name: 'D1' });
        const d2 = await r.routines.addDay(routine.id, { name: 'D2' });
        await expect(r.routines.addDay('nope', { name: 'x' })).rejects.toBeInstanceOf(
          NotFoundError,
        );
        await expect(r.routines.addDay(routine.id, { name: ' ' })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.routines.updateDay('nope', { name: 'x' })).rejects.toBeInstanceOf(
          NotFoundError,
        );
        await expect(r.routines.deleteDay('nope')).rejects.toBeInstanceOf(NotFoundError);
        await expect(r.routines.reorderDays('nope', [])).rejects.toBeInstanceOf(NotFoundError);
        await expect(r.routines.reorderDays(routine.id, [d1.id])).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.routines.reorderDays(routine.id, [d1.id, d1.id])).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.routines.reorderDays(routine.id, [d1.id, 'other'])).rejects.toBeInstanceOf(
          ValidationError,
        );
        // nothing changed by the failed attempts
        expect((await r.routines.getById(routine.id))!.days.map((d) => d.id)).toEqual([
          d1.id,
          d2.id,
        ]);
      });

      it('planned exercises: defaults, ordering, getDay detail', async () => {
        const r = await make();
        const e1 = await r.exercises.create({ name: 'E1', muscleGroup: 'core' });
        const e2 = await r.exercises.create({ name: 'E2', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        const created = await r.routines.addPlannedExercises(day.id, [
          { exerciseId: e1.id },
          { exerciseId: e2.id, sets: 5, reps: '8-10', restSeconds: 90, notes: 'slow' },
        ]);
        expect(created[0]).toMatchObject({ exerciseId: e1.id, sets: 3, reps: '10', order: 0 });
        expect(created[0]?.restSeconds).toBeUndefined();
        expect(created[1]).toMatchObject({
          sets: 5,
          reps: '8-10',
          restSeconds: 90,
          notes: 'slow',
          order: 1,
          dayId: day.id,
        });
        const more = await r.routines.addPlannedExercises(day.id, [{ exerciseId: e1.id }]);
        expect(more[0]?.order).toBe(2);
        expect(await r.routines.addPlannedExercises(day.id, [])).toEqual([]);

        const detail = await r.routines.getDay(day.id);
        expect(detail?.exercises.map((p) => p.order)).toEqual([0, 1, 2]);
        expect(detail?.exercises.map((p) => p.exerciseId)).toEqual([e1.id, e2.id, e1.id]);
      });

      it('addPlannedExercises is all-or-nothing and validates', async () => {
        const r = await make();
        const e1 = await r.exercises.create({ name: 'E1', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        await expect(
          r.routines.addPlannedExercises(day.id, [{ exerciseId: e1.id }, { exerciseId: 'nope' }]),
        ).rejects.toBeInstanceOf(NotFoundError);
        await expect(
          r.routines.addPlannedExercises(day.id, [{ exerciseId: e1.id, sets: 0 }]),
        ).rejects.toBeInstanceOf(ValidationError);
        await expect(
          r.routines.addPlannedExercises(day.id, [{ exerciseId: e1.id, reps: ' ' }]),
        ).rejects.toBeInstanceOf(ValidationError);
        await expect(
          r.routines.addPlannedExercises('nope', [{ exerciseId: e1.id }]),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect((await r.routines.getDay(day.id))?.exercises).toEqual([]);
      });

      it('updatePlannedExercise applies patch semantics', async () => {
        const r = await make();
        const e1 = await r.exercises.create({ name: 'E1', muscleGroup: 'core' });
        const e2 = await r.exercises.create({ name: 'E2', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        const [p] = await r.routines.addPlannedExercises(day.id, [
          { exerciseId: e1.id, restSeconds: 60, notes: 'n' },
        ]);
        const u1 = await r.routines.updatePlannedExercise(p!.id, { sets: 4, notes: null });
        expect(u1).toMatchObject({ sets: 4, reps: '10', restSeconds: 60 });
        expect(u1.notes).toBeUndefined();
        const u2 = await r.routines.updatePlannedExercise(p!.id, {
          exerciseId: e2.id,
          reps: 'AMRAP',
          restSeconds: null,
        });
        expect(u2).toMatchObject({ exerciseId: e2.id, reps: 'AMRAP', sets: 4 });
        expect(u2.restSeconds).toBeUndefined();

        await expect(r.routines.updatePlannedExercise(p!.id, { sets: 0 })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(
          r.routines.updatePlannedExercise(p!.id, { exerciseId: 'nope' }),
        ).rejects.toBeInstanceOf(NotFoundError);
        await expect(r.routines.updatePlannedExercise('nope', { sets: 2 })).rejects.toBeInstanceOf(
          NotFoundError,
        );
      });

      it('deletePlannedExercise and reorderPlannedExercises keep order contiguous', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'E', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        const [a, b, c] = await r.routines.addPlannedExercises(day.id, [
          { exerciseId: e.id, notes: 'a' },
          { exerciseId: e.id, notes: 'b' },
          { exerciseId: e.id, notes: 'c' },
        ]);
        await r.routines.reorderPlannedExercises(day.id, [c!.id, a!.id, b!.id]);
        let list = (await r.routines.getDay(day.id))!.exercises;
        expect(list.map((p) => [p.notes, p.order])).toEqual([
          ['c', 0],
          ['a', 1],
          ['b', 2],
        ]);
        await r.routines.deletePlannedExercise(a!.id);
        list = (await r.routines.getDay(day.id))!.exercises;
        expect(list.map((p) => [p.notes, p.order])).toEqual([
          ['c', 0],
          ['b', 1],
        ]);

        await expect(r.routines.reorderPlannedExercises(day.id, [c!.id])).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(
          r.routines.reorderPlannedExercises(day.id, [c!.id, c!.id]),
        ).rejects.toBeInstanceOf(ValidationError);
        await expect(r.routines.reorderPlannedExercises('nope', [])).rejects.toBeInstanceOf(
          NotFoundError,
        );
        await expect(r.routines.deletePlannedExercise('nope')).rejects.toBeInstanceOf(
          NotFoundError,
        );
      });

      it('mutating days or planned exercises bumps the routine updatedAt', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'E', muscleGroup: 'core' });
        const a = await r.routines.create({ name: 'A' });
        await r.routines.create({ name: 'B' });
        const day = await r.routines.addDay(a.id, { name: 'D' });
        expect((await r.routines.list())[0]?.name).toBe('A');
        await r.routines.addPlannedExercises(day.id, [{ exerciseId: e.id }]);
        const detail = await r.routines.getById(a.id);
        expect(detail!.updatedAt > a.updatedAt).toBe(true);
      });

      it('duplicate makes an inactive deep copy named "(copia)"', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'E', muscleGroup: 'core' });
        const src = await r.routines.create({ name: 'Rutina' });
        await r.routines.setActive(src.id);
        const d1 = await r.routines.addDay(src.id, { name: 'D1' });
        const d2 = await r.routines.addDay(src.id, { name: 'D2' });
        await r.routines.addPlannedExercises(d1.id, [
          { exerciseId: e.id, sets: 4, reps: '6', restSeconds: 120, notes: 'x' },
          { exerciseId: e.id },
        ]);
        await r.routines.addPlannedExercises(d2.id, [{ exerciseId: e.id }]);

        const copy = await r.routines.duplicate(src.id);
        expect(copy.name).toBe('Rutina (copia)');
        expect(copy).toMatchObject({ isActive: false, archived: false });
        expect(copy.id).not.toBe(src.id);

        const original = (await r.routines.getById(src.id))!;
        const dup = (await r.routines.getById(copy.id))!;
        expect(original.isActive).toBe(true);
        expect(dup.days.map((d) => [d.name, d.order, d.exercises.length])).toEqual([
          ['D1', 0, 2],
          ['D2', 1, 1],
        ]);
        const strip = (x: typeof original) =>
          x.days.flatMap((d) =>
            d.exercises.map((p) => [p.exerciseId, p.order, p.sets, p.reps, p.restSeconds, p.notes]),
          );
        expect(strip(dup)).toEqual(strip(original));
        const ids = new Set(original.days.flatMap((d) => [d.id, ...d.exercises.map((p) => p.id)]));
        for (const d of dup.days) {
          expect(ids.has(d.id)).toBe(false);
          expect(d.routineId).toBe(copy.id);
          for (const p of d.exercises) {
            expect(ids.has(p.id)).toBe(false);
            expect(p.dayId).toBe(d.id);
          }
        }
        // editing the copy leaves the original untouched
        await r.routines.deleteDay(dup.days[0]!.id);
        expect((await r.routines.getById(src.id))!.days).toHaveLength(2);
        await expect(r.routines.duplicate('nope')).rejects.toBeInstanceOf(NotFoundError);
      });

      it('delete removes the routine, its days and planned exercises but keeps workouts', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'E', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        const [p] = await r.routines.addPlannedExercises(day.id, [{ exerciseId: e.id }]);
        const w = await r.workouts.create({
          ...workoutInput([e.id]),
          routineId: routine.id,
          dayId: day.id,
          dayNameSnapshot: 'D',
        });
        await r.workouts.update(w.id, { finishedAt: '2026-02-01T00:00:00.000Z' });

        await r.routines.delete(routine.id);
        expect(await r.routines.getById(routine.id)).toBeNull();
        expect(await r.routines.getDay(day.id)).toBeNull();
        const snapshot = await r.backup.snapshot();
        expect(snapshot.plannedExercises.some((x) => x.id === p!.id)).toBe(false);
        expect(snapshot.routineDays).toEqual([]);

        const kept = await r.workouts.getById(w.id);
        expect(kept).not.toBeNull();
        expect(kept?.dayNameSnapshot).toBe('D');
        expect(kept?.exercises).toHaveLength(1);
        expect(await r.routines.list({ includeArchived: true })).toEqual([]);
        await expect(r.routines.delete(routine.id)).rejects.toBeInstanceOf(NotFoundError);
      });

      it('deleting a day keeps past workouts', async () => {
        const r = await make();
        const e = await r.exercises.create({ name: 'E', muscleGroup: 'core' });
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'D' });
        const w = await r.workouts.create({
          ...workoutInput([e.id]),
          routineId: routine.id,
          dayId: day.id,
        });
        await r.routines.deleteDay(day.id);
        expect(await r.workouts.getById(w.id)).not.toBeNull();
      });

      it('returned routine objects are copies', async () => {
        const r = await make();
        const routine = await r.routines.create({ name: 'A' });
        await r.routines.addDay(routine.id, { name: 'D' });
        const detail = (await r.routines.getById(routine.id))!;
        detail.name = 'mutated';
        detail.days[0]!.name = 'mutated';
        detail.days.push({ id: 'x', routineId: 'x', name: 'x', order: 9, exercises: [] });
        const again = (await r.routines.getById(routine.id))!;
        expect(again.name).toBe('A');
        expect(again.days.map((d) => d.name)).toEqual(['D']);
      });
    });

    // -----------------------------------------------------------------------
    describe('workouts', () => {
      const setup = async () => {
        const r = await make();
        const e1 = await r.exercises.create({ name: 'E1', muscleGroup: 'core' });
        const e2 = await r.exercises.create({ name: 'E2', muscleGroup: 'core' });
        return { r, e1, e2 };
      };

      it('create builds workout, exercises and sets', async () => {
        const { r, e1, e2 } = await setup();
        const routine = await r.routines.create({ name: 'R' });
        const day = await r.routines.addDay(routine.id, { name: 'Piernas' });
        const w = await r.workouts.create({
          routineId: routine.id,
          dayId: day.id,
          dayNameSnapshot: 'Piernas',
          startedAt: '2026-03-01T10:00:00.000Z',
          exercises: [
            {
              exerciseId: e1.id,
              plannedSets: 2,
              plannedReps: '8-10',
              restSeconds: 90,
              notes: 'tempo',
              sets: [{ weightKg: 50 }, { weightKg: 52.5, reps: 8 }],
            },
            { exerciseId: e2.id, plannedSets: 3, plannedReps: '12', sets: [] },
          ],
        });
        expect(w).toMatchObject({
          routineId: routine.id,
          dayId: day.id,
          dayNameSnapshot: 'Piernas',
          startedAt: '2026-03-01T10:00:00.000Z',
          ownerId: LOCAL_USER_ID,
          createdBy: LOCAL_USER_ID,
        });
        expect(w.finishedAt).toBeUndefined();
        expect(w.exercises.map((x) => [x.exerciseId, x.order, x.skipped])).toEqual([
          [e1.id, 0, false],
          [e2.id, 1, false],
        ]);
        expect(w.exercises[0]).toMatchObject({
          plannedSets: 2,
          plannedReps: '8-10',
          restSeconds: 90,
          notes: 'tempo',
        });
        const sets = w.exercises[0]!.sets;
        expect(sets.map((s) => [s.setIndex, s.weightKg, s.reps, s.completed])).toEqual([
          [0, 50, undefined, false],
          [1, 52.5, 8, false],
        ]);
        expect(w.exercises[1]!.sets).toEqual([]);
        expect(await r.workouts.getById(w.id)).toEqual(w);
        expect(await r.workouts.getById('nope')).toBeNull();
      });

      it('create defaults startedAt to now and rejects unknown references', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create(workoutInput([e1.id]));
        expect(new Date(w.startedAt).toISOString()).toBe(w.startedAt);
        await expect(r.workouts.create(workoutInput(['nope']))).rejects.toBeInstanceOf(
          NotFoundError,
        );
        await expect(
          r.workouts.create({ ...workoutInput([e1.id]), routineId: 'nope' }),
        ).rejects.toBeInstanceOf(NotFoundError);
        await expect(
          r.workouts.create({ ...workoutInput([e1.id]), dayId: 'nope' }),
        ).rejects.toBeInstanceOf(NotFoundError);
        // failed creates leave nothing behind
        expect((await r.backup.snapshot()).workouts).toHaveLength(1);
      });

      it('create can work without a routine (free workout)', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({ ...workoutInput([e1.id]), dayNameSnapshot: 'Libre' });
        expect(w.routineId).toBeUndefined();
        expect(w.dayId).toBeUndefined();
        expect(w.dayNameSnapshot).toBe('Libre');
      });

      it('getInProgress returns the most recent unfinished workout', async () => {
        const { r, e1 } = await setup();
        expect(await r.workouts.getInProgress()).toBeNull();
        const old = await r.workouts.create({
          ...workoutInput([e1.id]),
          startedAt: '2026-01-01T00:00:00.000Z',
        });
        const recent = await r.workouts.create({
          ...workoutInput([e1.id]),
          startedAt: '2026-01-02T00:00:00.000Z',
        });
        expect((await r.workouts.getInProgress())?.id).toBe(recent.id);
        await r.workouts.update(recent.id, { finishedAt: '2026-01-02T01:00:00.000Z' });
        expect((await r.workouts.getInProgress())?.id).toBe(old.id);
        await r.workouts.update(old.id, { finishedAt: '2026-01-01T01:00:00.000Z' });
        expect(await r.workouts.getInProgress()).toBeNull();
      });

      it('update sets finishedAt/notes, and null clears them', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create(workoutInput([e1.id]));
        const u1 = await r.workouts.update(w.id, {
          finishedAt: '2026-05-01T00:00:00.000Z',
          notes: 'good',
        });
        expect(u1).toMatchObject({ finishedAt: '2026-05-01T00:00:00.000Z', notes: 'good' });
        const u2 = await r.workouts.update(w.id, { notes: null });
        expect(u2.notes).toBeUndefined();
        expect(u2.finishedAt).toBe('2026-05-01T00:00:00.000Z');
        const u3 = await r.workouts.update(w.id, { finishedAt: null });
        expect(u3.finishedAt).toBeUndefined();
        await expect(r.workouts.update('nope', { notes: 'x' })).rejects.toBeInstanceOf(
          NotFoundError,
        );
      });

      it('listFinished: finished only, most recent first, with limit/offset/since', async () => {
        const { r, e1 } = await setup();
        const dates = ['2026-01-01', '2026-01-03', '2026-01-02', '2026-01-04'];
        const ids: string[] = [];
        for (const d of dates) {
          const w = await r.workouts.create({
            ...workoutInput([e1.id]),
            startedAt: `${d}T10:00:00.000Z`,
          });
          ids.push(w.id);
        }
        await r.workouts.update(ids[0]!, { finishedAt: '2026-01-01T11:00:00.000Z' });
        await r.workouts.update(ids[1]!, { finishedAt: '2026-01-03T11:00:00.000Z' });
        await r.workouts.update(ids[2]!, { finishedAt: '2026-01-02T11:00:00.000Z' });
        // ids[3] stays in progress
        const all = await r.workouts.listFinished();
        expect(all.map((w) => w.id)).toEqual([ids[1], ids[2], ids[0]]);
        expect((await r.workouts.listFinished({ limit: 2 })).map((w) => w.id)).toEqual([
          ids[1],
          ids[2],
        ]);
        expect((await r.workouts.listFinished({ limit: 1, offset: 1 })).map((w) => w.id)).toEqual([
          ids[2],
        ]);
        expect((await r.workouts.listFinished({ offset: 2 })).map((w) => w.id)).toEqual([ids[0]]);
        expect(
          (await r.workouts.listFinished({ since: '2026-01-02T00:00:00.000Z' })).map((w) => w.id),
        ).toEqual([ids[1], ids[2]]);
      });

      it('getLastFinishedForRoutine returns the latest finished by startedAt', async () => {
        const { r, e1 } = await setup();
        const routine = await r.routines.create({ name: 'R' });
        const other = await r.routines.create({ name: 'O' });
        expect(await r.workouts.getLastFinishedForRoutine(routine.id)).toBeNull();
        const mk = async (routineId: string, startedAt: string, finish: boolean) => {
          const w = await r.workouts.create({ ...workoutInput([e1.id]), routineId, startedAt });
          if (finish) await r.workouts.update(w.id, { finishedAt: startedAt });
          return w;
        };
        await mk(routine.id, '2026-01-01T00:00:00.000Z', true);
        const latest = await mk(routine.id, '2026-01-05T00:00:00.000Z', true);
        await mk(routine.id, '2026-01-09T00:00:00.000Z', false);
        await mk(other.id, '2026-01-10T00:00:00.000Z', true);
        expect((await r.workouts.getLastFinishedForRoutine(routine.id))?.id).toBe(latest.id);
      });

      it('delete removes the workout with its exercises and sets', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({
          ...workoutInput([e1.id]),
          exercises: [
            { exerciseId: e1.id, plannedSets: 1, plannedReps: '5', sets: [{ weightKg: 10 }] },
          ],
        });
        await r.workouts.delete(w.id);
        expect(await r.workouts.getById(w.id)).toBeNull();
        const snap = await r.backup.snapshot();
        expect(snap.workouts).toEqual([]);
        expect(snap.workoutExercises).toEqual([]);
        expect(snap.workoutSets).toEqual([]);
        await expect(r.workouts.delete(w.id)).rejects.toBeInstanceOf(NotFoundError);
      });

      it('updateWorkoutExercise toggles skipped', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create(workoutInput([e1.id]));
        const we = w.exercises[0]!;
        expect((await r.workouts.updateWorkoutExercise(we.id, { skipped: true })).skipped).toBe(
          true,
        );
        expect((await r.workouts.getById(w.id))!.exercises[0]!.skipped).toBe(true);
        expect((await r.workouts.updateWorkoutExercise(we.id, {})).skipped).toBe(true);
        expect((await r.workouts.updateWorkoutExercise(we.id, { skipped: false })).skipped).toBe(
          false,
        );
        await expect(
          r.workouts.updateWorkoutExercise('nope', { skipped: true }),
        ).rejects.toBeInstanceOf(NotFoundError);
      });

      it('addSet appends and copies weightKg (not reps) from the last set', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({
          ...workoutInput([e1.id]),
          exercises: [
            {
              exerciseId: e1.id,
              plannedSets: 2,
              plannedReps: '5',
              sets: [
                { weightKg: 40, reps: 5 },
                { weightKg: 45, reps: 4 },
              ],
            },
            { exerciseId: e1.id, plannedSets: 1, plannedReps: '5', sets: [] },
          ],
        });
        const [withSets, empty] = w.exercises;
        const s = await r.workouts.addSet(withSets!.id);
        expect(s).toMatchObject({ setIndex: 2, weightKg: 45, completed: false });
        expect(s.reps).toBeUndefined();
        expect(s.workoutExerciseId).toBe(withSets!.id);

        const first = await r.workouts.addSet(empty!.id);
        expect(first.setIndex).toBe(0);
        expect(first.weightKg).toBeUndefined();

        const second = await r.workouts.addSet(empty!.id);
        expect(second.setIndex).toBe(1);
        await expect(r.workouts.addSet('nope')).rejects.toBeInstanceOf(NotFoundError);
      });

      it('addSet copies the weight of the last set even when it was edited', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({
          ...workoutInput([e1.id]),
          exercises: [
            { exerciseId: e1.id, plannedSets: 1, plannedReps: '5', sets: [{ weightKg: 40 }] },
          ],
        });
        const we = w.exercises[0]!;
        await r.workouts.updateSet(we.sets[0]!.id, { weightKg: 60 });
        expect((await r.workouts.addSet(we.id)).weightKg).toBe(60);
      });

      it('removeSet re-indexes the remaining sets', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({
          ...workoutInput([e1.id]),
          exercises: [
            {
              exerciseId: e1.id,
              plannedSets: 3,
              plannedReps: '5',
              sets: [{ weightKg: 10 }, { weightKg: 20 }, { weightKg: 30 }],
            },
          ],
        });
        const sets = w.exercises[0]!.sets;
        await r.workouts.removeSet(sets[0]!.id);
        const after = (await r.workouts.getById(w.id))!.exercises[0]!.sets;
        expect(after.map((s) => [s.setIndex, s.weightKg])).toEqual([
          [0, 20],
          [1, 30],
        ]);
        await expect(r.workouts.removeSet(sets[0]!.id)).rejects.toBeInstanceOf(NotFoundError);
      });

      it('updateSet applies patch semantics and validates', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({
          ...workoutInput([e1.id]),
          exercises: [
            {
              exerciseId: e1.id,
              plannedSets: 1,
              plannedReps: '5',
              sets: [{ weightKg: 40, reps: 5 }],
            },
          ],
        });
        const id = w.exercises[0]!.sets[0]!.id;
        const done = await r.workouts.updateSet(id, {
          completed: true,
          completedAt: '2026-01-01T10:05:00.000Z',
          reps: 6,
        });
        expect(done).toMatchObject({
          weightKg: 40,
          reps: 6,
          completed: true,
          completedAt: '2026-01-01T10:05:00.000Z',
        });
        const cleared = await r.workouts.updateSet(id, {
          weightKg: null,
          reps: null,
          completed: false,
          completedAt: null,
        });
        expect(cleared.weightKg).toBeUndefined();
        expect(cleared.reps).toBeUndefined();
        expect(cleared.completedAt).toBeUndefined();
        expect(cleared.completed).toBe(false);
        expect((await r.workouts.updateSet(id, {})).completed).toBe(false);

        await expect(r.workouts.updateSet(id, { weightKg: -1 })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.workouts.updateSet(id, { reps: 1.5 })).rejects.toBeInstanceOf(
          ValidationError,
        );
        await expect(r.workouts.updateSet('nope', { reps: 1 })).rejects.toBeInstanceOf(
          NotFoundError,
        );
      });

      it('getExerciseHistory: finished only, newest first, with options', async () => {
        const { r, e1, e2 } = await setup();
        const mk = async (startedAt: string, exerciseId: string, finish: boolean) => {
          const w = await r.workouts.create({
            ...workoutInput([exerciseId]),
            startedAt,
            exercises: [
              {
                exerciseId,
                plannedSets: 1,
                plannedReps: '5',
                sets: [{ weightKg: 10, reps: 5 }, { weightKg: 20 }],
              },
            ],
          });
          if (finish) await r.workouts.update(w.id, { finishedAt: startedAt });
          return w;
        };
        const w1 = await mk('2026-01-01T00:00:00.000Z', e1.id, true);
        const w2 = await mk('2026-01-03T00:00:00.000Z', e1.id, true);
        await mk('2026-01-02T00:00:00.000Z', e2.id, true);
        const open = await mk('2026-01-04T00:00:00.000Z', e1.id, false);

        const hist = await r.workouts.getExerciseHistory(e1.id);
        expect(hist.map((h) => h.workout.id)).toEqual([w2.id, w1.id]);
        expect(hist[0]?.workoutExercise.exerciseId).toBe(e1.id);
        expect(hist[0]?.sets.map((s) => s.setIndex)).toEqual([0, 1]);

        expect(
          (await r.workouts.getExerciseHistory(e1.id, { limit: 1 })).map((h) => h.workout.id),
        ).toEqual([w2.id]);
        expect(
          (await r.workouts.getExerciseHistory(e1.id, { excludeWorkoutId: w2.id })).map(
            (h) => h.workout.id,
          ),
        ).toEqual([w1.id]);
        expect(
          (await r.workouts.getExerciseHistory(e1.id, { includeInProgress: true })).map(
            (h) => h.workout.id,
          ),
        ).toEqual([open.id, w2.id, w1.id]);
        expect(
          (
            await r.workouts.getExerciseHistory(e1.id, {
              includeInProgress: true,
              excludeWorkoutId: open.id,
              limit: 1,
            })
          ).map((h) => h.workout.id),
        ).toEqual([w2.id]);
        expect(await r.workouts.getExerciseHistory('nope')).toEqual([]);
      });

      it('returned workouts are copies', async () => {
        const { r, e1 } = await setup();
        const w = await r.workouts.create({
          ...workoutInput([e1.id]),
          exercises: [
            { exerciseId: e1.id, plannedSets: 1, plannedReps: '5', sets: [{ weightKg: 10 }] },
          ],
        });
        w.dayNameSnapshot = 'mutated';
        w.exercises[0]!.sets[0]!.weightKg = 999;
        w.exercises[0]!.sets.push({
          id: 'x',
          workoutExerciseId: 'x',
          setIndex: 5,
          completed: false,
        });
        const again = (await r.workouts.getById(w.id))!;
        expect(again.dayNameSnapshot).toBe('Día');
        expect(again.exercises[0]!.sets).toHaveLength(1);
        expect(again.exercises[0]!.sets[0]!.weightKg).toBe(10);
        const inProgress = (await r.workouts.getInProgress())!;
        inProgress.notes = 'mutated';
        expect((await r.workouts.getInProgress())?.notes).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    describe('settings', () => {
      it('returns defaults, merges updates and persists them', async () => {
        const r = await make();
        expect(await r.settings.get()).toEqual(DEFAULT_SETTINGS);
        expect(await r.settings.update({ unit: 'lb' })).toEqual({
          ...DEFAULT_SETTINGS,
          unit: 'lb',
        });
        expect(await r.settings.update({ restTimerEnabled: false })).toEqual({
          unit: 'lb',
          restTimerEnabled: false,
        });
        expect(await r.settings.update({})).toEqual({ unit: 'lb', restTimerEnabled: false });
        expect(await r.settings.get()).toEqual({ unit: 'lb', restTimerEnabled: false });
      });

      it('ignores undefined keys and rejects invalid values', async () => {
        const r = await make();
        await r.settings.update({ unit: 'lb' });
        expect(await r.settings.update({ unit: undefined })).toMatchObject({ unit: 'lb' });
        await expect(
          r.settings.update({ unit: 'stone' as unknown as 'kg' }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect((await r.settings.get()).unit).toBe('lb');
      });

      it('returned settings are copies', async () => {
        const r = await make();
        const s = await r.settings.get();
        s.unit = 'lb';
        expect((await r.settings.get()).unit).toBe('kg');
      });
    });

    // -----------------------------------------------------------------------
    describe('backup', () => {
      it('snapshot of a fresh repo has defaults and the seed (when seeded)', async () => {
        const empty = await (await make()).backup.snapshot();
        expect(empty).toEqual({
          exercises: [],
          routines: [],
          routineDays: [],
          plannedExercises: [],
          workouts: [],
          workoutExercises: [],
          workoutSets: [],
          settings: DEFAULT_SETTINGS,
        });
        const seeded = await (await make(true)).backup.snapshot();
        expect(seeded.exercises.length).toBeGreaterThan(40);
      });

      it('restore replaces everything and round-trips between repositories', async () => {
        const a = await make();
        const e = await a.exercises.create({ name: 'E', muscleGroup: 'core', equipment: 'cable' });
        const routine = await a.routines.create({ name: 'R' });
        await a.routines.setActive(routine.id);
        const day = await a.routines.addDay(routine.id, { name: 'D' });
        await a.routines.addPlannedExercises(day.id, [{ exerciseId: e.id, notes: 'n' }]);
        const w = await a.workouts.create({
          ...workoutInput([e.id]),
          routineId: routine.id,
          dayId: day.id,
          exercises: [
            { exerciseId: e.id, plannedSets: 1, plannedReps: '5', sets: [{ weightKg: 10 }] },
          ],
        });
        await a.settings.update({ unit: 'lb' });
        const snap = await a.backup.snapshot();

        const b = await make(true);
        await b.routines.create({ name: 'will be wiped' });
        await b.settings.update({ restTimerEnabled: false });
        await b.backup.restore(snap);

        expect(await b.backup.snapshot()).toEqual(snap);
        expect((await b.exercises.list()).map((x) => x.id)).toEqual([e.id]);
        expect((await b.routines.list()).map((x) => x.name)).toEqual(['R']);
        expect((await b.routines.getActive())?.days[0]?.exercises[0]?.notes).toBe('n');
        expect(await b.workouts.getById(w.id)).toEqual(await a.workouts.getById(w.id));
        expect(await b.settings.get()).toEqual({ unit: 'lb', restTimerEnabled: true });
      });

      it('restore keeps the repo fully usable afterwards', async () => {
        const a = await make();
        const routine = await a.routines.create({ name: 'R' });
        await a.routines.addDay(routine.id, { name: 'D1' });
        const snap = await a.backup.snapshot();
        const b = await make();
        await b.backup.restore(snap);
        const day = await b.routines.addDay(routine.id, { name: 'D2' });
        expect(day.order).toBe(1);
      });

      it('restoring an empty snapshot wipes all data', async () => {
        const r = await make(true);
        await r.routines.create({ name: 'R' });
        const empty = await (await make()).backup.snapshot();
        await r.backup.restore(empty);
        expect(await r.exercises.list()).toEqual([]);
        expect(await r.routines.list({ includeArchived: true })).toEqual([]);
        expect(await r.settings.get()).toEqual(DEFAULT_SETTINGS);
      });

      it('snapshot and restore do not alias stored state', async () => {
        const r = await make();
        await r.exercises.create({ name: 'E', muscleGroup: 'core' });
        const snap = await r.backup.snapshot();
        snap.exercises[0]!.name = 'mutated';
        expect((await r.exercises.list())[0]?.name).toBe('E');

        const clean = await r.backup.snapshot();
        await r.backup.restore(clean);
        clean.exercises[0]!.name = 'mutated';
        expect((await r.exercises.list())[0]?.name).toBe('E');
      });
    });
  });
}

function workoutInput(exerciseIds: string[]): NewWorkoutInput {
  return {
    dayNameSnapshot: 'Día',
    exercises: exerciseIds.map((exerciseId) => ({
      exerciseId,
      plannedSets: 3,
      plannedReps: '10',
      sets: [],
    })),
  };
}
