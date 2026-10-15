import { DEFAULT_SETTINGS, LOCAL_USER_ID, MUSCLE_GROUPS, NotFoundError } from './index';

describe('contracts', () => {
  it('exposes V1 constants', () => {
    expect(LOCAL_USER_ID).toBe('local-user');
    expect(DEFAULT_SETTINGS.unit).toBe('kg');
    expect(MUSCLE_GROUPS).toContain('chest');
  });

  it('NotFoundError carries its name', () => {
    const err = new NotFoundError('Routine', 'abc');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('NotFoundError');
  });
});
