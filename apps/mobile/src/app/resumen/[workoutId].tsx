import type { PersonalRecord } from '@gym/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  Text,
  TextField,
} from '../../components';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useAsync } from '../../data/useAsync';
import { useSettings } from '../../data/useSettings';
import { attempt } from '../../lib/errors';
import { formatDate, formatDuration, formatVolume, formatWeight } from '../../lib/format';
import { colors, radii, space } from '../../theme';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="displayS">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const settings = useSettings();
  const { data, loading, error, reload } = useAsync(
    () => services.getWorkoutSummary(workoutId),
    [workoutId],
  );
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  if (loading && !data)
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <LoadingState />
      </ScreenContainer>
    );
  if (error || !data)
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        {error ? (
          <ErrorState message="No pudimos cargar el resumen." onRetry={reload} />
        ) : (
          <EmptyState title="Resumen no encontrado" />
        )}
        <Button title="Volver a Hoy" variant="secondary" onPress={() => router.dismissAll()} />
      </ScreenContainer>
    );

  const unit = settings.unit;
  const noteValue = notes ?? data.workout.notes ?? '';
  const prLabel = (pr: PersonalRecord) => (pr.type === 'weight' ? 'Peso máximo' : 'e1RM estimado');

  async function saveAndExit() {
    setSaving(true);
    const trimmed = noteValue.trim();
    const ok = await attempt(() =>
      repos.workouts.update(workoutId, { notes: trimmed ? trimmed : null }),
    );
    setSaving(false);
    if (ok) router.dismissAll();
  }

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View>
          <Text variant="displayM">{data.workout.dayNameSnapshot}</Text>
          <Text variant="caption">{formatDate(data.workout.startedAt)}</Text>
        </View>

        <Card>
          <View style={styles.stats}>
            <Stat label="Duración" value={formatDuration(data.durationSeconds)} />
            <Stat label="Series" value={`${data.completedSets}/${data.totalSets}`} />
          </View>
          <View style={styles.stats}>
            <Stat label="Volumen" value={formatVolume(data.volumeKg, unit)} />
            <Stat label="Ejercicios" value={String(data.exerciseCount)} />
          </View>
        </Card>

        {data.personalRecords.length > 0 ? (
          <Card>
            <Text variant="displayS" color="record">
              ¡Nuevos récords!
            </Text>
            {data.personalRecords.map((pr) => (
              <View key={`${pr.exerciseId}-${pr.type}`}>
                <Text variant="bodyStrong">{pr.exerciseName}</Text>
                <Text variant="caption">
                  {prLabel(pr)}: {formatWeight(pr.valueKg, unit)}
                  {pr.previousKg !== undefined
                    ? ` (antes ${formatWeight(pr.previousKg, unit)})`
                    : ''}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Text variant="displayS">Ejercicios</Text>
        {data.exercises.map((e) => (
          <View key={e.workoutExerciseId} style={styles.exercise}>
            <View style={styles.exerciseText}>
              <Text variant="bodyStrong" color={e.skipped ? 'textSecondary' : 'textPrimary'}>
                {e.exerciseName}
              </Text>
              <Text variant="caption">
                {e.skipped ? 'Saltado' : `${e.completedSets}/${e.totalSets} series`}
              </Text>
            </View>
            {e.bestSet ? (
              <Text variant="bodyStrong">
                {formatWeight(e.bestSet.weightKg, unit)} × {e.bestSet.reps}
              </Text>
            ) : null}
          </View>
        ))}

        <TextField
          label="Notas"
          value={noteValue}
          onChangeText={setNotes}
          placeholder="¿Cómo te sentiste?"
          multiline
          style={styles.notes}
        />
        <Button title="Guardar y volver" size="lg" loading={saving} onPress={saveAndExit} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg, paddingVertical: space.lg },
  stats: { flexDirection: 'row', gap: space.lg },
  stat: { flex: 1, gap: space.xs },
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: radii.sm,
  },
  exerciseText: { flex: 1 },
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: space.md },
});
