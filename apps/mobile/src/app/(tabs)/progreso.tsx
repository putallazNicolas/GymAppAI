import type { Exercise } from '@gym/core';
import { useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BarList,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LineChart,
  ListItem,
  LoadingState,
  ScreenContainer,
  Text,
  TextField,
} from '../../components';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useAsync } from '../../data/useAsync';
import { useFocusAsync } from '../../data/useFocusAsync';
import { useSettings } from '../../data/useSettings';
import {
  formatDate,
  formatNumber,
  formatShortDate,
  formatVolume,
  kgToUnit,
} from '../../lib/format';
import { colors, spacing } from '../../theme';

export default function ProgresoScreen() {
  const repos = useRepositories();
  const services = useServices();
  const settings = useSettings();
  const unit = settings.unit;
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const base = useFocusAsync(async () => {
    const [exercises, weekly] = await Promise.all([
      repos.exercises.list(),
      services.getWeeklyStats(8),
    ]);
    const flags = await Promise.all(
      exercises.map(async (e) => {
        const h = await repos.workouts.getExerciseHistory(e.id, { limit: 1 });
        return h.length > 0;
      }),
    );
    const withHistory = exercises.filter((_, i) => flags[i]);
    const others = exercises.filter((_, i) => !flags[i]);
    return { ordered: [...withHistory, ...others], withHistoryCount: withHistory.length, weekly };
  });

  const selected: Exercise | undefined =
    base.data?.ordered.find((e) => e.id === pickedId) ??
    (base.data && base.data.withHistoryCount > 0 ? base.data.ordered[0] : undefined);

  const progress = useAsync(
    () => (selected ? services.getExerciseProgress(selected.id) : Promise.resolve([])),
    [selected?.id, base.data],
  );

  if (base.loading && !base.data)
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  if (base.error && !base.data)
    return (
      <ScreenContainer>
        <ErrorState message="No pudimos cargar tu progreso." onRetry={base.reload} />
      </ScreenContainer>
    );
  const data = base.data;
  if (!data) return null;

  if (data.withHistoryCount === 0)
    return (
      <ScreenContainer>
        <Text variant="heading">Progreso</Text>
        <EmptyState
          icon="progress"
          title="Todavía no hay datos"
          message="Terminá tu primer entrenamiento y acá vas a ver cómo evolucionan tus pesos."
        />
      </ScreenContainer>
    );

  const points = progress.data ?? [];

  return (
    <ScreenContainer>
      <Text variant="heading">Progreso</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text variant="title">Entrenamientos por semana</Text>
          <BarList
            items={data.weekly.map((w) => ({
              label: formatShortDate(w.weekStart),
              value: w.workouts,
              valueLabel: String(w.workouts),
            }))}
          />
        </Card>
        <Card>
          <Text variant="title">Volumen semanal</Text>
          <BarList
            color={colors.success}
            items={data.weekly.map((w) => ({
              label: formatShortDate(w.weekStart),
              value: w.volumeKg,
              valueLabel: formatNumber(kgToUnit(w.volumeKg, unit) / 1000, 1) + 'k',
            }))}
          />
          <Text variant="caption">Semanas desde el lunes, en miles de {unit}.</Text>
        </Card>

        <Text variant="title">Por ejercicio</Text>
        <Button
          title={selected ? selected.name : 'Elegir ejercicio'}
          variant="secondary"
          size="lg"
          onPress={() => setPickerOpen(true)}
        />

        {progress.loading && !progress.data ? (
          <LoadingState />
        ) : progress.error ? (
          <ErrorState message="No pudimos cargar este ejercicio." onRetry={progress.reload} />
        ) : points.length === 0 ? (
          <EmptyState
            icon="progress"
            title="Sin sesiones todavía"
            message="Todavía no registraste este ejercicio en un entrenamiento terminado."
          />
        ) : (
          <>
            <Card>
              <LineChart
                unitLabel={unit}
                xLabels={points.map((p) => formatShortDate(p.date))}
                series={[
                  {
                    label: 'Mejor peso',
                    color: colors.primary,
                    values: points.map((p) => kgToUnit(p.bestWeightKg, unit)),
                  },
                  {
                    label: 'e1RM',
                    color: colors.success,
                    values: points.map((p) => kgToUnit(p.bestE1rmKg, unit)),
                  },
                ]}
              />
            </Card>
            <Text variant="title">Historial</Text>
            {[...points].reverse().map((p) => (
              <ListItem
                key={p.workoutId}
                title={formatDate(p.date)}
                subtitle={
                  p.sets
                    .map(
                      (s) =>
                        `${s.weightKg === undefined ? '—' : formatNumber(kgToUnit(s.weightKg, unit))} × ${s.reps ?? '—'}`,
                    )
                    .join('  ·  ') || 'Sin series completadas'
                }
                trailing={<Text variant="caption">{formatVolume(p.volumeKg, unit)}</Text>}
              />
            ))}
          </>
        )}
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        exercises={data.ordered}
        withHistoryCount={data.withHistoryCount}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => {
          setPickedId(id);
          setPickerOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

function ExercisePicker({
  visible,
  exercises,
  withHistoryCount,
  onClose,
  onPick,
}: {
  visible: boolean;
  exercises: Exercise[];
  withHistoryCount: number;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = exercises
    .map((e, i) => ({ e, hasHistory: i < withHistoryCount }))
    .filter(({ e }) => !q || e.name.toLowerCase().includes(q));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalTop}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            accessibilityLabel="Buscar ejercicio"
            autoCorrect={false}
          />
          <Button title="Cerrar" variant="ghost" onPress={onClose} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalList}
          ListEmptyComponent={<Text variant="caption">Sin resultados.</Text>}
          renderItem={({ item }) => (
            <ListItem
              title={item.e.name}
              subtitle={item.hasHistory ? 'Con historial' : undefined}
              onPress={() => onPick(item.e.id)}
            />
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  modal: { flex: 1, backgroundColor: colors.background },
  modalTop: { padding: spacing.lg, gap: spacing.sm },
  modalList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
