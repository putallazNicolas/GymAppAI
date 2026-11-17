import { createSqlJsDriver } from '../testing/sqlJsDriver';
import { LATEST_SCHEMA_VERSION, MIGRATIONS, runMigrations } from './migrations';
import { createSqliteRepositories } from './index';

/**
 * Builds a database exactly as the PREVIOUS app version (schema v1) left it, fills it with
 * old-format data, then opens it with the current code and checks that nothing was lost.
 */
async function buildV1Database() {
  const driver = await createSqlJsDriver();
  const v1 = MIGRATIONS.filter((m) => m.version === 1);
  await runMigrations(driver, v1);
  expect((await driver.first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(
    1,
  );
  const owner = ['local-user', 'local-user'];
  const t = '2026-02-01T09:00:00.000Z';

  const insertExercise = (
    id: string,
    name: string,
    group: string,
    equip: string | null,
    custom: 0 | 1,
  ) =>
    driver.run(
      `INSERT INTO exercises ("id","name","muscleGroup","equipment","isCustom","createdAt","ownerId","createdBy")
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, name, group, equip, custom, t, ...owner],
    );
  await insertExercise('seed-squat', 'Sentadilla', 'quads', 'barbell', 0);
  await insertExercise('custom-1', 'Mi curl', 'biceps', null, 1);
  await insertExercise('custom-2', 'Sin usar', 'core', 'cable', 1);

  await driver.run(
    `INSERT INTO routines ("id","name","isActive","archived","createdAt","updatedAt","ownerId","createdBy")
     VALUES ('r1','Rutina vieja',1,0,?,?,?,?)`,
    [t, '2026-02-02T09:00:00.000Z', ...owner],
  );
  await driver.run(
    `INSERT INTO routine_days ("id","routineId","name","order") VALUES ('d1','r1','Día A',0)`,
  );
  await driver.run(
    `INSERT INTO routine_days ("id","routineId","name","order") VALUES ('d2','r1','Día B',1)`,
  );

  const insertPlanned = (
    id: string,
    day: string,
    ex: string,
    order: number,
    sets: number,
    reps: string,
    rest: number | null,
    notes: string | null,
  ) =>
    driver.run(
      `INSERT INTO planned_exercises ("id","dayId","exerciseId","order","sets","reps","restSeconds","notes")
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, day, ex, order, sets, reps, rest, notes],
    );
  await insertPlanned('p1', 'd1', 'seed-squat', 0, 4, '8-10', 100, 'pausa abajo');
  await insertPlanned('p2', 'd1', 'custom-1', 1, 3, '12', 90, null);
  await insertPlanned('p3', 'd2', 'seed-squat', 0, 5, 'AMRAP', 5, null);
  await insertPlanned('p4', 'd2', 'custom-1', 1, 2, '8 - 10', 900, 'x');
  await insertPlanned('p5', 'd2', 'custom-1', 2, 1, '6', null, null);

  await driver.run(
    `INSERT INTO workouts ("id","routineId","dayId","dayNameSnapshot","startedAt","finishedAt","notes","ownerId","createdBy")
     VALUES ('w1','r1','d1','Día A','2026-02-03T10:00:00.000Z','2026-02-03T11:00:00.000Z','buen día',?,?)`,
    owner,
  );
  await driver.run(
    `INSERT INTO workouts ("id","routineId","dayId","dayNameSnapshot","startedAt","finishedAt","notes","ownerId","createdBy")
     VALUES ('w2','r1','d2','Día B','2026-02-05T10:00:00.000Z',NULL,NULL,?,?)`,
    owner,
  );
  const insertWe = (
    id: string,
    w: string,
    ex: string,
    order: number,
    sets: number,
    reps: string,
    rest: number | null,
  ) =>
    driver.run(
      `INSERT INTO workout_exercises ("id","workoutId","exerciseId","order","plannedSets","plannedReps","restSeconds","notes","skipped")
       VALUES (?,?,?,?,?,?,?,NULL,0)`,
      [id, w, ex, order, sets, reps, rest],
    );
  await insertWe('we1', 'w1', 'seed-squat', 0, 4, '8-10', 100);
  await insertWe('we2', 'w1', 'custom-1', 1, 3, '12', null);
  await insertWe('we3', 'w2', 'seed-squat', 0, 5, 'AMRAP', 90);
  const insertSet = (
    id: string,
    we: string,
    idx: number,
    kg: number | null,
    reps: number | null,
    done: 0 | 1,
  ) =>
    driver.run(
      `INSERT INTO workout_sets ("id","workoutExerciseId","setIndex","weightKg","reps","completed","completedAt")
       VALUES (?,?,?,?,?,?,?)`,
      [id, we, idx, kg, reps, done, done ? '2026-02-03T10:10:00.000Z' : null],
    );
  await insertSet('s1', 'we1', 0, 100, 10, 1);
  await insertSet('s2', 'we1', 1, 102.5, 8, 1);
  await insertSet('s3', 'we1', 2, 102.5, null, 0);
  await insertSet('s4', 'we2', 0, 20, 12, 1);
  await insertSet('s5', 'we3', 0, null, null, 0);
  await driver.run(`INSERT INTO settings ("key","value") VALUES ('unit','"lb"')`);
  return driver;
}

describe('sqlite migration v1 -> v2 with real old-format data', () => {
  it('converts every value and loses nothing', async () => {
    const driver = await buildV1Database();
    const before = {
      routines: await driver.all('SELECT * FROM routines ORDER BY id'),
      days: await driver.all('SELECT * FROM routine_days ORDER BY id'),
      workouts: await driver.all('SELECT * FROM workouts ORDER BY id'),
      sets: await driver.all('SELECT * FROM workout_sets ORDER BY id'),
      exercises: await driver.all('SELECT * FROM exercises ORDER BY id'),
    };

    const repos = await createSqliteRepositories(driver, { seed: false });
    expect(LATEST_SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
    expect(
      (await driver.first<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(LATEST_SCHEMA_VERSION);

    // planned exercises
    const routine = (await repos.routines.getById('r1'))!;
    expect(routine).toMatchObject({ name: 'Rutina vieja', isActive: true });
    const [dayA, dayB] = routine.days;
    expect(dayA!.exercises).toHaveLength(2);
    expect(dayB!.exercises).toHaveLength(3);
    const same = (n: number, reps: string) => Array.from({ length: n }, () => ({ reps }));
    const [p1, p2] = dayA!.exercises;
    expect(p1).toEqual({
      id: 'p1',
      dayId: 'd1',
      exerciseId: 'seed-squat',
      order: 0,
      repsMode: 'same',
      plannedSets: same(4, '8-10'),
      restSeconds: 105, // 100 -> nearest multiple of 15
      notes: 'pausa abajo',
    });
    expect(p2).toEqual({
      id: 'p2',
      dayId: 'd1',
      exerciseId: 'custom-1',
      order: 1,
      repsMode: 'same',
      plannedSets: same(3, '12'),
      restSeconds: 90,
    });
    const [p3, p4, p5] = dayB!.exercises;
    expect(p3).toMatchObject({ id: 'p3', plannedSets: same(5, 'AMRAP'), restSeconds: 15 }); // 5 -> 15, never 0
    expect(p4).toMatchObject({
      id: 'p4',
      plannedSets: same(2, '8-10'),
      restSeconds: 600,
      notes: 'x',
    });
    expect(p5).toMatchObject({ id: 'p5', plannedSets: same(1, '6'), order: 2 });
    expect('restSeconds' in p5!).toBe(false); // unset stays unset
    expect('notes' in p5!).toBe(false);

    // workouts and sets untouched; plannedSetReps filled
    const w1 = (await repos.workouts.getById('w1'))!;
    expect(w1).toMatchObject({ notes: 'buen día', finishedAt: '2026-02-03T11:00:00.000Z' });
    expect(w1.exercises.map((e) => e.plannedSetReps)).toEqual([
      ['8-10', '8-10', '8-10', '8-10'],
      ['12', '12', '12'],
    ]);
    expect(w1.exercises[0]).toMatchObject({
      plannedSets: 4,
      plannedReps: '8-10',
      restSeconds: 100,
    });
    expect(w1.exercises[0]!.sets.map((s) => [s.weightKg, s.reps, s.completed])).toEqual([
      [100, 10, true],
      [102.5, 8, true],
      [102.5, undefined, false],
    ]);
    const w2 = (await repos.workouts.getById('w2'))!;
    expect(w2.finishedAt).toBeUndefined();
    expect(w2.exercises[0]!.plannedSetReps).toEqual(Array.from({ length: 5 }, () => 'AMRAP'));
    expect((await repos.workouts.getInProgress())?.id).toBe('w2');

    // exercises: updatedAt = createdAt, everything else intact
    const custom = (await repos.exercises.getById('custom-1'))!;
    expect(custom).toEqual({
      id: 'custom-1',
      name: 'Mi curl',
      muscleGroup: 'biceps',
      isCustom: true,
      createdAt: '2026-02-01T09:00:00.000Z',
      updatedAt: '2026-02-01T09:00:00.000Z',
      ownerId: 'local-user',
      createdBy: 'local-user',
    });
    expect(await repos.exercises.getById('custom-2')).toMatchObject({
      equipment: 'cable',
      updatedAt: '2026-02-01T09:00:00.000Z',
    });
    expect((await repos.settings.get()).unit).toBe('lb');

    // row counts and untouched tables are identical to before
    expect(await driver.all('SELECT * FROM routines ORDER BY id')).toEqual(before.routines);
    expect(await driver.all('SELECT * FROM routine_days ORDER BY id')).toEqual(before.days);
    expect(await driver.all('SELECT * FROM workouts ORDER BY id')).toEqual(before.workouts);
    expect(await driver.all('SELECT * FROM workout_sets ORDER BY id')).toEqual(before.sets);
    expect(await driver.all('SELECT * FROM exercises ORDER BY id')).toHaveLength(
      before.exercises.length,
    );
    expect(await driver.all('SELECT * FROM planned_exercises')).toHaveLength(5);
  });

  it('keeps the old database fully usable afterwards (new schema, indexes, foreign keys)', async () => {
    const driver = await buildV1Database();
    const repos = await createSqliteRepositories(driver, { seed: false });
    const added = await repos.routines.addPlannedExercises('d1', [
      { exerciseId: 'custom-2', repsMode: 'perSet', plannedSets: [{ reps: '5' }, { reps: '3' }] },
    ]);
    expect(added[0]).toMatchObject({ order: 2, repsMode: 'perSet' });
    const idx = (
      await driver.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'index'")
    ).map((r) => r.name);
    expect(idx).toEqual(expect.arrayContaining(['idx_planned_day', 'idx_planned_exercise']));
    // deleting a day still cascades to its planned exercises
    await repos.routines.deleteDay('d2');
    expect(await driver.all(`SELECT * FROM planned_exercises WHERE "dayId" = 'd2'`)).toEqual([]);
    // an exercise used by an old plan is archived, not deleted
    expect(await repos.exercises.delete('custom-1')).toBe('archived');
    expect(await repos.exercises.delete('custom-2')).toBe('archived'); // used by the plan added above
    // re-running the migrations is a no-op
    await runMigrations(driver);
    expect(await driver.all('SELECT * FROM planned_exercises')).toHaveLength(3);
  });

  it('rolls back the whole migration if a step fails (old data stays as it was)', async () => {
    const driver = await buildV1Database();
    const v2 = MIGRATIONS.find((m) => m.version === 2)!;
    const broken = [MIGRATIONS[0]!, { version: 2, up: [...v2.up, 'THIS IS NOT SQL'] }];
    await expect(runMigrations(driver, broken)).rejects.toBeDefined();
    expect(
      (await driver.first<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(1);
    const row = await driver.first<{ sets: number; reps: string }>(
      `SELECT "sets","reps" FROM planned_exercises WHERE "id" = 'p1'`,
    );
    expect(row).toEqual({ sets: 4, reps: '8-10' });
    // and a later attempt with the real migration still succeeds
    await runMigrations(driver);
    expect((await driver.all('SELECT * FROM planned_exercises')).length).toBe(5);
  });
});
