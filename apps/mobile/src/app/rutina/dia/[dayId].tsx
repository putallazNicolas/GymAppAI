import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';

import {
  BackBar,
  DashedAddButton,
  EmptyState,
  ErrorState,
  LoadingState,
  PlannedExerciseCard,
  SavedIndicator,
  ScreenContainer,
  Text,
  UnderlineField,
  confirm,
} from '../../../components';
import { useRepositories } from '../../../data/DataProvider';
import { useFocusAsync } from '../../../data/useFocusAsync';
import { attempt } from '../../../lib/errors';
import { moveId } from '../../../lib/reorder';
import { motion, space } from '../../../theme';

export default function DayScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const repos = useRepositories();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { data, loading, error, reload } = useFocusAsync(async () => {
    const day = await repos.routines.getDay(dayId);
    if (!day) return null;
    const [exercises, routine] = await Promise.all([
      repos.exercises.getByIds(day.exercises.map((e) => e.exerciseId)),
      repos.routines.getById(day.routineId),
    ]);
    return {
      day,
      names: new Map(exercises.map((e) => [e.id, e.name])),
      routineName: routine?.name ?? 'Rutina',
      position: routine ? routine.days.findIndex((d) => d.id === day.id) + 1 : 0,
    };
  }, [dayId]);
  const [draftName, setDraftName] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(0);

  if (loading && data === undefined)
    return (
      <Shell>
        <LoadingState />
      </Shell>
    );
  if (error && data === undefined)
    return (
      <Shell>
        <ErrorState message="No pudimos cargar el día." onRetry={reload} />
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <EmptyState title="Día no encontrado" message="Quizás ya lo eliminaste." />
      </Shell>
    );

  const { day, names, routineName, position } = data;
  const ids = day.exercises.map((e) => e.id);
  const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0);

  async function persist(run: () => Promise<unknown>) {
    const ok = await attempt(async () => {
      await run();
      return true;
    });
    if (ok) setSaved((n) => n + 1);
    reload();
    return ok;
  }

  async function saveName() {
    const name = (draftName ?? day.name).trim();
    setDraftName(undefined);
    if (!name || name === day.name) return;
    await persist(() => repos.routines.updateDay(day.id, { name }));
  }

  async function move(index: number, delta: -1 | 1) {
    await persist(() => repos.routines.reorderPlannedExercises(day.id, moveId(ids, index, delta)));
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: `¿Quitar ${name}?`,
      message: 'Se quita de este día. Lo que ya entrenaste se conserva.',
      confirmLabel: 'Quitar',
      destructive: true,
    });
    if (!ok) return;
    await persist(() => repos.routines.deletePlannedExercise(id));
  }

  return (
    <Shell>
      <BackBar label={routineName} right={<SavedIndicator stamp={saved} />} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <UnderlineField
          label={position > 0 ? `Día ${position} · nombre` : 'Nombre del día'}
          value={draftName ?? day.name}
          onChangeText={setDraftName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          returnKeyType="done"
          autoCapitalize="words"
        />

        <View style={styles.sectionHead}>
          <Text variant="label">
            Ejercicios{'  '}
            <Text variant="numS" color="textPrimary">
              {day.exercises.length}
            </Text>
          </Text>
          <Text variant="caption" color="textTertiary">
            <Text variant="numS" color="textBody">
              {totalSets}
            </Text>
            {totalSets === 1 ? ' serie en total' : ' series en total'}
          </Text>
        </View>

        <View style={styles.list}>
          {day.exercises.length === 0 ? (
            <Text variant="bodyS" color="textSecondary">
              Todavía no hay ejercicios. Agregá el primero.
            </Text>
          ) : null}
          {day.exercises.map((p, i) => {
            const name = names.get(p.exerciseId) ?? 'Ejercicio';
            return (
              <Animated.View
                key={p.id}
                layout={reduced ? undefined : LinearTransition.duration(motion.base + 20)}
              >
                <PlannedExerciseCard
                  planned={p}
                  name={name}
                  position={i + 1}
                  canMoveUp={i > 0}
                  canMoveDown={i < day.exercises.length - 1}
                  onSave={(patch) => {
                    void persist(() => repos.routines.updatePlannedExercise(p.id, patch));
                  }}
                  onMove={(delta) => move(i, delta)}
                  onDelete={() => remove(p.id, name)}
                />
              </Animated.View>
            );
          })}
        </View>

        <DashedAddButton
          title="Agregar ejercicio"
          onPress={() => router.push({ pathname: '/elegir-ejercicio', params: { dayId: day.id } })}
        />
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <ScreenContainer>{children}</ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { gap: space.lg + 2, paddingTop: space.sm + 2, paddingBottom: space.xxxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: -space.sm,
  },
  list: { gap: space.sm + 2 },
});
