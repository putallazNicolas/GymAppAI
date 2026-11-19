import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';

import {
  DashedAddButton,
  EditableTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  PlannedExerciseRow,
  SavedIndicator,
  ScreenContainer,
  Text,
} from '../../../components';
import { useRepositories } from '../../../data/DataProvider';
import { useFocusAsync } from '../../../data/useFocusAsync';
import { attempt } from '../../../lib/errors';
import { moveId } from '../../../lib/reorder';
import { motion, space } from '../../../theme';

export default function DayScreen() {
  const { dayId, isNew } = useLocalSearchParams<{ dayId: string; isNew?: string }>();
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
      position: routine ? routine.days.findIndex((d) => d.id === day.id) + 1 : 0,
    };
  }, [dayId]);
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

  const { day, names, position } = data;
  const ids = day.exercises.map((e) => e.id);
  const totalSets = day.exercises.reduce((sum, e) => sum + e.plannedSets.length, 0);

  async function persist(run: () => Promise<unknown>) {
    const ok = await attempt(async () => {
      await run();
      return true;
    });
    if (ok) setSaved((n) => n + 1);
    reload();
    return ok;
  }

  /** The title already validated and trimmed the name. */
  async function saveName(name: string) {
    return (await persist(() => repos.routines.updateDay(day.id, { name }))) === true;
  }

  async function move(index: number, delta: -1 | 1) {
    await persist(() => repos.routines.reorderPlannedExercises(day.id, moveId(ids, index, delta)));
  }

  return (
    <Shell>
      {/* Native header (design/L5 option A): only the chevron; the save status goes on the right. */}
      <Stack.Screen options={{ headerRight: () => <SavedIndicator stamp={saved} /> }} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <EditableTitle
          label={position > 0 ? `Día ${position} · nombre` : 'Nombre del día'}
          value={day.name}
          onCommit={saveName}
          placeholder="Nombre del día"
          emptyHelper="Ej.: Piernas A, Torso B, Empuje"
          autoFocus={isNew === '1'}
        />

        <View style={styles.sectionHead}>
          <View style={styles.inlineRow}>
            <Text variant="label">Ejercicios</Text>
            <Text variant="numS" color="textPrimary">
              {day.exercises.length}
            </Text>
          </View>
          <View style={styles.inlineRow}>
            <Text variant="numS" color="textBody">
              {totalSets}
            </Text>
            <Text variant="caption" color="textTertiary">
              {`${totalSets === 1 ? 'serie' : 'series'} · tocá uno para editarlo`}
            </Text>
          </View>
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
                <PlannedExerciseRow
                  planned={p}
                  name={name}
                  position={i + 1}
                  canMoveUp={i > 0}
                  canMoveDown={i < day.exercises.length - 1}
                  onOpen={() => {
                    Keyboard.dismiss();
                    router.push({
                      pathname: '/rutina/ejercicio/[plannedId]',
                      params: { plannedId: p.id, dayId: day.id },
                    });
                  }}
                  onMove={(delta) => move(i, delta)}
                />
              </Animated.View>
            );
          })}
        </View>

        <DashedAddButton
          title="Agregar ejercicio"
          onPress={() => {
            Keyboard.dismiss();
            router.push({ pathname: '/elegir-ejercicio', params: { dayId: day.id } });
          }}
        />
        {day.exercises.length > 0 ? (
          <Text variant="caption" color="textTertiary" style={styles.footHint}>
            Para quitar un ejercicio, abrilo y tocá «Quitar del día». Así el tacho no queda al lado
            de las flechas.
          </Text>
        ) : null}
      </ScrollView>
    </Shell>
  );
}

/** Under the native stack header: no top safe area (the header already has it). */
function Shell({ children }: { children: React.ReactNode }) {
  return <ScreenContainer edges={['left', 'right']}>{children}</ScreenContainer>;
}

const styles = StyleSheet.create({
  /** The title is the first thing, 8 pt below the bar (S5 box "22:30", navigation point 3). */
  content: { gap: space.lg + 2, paddingTop: space.sm, paddingBottom: space.xxxl },
  inlineRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs + 1 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: -space.sm,
  },
  list: { gap: space.sm + 2 },
  footHint: { textAlign: 'center', paddingHorizontal: space.xs },
});
