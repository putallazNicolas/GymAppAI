import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PlannedExerciseCard,
  ScreenContainer,
  Text,
  TextField,
  confirm,
} from '../../../components';
import { useRepositories } from '../../../data/DataProvider';
import { useFocusAsync } from '../../../data/useFocusAsync';
import { attempt } from '../../../lib/errors';
import { moveId } from '../../../lib/reorder';
import { spacing } from '../../../theme';

export default function DayScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const repos = useRepositories();
  const router = useRouter();
  const { data, loading, error, reload } = useFocusAsync(async () => {
    const day = await repos.routines.getDay(dayId);
    if (!day) return null;
    const exercises = await repos.exercises.getByIds(day.exercises.map((e) => e.exerciseId));
    return { day, names: new Map(exercises.map((e) => [e.id, e.name])) };
  }, [dayId]);
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
        <ErrorState message="No pudimos cargar el día." onRetry={reload} />
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <EmptyState title="Día no encontrado" message="Quizás ya lo eliminaste." />
      </Shell>
    );

  const { day, names } = data;
  const ids = day.exercises.map((e) => e.id);

  async function saveName() {
    const name = (draftName ?? day.name).trim();
    setDraftName(undefined);
    if (!name || name === day.name) return;
    await attempt(() => repos.routines.updateDay(day.id, { name }));
    reload();
  }

  async function move(index: number, delta: -1 | 1) {
    await attempt(() => repos.routines.reorderPlannedExercises(day.id, moveId(ids, index, delta)));
    reload();
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: 'Quitar ejercicio',
      message: `¿Quitar "${name}" de este día?`,
      confirmLabel: 'Quitar',
      destructive: true,
    });
    if (!ok) return;
    await attempt(() => repos.routines.deletePlannedExercise(id));
    reload();
  }

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TextField
          label="Nombre del día"
          value={draftName ?? day.name}
          onChangeText={setDraftName}
          onBlur={saveName}
          returnKeyType="done"
        />
        <Text variant="title">Ejercicios</Text>
        {day.exercises.length === 0 ? (
          <Text variant="caption">Todavía no hay ejercicios. Agregá el primero.</Text>
        ) : null}
        {day.exercises.map((p, i) => {
          const name = names.get(p.exerciseId) ?? 'Ejercicio';
          return (
            <PlannedExerciseCard
              key={p.id}
              planned={p}
              name={name}
              canMoveUp={i > 0}
              canMoveDown={i < day.exercises.length - 1}
              onSave={async (patch) => {
                await attempt(() => repos.routines.updatePlannedExercise(p.id, patch));
              }}
              onMove={(delta) => move(i, delta)}
              onDelete={() => remove(p.id, name)}
            />
          );
        })}
        <Button
          title="Agregar ejercicio"
          size="lg"
          onPress={() => router.push({ pathname: '/elegir-ejercicio', params: { dayId: day.id } })}
        />
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <ScreenContainer edges={['bottom', 'left', 'right']}>{children}</ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
});
