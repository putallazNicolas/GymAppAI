import {
  DEFAULT_SETTINGS,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  ValidationError,
  type DataSnapshot,
  type ExportPayload,
  type Repositories,
} from '../contracts';
import { createInMemoryRepositories } from '../memory';
import { EXERCISE_SEED } from '../seed';
import { createSqliteRepositories } from '../sqlite';
import { createSqlJsDriver } from '../testing/sqlJsDriver';
import { exportFileName } from './dataExport';
import { migrateExportPayload, type ExportMigrationStep } from './exportMigrations';
import { createDomainServices } from './index';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const clock = () => NOW;

type Build = () => Promise<Repositories>;
const BACKENDS: [string, Build][] = [
  ['in-memory', async () => createInMemoryRepositories({ now: clock })],
  ['sqlite', async () => createSqliteRepositories(await createSqlJsDriver(), { now: clock })],
];

/** Repos with a seeded catalog plus a routine, a finished workout and custom settings. */
async function populate(repos: Repositories) {
  const services = createDomainServices(repos, { now: clock });
  const squat = await repos.exercises.getById('seed-squat');
  const custom = await repos.exercises.create({ name: 'Curl 21', muscleGroup: 'biceps' });
  const routine = await repos.routines.create({ name: 'Rutina' });
  await repos.routines.setActive(routine.id);
  const day = await repos.routines.addDay(routine.id, { name: 'Día A' });
  await repos.routines.addPlannedExercises(day.id, [
    { exerciseId: squat!.id, sets: 2, reps: '5', restSeconds: 120, notes: 'pausa' },
    { exerciseId: custom.id },
  ]);
  const w = await services.startWorkoutFromDay(day.id);
  const set = w.exercises[0]!.sets[0]!;
  await services.completeSet(set.id, { weightKg: 102.5, reps: 5 });
  await repos.workouts.updateWorkoutExercise(w.exercises[1]!.id, { skipped: true });
  await services.finishWorkout(w.id, { notes: 'ok' });
  await repos.settings.update({ unit: 'lb', restTimerEnabled: false });
  return { services, ids: { day: day.id, routine: routine.id, workout: w.id } };
}

const viaJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe.each(BACKENDS)('export/import round-trip on %s', (_name, build) => {
  it('is lossless through JSON, including catalog exercises, onto every backend', async () => {
    const source = await build();
    const { services } = await populate(source);
    const payload = viaJson(await services.exportAllData({ appVersion: '1.0.0' }));
    expect(payload.data.exercises.filter((e) => !e.isCustom)).toHaveLength(EXERCISE_SEED.length);
    expect(payload.data.exercises.some((e) => e.isCustom)).toBe(true);

    for (const [, buildTarget] of BACKENDS) {
      const target = await buildTarget();
      await target.routines.create({ name: 'to be replaced' });
      const result = await createDomainServices(target, { now: clock }).importAllData(payload);
      expect(result).toEqual({
        exercises: EXERCISE_SEED.length + 1,
        routines: 1,
        workouts: 1,
      });
      expect(await target.backup.snapshot()).toEqual(payload.data);
    }
  });

  it('keeps the catalog available when the payload lacks seed rows', async () => {
    const source = await build();
    const { services } = await populate(source);
    const payload = viaJson(await services.exportAllData());
    const trimmed: ExportPayload = {
      ...payload,
      data: {
        ...payload.data,
        // drop every catalog row that is not referenced
        exercises: payload.data.exercises.filter((e) => e.isCustom || e.id === 'seed-squat'),
      },
    };
    const target = await build();
    await createDomainServices(target, { now: clock }).importAllData(trimmed);
    const all = await target.exercises.list();
    expect(all).toHaveLength(EXERCISE_SEED.length + 1);
    expect(all.filter((e) => !e.isCustom)).toHaveLength(EXERCISE_SEED.length);
    // rows the payload did have are kept as provided
    expect(await target.exercises.getById('seed-squat')).toEqual(
      payload.data.exercises.find((e) => e.id === 'seed-squat'),
    );
  });

  it('writes nothing when validation fails', async () => {
    const target = await build();
    const svc = createDomainServices(target, { now: clock });
    await target.routines.create({ name: 'keep' });
    const before = await target.backup.snapshot();
    const good = await svc.exportAllData();
    const broken = viaJson(good);
    broken.data.workouts = [{ id: 'w', startedAt: 'not a date' } as never];
    await expect(svc.importAllData(broken)).rejects.toBeInstanceOf(ValidationError);
    expect(await target.backup.snapshot()).toEqual(before);
  });
});

/** Builds a valid, minimal, self-contained payload to mutate in the validation tests. */
function validPayload(): ExportPayload {
  const ts = '2026-05-01T10:00:00.000Z';
  const owner = { ownerId: 'local-user', createdBy: 'local-user' };
  const data: DataSnapshot = {
    exercises: [
      {
        id: 'e1',
        name: 'Custom',
        muscleGroup: 'core',
        equipment: 'cable',
        isCustom: true,
        createdAt: ts,
        ...owner,
      },
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
        sets: 3,
        reps: '8-10',
        restSeconds: 60,
        notes: 'n',
      },
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
        plannedReps: '8',
        skipped: false,
      },
    ],
    workoutSets: [
      {
        id: 's1',
        workoutExerciseId: 'we1',
        setIndex: 0,
        weightKg: 50,
        reps: 8,
        completed: true,
        completedAt: ts,
      },
    ],
    settings: { ...DEFAULT_SETTINGS },
  };
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: ts, data };
}

describe('import validation', () => {
  let repos: Repositories;
  let svc: ReturnType<typeof createDomainServices>;
  beforeEach(() => {
    repos = createInMemoryRepositories({ seed: false, now: clock });
    svc = createDomainServices(repos, { now: clock });
  });

  const reject = async (mutate: (p: ExportPayload) => void, message: RegExp) => {
    const payload = viaJson(validPayload());
    mutate(payload);
    const error = await svc.importAllData(payload).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toMatch(message);
  };

  it('accepts a valid payload', async () => {
    const result = await svc.importAllData(viaJson(validPayload()));
    expect(result).toEqual({ exercises: 1 + EXERCISE_SEED.length, routines: 1, workouts: 1 });
    const detail = await repos.routines.getActive();
    expect(detail?.days[0]?.exercises[0]).toMatchObject({ reps: '8-10', restSeconds: 60 });
  });

  it('accepts null for optional fields and strips unknown keys', async () => {
    const payload = viaJson(validPayload()) as unknown as {
      data: Record<string, Record<string, unknown>[]>;
    };
    payload.data.exercises![0]!.equipment = null;
    payload.data.exercises![0]!.surprise = 1;
    await svc.importAllData(payload);
    const e = await repos.exercises.getById('e1');
    expect(e).not.toHaveProperty('equipment');
    expect(e).not.toHaveProperty('surprise');
  });

  it('reports the table and row index of bad fields', async () => {
    await reject((p) => {
      p.data.exercises[0]!.muscleGroup = 'legs' as never;
    }, /^exercises\[0\]\.muscleGroup/);
    await reject((p) => {
      p.data.exercises[0]!.equipment = 'laser' as never;
    }, /exercises\[0\]\.equipment/);
    await reject((p) => {
      p.data.exercises[0]!.name = ' ';
    }, /exercises\[0\]\.name/);
    await reject((p) => {
      p.data.exercises[0]!.isCustom = 'yes' as never;
    }, /exercises\[0\]\.isCustom/);
    await reject((p) => {
      p.data.exercises[0]!.createdAt = '2026-13-45';
    }, /exercises\[0\]\.createdAt/);
    await reject((p) => {
      p.data.routines[0]!.updatedAt = 'yesterday';
    }, /routines\[0\]\.updatedAt/);
    await reject((p) => {
      p.data.routineDays[0]!.order = -1;
    }, /routineDays\[0\]\.order/);
    await reject((p) => {
      p.data.routineDays[0]!.order = 1.5;
    }, /routineDays\[0\]\.order/);
    await reject((p) => {
      p.data.plannedExercises[0]!.sets = 0;
    }, /plannedExercises\[0\]\.sets/);
    await reject((p) => {
      p.data.plannedExercises[0]!.reps = 8 as never;
    }, /plannedExercises\[0\]\.reps/);
    await reject((p) => {
      p.data.plannedExercises[0]!.restSeconds = -5;
    }, /plannedExercises\[0\]\.restSeconds/);
    await reject((p) => {
      p.data.workouts[0]!.startedAt = '';
    }, /workouts\[0\]\.startedAt/);
    await reject((p) => {
      p.data.workouts[0]!.finishedAt = 'x';
    }, /workouts\[0\]\.finishedAt/);
    await reject((p) => {
      p.data.workoutExercises[0]!.skipped = 0 as never;
    }, /workoutExercises\[0\]\.skipped/);
    await reject((p) => {
      p.data.workoutSets[0]!.weightKg = -1;
    }, /workoutSets\[0\]\.weightKg/);
    await reject((p) => {
      p.data.workoutSets[0]!.weightKg = Infinity;
    }, /workoutSets\[0\]\.weightKg/);
    await reject((p) => {
      p.data.workoutSets[0]!.reps = 2.5;
    }, /workoutSets\[0\]\.reps/);
    await reject((p) => {
      p.data.workoutSets[0]!.completed = null as never;
    }, /workoutSets\[0\]\.completed/);
    await reject((p) => {
      p.data.settings.unit = 'stone' as never;
    }, /settings\.unit/);
    await reject((p) => {
      p.data.settings.restTimerEnabled = 'no' as never;
    }, /settings\.restTimerEnabled/);
  });

  it('reports the failing row index, not just the first row', async () => {
    await reject((p) => {
      const second = { ...p.data.workoutSets[0]!, id: 's2', setIndex: 1, reps: -1 };
      p.data.workoutSets.push(second);
    }, /workoutSets\[1\]\.reps/);
  });

  it('rejects non-object rows, missing tables and duplicate ids', async () => {
    await reject((p) => {
      p.data.routines = [null as never];
    }, /routines\[0\]: must be an object/);
    await reject((p) => {
      delete (p.data as Partial<DataSnapshot>).workoutSets;
    }, /data\.workoutSets/);
    await reject((p) => {
      p.data = null as never;
    }, /data/);
    await reject((p) => {
      p.data.exercises.push({ ...p.data.exercises[0]! });
    }, /exercises\[1\]\.id: duplicate/);
  });

  it('enforces referential integrity', async () => {
    await reject((p) => {
      p.data.routineDays[0]!.routineId = 'nope';
    }, /routineDays\[0\]\.routineId/);
    await reject((p) => {
      p.data.plannedExercises[0]!.dayId = 'nope';
    }, /plannedExercises\[0\]\.dayId/);
    await reject((p) => {
      p.data.plannedExercises[0]!.exerciseId = 'nope';
    }, /plannedExercises\[0\]\.exerciseId/);
    await reject((p) => {
      p.data.workoutExercises[0]!.workoutId = 'nope';
    }, /workoutExercises\[0\]\.workoutId/);
    await reject((p) => {
      p.data.workoutExercises[0]!.exerciseId = 'nope';
    }, /workoutExercises\[0\]\.exerciseId/);
    await reject((p) => {
      p.data.workoutSets[0]!.workoutExerciseId = 'nope';
    }, /workoutSets\[0\]\.workoutExerciseId/);
  });

  it('accepts references to catalog exercises that the payload omits (seed is re-added)', async () => {
    const payload = viaJson(validPayload());
    payload.data.plannedExercises[0]!.exerciseId = 'seed-squat';
    await svc.importAllData(payload);
    expect(await repos.exercises.getById('seed-squat')).not.toBeNull();
  });

  it('drops workout links to missing routines and days', async () => {
    const payload = viaJson(validPayload());
    payload.data.workouts[0]!.routineId = 'gone';
    payload.data.workouts[0]!.dayId = 'gone-too';
    await svc.importAllData(payload);
    const w = await repos.workouts.getById('w1');
    expect(w).not.toBeNull();
    expect(w).not.toHaveProperty('routineId');
    expect(w).not.toHaveProperty('dayId');
    expect(w?.dayNameSnapshot).toBe('D');
  });

  it('rejects inconsistent active routines', async () => {
    await reject((p) => {
      p.data.routines[0]!.archived = true;
    }, /routines\[0\].*archived/);
    await reject((p) => {
      p.data.routines.push({ ...p.data.routines[0]!, id: 'r2' });
    }, /more than one active/);
  });

  it('fills settings defaults when missing or partial', async () => {
    const payload = viaJson(validPayload()) as unknown as { data: { settings?: unknown } };
    payload.data.settings = { unit: 'lb' };
    await svc.importAllData(payload);
    expect(await repos.settings.get()).toEqual({ unit: 'lb', restTimerEnabled: true });
  });
});

describe('migrateExportPayload', () => {
  const v0 = { format: EXPORT_FORMAT, version: 0, exportedAt: 'x', data: { legacy: true } };

  it('returns current-version payloads untouched (empty registry today)', () => {
    const p = validPayload();
    expect(migrateExportPayload(p)).toEqual(p);
  });

  it('runs steps in order up to the target version', () => {
    const calls: number[] = [];
    const registry: Record<number, ExportMigrationStep> = {
      0: (p) => {
        calls.push(0);
        return { ...p, data: { renamed: true } };
      },
      1: (p) => {
        calls.push(1);
        return { ...p, data: { ...(p.data as object), second: true } };
      },
    };
    const out = migrateExportPayload(v0, registry, 2);
    expect(calls).toEqual([0, 1]);
    expect(out.version).toBe(2);
    expect(out.data).toEqual({ renamed: true, second: true });
    expect(v0.version).toBe(0); // input is not mutated
  });

  it('rejects unknown formats, newer versions, bad versions and missing steps', () => {
    expect(() => migrateExportPayload(null)).toThrow(ValidationError);
    expect(() => migrateExportPayload([])).toThrow(ValidationError);
    expect(() => migrateExportPayload({ ...v0, format: 'x' })).toThrow(/format/);
    expect(() => migrateExportPayload({ ...v0, version: EXPORT_VERSION + 1 })).toThrow(/newer/);
    expect(() => migrateExportPayload({ ...v0, version: 1.5 })).toThrow(/version/);
    expect(() => migrateExportPayload({ ...v0, version: -1 })).toThrow(/version/);
    expect(() => migrateExportPayload({ ...v0, version: '1' })).toThrow(/version/);
    expect(() => migrateExportPayload(v0)).toThrow(/no migration from v0/);
  });

  it('is applied by importAllData before row validation', async () => {
    // A real v0 does not exist; this only checks that unsupported versions are refused.
    const repos = createInMemoryRepositories({ seed: false });
    const svc = createDomainServices(repos);
    await expect(svc.importAllData(v0)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('exportFileName', () => {
  it('formats the local date with zero padding', () => {
    expect(exportFileName(new Date(2026, 9, 15, 23, 59))).toBe('gym-app-backup-2026-10-15.json');
    expect(exportFileName(new Date(2026, 0, 5, 0, 1))).toBe('gym-app-backup-2026-01-05.json');
  });

  it('defaults to today', () => {
    expect(exportFileName()).toMatch(/^gym-app-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
