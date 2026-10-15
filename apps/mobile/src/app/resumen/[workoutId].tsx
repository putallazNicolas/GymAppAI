import type { PersonalRecord, WeightUnit, WorkoutDetail, WorkoutSummary } from '@gym/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  Text,
  TextField,
} from '../../components';
import { RecordLights } from '../../components/summary/RecordLights';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useAsync } from '../../data/useAsync';
import { useSettings } from '../../data/useSettings';
import { attempt } from '../../lib/errors';
import {
  formatDate,
  formatClock,
  formatNumber,
  formatTime,
  formatWeight,
  kgToUnit,
} from '../../lib/format';
import { colors, motion, radii, space, stroke } from '../../theme';

const STAT_STAGGER_MS = 60;
const ROW_FIRST_DELAY_MS = 900;
const ROW_STAGGER_MS = 120;
const RISE_MS = 360;
const COUNT_MS = 300;

function useEnter(kind: 'stat' | 'rise', index: number) {
  const reduced = useReducedMotion();
  if (reduced) return FadeIn.duration(motion.reduced);
  if (kind === 'stat')
    return FadeInDown.duration(COUNT_MS)
      .delay(index * STAT_STAGGER_MS)
      .easing(motion.easeOut);
  return FadeInDown.duration(RISE_MS)
    .delay(ROW_FIRST_DELAY_MS + index * ROW_STAGGER_MS)
    .easing(motion.easeOut);
}

function Stat({
  label,
  index,
  children,
}: {
  label: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={useEnter('stat', index)} style={styles.stat}>
      <Text variant="label">{label}</Text>
      {children}
    </Animated.View>
  );
}

/** "1:07:42" -> "1:07" + a quieter ":42". */
function DurationValue({ seconds }: { seconds: number }) {
  const text = formatClock(seconds);
  const cut = text.lastIndexOf(':');
  return (
    <Text variant="numXL">
      {text.slice(0, cut)}
      <Text variant="numXL" color="textTertiary">
        {text.slice(cut)}
      </Text>
    </Text>
  );
}

interface PrRow {
  exerciseId: string;
  exerciseName: string;
  record: PersonalRecord;
  bestSet?: { weightKg: number; reps: number };
}

type SummaryData = WorkoutSummary & {
  /** Heaviest completed set per exercise (ties: more reps), for weight records. */
  heaviest: Map<string, { weightKg: number; reps: number }>;
};

function heaviestSets(detail: WorkoutDetail | null): SummaryData['heaviest'] {
  const out: SummaryData['heaviest'] = new Map();
  for (const e of detail?.exercises ?? []) {
    for (const s of e.sets) {
      if (!s.completed || s.weightKg === undefined || s.reps === undefined || s.reps < 1) continue;
      const cur = out.get(e.exerciseId);
      if (!cur || s.weightKg > cur.weightKg || (s.weightKg === cur.weightKg && s.reps > cur.reps))
        out.set(e.exerciseId, { weightKg: s.weightKg, reps: s.reps });
    }
  }
  return out;
}

/** One row per exercise: the e1RM record when there is one, else the weight record. */
function prRows(summary: SummaryData): PrRow[] {
  const byExercise = new Map<string, PersonalRecord>();
  for (const pr of summary.personalRecords) {
    const current = byExercise.get(pr.exerciseId);
    if (!current || (pr.type === 'e1rm' && current.type !== 'e1rm'))
      byExercise.set(pr.exerciseId, pr);
  }
  return [...byExercise.values()].map((record) => ({
    exerciseId: record.exerciseId,
    exerciseName: record.exerciseName,
    record,
    // A weight record shows the set that set it; an e1RM record, the best set by e1RM.
    bestSet:
      record.type === 'weight'
        ? summary.heaviest.get(record.exerciseId)
        : summary.exercises.find((e) => e.exerciseId === record.exerciseId)?.bestSet,
  }));
}

function PrRowView({ row, index, unit }: { row: PrRow; index: number; unit: WeightUnit }) {
  const { record, bestSet } = row;
  const delta = record.previousKg !== undefined ? record.valueKg - record.previousKg : undefined;
  return (
    <Animated.View entering={useEnter('rise', index)} style={styles.prRow}>
      <View style={styles.flex}>
        <Text variant="bodyMSemi">{row.exerciseName}</Text>
        <Text variant="caption">
          {record.type === 'e1rm' ? 'e1RM' : 'Peso'}{' '}
          <Text variant="numS" color="textPrimary">
            {formatWeight(record.valueKg, unit)}
          </Text>
          {record.previousKg !== undefined
            ? ` · antes ${formatNumber(kgToUnit(record.previousKg, unit))}`
            : ''}
        </Text>
      </View>
      <View style={styles.prValues}>
        {bestSet ? (
          <Text variant="numD">
            {formatNumber(kgToUnit(bestSet.weightKg, unit))} × {bestSet.reps}
          </Text>
        ) : null}
        {delta !== undefined && delta > 0 ? (
          <View style={styles.deltaTag}>
            <Text variant="badge" color="onAccent">
              +{formatWeight(delta, unit)}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function PrTag() {
  return (
    <View style={styles.prTag} accessibilityLabel="Récord personal">
      <Text variant="badge" color="onAccent">
        PR
      </Text>
    </View>
  );
}

export default function SummaryScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const settings = useSettings();
  const { data, loading, error, reload } = useAsync(async (): Promise<SummaryData> => {
    const [summary, detail] = await Promise.all([
      services.getWorkoutSummary(workoutId),
      repos.workouts.getById(workoutId),
    ]);
    return { ...summary, heaviest: heaviestSets(detail) };
  }, [workoutId]);
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
  const rows = prRows(data);
  const prIds = new Set(rows.map((r) => r.exerciseId));
  const started = new Date(data.workout.startedAt);
  const dateText = formatDate(started);
  const timeRange = data.workout.finishedAt
    ? `${formatTime(started)} – ${formatTime(data.workout.finishedAt)}`
    : formatTime(started);

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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text variant="label" color="success">
            Entrenamiento terminado
          </Text>
          <Text variant="displayXL" accessibilityRole="header">
            {data.workout.dayNameSnapshot}
          </Text>
          <Text variant="bodyS" color="textSecondary">
            {dateText.charAt(0).toUpperCase() + dateText.slice(1)} · {timeRange}
          </Text>
        </View>

        <View style={styles.grid}>
          <Stat label="Duración" index={0}>
            <DurationValue seconds={data.durationSeconds} />
          </Stat>
          <Stat label="Series" index={1}>
            <Text variant="numXL">
              {data.completedSets}
              <Text variant="numXL" color="textTertiary">
                /{data.totalSets}
              </Text>
            </Text>
          </Stat>
          <Stat label="Volumen" index={2}>
            <Text variant="numXL" numberOfLines={1} adjustsFontSizeToFit>
              {formatNumber(kgToUnit(data.volumeKg, unit), 0)}
              <Text variant="numS" color="textTertiary">
                {' '}
                {unit}
              </Text>
            </Text>
          </Stat>
          <Stat label="Ejercicios" index={3}>
            <Text variant="numXL">{data.exerciseCount}</Text>
          </Stat>
        </View>

        {rows.length > 0 ? (
          <View style={styles.records} accessibilityLabel="Récords nuevos">
            <LinearGradient
              colors={[colors.recordMuted, colors.surface]}
              locations={[0, 0.7]}
              style={styles.recordsFill}
            />
            <View style={styles.recordsHead}>
              <View>
                <Text variant="label" color="record">
                  Tres luces blancas
                </Text>
                <Text variant="displayL">
                  {rows.length} {rows.length === 1 ? 'PR nuevo' : 'PRs nuevos'}
                </Text>
              </View>
              <RecordLights />
            </View>
            <View style={styles.prList}>
              {rows.map((row, i) => (
                <PrRowView key={row.exerciseId} row={row} index={i} unit={unit} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.best}>
          <Text variant="label" style={styles.sectionLabel}>
            Mejor serie por ejercicio
          </Text>
          <View style={styles.tableHead}>
            <Text variant="label" color="textTertiary" style={styles.flex}>
              Ejercicio
            </Text>
            <Text variant="label" color="textTertiary" style={styles.colSet}>
              Serie
            </Text>
            <Text variant="label" color="textTertiary" style={styles.colE1rm}>
              e1RM
            </Text>
          </View>
          <View style={styles.table}>
            {data.exercises.map((e, i) => (
              <View
                key={e.workoutExerciseId}
                style={[styles.tableRow, i < data.exercises.length - 1 && styles.tableRowBorder]}
              >
                <View style={[styles.flex, styles.nameCell]}>
                  <Text
                    variant="bodyM"
                    color={e.skipped ? 'textSecondary' : 'textPrimary'}
                    numberOfLines={2}
                    style={styles.shrink}
                  >
                    {e.exerciseName}
                  </Text>
                  {prIds.has(e.exerciseId) ? <PrTag /> : null}
                </View>
                <Text variant="numMd" style={styles.colSet}>
                  {e.bestSet
                    ? `${formatNumber(kgToUnit(e.bestSet.weightKg, unit))} × ${e.bestSet.reps}`
                    : e.skipped
                      ? 'Saltado'
                      : '—'}
                </Text>
                <Text variant="numMd" color="textSecondary" style={styles.colE1rm}>
                  {e.bestSet ? formatNumber(kgToUnit(e.bestSet.e1rmKg, unit), 0) : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.notes}>
          <TextField
            label="Notas"
            value={noteValue}
            onChangeText={setNotes}
            placeholder="¿Cómo te sentiste? Técnica, molestias, sueño…"
            multiline
            style={styles.notesInput}
          />
        </View>
        <Button title="Guardar y volver" size="lg" loading={saving} onPress={saveAndExit} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md + 2, paddingVertical: space.lg, paddingBottom: space.xxl },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  head: { gap: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: {
    width: '48.5%',
    flexGrow: 1,
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  records: {
    paddingTop: space.lg + 2,
    paddingHorizontal: space.lg,
    paddingBottom: space.md + 2,
    borderRadius: radii.xl + 2,
    borderWidth: stroke.hairline,
    borderColor: colors.recordBorder,
    overflow: 'hidden',
  },
  recordsFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  recordsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prList: { marginTop: space.md + 2, gap: space.sm },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  prValues: { alignItems: 'flex-end', gap: 2 },
  deltaTag: {
    paddingHorizontal: space.xs + 3,
    borderRadius: space.xs + 1,
    backgroundColor: colors.record,
  },
  prTag: {
    paddingHorizontal: space.xs + 1,
    borderRadius: radii.xs * 2,
    backgroundColor: colors.record,
  },
  best: { gap: space.xs + 2 },
  sectionLabel: { paddingTop: space.xs + 2, paddingBottom: 2 },
  tableHead: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md + 2 },
  table: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  tableRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md + 2,
  },
  tableRowBorder: { borderBottomWidth: stroke.hairline, borderBottomColor: colors.divider },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  colSet: { width: 88, textAlign: 'right' },
  colE1rm: { width: 64, textAlign: 'right' },
  notes: { paddingTop: space.xs },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
});
