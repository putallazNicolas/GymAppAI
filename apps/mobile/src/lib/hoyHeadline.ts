import { formatDayMonthShort, formatTime, formatWeekdayShort } from './format';

/**
 * Texts of the Hoy headline (design/L5, option 1; S5 box "22:30" point 4). Pure functions so the
 * wording is tested without rendering the screen.
 */

const DAY_MS = 86_400_000;

/** Calendar days from `from` to `to` in local time (0 = same day, 1 = yesterday...). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(to) - start(from)) / DAY_MS);
}

/**
 * Support line when a day is due: "Último entreno hace 3 días", "Último entreno ayer",
 * "Ya entrenaste hoy", or "Tu primer entreno de esta rutina" when the routine was never trained.
 */
export function lastWorkoutLine(lastFinishedAt: Date | undefined, now: Date): string {
  if (!lastFinishedAt) return 'Tu primer entreno de esta rutina';
  const days = calendarDaysBetween(lastFinishedAt, now);
  if (days <= 0) return 'Ya entrenaste hoy';
  if (days === 1) return 'Último entreno ayer';
  return `Último entreno hace ${days} días`;
}

/**
 * When a workout in progress started: "hoy a las 20:12", "ayer a las 20:12", "el lun a las
 * 20:12" within the last week, else "el jue 8 oct a las 20:12".
 */
export function startedWhen(startedAt: Date, now: Date): string {
  const days = calendarDaysBetween(startedAt, now);
  const time = formatTime(startedAt);
  if (days <= 0) return `hoy a las ${time}`;
  if (days === 1) return `ayer a las ${time}`;
  if (days < 7) return `el ${formatWeekdayShort(startedAt)} a las ${time}`;
  return `el ${formatDayMonthShort(startedAt)} a las ${time}`;
}

/** "3 de 5 ejercicios · lo empezaste ayer a las 20:12". */
export function inProgressLine(done: number, total: number, startedAt: Date, now: Date): string {
  return `${done} de ${total} ${total === 1 ? 'ejercicio' : 'ejercicios'} · lo empezaste ${startedWhen(startedAt, now)}`;
}

/** The PR chip is shown only for records set in the last 14 days. */
export const RECENT_PR_DAYS = 14;
