import { Redirect, useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState, ScreenContainer } from '../../components';
import { ActiveWorkout } from '../../components/workout/ActiveWorkout';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useAsync } from '../../data/useAsync';

export default function WorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const repos = useRepositories();
  const services = useServices();
  const { data, loading, error, reload } = useAsync(async () => {
    const [workout, settings] = await Promise.all([
      repos.workouts.getById(workoutId),
      repos.settings.get(),
    ]);
    if (!workout) return null;
    const ids = workout.exercises.map((e) => e.exerciseId);
    const exercises = await repos.exercises.getByIds(ids);
    const names = Object.fromEntries(exercises.map((e) => [e.id, e.name]));
    const prevEntries = await Promise.all(
      ids.map(
        async (id) =>
          [id, await services.getPreviousPerformance(id, { excludeWorkoutId: workoutId })] as const,
      ),
    );
    // Historical best e1RM per exercise (finished workouts only): the bar for the live PR badge.
    const bestEntries = await Promise.all(
      ids.map(async (id) => {
        const points = await services.getExerciseProgress(id);
        return [id, points.reduce((max, p) => Math.max(max, p.bestE1rmKg), 0)] as const;
      }),
    );
    const routine = workout.routineId ? await repos.routines.getById(workout.routineId) : null;
    return {
      workout,
      settings,
      names,
      previous: Object.fromEntries(prevEntries),
      bests: Object.fromEntries(bestEntries),
      routineName: routine?.name,
    };
  }, [workoutId]);

  if (loading && data === undefined)
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  if (error)
    return (
      <ScreenContainer>
        <ErrorState message="No pudimos cargar el entrenamiento." onRetry={reload} />
      </ScreenContainer>
    );
  if (!data)
    return (
      <ScreenContainer>
        <EmptyState title="Entrenamiento no encontrado" />
      </ScreenContainer>
    );
  if (data.workout.finishedAt)
    return <Redirect href={{ pathname: '/resumen/[workoutId]', params: { workoutId } }} />;

  return (
    <ActiveWorkout
      initial={data.workout}
      names={data.names}
      previous={data.previous}
      bests={data.bests}
      routineName={data.routineName}
      unit={data.settings.unit}
      restTimerEnabled={data.settings.restTimerEnabled}
    />
  );
}
