import { EXPORT_FORMAT, EXPORT_VERSION, type Repositories } from '../contracts';
import { createInMemoryRepositories } from '../memory';
import { EXERCISE_SEED } from '../seed';
import { createSqliteRepositories } from '../sqlite';
import { createSqlJsDriver } from '../testing/sqlJsDriver';
import { createDomainServices } from './index';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const clock = () => NOW;
const viaJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type Build = () => Promise<Repositories>;
const BACKENDS: [string, Build][] = [
  ['in-memory', async () => createInMemoryRepositories({ now: clock })],
  ['sqlite', async () => createSqliteRepositories(await createSqlJsDriver(), { now: clock })],
];

describe.each(BACKENDS)('importing a v1 file on %s', (_name, build) => {
  const ts = '2026-05-01T10:00:00.000Z';
  const owner = { ownerId: 'local-user', createdBy: 'local-user' };
  const v1File = () => ({
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: ts,
    data: {
      exercises: [
        { id: 'e1', name: 'Curl', muscleGroup: 'biceps', isCustom: true, createdAt: ts, ...owner },
      ],
      routines: [
        {
          id: 'r1',
          name: 'R',
          isActive: true,
          archived: false,
          createdAt: ts,
          updatedAt: ts,
          ...owner,
        },
      ],
      routineDays: [{ id: 'd1', routineId: 'r1', name: 'D', order: 0 }],
      plannedExercises: [
        {
          id: 'p1',
          dayId: 'd1',
          exerciseId: 'e1',
          order: 0,
          sets: 4,
          reps: '8 - 10',
          restSeconds: 100,
        },
        { id: 'p2', dayId: 'd1', exerciseId: 'e1', order: 1, sets: 2, reps: 'amrap', notes: 'n' },
        { id: 'p3', dayId: 'd1', exerciseId: 'e1', order: 2, sets: 1, reps: '5', restSeconds: 5 },
        { id: 'p4', dayId: 'd1', exerciseId: 'e1', order: 3, sets: 1, reps: '5', restSeconds: 0 },
      ],
      workouts: [
        {
          id: 'w1',
          routineId: 'r1',
          dayId: 'd1',
          dayNameSnapshot: 'D',
          startedAt: ts,
          finishedAt: ts,
          ...owner,
        },
      ],
      workoutExercises: [
        {
          id: 'we1',
          workoutId: 'w1',
          exerciseId: 'e1',
          order: 0,
          plannedSets: 3,
          plannedReps: '8-10',
          restSeconds: 100,
          skipped: false,
        },
      ],
      workoutSets: [
        {
          id: 's1',
          workoutExerciseId: 'we1',
          setIndex: 0,
          weightKg: 20,
          reps: 9,
          completed: true,
          completedAt: ts,
        },
      ],
      settings: { unit: 'kg', restTimerEnabled: true },
    },
  });

  it('converts it to v2 data with the same rules as the SQLite migration', async () => {
    const repos = await build();
    const svc = createDomainServices(repos, { now: clock });
    const file = v1File();
    const before = JSON.stringify(file);
    const result = await svc.importAllData(file);
    expect(result).toEqual({ exercises: 1 + EXERCISE_SEED.length, routines: 1, workouts: 1 });
    expect(JSON.stringify(file)).toBe(before); // input not mutated

    const [p1, p2] = (await repos.routines.getById('r1'))!.days[0]!.exercises;
    expect(p1).toEqual({
      id: 'p1',
      dayId: 'd1',
      exerciseId: 'e1',
      order: 0,
      repsMode: 'same',
      plannedSets: Array.from({ length: 4 }, () => ({ reps: '8-10' })),
      restSeconds: 105,
    });
    expect(p2).toMatchObject({
      repsMode: 'same',
      plannedSets: [{ reps: 'AMRAP' }, { reps: 'AMRAP' }],
      notes: 'n',
    });
    expect('restSeconds' in p2!).toBe(false);
    const day = (await repos.routines.getById('r1'))!.days[0]!.exercises;
    expect(day[2]?.restSeconds).toBe(15); // 5 -> 15, never 0 ("Sin descanso")
    expect(day[3]?.restSeconds).toBe(0); // 0 stays 0
    expect(await repos.exercises.getById('e1')).toMatchObject({ updatedAt: ts, createdAt: ts });
    const w = (await repos.workouts.getById('w1'))!;
    expect(w.exercises[0]).toMatchObject({
      plannedSets: 3,
      plannedReps: '8-10',
      plannedSetReps: ['8-10', '8-10', '8-10'],
    });
    expect(w.exercises[0]!.sets[0]).toMatchObject({ weightKg: 20, reps: 9, completed: true });

    // the re-export is a valid v2 file that round-trips losslessly
    const exported = viaJson(await svc.exportAllData());
    expect(exported.version).toBe(EXPORT_VERSION);
    const target = await build();
    await createDomainServices(target, { now: clock }).importAllData(exported);
    expect(await target.backup.snapshot()).toEqual(exported.data);
  });

  it('still reports bad v1 rows with their table and index', async () => {
    const svc = createDomainServices(await build(), { now: clock });
    const file = v1File();
    (file.data.plannedExercises[1] as Record<string, unknown>).sets = 0;
    await expect(svc.importAllData(file)).rejects.toThrow(/plannedExercises\[1\]/);
    const bad = v1File();
    (bad.data.plannedExercises[0] as Record<string, unknown>).reps = 8;
    await expect(svc.importAllData(bad)).rejects.toThrow(/plannedExercises\[0\]/);
  });
});
