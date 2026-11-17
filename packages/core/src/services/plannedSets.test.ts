import { plannedRepsForSet, plannedRepsToNumber } from '../plan';
import { createInMemoryRepositories } from '../memory';
import { createSqliteRepositories } from '../sqlite';
import { createSqlJsDriver } from '../testing/sqlJsDriver';
import type { Repositories } from '../contracts';
import { createDomainServices } from './index';

type Build = () => Promise<Repositories>;
const BACKENDS: [string, Build][] = [
  ['in-memory', async () => createInMemoryRepositories({ seed: false })],
  ['sqlite', async () => createSqliteRepositories(await createSqlJsDriver(), { seed: false })],
];

describe.each(BACKENDS)('startWorkoutFromDay with a per-set plan on %s', (_name, build) => {
  it('snapshots count, summary and reps per set, with one set per planned set', async () => {
    const repos = await build();
    const services = createDomainServices(repos);
    const a = await repos.exercises.create({ name: 'A', muscleGroup: 'chest' });
    const b = await repos.exercises.create({ name: 'B', muscleGroup: 'chest' });
    const routine = await repos.routines.create({ name: 'R' });
    const day = await repos.routines.addDay(routine.id, { name: 'D' });
    await repos.routines.addPlannedExercises(day.id, [
      {
        exerciseId: a.id,
        repsMode: 'perSet',
        plannedSets: [{ reps: '5' }, { reps: '3' }, { reps: '1' }, { reps: 'amrap' }],
        restSeconds: 0,
      },
      { exerciseId: b.id, plannedSets: [{ reps: '8-10' }, { reps: '8-10' }] },
    ]);

    const w = await services.startWorkoutFromDay(day.id);
    const [wa, wb] = w.exercises;
    expect(wa).toMatchObject({
      plannedSets: 4,
      plannedReps: '5 · 3 · 1 · AMRAP',
      plannedSetReps: ['5', '3', '1', 'AMRAP'],
      restSeconds: 0,
    });
    expect(wa!.sets).toHaveLength(4);
    expect(wb).toMatchObject({
      plannedSets: 2,
      plannedReps: '2 × 8-10',
      plannedSetReps: ['8-10', '8-10'],
    });
    expect(wb!.sets).toHaveLength(2);
    expect('restSeconds' in wb!).toBe(false);
  });

  it('the ✓ rule: planned integer reps complete the set as is; ranges and AMRAP need input', async () => {
    const repos = await build();
    const services = createDomainServices(repos);
    const e = await repos.exercises.create({ name: 'A', muscleGroup: 'chest' });
    const routine = await repos.routines.create({ name: 'R' });
    const day = await repos.routines.addDay(routine.id, { name: 'D' });
    await repos.routines.addPlannedExercises(day.id, [
      {
        exerciseId: e.id,
        repsMode: 'perSet',
        plannedSets: [{ reps: '5' }, { reps: '8-10' }, { reps: 'AMRAP' }],
      },
    ]);
    const w = await services.startWorkoutFromDay(day.id);
    const we = w.exercises[0]!;

    // The UI decides the reps with the helper; completeSet only stores what it gets.
    const decided = we.sets.map((_, i) =>
      plannedRepsToNumber(plannedRepsForSet(we.plannedSetReps, i)),
    );
    expect(decided).toEqual([5, null, null]);

    const first = await services.completeSet(we.sets[0]!.id, {
      weightKg: 100,
      ...(decided[0] !== null ? { reps: decided[0] } : {}),
    });
    expect(first).toMatchObject({ completed: true, reps: 5, weightKg: 100 });
    const second = await services.completeSet(we.sets[1]!.id, { weightKg: 90, reps: 9 });
    expect(second.reps).toBe(9);
    // a set added beyond the plan uses the last planned value as its placeholder
    expect(plannedRepsForSet(we.plannedSetReps, 7)).toBe('AMRAP');
  });
});
