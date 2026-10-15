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
