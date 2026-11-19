import { describe, expect, it } from '@jest/globals';

import { calendarDaysBetween, inProgressLine, lastWorkoutLine, startedWhen } from './hoyHeadline';

// Thursday 15 Oct 2026, 18:00 local time.
const NOW = new Date(2026, 9, 15, 18, 0);

describe('Hoy headline texts', () => {
  it('counts calendar days, not 24 h blocks', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 14, 23, 59), NOW)).toBe(1);
    expect(calendarDaysBetween(new Date(2026, 9, 15, 0, 1), NOW)).toBe(0);
  });

  it('says when the last workout was', () => {
    expect(lastWorkoutLine(undefined, NOW)).toBe('Tu primer entreno de esta rutina');
    expect(lastWorkoutLine(new Date(2026, 9, 15, 7, 30), NOW)).toBe('Ya entrenaste hoy');
    expect(lastWorkoutLine(new Date(2026, 9, 14, 20, 0), NOW)).toBe('Último entreno ayer');
    expect(lastWorkoutLine(new Date(2026, 9, 12, 20, 0), NOW)).toBe('Último entreno hace 3 días');
  });

  it('says when a workout in progress started', () => {
    expect(startedWhen(new Date(2026, 9, 15, 9, 5), NOW)).toBe('hoy a las 09:05');
    expect(startedWhen(new Date(2026, 9, 14, 20, 12), NOW)).toBe('ayer a las 20:12');
    expect(startedWhen(new Date(2026, 9, 12, 20, 12), NOW)).toBe('el lun a las 20:12');
    expect(startedWhen(new Date(2026, 9, 1, 20, 12), NOW)).toBe('el jue 1 oct a las 20:12');
  });

  it('builds the "quedó a medias" support line', () => {
    expect(inProgressLine(3, 5, new Date(2026, 9, 14, 20, 12), NOW)).toBe(
      '3 de 5 ejercicios · lo empezaste ayer a las 20:12',
    );
    expect(inProgressLine(0, 1, new Date(2026, 9, 15, 17, 0), NOW)).toBe(
      '0 de 1 ejercicio · lo empezaste hoy a las 17:00',
    );
  });
});
