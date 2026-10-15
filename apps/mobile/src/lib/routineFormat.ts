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

/** "2 de agosto" (local time). Accepts a Date or an ISO string. */
export function formatDayMonth(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "1 día" / "4 días". */
export function daysLabel(count: number): string {
  return `${count} ${count === 1 ? 'día' : 'días'}`;
}

/** "1 ejercicio · 3 series" / "Sin ejercicios todavía". */
export function dayMeta(exerciseCount: number, setCount: number): string {
  if (exerciseCount === 0) return 'Sin ejercicios todavía';
  const ex = `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`;
  const se = `${setCount} ${setCount === 1 ? 'serie' : 'series'}`;
  return `${ex} · ${se}`;
}
