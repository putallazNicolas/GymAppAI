import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';

import {
  BackBar,
  DashedAddButton,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  SavedIndicator,
  ScreenContainer,
  Switch,
  Text,
  UnderlineField,
  confirm,
} from '../../components';
import { useRepositories } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { attempt } from '../../lib/errors';
import { moveId } from '../../lib/reorder';
import { dayMeta } from '../../lib/routineFormat';
import { colors, hit, motion, radii, space, stroke } from '../../theme';

export default function RoutineScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const repos = useRepositories();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { data, loading, error, reload } = useFocusAsync(
    () => repos.routines.getById(routineId),
    [routineId],
  );
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
        <ErrorState message="No pudimos cargar la rutina." onRetry={reload} />
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <EmptyState title="Rutina no encontrada" message="Quizás ya la eliminaste." />
      </Shell>
    );

  const routine = data;
  const dayIds = routine.days.map((d) => d.id);

  /** Runs a mutation; on success marks "Guardado" and reloads. */
  async function persist(run: () => Promise<unknown>) {
    const result = await attempt(async () => {
      await run();
      return true;
    });
    if (result) setSaved((n) => n + 1);
    reload();
    return result;
  }

  async function saveName() {
    const name = (draftName ?? routine.name).trim();
    setDraftName(undefined);
    if (!name || name === routine.name) return;
    await persist(() => repos.routines.update(routine.id, { name }));
  }

  async function move(index: number, delta: -1 | 1) {
    await persist(() => repos.routines.reorderDays(routine.id, moveId(dayIds, index, delta)));
  }

  async function removeDay(id: string, name: string) {
    const ok = await confirm({
      title: `¿Eliminar ${name}?`,
      message:
        'Se borran sus ejercicios planificados. Los entrenamientos que ya registraste se conservan.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await persist(() => repos.routines.deleteDay(id));
  }

  async function addDay() {
    const day = await attempt(() =>
      repos.routines.addDay(routine.id, { name: `Día ${routine.days.length + 1}` }),
    );
    if (day) {
      setSaved((n) => n + 1);
      router.push({ pathname: '/rutina/dia/[dayId]', params: { dayId: day.id } });
    }
  }

  async function toggleActive(value: boolean) {
    await persist(() => repos.routines.setActive(value ? routine.id : null));
  }

  return (
    <Shell>
      <BackBar label="Rutinas" right={<SavedIndicator stamp={saved} />} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <UnderlineField
          label="Nombre de la rutina"
          value={draftName ?? routine.name}
          onChangeText={setDraftName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          returnKeyType="done"
          autoCapitalize="words"
        />

        <View style={styles.activeCard}>
          <View style={styles.activeTexts}>
            <Text variant="bodyStrong">Rutina activa</Text>
            <Text variant="caption">La usamos para sugerirte el día en Hoy</Text>
          </View>
          <Switch
            accessibilityLabel="Rutina activa"
            value={routine.isActive}
            onValueChange={toggleActive}
          />
        </View>

        <View style={styles.sectionHead}>
          <Text variant="label">
            Días{'  '}
            <Text variant="numS" color="textPrimary">
              {routine.days.length}
            </Text>
          </Text>
          <Text variant="caption" color="textTertiary">
            Se entrenan en este orden
          </Text>
        </View>

        <View style={styles.days}>
          {routine.days.length === 0 ? (
            <Text variant="bodyS" color="textSecondary">
              Todavía no hay días. Agregá el primero.
            </Text>
          ) : null}
          {routine.days.map((day, i) => {
            const sets = day.exercises.reduce((sum, e) => sum + e.sets, 0);
            return (
              <Animated.View
                key={day.id}
                layout={reduced ? undefined : LinearTransition.duration(motion.base + 20)}
                style={styles.dayRow}
              >
                <View style={styles.dayNumber}>
                  <Text variant="displayM" color="accent">
                    {i + 1}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${day.name}, ${dayMeta(day.exercises.length, sets)}`}
                  onPress={() =>
                    router.push({ pathname: '/rutina/dia/[dayId]', params: { dayId: day.id } })
                  }
                  style={styles.dayInfo}
                >
                  <Text variant="displayS" numberOfLines={1}>
                    {day.name}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {dayMeta(day.exercises.length, sets)}
                  </Text>
                </Pressable>
                <IconButton
                  glyph="↑"
                  label={`Subir ${day.name}`}
                  bare
                  narrow
                  tint="textBody"
                  disabled={i === 0}
                  onPress={() => move(i, -1)}
                />
                <IconButton
                  glyph="↓"
                  label={`Bajar ${day.name}`}
                  bare
                  narrow
                  tint="textBody"
                  disabled={i === routine.days.length - 1}
                  onPress={() => move(i, 1)}
                />
                <IconButton
                  glyph="trash"
                  label={`Eliminar ${day.name}`}
                  bare
                  tint="textSecondary"
                  onPress={() => removeDay(day.id, day.name)}
                />
              </Animated.View>
            );
          })}
        </View>

        <DashedAddButton title="Agregar día" onPress={addDay} />
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <ScreenContainer>{children}</ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { gap: space.lg + 2, paddingTop: space.sm + 2, paddingBottom: space.xxxl },
  activeCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  activeTexts: { flex: 1, gap: 2 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: -space.sm,
  },
  days: { gap: space.sm - 2 },
  dayRow: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingRight: space.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  dayNumber: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: stroke.hairline,
    borderRightColor: colors.border,
  },
  dayInfo: {
    flex: 1,
    minWidth: 0,
    minHeight: hit.min,
    justifyContent: 'center',
    gap: 2,
    paddingLeft: space.sm + 2,
  },
});
