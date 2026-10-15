import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ScreenContainer,
  Text,
  TextField,
  confirm,
} from '../../components';
import { useRepositories } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { attempt } from '../../lib/errors';
import { moveId } from '../../lib/reorder';
import { colors, spacing, touch } from '../../theme';

export default function RoutineScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const repos = useRepositories();
  const router = useRouter();
  const { data, loading, error, reload } = useFocusAsync(
    () => repos.routines.getById(routineId),
    [routineId],
  );
  const [draftName, setDraftName] = useState<string | undefined>(undefined);

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

  async function saveName() {
    const name = (draftName ?? routine.name).trim();
    setDraftName(undefined);
    if (!name || name === routine.name) return;
    await attempt(() => repos.routines.update(routine.id, { name }));
    reload();
  }

  async function move(index: number, delta: -1 | 1) {
    await attempt(() => repos.routines.reorderDays(routine.id, moveId(dayIds, index, delta)));
    reload();
  }

  async function removeDay(id: string, name: string) {
    const ok = await confirm({
      title: 'Eliminar día',
      message: `Se va a eliminar "${name}" y sus ejercicios.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await attempt(() => repos.routines.deleteDay(id));
    reload();
  }

  async function addDay() {
    const day = await attempt(() =>
      repos.routines.addDay(routine.id, { name: `Día ${routine.days.length + 1}` }),
    );
    if (day) router.push({ pathname: '/rutina/dia/[dayId]', params: { dayId: day.id } });
  }

  async function toggleActive(value: boolean) {
    await attempt(() => repos.routines.setActive(value ? routine.id : null));
    reload();
  }

  return (
    <Shell>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TextField
          label="Nombre de la rutina"
          value={draftName ?? routine.name}
          onChangeText={setDraftName}
          onBlur={saveName}
          returnKeyType="done"
        />
        <View style={styles.switchRow}>
          <Text variant="label">Rutina activa</Text>
          <Switch
            accessibilityLabel="Rutina activa"
            value={routine.isActive}
            onValueChange={toggleActive}
            trackColor={{ true: colors.success, false: colors.border }}
          />
        </View>
        <Text variant="title">Días</Text>
        {routine.days.length === 0 ? (
          <Text variant="caption">Todavía no hay días. Agregá el primero.</Text>
        ) : null}
        {routine.days.map((day, i) => (
          <Card key={day.id} style={styles.dayCard}>
            <View style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Button
                  title={day.name}
                  variant="ghost"
                  onPress={() =>
                    router.push({ pathname: '/rutina/dia/[dayId]', params: { dayId: day.id } })
                  }
                  style={styles.dayBtn}
                />
                <Text variant="caption">
                  {day.exercises.length} {day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                </Text>
              </View>
              <IconButton
                glyph="↑"
                label="Subir día"
                disabled={i === 0}
                onPress={() => move(i, -1)}
              />
              <IconButton
                glyph="↓"
                label="Bajar día"
                disabled={i === routine.days.length - 1}
                onPress={() => move(i, 1)}
              />
              <IconButton
                glyph="✕"
                label="Eliminar día"
                danger
                onPress={() => removeDay(day.id, day.name)}
              />
            </View>
          </Card>
        ))}
        <Button title="Agregar día" variant="secondary" size="lg" onPress={addDay} />
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <ScreenContainer edges={['bottom', 'left', 'right']}>{children}</ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  dayCard: { padding: spacing.md },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayInfo: { flex: 1 },
  dayBtn: { alignItems: 'flex-start', paddingHorizontal: 0 },
});
