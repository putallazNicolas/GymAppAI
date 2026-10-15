/** Rest between sets when the exercise has no `restSeconds` of its own (2:00, as in design/P03). */
export const DEFAULT_REST_SECONDS = 120;

/** Seconds of rest to run after completing a set of an exercise. */
export function restSecondsFor(exercise: { restSeconds?: number }): number {
  return exercise.restSeconds && exercise.restSeconds > 0
    ? exercise.restSeconds
    : DEFAULT_REST_SECONDS;
}
