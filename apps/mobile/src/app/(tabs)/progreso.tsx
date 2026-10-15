import type { Exercise } from '@gym/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import {
  Button,
  ErrorState,
  Icon,
  IconButton,
  LoadingState,
  PressableScale,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
  Text,
  TextField,
} from '../../components';
import {
  HistoryList,
  ProgressChart,
  WeeklySummary,
  type ChartPoint,
  type HistoryRow,
} from '../../components/progress';
import { useRepositories, useServices } from '../../data/DataProvider';
import { useAsync } from '../../data/useAsync';
import { useFocusAsync } from '../../data/useFocusAsync';
import { useSettings } from '../../data/useSettings';
import {
  formatDayMonth,
  formatMonthShort,
  formatNumber,
  formatShortDate,
  formatWeekdayDayMonth,
  kgToUnit,
} from '../../lib/format';
import {
  RANGES,
  analyzeSessions,
  defaultRange,
  inRange,
  type RangeKey,
  type SessionEntry,
} from '../../lib/progress';
import { colors, hit, radii, space, stroke } from '../../theme';

/** How many recent finished workouts are scanned to find exercises with history. */
const HISTORY_WORKOUT_LIMIT = 100;
const WEEKS = 12;

export default function ProgresoScreen() {
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const unit = useSettings().unit;
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [pickedRange, setPickedRange] = useState<RangeKey | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const base = useFocusAsync(async () => {
    const [exercises, weekly, active] = await Promise.all([
      repos.exercises.list(),
      services.getWeeklyStats(WEEKS),
      repos.routines.getActive(),
    ]);
    // One pass over the most recent finished workouts instead of one history query per exercise.
    const finished = await repos.workouts.listFinished({ limit: HISTORY_WORKOUT_LIMIT });
    const details = await Promise.all(finished.map((w) => repos.workouts.getById(w.id)));
    const withIds = new Set<string>();
    for (const d of details)
      for (const e of d?.exercises ?? [])
        if (e.sets.some((s) => s.completed)) withIds.add(e.exerciseId);
    const withHistory = exercises.filter((e) => withIds.has(e.id));
    const others = exercises.filter((e) => !withIds.has(e.id));
    const dayNames = new Map(finished.map((w) => [w.id, w.dayNameSnapshot]));
    return {
      ordered: [...withHistory, ...others],
      withHistoryCount: withHistory.length,
      weekly,
      routineDays: active?.days.length ?? 0,
      dayNames,
    };
  });

  const selected: Exercise | undefined =
    base.data?.ordered.find((e) => e.id === pickedId) ?? base.data?.ordered[0];

  const progress = useAsync(
    () => (selected ? services.getExerciseProgress(selected.id) : Promise.resolve([])),
    [selected?.id, base.data],
  );

  const entries = useMemo(() => analyzeSessions(progress.data ?? []), [progress.data]);
  const now = new Date();

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

  const globalEmpty = data.withHistoryCount === 0;
  const range = pickedRange ?? defaultRange(entries, now);
  const visible = inRange(entries, range, now);
  const loadingProgress = progress.loading && !progress.data;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          label={globalEmpty ? 'Sin sesiones todavía' : `Últimas ${WEEKS} semanas`}
          title="Progreso"
        />

        {selected ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Ejercicio: ${selected.name}. Cambiar`}
            onPress={() => setPickerOpen(true)}
            style={styles.selector}
          >
            <View style={styles.selectorTexts}>
              <Text variant="label">EJERCICIO</Text>
              <Text variant="displayName" numberOfLines={1}>
                {selected.name}
              </Text>
            </View>
            <Icon name="chevronDown" size={22} color="accent" strokeWidth={2.4} />
          </PressableScale>
        ) : null}

        {loadingProgress ? (
          <LoadingState />
        ) : progress.error ? (
          <ErrorState message="No pudimos cargar este ejercicio." onRetry={progress.reload} />
        ) : entries.length === 0 ? (
          <EmptyProgress exerciseName={selected?.name} onGo={() => router.navigate('/')} />
        ) : (
          <>
            <Stats entries={visible} unit={unit} />
            <View style={styles.chartCard}>
              <View style={styles.chartTop}>
                <SegmentedControl
                  variant="range"
                  accessibilityLabel="Rango"
                  options={RANGES.map((r) => ({ value: r, label: r }))}
                  value={range}
                  onChange={setPickedRange}
                />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={styles.swatchE1rm} />
                    <Text variant="caption" color="textBody">
                      e1RM
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={styles.swatchWeight} />
                    <Text variant="caption" color="textBody">
                      Mejor peso
                    </Text>
                  </View>
                </View>
              </View>
              {visible.length === 0 ? (
                <View style={styles.noRange}>
                  <Text variant="bodyS" color="textBody" style={styles.center}>
                    No hay sesiones en este rango. Probá con uno más largo.
                  </Text>
                </View>
              ) : (
                <ProgressChart
                  key={`${selected?.id}-${range}-${unit}`}
                  points={chartPoints(visible, unit)}
                  unit={unit}
                  summary={chartSummary(selected?.name ?? '', visible, unit)}
                />
              )}
            </View>
          </>
        )}

        {!globalEmpty ? (
          <WeeklySummary
            weeks={data.weekly.map((w) => ({
              label: formatShortDate(w.weekStart),
              workouts: w.workouts,
              volumeKg: w.volumeKg,
            }))}
            unit={unit}
            routineDays={data.routineDays}
          />
        ) : null}

        {visible.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text variant="label">HISTORIAL</Text>
              <Text variant="caption" color="textTertiary">
                Mejor serie · e1RM
              </Text>
            </View>
            <HistoryList rows={historyRows(visible, data.dayNames, unit)} />
          </>
        ) : null}
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        exercises={data.ordered}
        withHistoryCount={data.withHistoryCount}
        selectedId={selected?.id}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => {
          setPickedId(id);
          setPickedRange(undefined);
          setPickerOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

function chartPoints(entries: SessionEntry[], unit: 'kg' | 'lb'): ChartPoint[] {
  return entries.map((e) => {
    const d = new Date(e.point.date);
    return {
      label: formatDayMonth(d),
      monthKey: `${d.getFullYear()}-${d.getMonth()}`,
      monthLabel: formatMonthShort(d),
      weight: kgToUnit(e.point.bestWeightKg, unit),
      e1rm: kgToUnit(e.point.bestE1rmKg, unit),
      reps: e.bestSet.reps,
      pr: e.prE1rm,
    };
  });
}

function chartSummary(name: string, entries: SessionEntry[], unit: string): string {
  const first = entries[0];
  const last = entries[entries.length - 1];
  if (!first || !last) return '';
  return `e1RM de ${name} de ${formatNumber(first.point.bestE1rmKg)} a ${formatNumber(last.point.bestE1rmKg)} ${unit} entre ${formatDayMonth(first.point.date)} y ${formatDayMonth(last.point.date)}. Deslizá para recorrer las sesiones.`;
}

function historyRows(
  entries: SessionEntry[],
  dayNames: Map<string, string>,
  unit: 'kg' | 'lb',
): HistoryRow[] {
  return [...entries].reverse().map((e) => {
    const day = dayNames.get(e.point.workoutId);
    const sets = `${e.point.sets.length} ${e.point.sets.length === 1 ? 'serie' : 'series'}`;
    return {
      key: e.point.workoutId,
      date: formatWeekdayDayMonth(e.point.date),
      detail: day ? `${day} · ${sets}` : sets,
      bestSet: `${formatNumber(kgToUnit(e.bestSet.weightKg, unit))} × ${e.bestSet.reps}`,
      e1rm: formatNumber(kgToUnit(e.point.bestE1rmKg, unit)),
      tag: e.prE1rm ? 'PR' : e.prWeight ? 'PR PESO' : undefined,
    };
  });
}

function Stats({ entries, unit }: { entries: SessionEntry[]; unit: 'kg' | 'lb' }) {
  const first = entries[0];
  const last = entries[entries.length - 1];
  if (!first || !last)
    return (
      <View style={styles.stats}>
        <StatCell label="E1RM" value="—" />
        <StatCell label="MEJOR PESO" value="—" divider />
        <StatCell label="SESIONES" value="0" divider />
      </View>
    );
  const best = entries.reduce((a, b) => (b.point.bestWeightKg > a.point.bestWeightKg ? b : a));
  const delta = kgToUnit(last.point.bestE1rmKg - first.point.bestE1rmKg, unit);
  const deltaText =
    entries.length < 2
      ? 'Primera sesión'
      : Math.abs(delta) < 0.05
        ? 'Sin cambios'
        : `${delta > 0 ? '▲' : '▼'} ${formatNumber(Math.abs(delta))} ${unit}`;
  return (
    <View style={styles.stats}>
      <StatCell
        label="E1RM"
        value={formatNumber(kgToUnit(last.point.bestE1rmKg, unit))}
        unit={unit}
        sub={deltaText}
        subColor={delta > 0.05 && entries.length > 1 ? 'success' : 'textSecondary'}
        subNum
      />
      <StatCell
        label="MEJOR PESO"
        value={formatNumber(kgToUnit(best.point.bestWeightKg, unit))}
        unit={unit}
        sub={`${formatDayMonth(best.point.date)} · × ${best.bestSet.reps}`}
        divider
      />
      <StatCell
        label="SESIONES"
        value={String(entries.length)}
        sub={`desde ${formatDayMonth(first.point.date)}`}
        divider
      />
    </View>
  );
}

function StatCell({
  label,
  value,
  unit,
  sub,
  subColor = 'textSecondary',
  subNum = false,
  divider = false,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  subColor?: 'success' | 'textSecondary';
  subNum?: boolean;
  divider?: boolean;
}) {
  return (
    <View style={[styles.statCell, divider && styles.statDivider]}>
      <Text variant="label">{label}</Text>
      <Text variant="numL">
        {value}
        {unit ? <Text variant="numS" color="textTertiary">{` ${unit}`}</Text> : null}
      </Text>
      {sub ? (
        <Text variant={subNum ? 'numXS' : 'caption'} color={subColor} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const GHOST_W = 329;
const GHOST_H = 170;

function EmptyProgress({ exerciseName, onGo }: { exerciseName?: string; onGo: () => void }) {
  return (
    <>
      <View style={styles.emptyCard}>
        <Svg
          width="100%"
          height={GHOST_H}
          viewBox={`0 0 ${GHOST_W} ${GHOST_H}`}
          accessibilityLabel="Gráfico vacío"
        >
          {[20, 60, 100, 140].map((y) => (
            <Line
              key={y}
              x1={8}
              x2={321}
              y1={y}
              y2={y}
              stroke={colors.divider}
              strokeWidth={stroke.hairline}
            />
          ))}
          <Line
            x1={8}
            x2={321}
            y1={150}
            y2={150}
            stroke={colors.borderStrong}
            strokeWidth={stroke.hairline}
          />
          <Path
            d="M20 128C70 120 90 104 130 100S200 78 236 62 300 40 316 30"
            fill="none"
            stroke={colors.borderStrong}
            strokeWidth={2.5}
            strokeDasharray={[2, 8]}
            strokeLinecap="round"
          />
          <Circle cx={316} cy={30} r={9} fill="none" stroke={colors.accent} strokeWidth={2} />
          <Circle cx={316} cy={30} r={3.5} fill={colors.accent} />
          {[
            [20, 128],
            [130, 100],
            [236, 62],
          ].map(([cx, cy]) => (
            <Circle
              key={cx}
              cx={cx}
              cy={cy}
              r={4}
              fill={colors.background}
              stroke={colors.borderStrong}
              strokeWidth={2}
            />
          ))}
        </Svg>
        <Text variant="displayM" style={styles.center}>
          Todavía no hay datos
        </Text>
        <Text variant="bodyM" color="textBody" style={[styles.center, styles.emptyMsg]}>
          {exerciseName
            ? `Completá una serie de ${exerciseName.toLowerCase()} y acá vas a ver tu e1RM y tu mejor peso, semana a semana.`
            : 'Completá una serie y acá vas a ver tu e1RM y tu mejor peso, semana a semana.'}
        </Text>
        <Button title="Ir a entrenar" size="lg" onPress={onGo} style={styles.emptyCta} />
      </View>
      <View style={styles.info}>
        <Text variant="displayS" color="accent">
          e1RM
        </Text>
        <Text variant="caption" style={styles.infoText}>
          Tu máximo estimado para 1 repetición, calculado con cada serie: kg × (1 + reps / 30).
        </Text>
      </View>
    </>
  );
}

function ExercisePicker({
  visible,
  exercises,
  withHistoryCount,
  selectedId,
  onClose,
  onPick,
}: {
  visible: boolean;
  exercises: Exercise[];
  withHistoryCount: number;
  selectedId?: string;
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
        <View style={styles.modalHead}>
          <Text variant="displayM" accessibilityRole="header" style={styles.modalTitle}>
            Elegí un ejercicio
          </Text>
          <IconButton glyph="✕" label="Cerrar" onPress={onClose} />
        </View>
        <View style={styles.modalSearch}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            accessibilityLabel="Buscar ejercicio"
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modalList}
          ListEmptyComponent={<Text variant="caption">Sin resultados.</Text>}
          renderItem={({ item }) => (
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ selected: item.e.id === selectedId }}
              onPress={() => onPick(item.e.id)}
              style={styles.pickRow}
              scaleTo={1}
            >
              <View style={styles.pickTexts}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.e.name}
                </Text>
                {item.hasHistory ? <Text variant="caption">Con historial</Text> : null}
              </View>
              {item.e.id === selectedId ? <Icon name="check" size={20} color="accent" /> : null}
            </PressableScale>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl, gap: space.md },
  center: { textAlign: 'center' },
  selector: {
    height: 60,
    paddingLeft: space.lg,
    paddingRight: space.md,
    borderRadius: radii.lg,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorTexts: { flex: 1 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  statCell: { flex: 1, paddingHorizontal: space.md, paddingVertical: 10, gap: 3 },
  statDivider: { borderLeftWidth: stroke.hairline, borderLeftColor: colors.border },
  chartCard: {
    paddingTop: space.md,
    paddingBottom: 10,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  chartTop: {
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  legend: { gap: 3 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatchE1rm: { width: 14, height: 3, borderRadius: radii.xs, backgroundColor: colors.accent },
  swatchWeight: { width: 14, height: 2, backgroundColor: colors.chartWeight },
  noRange: { padding: space.xl, minHeight: hit.min * 3, justifyContent: 'center' },
  sectionHead: {
    marginTop: space.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  emptyCard: {
    paddingTop: space.lg,
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    alignItems: 'stretch',
    gap: space.sm,
  },
  emptyMsg: { alignSelf: 'center', maxWidth: 290 },
  emptyCta: { marginTop: space.md },
  info: {
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: stroke.hairline,
    borderColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  infoText: { flex: 1 },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  modalTitle: { flex: 1 },
  modalSearch: { padding: space.lg },
  modalList: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  pickRow: {
    minHeight: hit.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: stroke.hairline,
    borderBottomColor: colors.divider,
  },
  pickTexts: { flex: 1 },
});
