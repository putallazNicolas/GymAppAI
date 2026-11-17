/** Rest between sets when the exercise has no `restSeconds` of its own (2:00, as in design/P03). */
export const DEFAULT_REST_SECONDS = 120;

/**
 * Seconds of rest to run after completing a set of an exercise: its own value, the default when
 * it has none (`undefined`), and 0 for "Sin descanso" (no rest bar at all).
 */
export function restSecondsFor(exercise: { restSeconds?: number }): number {
  return exercise.restSeconds ?? DEFAULT_REST_SECONDS;
}
