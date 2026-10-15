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
    return { workout, settings, names, previous: Object.fromEntries(prevEntries) };
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
      unit={data.settings.unit}
      restTimerEnabled={data.settings.restTimerEnabled}
    />
  );
}
