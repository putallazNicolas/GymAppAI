import { MAX_PLANNED_SETS, ValidationError } from './contracts';
import { legacyPlan, legacyRestSeconds, legacySetReps } from './legacy';
import {
  assertRestSeconds,
  normalizePlan,
  normalizeReps,
  plannedRepsForSet,
  plannedRepsToNumber,
  summarizePlannedSets,
} from './plan';
import { copyName } from './rules';

describe('normalizeReps', () => {
  it('trims, uppercases, collapses spaces and tightens dashes', () => {
    expect(normalizeReps('  8 - 10 ')).toBe('8-10');
    expect(normalizeReps('8–10')).toBe('8-10');
    expect(normalizeReps('amrap')).toBe('AMRAP');
    expect(normalizeReps('to   failure')).toBe('TO FAILURE');
    expect(normalizeReps('10')).toBe('10');
    expect(normalizeReps('   ')).toBe('');
  });
});

describe('plannedRepsToNumber (rule of the ✓ button)', () => {
  it('gives a number only for integers', () => {
    expect(plannedRepsToNumber('10')).toBe(10);
    expect(plannedRepsToNumber(' 5 ')).toBe(5);
    expect(plannedRepsToNumber('8-10')).toBeNull();
    expect(plannedRepsToNumber('AMRAP')).toBeNull();
    expect(plannedRepsToNumber('amrap')).toBeNull();
    expect(plannedRepsToNumber('')).toBeNull();
    expect(plannedRepsToNumber('8.5')).toBeNull();
  });
});

describe('summarizePlannedSets', () => {
  it('uses "N × reps" for same and a dotted list for perSet', () => {
    expect(
      summarizePlannedSets({
        repsMode: 'same',
        plannedSets: [{ reps: '8-10' }, { reps: '8-10' }, { reps: '8-10' }, { reps: '8-10' }],
      }),
    ).toBe('4 × 8-10');
    expect(
      summarizePlannedSets({
        repsMode: 'perSet',
        plannedSets: [{ reps: '5' }, { reps: '3' }, { reps: '1' }, { reps: 'AMRAP' }],
      }),
    ).toBe('5 · 3 · 1 · AMRAP');
    expect(summarizePlannedSets({ repsMode: 'same', plannedSets: [] })).toBe('');
  });
});

describe('plannedRepsForSet', () => {
  it('repeats the last value beyond the plan and handles empty lists', () => {
    expect(plannedRepsForSet(['5', '3', '1'], 0)).toBe('5');
    expect(plannedRepsForSet(['5', '3', '1'], 2)).toBe('1');
    expect(plannedRepsForSet(['5', '3', '1'], 7)).toBe('1');
    expect(plannedRepsForSet([], 0)).toBe('');
  });
});

describe('normalizePlan / assertRestSeconds', () => {
  it('normalizes valid plans', () => {
    expect(
      normalizePlan({ repsMode: 'same', plannedSets: [{ reps: ' 8 - 10' }, { reps: '8-10' }] }),
    ).toEqual({ repsMode: 'same', plannedSets: [{ reps: '8-10' }, { reps: '8-10' }] });
  });

  it('rejects invalid plans', () => {
    const bad = [
      { repsMode: 'same', plannedSets: [] },
      {
        repsMode: 'same',
        plannedSets: Array.from({ length: MAX_PLANNED_SETS + 1 }, () => ({ reps: '5' })),
      },
      { repsMode: 'same', plannedSets: [{ reps: '5' }, { reps: '6' }] },
      { repsMode: 'perSet', plannedSets: [{ reps: '  ' }] },
      { repsMode: 'nope', plannedSets: [{ reps: '5' }] },
      { repsMode: 'same', plannedSets: 'x' },
    ];
    for (const plan of bad) expect(() => normalizePlan(plan)).toThrow(ValidationError);
    expect(
      normalizePlan({
        repsMode: 'perSet',
        plannedSets: Array.from({ length: MAX_PLANNED_SETS }, (_, i) => ({ reps: String(i + 1) })),
      }).plannedSets,
    ).toHaveLength(MAX_PLANNED_SETS);
  });

  it('validates rest: integer 0..600, multiple of 15', () => {
    expect(assertRestSeconds(undefined)).toBeUndefined();
    expect(assertRestSeconds(0)).toBe(0);
    expect(assertRestSeconds(600)).toBe(600);
    for (const bad of [-15, 10, 615, 7.5, '60', Number.NaN]) {
      expect(() => assertRestSeconds(bad)).toThrow(ValidationError);
    }
  });
});

describe('copyName', () => {
  it('appends " (copia)" and truncates the base to fit 40 characters', () => {
    expect(copyName('Rutina')).toBe('Rutina (copia)');
    expect(copyName('x'.repeat(40))).toBe(`${'x'.repeat(32)} (copia)`);
    expect(copyName('x'.repeat(40)).length).toBe(40);
  });
});

describe('legacy conversion', () => {
  it('turns sets + reps into a "same" plan', () => {
    expect(legacyPlan(3, '8 - 10')).toEqual({
      repsMode: 'same',
      plannedSets: [{ reps: '8-10' }, { reps: '8-10' }, { reps: '8-10' }],
    });
    expect(legacyPlan(50, '5').plannedSets).toHaveLength(MAX_PLANNED_SETS);
    expect(legacyPlan(0, '').plannedSets).toEqual([{ reps: '10' }]);
  });

  it('rounds rest to the nearest multiple of 15 and clamps to 600', () => {
    expect(legacyRestSeconds(100)).toBe(105);
    expect(legacyRestSeconds(97)).toBe(90);
    expect(legacyRestSeconds(90)).toBe(90);
    expect(legacyRestSeconds(5)).toBe(15);
    expect(legacyRestSeconds(7)).toBe(15);
    expect(legacyRestSeconds(8)).toBe(15);
    expect(legacyRestSeconds(0)).toBe(0);
    expect(legacyRestSeconds(900)).toBe(600);
    expect(legacyRestSeconds(-20)).toBe(0);
  });

  it('copies plannedReps once per planned set for a workout snapshot', () => {
    expect(legacySetReps(3, '8-10')).toEqual(['8-10', '8-10', '8-10']);
    expect(legacySetReps(0, '8')).toEqual([]);
  });
});
