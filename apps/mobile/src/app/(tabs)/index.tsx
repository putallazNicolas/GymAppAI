import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListItem,
  LoadingState,
  ScreenContainer,
  Text,
} from '../../components';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { useSettings } from '../../data/useSettings';
import { attempt } from '../../lib/errors';
import { useNow } from '../../lib/useNow';
import { formatDate, formatDuration, formatVolume } from '../../lib/format';
import { space } from '../../theme';

function greeting(hour: number): string {
  if (hour < 6) return 'Buenas noches';
  if (hour < 13) return 'Buen día';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HoyScreen() {
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const settings = useSettings();
  const { data, loading, error, reload } = useFocusAsync(async () => {
    const [inProgress, routines, active, suggested, recent] = await Promise.all([
      repos.workouts.getInProgress(),
      repos.routines.list(),
      repos.routines.getActive(),
      services.getSuggestedNextDay(),
      services.getRecentWorkouts(3),
    ]);
    return { inProgress, routineCount: routines.length, active, suggested, recent };
  });

  const nowMs = useNow();
  const now = new Date(nowMs);

  async function createFirstRoutine() {
    const routine = await attempt(() => repos.routines.create({ name: 'Mi rutina' }));
    if (routine)
      router.push({ pathname: '/rutina/[routineId]', params: { routineId: routine.id } });
  }

  async function start(dayId: string) {
    const workout = await attempt(() => services.startWorkoutFromDay(dayId));
    if (workout)
      router.push({ pathname: '/entrenando/[workoutId]', params: { workoutId: workout.id } });
  }

  const elapsedSeconds = (startedAt: string) => (nowMs - Date.parse(startedAt)) / 1000;

  let body;
  if (loading && !data) body = <LoadingState />;
  else if (error && !data)
    body = <ErrorState message="No pudimos cargar tu día." onRetry={reload} />;
  else if (data && data.routineCount === 0 && !data.inProgress)
    body = (
      <EmptyState
        icon="routines"
        title="Todavía no tenés rutinas"
        message="Armá tu primera rutina y empezá a registrar tus entrenamientos."
        actionLabel="Armá tu primera rutina"
        onAction={createFirstRoutine}
      />
    );
  else if (data) {
    const { inProgress, active, suggested, recent } = data;
    body = (
      <ScrollView contentContainerStyle={styles.content}>
        {inProgress ? (
          <Banner
            title="Continuar entrenamiento"
            subtitle={`${inProgress.dayNameSnapshot} · ${formatDuration(elapsedSeconds(inProgress.startedAt))}`}
            onPress={() =>
              router.push({
                pathname: '/entrenando/[workoutId]',
                params: { workoutId: inProgress.id },
              })
            }
          />
        ) : null}

        {suggested ? (
          <Card>
            <Text variant="caption">Entrenamiento de hoy</Text>
            <Text variant="displayS">{suggested.day.name}</Text>
            <Text variant="caption">{suggested.routine.name}</Text>
            <View style={styles.exerciseList}>
              {suggested.exercises.slice(0, 5).map((e, i) => (
                <Text key={`${e.id}-${i}`}>{e.name}</Text>
              ))}
              {suggested.exercises.length > 5 ? (
                <Text variant="caption">y {suggested.exercises.length - 5} más</Text>
              ) : null}
              {suggested.exercises.length === 0 ? (
                <Text variant="caption">Este día todavía no tiene ejercicios.</Text>
              ) : null}
            </View>
            <Button
              title="Empezar"
              size="lg"
              disabled={suggested.exercises.length === 0 || inProgress !== null}
              onPress={() => start(suggested.day.id)}
            />
            <Button
              title="Elegir otro día"
              variant="ghost"
              disabled={inProgress !== null}
              onPress={() => router.push('/elegir-dia')}
            />
            {inProgress ? (
              <Text variant="caption">Terminá el entrenamiento en curso para empezar otro.</Text>
            ) : null}
          </Card>
        ) : data.routineCount > 0 ? (
          <Card>
            <Text variant="displayS">
              {active ? 'Tu rutina activa no tiene días' : 'No tenés una rutina activa'}
            </Text>
            <Text variant="caption">
              {active
                ? 'Agregale días y ejercicios para poder entrenar.'
                : 'Elegí una rutina y marcala como activa para ver tu entrenamiento de hoy.'}
            </Text>
            <Button
              title={active ? 'Armar rutina' : 'Ir a Rutinas'}
              size="lg"
              onPress={() =>
                active
                  ? router.push({
                      pathname: '/rutina/[routineId]',
                      params: { routineId: active.id },
                    })
                  : router.push('/rutinas')
              }
            />
          </Card>
        ) : null}

        <Text variant="displayS">Últimos entrenamientos</Text>
        {recent.length === 0 ? (
          <Text variant="caption">Cuando termines tu primer entrenamiento va a aparecer acá.</Text>
        ) : (
          recent.map((r) => (
            <ListItem
              key={r.workout.id}
              title={r.workout.dayNameSnapshot}
              subtitle={`${formatDate(r.workout.startedAt)} · ${formatDuration(r.durationSeconds)} · ${formatVolume(r.volumeKg, settings.unit)}`}
              onPress={() =>
                router.push({
                  pathname: '/resumen/[workoutId]',
                  params: { workoutId: r.workout.id },
                })
              }
            />
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <ScreenContainer>
      <Text variant="caption">{formatDate(now)}</Text>
      <Text variant="displayM">{greeting(now.getHours())}</Text>
      <View style={styles.body}>{body}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, marginTop: space.md },
  content: { gap: space.lg, paddingBottom: space.xl },
  exerciseList: { gap: space.xs },
});
