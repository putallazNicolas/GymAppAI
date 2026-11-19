import {
  summarizePlannedSets,
  type DomainServices,
  type Repositories,
  type WeightUnit,
  type WorkoutListItem,
} from '@gym/core';
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
  Text,
} from '../../components';
import { HomeEmpty } from '../../components/home/HomeEmpty';
import {
  HoyHeader,
  type Headline,
  type HeadlinePr,
  type WeekProgress,
} from '../../components/home/HoyHeader';
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
import { RECENT_PR_DAYS, inProgressLine, lastWorkoutLine } from '../../lib/hoyHeadline';
import { useNow } from '../../lib/useNow';
import { colors, radii, space, stroke } from '../../theme';

interface RecentPr {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

/**
 * The most recent personal record of the last 14 days, with the set that made it (design/L5:
 * "PR 140 × 5 en sentadilla"). Uses the workout summaries of the core; no new data.
 */
async function findRecentPr(
  repos: Repositories,
  services: DomainServices,
  now: Date,
): Promise<RecentPr | undefined> {
  const since = new Date(now.getTime() - RECENT_PR_DAYS * 86_400_000).toISOString();
  const finished = await repos.workouts.listFinished({ since });
  for (const workout of finished) {
    const summary = await services.getWorkoutSummary(workout.id);
    for (const record of summary.personalRecords) {
      const best = summary.exercises.find((e) => e.exerciseId === record.exerciseId)?.bestSet;
      if (best)
        return { exerciseName: record.exerciseName, weightKg: best.weightKg, reps: best.reps };
    }
  }
  return undefined;
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
    const [inProgress, routines, active, suggested, recent, finished, weekly, recentPr] =
      await Promise.all([
        repos.workouts.getInProgress(),
        repos.routines.list(),
        repos.routines.getActive(),
        services.getSuggestedNextDay(),
        services.getRecentWorkouts(3),
        repos.workouts.listFinished({ limit: 100 }),
        services.getWeeklyStats(1),
        findRecentPr(repos, services, new Date()),
      ]);
    const inProgressDetail = inProgress ? await repos.workouts.getById(inProgress.id) : null;
    const lastForRoutine = active
      ? await repos.workouts.getLastFinishedForRoutine(active.id)
      : null;
    const lastSameDay = suggested ? finished.find((w) => w.dayId === suggested.day.id) : undefined;
    return {
      inProgress,
      inProgressDetail,
      routineCount: routines.length,
      active,
      suggested,
      recent,
      lastSameDay,
      lastForRoutine,
      workoutsThisWeek: weekly[0]?.workouts ?? 0,
      recentPr,
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

  // The headline says what is due (design/L5, option 1; S5 box "22:30", point 4).
  let headline: Headline | undefined;
  if (data?.inProgress) {
    const detail = data.inProgressDetail;
    const total = detail?.exercises.length ?? 0;
    const done = detail
      ? detail.exercises.filter((e) => e.sets.length > 0 && e.sets.every((s) => s.completed)).length
      : 0;
    headline = {
      label: 'Quedó a medias',
      title: data.inProgress.dayNameSnapshot,
      support: inProgressLine(done, total, new Date(data.inProgress.startedAt), now),
    };
  } else if (data && isEmpty) {
    headline = {
      label: 'Primer paso',
      title: 'Armá tu rutina',
      support: 'Tarda dos minutos. Después, cada día te dice qué toca.',
    };
  } else if (data?.suggested) {
    const pr: HeadlinePr | undefined = data.recentPr
      ? {
          set: `${formatNumber(kgToUnit(data.recentPr.weightKg, settings.unit), 1)} × ${data.recentPr.reps}`,
          exercise: data.recentPr.exerciseName,
        }
      : undefined;
    const lastAt = data.lastForRoutine?.finishedAt ?? data.lastForRoutine?.startedAt;
    headline = {
      label: 'Hoy toca',
      title: data.suggested.day.name,
      support: lastWorkoutLine(lastAt ? new Date(lastAt) : undefined, now),
      pr,
    };
  } else if (data) {
    // Routines exist, but none is active or the active one has no days (not drawn in L5).
    headline = {
      label: 'Primer paso',
      title: data.active ? 'Sumale días' : 'Elegí tu rutina',
      support: data.active
        ? 'Tu rutina activa todavía no tiene días.'
        : 'Marcá una rutina como activa para ver qué toca cada día.',
    };
  }
  const week: WeekProgress | undefined =
    headline && data?.active && data.active.days.length > 0
      ? { done: data.workoutsThisWeek, planned: data.active.days.length }
      : undefined;

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
            ? `${finishedCount} de ${inProgressDetail.exercises.length} ${inProgressDetail.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`
            : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;
    const plannedByIndex = suggested?.day.exercises ?? [];
    const todayExercises = suggested
      ? suggested.exercises.map((e, i) => ({
          name: e.name,
          summary: plannedByIndex[i] ? summarizePlannedSets(plannedByIndex[i]) : '',
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
            totalSets={plannedByIndex.reduce((n, e) => n + e.plannedSets.length, 0)}
            lastTime={lastSameDay ? formatDayMonthShort(lastSameDay.startedAt) : undefined}
            blocked={inProgress !== null}
            onStart={() => start(suggested.day.id)}
            onPickDay={() => router.push('/elegir-dia')}
          />
        ) : data.routineCount > 0 ? (
          <Card>
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
      <HoyHeader headline={headline} week={week} />
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
