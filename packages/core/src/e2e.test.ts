/**
 * End-to-end flow on SQLite (orchestrator integration check):
 * create routine → start → complete sets → restart & resume → summary → progress → export/import.
 */
import { createDomainServices, createSqliteRepositories, exportFileName } from './index';
import { createSqlJsDriver } from './testing/sqlJsDriver';

it('runs the whole V1 flow on SQLite', async () => {
  let t = new Date('2026-10-01T10:00:00Z').getTime();
  const now = () => new Date(t);
  const driver = await createSqlJsDriver();
  const repos = await createSqliteRepositories(driver, { now });
  const services = createDomainServices(repos, { now });

  const squat = (await repos.exercises.list({ search: 'sentadilla' }))[0]!;
  const bench = (await repos.exercises.list({ search: 'press banca' }))[0]!;
  const routine = await repos.routines.create({ name: 'Full body' });
  const dayA = await repos.routines.addDay(routine.id, { name: 'Día A' });
  const dayB = await repos.routines.addDay(routine.id, { name: 'Día B' });
  await repos.routines.addPlannedExercises(dayA.id, [
    { exerciseId: squat.id, sets: 3, reps: '5', restSeconds: 180 },
  ]);
  await repos.routines.addPlannedExercises(dayB.id, [
    { exerciseId: bench.id, sets: 2, reps: '8-10' },
  ]);
  await repos.routines.setActive(routine.id);

  expect((await services.getSuggestedNextDay())!.day.name).toBe('Día A');
  const first = await services.startWorkoutFromDay(dayA.id);
  for (const set of first.exercises[0]!.sets) {
    await services.completeSet(set.id, { weightKg: 100, reps: 5 });
  }
  t += 3_600_000;
  await services.finishWorkout(first.id);
  expect((await services.getSuggestedNextDay())!.day.name).toBe('Día B');

  // Start another session, then simulate an app restart on the same database.
  t += 86_400_000;
  const second = await services.startWorkoutFromDay(dayA.id);
  const reopened = await createSqliteRepositories(driver, { now });
  const afterRestart = createDomainServices(reopened, { now });
  expect((await reopened.workouts.getInProgress())!.id).toBe(second.id);
  const resumed = (await reopened.workouts.getById(second.id))!;
  expect(resumed.exercises[0]!.sets[0]!.weightKg).toBe(100); // prefilled from last time
  const previous = await afterRestart.getPreviousPerformance(squat.id, {
    excludeWorkoutId: second.id,
  });
  expect(previous!.sets).toHaveLength(3);

  await afterRestart.completeSet(resumed.exercises[0]!.sets[0]!.id, { weightKg: 105, reps: 5 });
  t += 1_800_000;
  await afterRestart.finishWorkout(second.id, { notes: 'bien' });

  const summary = await afterRestart.getWorkoutSummary(second.id);
  expect(summary.volumeKg).toBe(525);
  expect(summary.durationSeconds).toBe(1800);
  expect(summary.personalRecords.map((p) => p.type).sort()).toEqual(['e1rm', 'weight']);
  expect((await afterRestart.getExerciseProgress(squat.id)).map((p) => p.bestWeightKg)).toEqual([
    100, 105,
  ]);
  expect(await afterRestart.getRecentWorkouts(3)).toHaveLength(2);

  const payload: unknown = JSON.parse(
    JSON.stringify(await afterRestart.exportAllData({ appVersion: '0.1.0' })),
  );
  const target = createDomainServices(
    await createSqliteRepositories(await createSqlJsDriver(), { now }),
    { now },
  );
  expect((await target.importAllData(payload)).workouts).toBe(2);
  expect(await target.getExerciseProgress(squat.id)).toHaveLength(2);
  expect(exportFileName(new Date(2026, 9, 15))).toBe('gym-app-backup-2026-10-15.json');
});
