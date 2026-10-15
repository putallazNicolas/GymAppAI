import { LOCAL_USER_ID } from '../contracts';
import { EXERCISE_SEED } from '../seed';
import { describeRepositoriesContract } from '../testing/repositoriesContract';
import { createInMemoryRepositories } from './index';

describeRepositoriesContract('in-memory repositories', ({ seed, now }) =>
  createInMemoryRepositories({ seed, now }),
);

describe('in-memory specifics', () => {
  it('seed: false starts with an empty catalog', async () => {
    const repos = createInMemoryRepositories({ seed: false });
    expect(await repos.exercises.list()).toEqual([]);
  });

  it('seeds the catalog with deterministic ids and local ownership', async () => {
    const repos = createInMemoryRepositories();
    const all = await repos.exercises.list();
    expect(all).toHaveLength(EXERCISE_SEED.length);
    const squat = await repos.exercises.getById('seed-squat');
    expect(squat).toMatchObject({
      name: 'Sentadilla',
      isCustom: false,
      ownerId: LOCAL_USER_ID,
      createdBy: LOCAL_USER_ID,
    });
  });

  it('instances do not share state', async () => {
    const a = createInMemoryRepositories({ seed: false });
    const b = createInMemoryRepositories({ seed: false });
    await a.routines.create({ name: 'A' });
    expect(await b.routines.list()).toEqual([]);
  });
});
