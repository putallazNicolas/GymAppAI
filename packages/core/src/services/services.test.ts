import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  NotFoundError,
  ValidationError,
  type Repositories,
} from '../contracts';
import { createInMemoryRepositories } from '../memory';
import { createSqliteRepositories } from '../sqlite';
import { createSqlJsDriver } from '../testing/sqlJsDriver';
import { createDomainServices } from './index';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Local-time date builder so weekly tests do not depend on the runner's timezone. */
const local = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min);

type Build = (now: () => Date) => Promise<Repositories>;
const BACKENDS: [string, Build][] = [
  ['in-memory', async (now) => createInMemoryRepositories({ seed: false, now })],
  [
    'sqlite',
    async (now) => createSqliteRepositories(await createSqlJsDriver(), { seed: false, now }),
  ],
];

describe.each(BACKENDS)('domain services on %s', (_name, build) => {
  async function setup(start = local(2026, 3, 4)) {
    // 2026-03-04 is a Wednesday.
    let current = start;
    const now = () => current;
    const repos = await build(now);
    const services = createDomainServices(repos, { now });
    return {
      repos,
      services,
      set: (d: Date) => {
        current = d;
      },
      advance: (ms: number) => {
        current = new Date(current.getTime() + ms);
      },
      get now() {
        return current;
      },
    };
  }
  type Ctx = Awaited<ReturnType<typeof setup>>;

  async function fixture(
    ctx: Ctx,
    daySpecs: { name: string; exercises: string[] }[] = [
      { name: 'Día A', exercises: ['Sentadilla', 'Prensa'] },
      { name: 'Día B', exercises: ['Press banca'] },
      { name: 'Día C', exercises: ['Dominadas'] },
    ],
  ) {
    const { repos } = ctx;
    const exercises: Record<string, string> = {};
    const routine = await repos.routines.create({ name: 'Rutina' });
    const dayIds: string[] = [];
    for (const spec of daySpecs) {
      const day = await repos.routines.addDay(routine.id, { name: spec.name });
      dayIds.push(day.id);
      for (const name of spec.exercises) {
        if (!exercises[name]) {
          exercises[name] = (await repos.exercises.create({ name, muscleGroup: 'quads' })).id;
        }
        await repos.routines.addPlannedExercises(day.id, [
          { exerciseId: exercises[name]!, sets: 3, reps: '8-10', restSeconds: 90, notes: 'n' },
        ]);
      }
    }
    await repos.routines.setActive(routine.id);
    return { routine, dayIds, exercises };
  }

  /** Starts a workout from a day, completes the given sets of the first exercise, finishes. */
  async function train(
    ctx: Ctx,
    dayId: string,
    sets: { weightKg: number; reps: number }[],
    durationMs = 45 * MIN,
  ) {
    const w = await ctx.services.startWorkoutFromDay(dayId);
    const we = w.exercises[0]!;
    for (let i = 0; i < sets.length; i++) {
      let set = we.sets[i];
      if (!set) set = await ctx.repos.workouts.addSet(we.id);
      await ctx.services.completeSet(set.id, sets[i]!);
    }
    ctx.advance(durationMs);
    const finished = await ctx.services.finishWorkout(w.id);
    ctx.advance(DAY);
    return { id: w.id, workout: finished, detail: w };
  }

  describe('startWorkoutFromDay', () => {
    it('snapshots the day into a workout with empty sets', async () => {
      const ctx = await setup();
      const { routine, dayIds, exercises } = await fixture(ctx);
      const w = await ctx.services.startWorkoutFromDay(dayIds[0]!);
      expect(w).toMatchObject({
        routineId: routine.id,
        dayId: dayIds[0],
        dayNameSnapshot: 'Día A',
        startedAt: ctx.now.toISOString(),
      });
      expect(w.finishedAt).toBeUndefined();
      expect(w.exercises.map((e) => e.exerciseId)).toEqual([
        exercises['Sentadilla'],
        exercises['Prensa'],
      ]);
      expect(w.exercises[0]).toMatchObject({
        plannedSets: 3,
        plannedReps: '8-10',
        restSeconds: 90,
        notes: 'n',
        skipped: false,
      });
      for (const e of w.exercises) {
        expect(e.sets).toHaveLength(3);
        for (const s of e.sets) {
          expect(s.weightKg).toBeUndefined();
          expect(s.reps).toBeUndefined();
          expect(s.completed).toBe(false);
        }
      }
    });

    it('rejects when a workout is in progress and for unknown days', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      await expect(ctx.services.startWorkoutFromDay('nope')).rejects.toBeInstanceOf(NotFoundError);
      await ctx.services.startWorkoutFromDay(dayIds[0]!);
      await expect(ctx.services.startWorkoutFromDay(dayIds[1]!)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('prefills weight from the previous performance (same index, else last set)', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      await train(ctx, dayIds[0]!, [
        { weightKg: 100, reps: 8 },
        { weightKg: 105, reps: 6 },
      ]);
      const w = await ctx.services.startWorkoutFromDay(dayIds[0]!);
      expect(w.exercises[0]!.sets.map((s) => s.weightKg)).toEqual([100, 105, 105]);
      expect(w.exercises[0]!.sets.every((s) => s.reps === undefined)).toBe(true);
      // second exercise had no completed sets before: nothing to prefill
      expect(w.exercises[1]!.sets.every((s) => s.weightKg === undefined)).toBe(true);
    });
  });

  describe('getPreviousPerformance', () => {
    it('returns the last finished session with completed sets only', async () => {
      const ctx = await setup();
      const { dayIds, exercises } = await fixture(ctx);
      expect(await ctx.services.getPreviousPerformance(exercises['Sentadilla']!)).toBeNull();
      await train(ctx, dayIds[0]!, [{ weightKg: 80, reps: 10 }]);
      const second = await train(ctx, dayIds[0]!, [
        { weightKg: 90, reps: 8 },
        { weightKg: 95, reps: 5 },
      ]);
      const prev = await ctx.services.getPreviousPerformance(exercises['Sentadilla']!);
      expect(prev?.workoutId).toBe(second.id);
      expect(prev?.date).toBe(second.detail.startedAt);
      // 3 sets existed, only 2 completed
      expect(prev?.sets).toEqual([
        { setIndex: 0, weightKg: 90, reps: 8 },
        { setIndex: 1, weightKg: 95, reps: 5 },
      ]);
      const excluded = await ctx.services.getPreviousPerformance(exercises['Sentadilla']!, {
        excludeWorkoutId: second.id,
      });
      expect(excluded?.sets).toEqual([{ setIndex: 0, weightKg: 80, reps: 10 }]);
    });

    it('ignores in-progress workouts and sessions without completed sets', async () => {
      const ctx = await setup();
      const { dayIds, exercises } = await fixture(ctx);
      const good = await train(ctx, dayIds[0]!, [{ weightKg: 50, reps: 5 }]);
      await train(ctx, dayIds[0]!, []); // finished, nothing completed
      await ctx.services.startWorkoutFromDay(dayIds[0]!); // in progress
      const prev = await ctx.services.getPreviousPerformance(exercises['Sentadilla']!);
      expect(prev?.workoutId).toBe(good.id);
    });
  });

  describe('set and workout lifecycle', () => {
    it('completeSet stores values and completedAt; uncompleteSet keeps values', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      const w = await ctx.services.startWorkoutFromDay(dayIds[0]!);
      const setId = w.exercises[0]!.sets[0]!.id;
      const done = await ctx.services.completeSet(setId, { weightKg: 60, reps: 10 });
      expect(done).toMatchObject({
        weightKg: 60,
        reps: 10,
        completed: true,
        completedAt: ctx.now.toISOString(),
      });
      const undone = await ctx.services.uncompleteSet(setId);
      expect(undone).toMatchObject({ weightKg: 60, reps: 10, completed: false });
      expect(undone.completedAt).toBeUndefined();
      // completing with no values keeps what was prefilled
      const again = await ctx.services.completeSet(setId, {});
      expect(again).toMatchObject({ weightKg: 60, reps: 10, completed: true });
      await expect(ctx.services.completeSet('nope', {})).rejects.toBeInstanceOf(NotFoundError);
      await expect(ctx.services.uncompleteSet('nope')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('finishWorkout sets finishedAt and optional notes', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      const w = await ctx.services.startWorkoutFromDay(dayIds[0]!);
      ctx.advance(30 * MIN);
      const f = await ctx.services.finishWorkout(w.id, { notes: 'buena' });
      expect(f.finishedAt).toBe(ctx.now.toISOString());
      expect(f.notes).toBe('buena');
      expect(await ctx.repos.workouts.getInProgress()).toBeNull();
      await expect(ctx.services.finishWorkout('nope')).rejects.toBeInstanceOf(NotFoundError);

      const w2 = await ctx.services.startWorkoutFromDay(dayIds[1]!);
      const f2 = await ctx.services.finishWorkout(w2.id);
      expect(f2.notes).toBeUndefined();
    });
  });

  describe('getSuggestedNextDay', () => {
    it('is null without an active routine or without days', async () => {
      const ctx = await setup();
      expect(await ctx.services.getSuggestedNextDay()).toBeNull();
      const r = await ctx.repos.routines.create({ name: 'Vacía' });
      await ctx.repos.routines.setActive(r.id);
      expect(await ctx.services.getSuggestedNextDay()).toBeNull();
    });

    it('starts at the first day, rotates, wraps around and lists exercises in order', async () => {
      const ctx = await setup();
      const { routine, dayIds, exercises } = await fixture(ctx);
      let s = await ctx.services.getSuggestedNextDay();
      expect(s?.day.id).toBe(dayIds[0]);
      expect(s?.routine.id).toBe(routine.id);
      expect(s?.routine).not.toHaveProperty('days');
      expect(s?.exercises.map((e) => e.id)).toEqual([exercises['Sentadilla'], exercises['Prensa']]);

      await train(ctx, dayIds[0]!, []);
      expect((await ctx.services.getSuggestedNextDay())?.day.id).toBe(dayIds[1]);
      await train(ctx, dayIds[1]!, []);
      expect((await ctx.services.getSuggestedNextDay())?.day.id).toBe(dayIds[2]);
      await train(ctx, dayIds[2]!, []);
      s = await ctx.services.getSuggestedNextDay();
      expect(s?.day.id).toBe(dayIds[0]);
    });

    it('ignores in-progress workouts and falls back to the first day if the last day was deleted', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      await train(ctx, dayIds[1]!, []);
      await ctx.services.startWorkoutFromDay(dayIds[2]!); // in progress: not counted
      expect((await ctx.services.getSuggestedNextDay())?.day.id).toBe(dayIds[2]);
      const open = await ctx.repos.workouts.getInProgress();
      await ctx.services.finishWorkout(open!.id);
      await ctx.repos.routines.deleteDay(dayIds[2]!);
      expect((await ctx.services.getSuggestedNextDay())?.day.id).toBe(dayIds[0]);
    });
  });

  describe('getWorkoutSummary', () => {
    it('computes duration, counts and volume', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      const t = await train(
        ctx,
        dayIds[0]!,
        [
          { weightKg: 100, reps: 5 },
          { weightKg: 100, reps: 5 },
        ],
        3_725_900,
      );
      const s = await ctx.services.getWorkoutSummary(t.id);
      expect(s.workout.id).toBe(t.id);
      expect(s.durationSeconds).toBe(3725);
      expect(s.completedSets).toBe(2);
      expect(s.totalSets).toBe(6);
      expect(s.volumeKg).toBe(1000);
      expect(s.exerciseCount).toBe(1);
      expect(s.exercises).toHaveLength(2);
      expect(s.exercises[0]).toMatchObject({
        exerciseName: 'Sentadilla',
        completedSets: 2,
        totalSets: 3,
        volumeKg: 1000,
        skipped: false,
      });
      expect(s.exercises[1]).toMatchObject({ exerciseName: 'Prensa', completedSets: 0 });
      expect(s.exercises[1]!.bestSet).toBeUndefined();
      expect(s.personalRecords).toEqual([]);
    });

    it('uses now for in-progress workouts and ignores sets missing weight or reps in volume', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      const w = await ctx.services.startWorkoutFromDay(dayIds[0]!);
      const sets = w.exercises[0]!.sets;
      await ctx.services.completeSet(sets[0]!.id, { weightKg: 50 }); // no reps
      await ctx.services.completeSet(sets[1]!.id, { reps: 10 }); // no weight
      await ctx.services.completeSet(sets[2]!.id, { weightKg: 20, reps: 10 });
      ctx.advance(10 * MIN);
      const s = await ctx.services.getWorkoutSummary(w.id);
      expect(s.durationSeconds).toBe(600);
      expect(s.completedSets).toBe(3);
      expect(s.volumeKg).toBe(200);
      expect(s.exercises[0]!.bestSet).toEqual({
        weightKg: 20,
        reps: 10,
        e1rmKg: 20 * (1 + 10 / 30),
      });
      await expect(ctx.services.getWorkoutSummary('nope')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('picks the best set by e1RM, ties going to the heavier set', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      // 90x3 -> 99 ; 100x1 -> 100 ; 80x6 -> 96
      const a = await train(ctx, dayIds[0]!, [
        { weightKg: 90, reps: 3 },
        { weightKg: 100, reps: 1 },
        { weightKg: 80, reps: 6 },
      ]);
      const sa = await ctx.services.getWorkoutSummary(a.id);
      expect(sa.exercises[0]!.bestSet).toMatchObject({ weightKg: 100, reps: 1, e1rmKg: 100 });
      // 60x20 -> 100 ties with 100x1 -> heavier wins
      const b = await train(ctx, dayIds[0]!, [
        { weightKg: 60, reps: 20 },
        { weightKg: 100, reps: 1 },
      ]);
      const sb = await ctx.services.getWorkoutSummary(b.id);
      expect(sb.exercises[0]!.bestSet).toMatchObject({ weightKg: 100, reps: 1 });
    });

    it('reports personal records only against previous history', async () => {
      const ctx = await setup();
      const { dayIds, exercises } = await fixture(ctx);
      const first = await train(ctx, dayIds[0]!, [{ weightKg: 100, reps: 5 }]);
      expect((await ctx.services.getWorkoutSummary(first.id)).personalRecords).toEqual([]);

      // heavier + higher e1RM
      const second = await train(ctx, dayIds[0]!, [{ weightKg: 110, reps: 5 }]);
      const prs = (await ctx.services.getWorkoutSummary(second.id)).personalRecords;
      expect(prs).toEqual([
        {
          exerciseId: exercises['Sentadilla'],
          exerciseName: 'Sentadilla',
          type: 'weight',
          valueKg: 110,
          previousKg: 100,
        },
        {
          exerciseId: exercises['Sentadilla'],
          exerciseName: 'Sentadilla',
          type: 'e1rm',
          valueKg: 110 * (1 + 5 / 30),
          previousKg: 100 * (1 + 5 / 30),
        },
      ]);

      // lighter but more reps: e1RM PR only (105x10 = 140 > 128.3), no weight PR
      const third = await train(ctx, dayIds[0]!, [{ weightKg: 105, reps: 10 }]);
      const prs3 = (await ctx.services.getWorkoutSummary(third.id)).personalRecords;
      expect(prs3.map((p) => p.type)).toEqual(['e1rm']);

      // equal performance is not a PR
      const fourth = await train(ctx, dayIds[0]!, [{ weightKg: 105, reps: 10 }]);
      expect((await ctx.services.getWorkoutSummary(fourth.id)).personalRecords).toEqual([]);
    });

    it('compares only against workouts that started earlier', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      const first = await train(ctx, dayIds[0]!, [{ weightKg: 100, reps: 5 }]);
      await train(ctx, dayIds[0]!, [{ weightKg: 200, reps: 5 }]);
      // the first workout is not a PR relative to a *later* heavier one, and has no earlier history
      expect((await ctx.services.getWorkoutSummary(first.id)).personalRecords).toEqual([]);
    });
  });

  describe('history queries', () => {
    it('getRecentWorkouts lists finished workouts newest first with stats', async () => {
      const ctx = await setup();
      const { dayIds } = await fixture(ctx);
      expect(await ctx.services.getRecentWorkouts(5)).toEqual([]);
      const a = await train(ctx, dayIds[0]!, [{ weightKg: 10, reps: 10 }], 20 * MIN);
      const b = await train(ctx, dayIds[1]!, [{ weightKg: 20, reps: 5 }], 30 * MIN);
      await ctx.services.startWorkoutFromDay(dayIds[2]!); // in progress, excluded
      const list = await ctx.services.getRecentWorkouts(10);
      expect(list.map((i) => i.workout.id)).toEqual([b.id, a.id]);
      expect(list[0]).toMatchObject({ durationSeconds: 1800, volumeKg: 100, completedSets: 1 });
      expect(list[1]).toMatchObject({ durationSeconds: 1200, volumeKg: 100, completedSets: 1 });
      expect((await ctx.services.getRecentWorkouts(1)).map((i) => i.workout.id)).toEqual([b.id]);
      expect(await ctx.services.getRecentWorkouts(0)).toEqual([]);
    });

    it('getExerciseProgress gives one point per session with completed sets, oldest first', async () => {
      const ctx = await setup();
      const { dayIds, exercises } = await fixture(ctx);
      expect(await ctx.services.getExerciseProgress(exercises['Sentadilla']!)).toEqual([]);
      const a = await train(ctx, dayIds[0]!, [
        { weightKg: 100, reps: 5 },
        { weightKg: 90, reps: 8 },
      ]);
      await train(ctx, dayIds[0]!, []); // no completed sets: skipped
      const c = await train(ctx, dayIds[0]!, [{ weightKg: 110, reps: 3 }]);
      await ctx.services.startWorkoutFromDay(dayIds[0]!); // in progress: excluded
      const points = await ctx.services.getExerciseProgress(exercises['Sentadilla']!);
      expect(points.map((p) => p.workoutId)).toEqual([a.id, c.id]);
      expect(points[0]).toMatchObject({
        date: a.detail.startedAt,
        bestWeightKg: 100,
        volumeKg: 500 + 720,
      });
      expect(points[0]!.bestE1rmKg).toBeCloseTo(Math.max(100 * (1 + 5 / 30), 90 * (1 + 8 / 30)));
      expect(points[0]!.sets).toHaveLength(2);
      expect(points[0]!.sets.every((s) => s.completed)).toBe(true);
      expect(points[1]).toMatchObject({ bestWeightKg: 110, volumeKg: 330 });
    });

    it('getWeeklyStats uses Monday-start local weeks, includes empty weeks, oldest first', async () => {
      // Wednesday 2026-03-04 -> current week starts Monday 2026-03-02
      const ctx = await setup(local(2026, 2, 17, 10)); // Tuesday of week of Mon 2026-02-16
      const { dayIds } = await fixture(ctx);
      await train(ctx, dayIds[0]!, [{ weightKg: 100, reps: 5 }]); // Tue 02-17 -> week 02-16
      ctx.set(local(2026, 3, 1, 23, 30)); // Sunday still week 02-23
      await train(ctx, dayIds[0]!, [{ weightKg: 50, reps: 10 }], 10 * MIN);
      ctx.set(local(2026, 3, 2, 0, 30)); // Monday 00:30 -> week 03-02
      await train(ctx, dayIds[1]!, [{ weightKg: 10, reps: 10 }], 10 * MIN);
      ctx.set(local(2026, 3, 4, 10));
      await ctx.services.startWorkoutFromDay(dayIds[2]!); // in progress, not counted

      const stats = await ctx.services.getWeeklyStats(4);
      expect(stats.map((s) => s.weekStart)).toEqual([
        local(2026, 2, 9, 0).toISOString(),
        local(2026, 2, 16, 0).toISOString(),
        local(2026, 2, 23, 0).toISOString(),
        local(2026, 3, 2, 0).toISOString(),
      ]);
      expect(stats.map((s) => [s.workouts, s.volumeKg])).toEqual([
        [0, 0],
        [1, 500],
        [1, 500],
        [1, 100],
      ]);
      expect(await ctx.services.getWeeklyStats(0)).toEqual([]);
      const one = await ctx.services.getWeeklyStats(1);
      expect(one).toHaveLength(1);
      expect(one[0]!.weekStart).toBe(local(2026, 3, 2, 0).toISOString());
    });
  });

  describe('export / import', () => {
    it('exports the documented envelope', async () => {
      const ctx = await setup();
      await fixture(ctx);
      const p = await ctx.services.exportAllData({ appVersion: '1.2.3' });
      expect(p).toMatchObject({
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: ctx.now.toISOString(),
        appVersion: '1.2.3',
      });
      expect(p.data.routines).toHaveLength(1);
      const plain = await ctx.services.exportAllData();
      expect('appVersion' in plain).toBe(false);
    });

    it('round-trips through JSON into a fresh repository', async () => {
      const a = await setup();
      const { dayIds } = await fixture(a);
      await train(a, dayIds[0]!, [{ weightKg: 100, reps: 5 }]);
      await a.repos.settings.update({ unit: 'lb' });
      const json = JSON.stringify(await a.services.exportAllData());

      const b = await setup();
      const result = await b.services.importAllData(JSON.parse(json));
      expect(result).toEqual({ exercises: 4, routines: 1, workouts: 1 });
      expect(await b.repos.backup.snapshot()).toEqual(await a.repos.backup.snapshot());
      expect((await b.services.getRecentWorkouts(5)).length).toBe(1);
      expect((await b.repos.settings.get()).unit).toBe('lb');
    });

    it('replaces existing data on import', async () => {
      const a = await setup();
      await a.repos.routines.create({ name: 'only in a' });
      const payload = await a.services.exportAllData();
      const b = await setup();
      await b.repos.routines.create({ name: 'will vanish' });
      await b.services.importAllData(payload);
      expect((await b.repos.routines.list()).map((r) => r.name)).toEqual(['only in a']);
    });

    it('rejects invalid payloads without touching data', async () => {
      const ctx = await setup();
      await ctx.repos.routines.create({ name: 'keep' });
      const good = await ctx.services.exportAllData();
      const bad: unknown[] = [
        null,
        'text',
        {},
        { ...good, format: 'other' },
        { ...good, version: EXPORT_VERSION + 1 },
        { ...good, version: 0 },
        { ...good, version: 'x' },
        { ...good, data: undefined },
        { ...good, data: { ...good.data, workouts: 'nope' } },
      ];
      for (const payload of bad) {
        await expect(ctx.services.importAllData(payload)).rejects.toBeInstanceOf(ValidationError);
      }
      expect((await ctx.repos.routines.list()).map((r) => r.name)).toEqual(['keep']);
    });

    it('fills missing settings with defaults', async () => {
      const ctx = await setup();
      const good = await ctx.services.exportAllData();
      const data = { ...good.data } as Record<string, unknown>;
      delete data.settings;
      await ctx.services.importAllData({ ...good, data });
      expect(await ctx.repos.settings.get()).toEqual({ unit: 'kg', restTimerEnabled: true });
    });
  });
});
