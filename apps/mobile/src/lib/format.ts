import type { WeightUnit } from '@gym/core';

const KG_PER_LB = 0.45359237;

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "jueves 15 de octubre" (local time). Accepts a Date or an ISO string. */
export function formatDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** mm:ss under one hour, h:mm:ss from one hour on. Negative values clamp to zero. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

/** Spanish number format: "." thousands, "," decimal, up to `maxDecimals` decimals. */
export function formatNumber(value: number, maxDecimals = 1): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  const [int = '0', dec] = Math.abs(rounded).toFixed(maxDecimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const trimmedDec = dec?.replace(/0+$/, '');
  const sign = rounded < 0 ? '-' : '';
  return trimmedDec ? `${sign}${grouped},${trimmedDec}` : `${sign}${grouped}`;
}

/** "82,5 kg" / "181,9 lb" from a weight stored in kg. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${formatNumber(kgToUnit(kg, unit))} ${unit}`;
}

/** Volume (kg x reps) in the display unit: "1.234 kg". */
export function formatVolume(volumeKg: number, unit: WeightUnit): string {
  return `${formatNumber(kgToUnit(volumeKg, unit), 0)} ${unit}`;
}

/** Plain editable text for a weight stored in kg ("82.5"); empty when undefined. */
export function weightToInput(kg: number | undefined, unit: WeightUnit): string {
  if (kg === undefined) return '';
  return String(Math.round(kgToUnit(kg, unit) * 10) / 10);
}

/** Parses user input (accepts "," or ".") into kg; undefined when empty/invalid. */
export function inputToKg(text: string, unit: WeightUnit): number | undefined {
  const n = Number(text.trim().replace(',', '.'));
  if (text.trim() === '' || !Number.isFinite(n) || n < 0) return undefined;
  return unitToKg(n, unit);
}

/** Parses a reps input into a non-negative integer; undefined when empty/invalid. */
export function inputToReps(text: string): number | undefined {
  const n = parseInt(text.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** "15/10" from an ISO date or Date (local time). */
export function formatShortDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function toDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/** "jue" (local time). */
export function formatWeekdayShort(input: Date | string): string {
  return WEEKDAYS_SHORT[toDate(input).getDay()] ?? '';
}

/** "jue 8 oct" (local time). */
export function formatDayMonthShort(input: Date | string): string {
  const d = toDate(input);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "19:02" (local time, 24 h). */
export function formatTime(input: Date | string): string {
  const d = toDate(input);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "empezado" moment: "hoy 19:02", "ayer 20:12" or "jue 8 oct 20:12". */
export function formatStartedAt(input: Date | string, now: Date = new Date()): string {
  const d = toDate(input);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `hoy ${formatTime(d)}`;
  if (days === 1) return `ayer ${formatTime(d)}`;
  return `${formatDayMonthShort(d)} ${formatTime(d)}`;
}

/** "1 h 12 min", "58 min" or "45 s" for list rows. */
export function formatDurationHuman(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${pad(m)} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

/** m:ss without a leading zero on the minutes ("2:00", "0:45"); h:mm:ss from one hour on. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
