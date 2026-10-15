import type { WeightUnit, WorkoutListItem } from '@gym/core';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Banner,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PressableScale,
  ScreenContainer,
  ScreenHeader,
  Text,
} from '../../components';
import { HomeEmpty } from '../../components/home/HomeEmpty';
import { TodayCard } from '../../components/home/TodayCard';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { useSettings } from '../../data/useSettings';
import { attempt } from '../../lib/errors';
import {
  formatDate,
  formatDayMonthShort,
  formatDurationHuman,
  formatNumber,
  formatStartedAt,
  formatWeekdayShort,
  kgToUnit,
} from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { colors, radii, space, stroke } from '../../theme';

function greeting(hour: number): string {
  if (hour < 6) return 'Buenas noches';
  if (hour < 13) return 'Buen día';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function RecentRow({
  item,
  unit,
  onPress,
}: {
  item: WorkoutListItem;
  unit: WeightUnit;
  onPress: () => void;
}) {
  const started = new Date(item.workout.startedAt);
  const weekday = formatWeekdayShort(started);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${item.workout.dayNameSnapshot}, ${formatDate(started)}, ${formatDurationHuman(item.durationSeconds)}`}
      onPress={onPress}
      style={styles.recent}
    >
      <View style={styles.dateBlock}>
        <Text variant="numM">{started.getDate()}</Text>
        <Text variant="label">{weekday}</Text>
      </View>
      <View style={styles.recentText}>
        <Text variant="bodyMSemi" numberOfLines={1}>
          {item.workout.dayNameSnapshot}
        </Text>
        <Text variant="caption">{formatDurationHuman(item.durationSeconds)}</Text>
      </View>
      <Text variant="numMd">
        {formatNumber(kgToUnit(item.volumeKg, unit), 0)}
        <Text variant="caption"> {unit}</Text>
      </Text>
    </PressableScale>
  );
}

export default function HoyScreen() {
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const settings = useSettings();
  const { data, loading, error, reload } = useFocusAsync(async () => {
    const [inProgress, routines, active, suggested, recent, finished] = await Promise.all([
      repos.workouts.getInProgress(),
      repos.routines.list(),
      repos.routines.getActive(),
      services.getSuggestedNextDay(),
      services.getRecentWorkouts(3),
      repos.workouts.listFinished({ limit: 100 }),
    ]);
    const inProgressDetail = inProgress ? await repos.workouts.getById(inProgress.id) : null;
    const lastSameDay = suggested ? finished.find((w) => w.dayId === suggested.day.id) : undefined;
    return {
      inProgress,
      inProgressDetail,
      routineCount: routines.length,
      active,
      suggested,
      recent,
      lastSameDay,
    };
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

  const isEmpty = data !== undefined && data.routineCount === 0 && !data.inProgress;

  let body;
  if (loading && !data) body = <LoadingState />;
  else if (error && !data)
    body = <ErrorState message="No pudimos cargar tu día." onRetry={reload} />;
  else if (data && isEmpty)
    body = (
      <HomeEmpty onCreateRoutine={createFirstRoutine} onImport={() => router.push('/perfil')} />
    );
  else if (data) {
    const { inProgress, inProgressDetail, active, suggested, recent, lastSameDay } = data;
    const finishedCount = inProgressDetail
      ? inProgressDetail.exercises.filter(
          (e) => e.sets.length > 0 && e.sets.every((s) => s.completed),
        ).length
      : 0;
    const bannerSubtitle = inProgress
      ? [
          inProgress.dayNameSnapshot,
          `empezado ${formatStartedAt(inProgress.startedAt, now)}`,
          inProgressDetail
            ? `${finishedCount} de ${inProgressDetail.exercises.length} ejercicios`
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;
    const plannedByIndex = suggested?.day.exercises ?? [];
    const todayExercises = suggested
      ? suggested.exercises.map((e, i) => ({
          name: e.name,
          sets: plannedByIndex[i]?.sets ?? 0,
          reps: plannedByIndex[i]?.reps ?? '',
        }))
      : [];

    body = (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {inProgress ? (
          <Banner
            title="Continuar entrenamiento"
            subtitle={bannerSubtitle}
            onPress={() =>
              router.push({
                pathname: '/entrenando/[workoutId]',
                params: { workoutId: inProgress.id },
              })
            }
          />
        ) : null}

        {suggested ? (
          <TodayCard
            caption={`Día ${suggested.day.order + 1} de ${active?.days.length ?? 1} · ${suggested.routine.name}`}
            dayName={suggested.day.name}
            exercises={todayExercises}
            totalSets={todayExercises.reduce((n, e) => n + e.sets, 0)}
            lastTime={lastSameDay ? formatDayMonthShort(lastSameDay.startedAt) : undefined}
            blocked={inProgress !== null}
            onStart={() => start(suggested.day.id)}
            onPickDay={() => router.push('/elegir-dia')}
          />
        ) : data.routineCount > 0 ? (
          <Card>
            <Text variant="displayM">
              {active ? 'Tu rutina activa no tiene días' : 'No tenés una rutina activa'}
            </Text>
            <Text variant="bodyS">
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

        <View style={styles.section}>
          <Text variant="label" style={styles.sectionLabel}>
            Últimos entrenamientos
          </Text>
          {recent.length === 0 ? (
            <Text variant="caption">
              Cuando termines tu primer entrenamiento va a aparecer acá.
            </Text>
          ) : (
            <View style={styles.recentList}>
              {recent.map((r) => (
                <RecentRow
                  key={r.workout.id}
                  item={r}
                  unit={settings.unit}
                  onPress={() =>
                    router.push({
                      pathname: '/resumen/[workoutId]',
                      params: { workoutId: r.workout.id },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        label={formatDate(now)}
        title={isEmpty ? 'Bienvenido' : greeting(now.getHours())}
      />
      <View style={styles.body}>{body}</View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { gap: space.md, paddingBottom: space.xl },
  section: { marginTop: space.sm, gap: space.sm },
  sectionLabel: { paddingTop: space.xs },
  recentList: { gap: space.xs + 2 },
  recent: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingRight: space.md + 2,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
  },
  dateBlock: {
    width: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: stroke.hairline,
    borderRightColor: colors.divider,
  },
  recentText: { flex: 1 },
});
