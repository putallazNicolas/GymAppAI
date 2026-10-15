/** Small pure helpers shared by repositories, services and the UI. */

const KG_PER_LB = 0.45359237;

/** Generates a UUID v4. Math.random based: ids are opaque, not secrets. */
export function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Current time as an ISO 8601 UTC string. */
export function nowIso(now: () => Date = () => new Date()): string {
  return now().toISOString();
}

/** Lowercases and strips accents/diacritics, for case- and accent-insensitive search. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/**
 * Estimated one-rep max (Epley): w * (1 + reps / 30).
 * One rep (or fewer) returns the weight itself; zero or negative reps return 0.
 */
export function epley(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
