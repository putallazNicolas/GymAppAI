import { EQUIPMENT, MUSCLE_GROUPS } from '../contracts';
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from '../labels';
import { EXERCISE_SEED } from './exercises';

describe('exercise seed', () => {
  it('has around 60 exercises with unique keys and names', () => {
    expect(EXERCISE_SEED.length).toBeGreaterThanOrEqual(55);
    expect(new Set(EXERCISE_SEED.map((e) => e.key)).size).toBe(EXERCISE_SEED.length);
    expect(new Set(EXERCISE_SEED.map((e) => e.name)).size).toBe(EXERCISE_SEED.length);
  });

  it('uses slug keys and valid unions, covering every muscle group', () => {
    for (const e of EXERCISE_SEED) {
      expect(e.key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(MUSCLE_GROUPS).toContain(e.muscleGroup);
      expect(EQUIPMENT).toContain(e.equipment);
    }
    for (const group of MUSCLE_GROUPS) {
      expect(EXERCISE_SEED.some((e) => e.muscleGroup === group)).toBe(true);
    }
  });

  it('includes the staple lifts', () => {
    const names = EXERCISE_SEED.map((e) => e.name);
    for (const n of ['Sentadilla', 'Press banca', 'Peso muerto', 'Dominadas', 'Hip thrust']) {
      expect(names).toContain(n);
    }
  });

  it('has Spanish labels for every muscle group and equipment', () => {
    for (const g of MUSCLE_GROUPS) expect(MUSCLE_GROUP_LABELS[g]).toBeTruthy();
    for (const e of EQUIPMENT) expect(EQUIPMENT_LABELS[e]).toBeTruthy();
    expect(MUSCLE_GROUP_LABELS.chest).toBe('Pecho');
    expect(MUSCLE_GROUP_LABELS.quads).toBe('Cuádriceps');
  });
});
