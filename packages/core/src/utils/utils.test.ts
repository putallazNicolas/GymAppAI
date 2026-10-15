import { epley, kgToLb, lbToKg, newId, normalizeText, nowIso } from './index';

describe('utils', () => {
  it('newId returns unique UUID v4 strings', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(re);
  });

  it('nowIso returns an ISO string, honoring an injected clock', () => {
    expect(nowIso(() => new Date('2026-01-02T03:04:05.000Z'))).toBe('2026-01-02T03:04:05.000Z');
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it('normalizeText lowercases and strips accents', () => {
    expect(normalizeText('Bíceps Ñandú CURL')).toBe('biceps nandu curl');
    expect(normalizeText('')).toBe('');
  });

  it('converts between kg and lb', () => {
    expect(lbToKg(1)).toBeCloseTo(0.45359237, 10);
    expect(kgToLb(0.45359237)).toBeCloseTo(1, 10);
    expect(kgToLb(100)).toBeCloseTo(220.462262, 5);
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5, 10);
    expect(kgToLb(0)).toBe(0);
  });

  it('epley follows w * (1 + reps / 30)', () => {
    expect(epley(100, 10)).toBeCloseTo(133.3333, 3);
    expect(epley(100, 5)).toBeCloseTo(116.6667, 3);
    expect(epley(100, 1)).toBe(100);
    expect(epley(100, 0)).toBe(0);
    expect(epley(100, -3)).toBe(0);
    expect(epley(0, 8)).toBe(0);
  });
});
