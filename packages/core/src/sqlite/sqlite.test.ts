import { EXERCISE_SEED } from '../seed';
import { describeRepositoriesContract } from '../testing/repositoriesContract';
import { createSqlJsDriver } from '../testing/sqlJsDriver';
import { LATEST_SCHEMA_VERSION, MIGRATIONS, runMigrations } from './migrations';
import { createSqliteRepositories } from './index';

describeRepositoriesContract('sqlite repositories', async ({ seed, now }) =>
  createSqliteRepositories(await createSqlJsDriver(), { seed, now }),
);

const tableNames = async (driver: Awaited<ReturnType<typeof createSqlJsDriver>>) =>
  (
    await driver.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((r) => r.name);

describe('sqlite migrations', () => {
  it('creates the schema on a fresh database and records the version', async () => {
    const driver = await createSqlJsDriver();
    await createSqliteRepositories(driver, { seed: false });
    expect(await tableNames(driver)).toEqual([
      'exercises',
      'planned_exercises',
      'routine_days',
      'routines',
      'settings',
      'workout_exercises',
      'workout_sets',
      'workouts',
    ]);
    expect(
      (await driver.first<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(LATEST_SCHEMA_VERSION);
    expect(
      (await driver.first<{ foreign_keys: number }>('PRAGMA foreign_keys'))?.foreign_keys,
    ).toBe(1);
  });

  it('creates the performance indexes', async () => {
    const driver = await createSqlJsDriver();
    await runMigrations(driver);
    const names = (
      await driver.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'index'")
    ).map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(['idx_workouts_started', 'idx_workout_exercises_exercise']),
    );
  });

  it('is idempotent and preserves data across re-runs', async () => {
    const driver = await createSqlJsDriver();
    const first = await createSqliteRepositories(driver, { seed: false });
    await first.routines.create({ name: 'Keep me' });
    await runMigrations(driver);
    const second = await createSqliteRepositories(driver, { seed: false });
    expect((await second.routines.list()).map((r) => r.name)).toEqual(['Keep me']);
  });

  it('applies only pending migrations', async () => {
    const driver = await createSqlJsDriver();
    await runMigrations(driver);
    const extra = [
      ...MIGRATIONS,
      { version: LATEST_SCHEMA_VERSION + 1, up: ['CREATE TABLE extra (id TEXT)'] },
    ];
    await runMigrations(driver, extra);
    expect(await tableNames(driver)).toContain('extra');
    await runMigrations(driver, extra); // would fail on CREATE TABLE if re-applied
    expect(
      (await driver.first<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(LATEST_SCHEMA_VERSION + 1);
  });

  it('rolls back a failing migration and keeps the version', async () => {
    const driver = await createSqlJsDriver();
    await runMigrations(driver);
    const broken = [
      ...MIGRATIONS,
      {
        version: LATEST_SCHEMA_VERSION + 1,
        up: ['CREATE TABLE half (id TEXT)', 'THIS IS NOT SQL'],
      },
    ];
    await expect(runMigrations(driver, broken)).rejects.toBeDefined();
    expect(await tableNames(driver)).not.toContain('half');
    expect(
      (await driver.first<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(LATEST_SCHEMA_VERSION);
  });

  it('refuses a database newer than the code', async () => {
    const driver = await createSqlJsDriver();
    await driver.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 5}`);
    await expect(runMigrations(driver)).rejects.toThrow(/newer/);
  });
});

describe('sqlite seeding', () => {
  it('seeds the catalog once (idempotent across restarts)', async () => {
    const driver = await createSqlJsDriver();
    const repos = await createSqliteRepositories(driver);
    expect(await repos.exercises.list()).toHaveLength(EXERCISE_SEED.length);
    const again = await createSqliteRepositories(driver);
    expect(await again.exercises.list()).toHaveLength(EXERCISE_SEED.length);
    expect(await again.exercises.getById('seed-squat')).toMatchObject({
      name: 'Sentadilla',
      isCustom: false,
      equipment: 'barbell',
    });
  });

  it('does not overwrite or duplicate user data when re-seeding', async () => {
    const driver = await createSqlJsDriver();
    const repos = await createSqliteRepositories(driver);
    await repos.exercises.create({ name: 'Mine', muscleGroup: 'core' });
    const again = await createSqliteRepositories(driver);
    expect(await again.exercises.list()).toHaveLength(EXERCISE_SEED.length + 1);
  });

  it('seed: false leaves the catalog empty', async () => {
    const repos = await createSqliteRepositories(await createSqlJsDriver(), { seed: false });
    expect(await repos.exercises.list()).toEqual([]);
  });
});

describe('sqlite integrity', () => {
  it('enforces foreign keys at the database level', async () => {
    const driver = await createSqlJsDriver();
    await createSqliteRepositories(driver, { seed: false });
    await expect(
      driver.run(
        `INSERT INTO routine_days ("id","routineId","name","order") VALUES ('d','missing','x',0)`,
      ),
    ).rejects.toBeDefined();
  });

  it('keeps data across "app restarts" (new repositories on the same driver)', async () => {
    const driver = await createSqlJsDriver();
    const a = await createSqliteRepositories(driver);
    const e = (await a.exercises.list({ search: 'sentadilla' }))[0]!;
    const w = await a.workouts.create({
      dayNameSnapshot: 'D',
      exercises: [{ exerciseId: e.id, plannedSets: 1, plannedReps: '5', sets: [{ weightKg: 20 }] }],
    });
    const b = await createSqliteRepositories(driver);
    expect((await b.workouts.getInProgress())?.id).toBe(w.id);
    expect((await b.workouts.getById(w.id))?.exercises[0]?.sets[0]?.weightKg).toBe(20);
  });
});
