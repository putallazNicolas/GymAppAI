import {
  EQUIPMENT_LABELS,
  MAX_PLANNED_SETS,
  MUSCLE_GROUP_LABELS,
  type Exercise,
  type PlannedExercise,
  type RepsMode,
} from '@gym/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Bump,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PlannedSetHeader,
  PlannedSetRow,
  PresetChips,
  PressableScale,
  RepsInput,
  RepsKeyboardBar,
  SegmentedControl,
  SheetHeader,
  Stepper,
  Text,
  confirm,
  useRepsBar,
  type SegmentOption,
} from '../../../components';
import { useRepositories } from '../../../data/DataProvider';
import { useFocusAsync } from '../../../data/useFocusAsync';
import { usePlannedSaver } from '../../../data/usePlannedSaver';
import { fiveThreeOne, restLabel, stairReps } from '../../../lib/planFormat';
import { DEFAULT_REST_SECONDS } from '../../../lib/rest';
import { colors, hit, inputHeight, inputType, motion, radii, space, stroke } from '../../../theme';

const REPS_PRESETS = ['5', '6-8', '8-10', '10-12', '12-15', '15-20', 'AMRAP'] as const;
const MODE_OPTIONS: SegmentOption<RepsMode>[] = [
  { value: 'same', label: 'Igual en todas' },
  { value: 'perSet', label: 'Por serie' },
];

interface Loaded {
  planned: PlannedExercise;
  exercise: Exercise | null;
  position: number;
  total: number;
}

/** Edit sheet of a planned exercise (design/P07c, P07c2). Every change is saved right away. */
export default function EditPlannedExerciseSheet() {
  const { plannedId, dayId } = useLocalSearchParams<{ plannedId: string; dayId: string }>();
  const repos = useRepositories();
  const { data, loading, error, reload } = useFocusAsync<Loaded | null>(async () => {
    const day = await repos.routines.getDay(dayId);
    const index = day?.exercises.findIndex((e) => e.id === plannedId) ?? -1;
    const planned = day?.exercises[index];
    if (!day || !planned) return null;
    return {
      planned,
      exercise: await repos.exercises.getById(planned.exerciseId),
      position: index + 1,
      total: day.exercises.length,
    };
  }, [dayId, plannedId]);

  if (loading && data === undefined)
    return (
      <Sheet>
        <LoadingState />
      </Sheet>
    );
  if (error && data === undefined)
    return (
      <Sheet>
        <ErrorState message="No pudimos cargar el ejercicio." onRetry={reload} />
      </Sheet>
    );
  if (!data)
    return (
      <Sheet>
        <EmptyState title="Ejercicio no encontrado" message="Quizás ya lo quitaste del día." />
      </Sheet>
    );
  return (
    <Sheet>
      <Editor key={data.planned.id} data={data} dayId={dayId} />
    </Sheet>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return <View style={styles.sheet}>{children}</View>;
}

interface Plan {
  mode: RepsMode;
  reps: string[];
}

function planOf(planned: PlannedExercise): Plan {
  return { mode: planned.repsMode, reps: planned.plannedSets.map((s) => s.reps) };
}

function Editor({ data, dayId }: { data: Loaded; dayId: string }) {
  const { planned, exercise, position, total } = data;
  const repos = useRepositories();
  const router = useRouter();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const bar = useRepsBar();

  const [plan, setPlanState] = useState<Plan>(() => planOf(planned));
  const planRef = useRef(plan);
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState(planned.notes ?? '');
  /** The per-set values to bring back when returning to "Por serie" (design/S4). Not persisted. */
  const backup = useRef<string[] | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  /** Bumps the series stepper when the "N ×" of "Igual en todas" is tapped. */
  const [stepperPulse, setStepperPulse] = useState(0);

  function showPlan(next: Plan) {
    planRef.current = next;
    setPlanState(next);
  }

  const saver = usePlannedSaver(planned.id, () => {
    // A write failed: show what is really stored.
    void repos.routines.getDay(dayId).then((day) => {
      const stored = day?.exercises.find((e) => e.id === planned.id);
      if (stored) showPlan(planOf(stored));
    });
  });

  function setPlan(next: Plan) {
    showPlan(next);
    saver.save({
      repsMode: next.mode,
      plannedSets: next.reps.map((reps) => ({ reps })),
    });
  }

  /** Any edit of sets or reps drops the backup and the notice. */
  function edited(next: Plan) {
    backup.current = null;
    setNotice('');
    setPlan(next);
  }

  const sets = plan.reps.length;
  const first = plan.reps[0] ?? '';

  function changeSets(n: number) {
    const { mode, reps } = planRef.current;
    const last = reps[reps.length - 1] ?? '';
    const next =
      mode === 'same'
        ? Array.from({ length: n }, () => reps[0] ?? '')
        : n > reps.length
          ? [...reps, ...Array.from({ length: n - reps.length }, () => last)]
          : reps.slice(0, n);
    edited({ mode, reps: next });
  }

  function changeMode(mode: RepsMode) {
    const current = planRef.current;
    if (mode === current.mode) return;
    if (mode === 'perSet') {
      const restored = backup.current?.length === current.reps.length ? backup.current : null;
      backup.current = null;
      setNotice('');
      setPlan({ mode, reps: restored ?? current.reps });
      return;
    }
    const keep = current.reps[0] ?? '';
    const allEqual = current.reps.every((r) => r === keep);
    backup.current = allEqual ? null : [...current.reps];
    setNotice(
      allEqual
        ? ''
        : `Las series tenían reps distintas: quedó «${keep}» en todas. Volvé a «Por serie» para recuperar ${current.reps.join(' · ')}.`,
    );
    setPlan({ mode, reps: current.reps.map(() => keep) });
  }

  function setSame(reps: string) {
    edited({ mode: 'same', reps: planRef.current.reps.map(() => reps) });
  }

  function setOne(index: number, reps: string) {
    edited({
      mode: 'perSet',
      reps: planRef.current.reps.map((r, i) => (i === index ? reps : r)),
    });
  }

  function fill(reps: string[]) {
    edited({ mode: 'perSet', reps });
  }

  function saveNotes() {
    const value = notes.trim();
    setNotes(value);
    if (value !== (planned.notes ?? '')) saver.save({ notes: value ? value : null });
  }

  async function remove() {
    const name = exercise?.name ?? 'este ejercicio';
    const ok = await confirm({
      title: `¿Quitar ${name}?`,
      message: 'Se quita de este día. Lo que ya entrenaste se conserva.',
      confirmLabel: 'Quitar',
      destructive: true,
    });
    if (!ok) return;
    saver.close();
    try {
      await repos.routines.deletePlannedExercise(planned.id);
      router.back();
    } catch {
      Alert.alert('No se pudo quitar', 'Probá de nuevo.');
    }
  }

  const restSeconds = planned.restSeconds;
  const eyebrow = [
    `Ejercicio ${position} de ${total}`,
    exercise ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : undefined,
    exercise?.equipment ? EQUIPMENT_LABELS[exercise.equipment] : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const presetValue = REPS_PRESETS.find((p) => p === first) ?? '';

  /** Current scroll offset, to scroll a field out from behind the keyboard bar. */
  const scrollY = useRef(0);
  function scrollBy(dy: number) {
    scrollRef.current?.scrollTo({ y: scrollY.current + dy, animated: !reduced });
  }

  function goToStepper() {
    scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
    setStepperPulse((n) => n + 1);
  }

  return (
    <>
      <SheetHeader eyebrow={eyebrow} title={exercise?.name ?? 'Ejercicio'} bordered />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
      >
        <View style={styles.rowBetween}>
          <Text variant="label">Series</Text>
          <Bump trigger={stepperPulse}>
            <Stepper
              value={sets}
              min={1}
              max={MAX_PLANNED_SETS}
              onChange={changeSets}
              decLabel="Una serie menos"
              incLabel="Una serie más"
              valueLabel={`${sets} ${sets === 1 ? 'serie' : 'series'}`}
            />
          </Bump>
        </View>

        <View style={styles.group}>
          <View style={styles.rowBetween}>
            <Text variant="label">Reps</Text>
            <View style={styles.toggle}>
              <SegmentedControl
                variant="mode"
                options={MODE_OPTIONS}
                value={plan.mode}
                onChange={changeMode}
                accessibilityLabel="Modo de reps"
              />
            </View>
          </View>

          {notice ? (
            <Animated.View
              entering={reduced ? undefined : FadeIn.duration(motion.fast + 40)}
              accessibilityRole="alert"
              style={styles.notice}
            >
              <Icon name="info" size={18} color="accent" />
              <Text variant="caption" color="textBody" style={styles.noticeText}>
                {notice}
              </Text>
            </Animated.View>
          ) : null}

          {plan.mode === 'same' ? (
            <Animated.View
              key="same"
              entering={reduced ? undefined : FadeIn.duration(motion.fast + 40)}
              style={styles.group}
            >
              <View style={styles.sameBox}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${sets} ${sets === 1 ? 'serie' : 'series'}. Cambiar cantidad`}
                  accessibilityHint="Lleva al control de series"
                  onPress={goToStepper}
                  hitSlop={space.sm}
                  style={styles.sameSets}
                >
                  <Text variant="numRow" color="accent">
                    {sets} ×
                  </Text>
                </PressableScale>
                <View style={styles.sameInput}>
                  <RepsInput
                    value={first}
                    onCommit={setSame}
                    index={0}
                    bar={bar}
                    size="big"
                    placeholder="8-10"
                    accessibilityLabel="Reps en todas las series"
                  />
                </View>
                <Text variant="caption" color="textTertiary" style={styles.sameHint}>
                  {'tocá para\nescribir'}
                </Text>
              </View>
              <PresetChips
                presets={REPS_PRESETS}
                value={presetValue}
                onPick={setSame}
                accessibilityLabel="Reps frecuentes"
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="perSet"
              entering={reduced ? undefined : FadeIn.duration(motion.fast + 40)}
              style={styles.perSet}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.fills}
              >
                <FillChip
                  label="Igualar a la serie 1"
                  onPress={() => fill(plan.reps.map(() => first))}
                />
                <FillChip label="Escalera −2" onPress={() => fill(stairReps(first, sets))} />
                <FillChip label="5 · 3 · 1" onPress={() => fill(fiveThreeOne(sets))} />
              </ScrollView>
              <PlannedSetHeader />
              {plan.reps.map((reps, i) => (
                <PlannedSetRow
                  key={i}
                  index={i}
                  reps={reps}
                  onChange={(next) => setOne(i, next)}
                  bar={bar}
                />
              ))}
              <View style={styles.setActions}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Quitar la última serie"
                  accessibilityState={{ disabled: sets <= 1 }}
                  disabled={sets <= 1}
                  onPress={() => changeSets(sets - 1)}
                  style={[styles.setAction, sets <= 1 && styles.setActionOff]}
                >
                  <Icon name="minus" size={18} color="textSecondary" strokeWidth={2.4} />
                  <Text variant="buttonS" color="textBody">
                    Quitar serie
                  </Text>
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Agregar serie"
                  accessibilityState={{ disabled: sets >= MAX_PLANNED_SETS }}
                  disabled={sets >= MAX_PLANNED_SETS}
                  onPress={() => changeSets(sets + 1)}
                  style={[
                    styles.setAction,
                    styles.setActionAdd,
                    sets >= MAX_PLANNED_SETS && styles.setActionOff,
                  ]}
                >
                  <Icon name="add" size={18} color="accent" strokeWidth={2.4} />
                  <Text variant="buttonS" color="accent">
                    Agregar serie
                  </Text>
                </PressableScale>
              </View>
              <Text variant="caption" color="textTertiary" style={styles.hint}>
                Tocá el número para escribir rangos («8-10») o AMRAP. La columna CARGA queda
                reservada para más adelante.
              </Text>
            </Animated.View>
          )}
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Descanso: ${restLabel(restSeconds ?? DEFAULT_REST_SECONDS)}. Cambiar`}
          onPress={() =>
            router.push({
              pathname: '/rutina/descanso/[plannedId]',
              params: { plannedId: planned.id, dayId },
            })
          }
          scaleTo={0.99}
          style={styles.restRow}
        >
          <View style={styles.restText}>
            <Text variant="label">Descanso</Text>
            <Text variant="caption">
              {restSeconds === 0
                ? 'No aparece el temporizador'
                : restSeconds === undefined
                  ? 'Por defecto · arranca solo al tildar cada serie'
                  : 'Arranca solo al tildar cada serie'}
            </Text>
          </View>
          <Text variant="numD" color={restSeconds === undefined ? 'textTertiary' : 'textPrimary'}>
            {restLabel(restSeconds ?? DEFAULT_REST_SECONDS)}
          </Text>
          <Icon name="chevron" size={20} color="textSecondary" strokeWidth={2.4} />
        </PressableScale>

        <View style={styles.notesBlock}>
          <Text variant="label">Notas · opcional</Text>
          <View style={styles.notes}>
            <Icon name="pencil" size={16} color="textTertiary" />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              onBlur={saveNotes}
              placeholder="Cues de técnica, agarre, tempo…"
              placeholderTextColor={colors.textDisabled}
              selectionColor={colors.accent}
              accessibilityLabel="Notas del ejercicio"
              style={styles.notesInput}
            />
          </View>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Quitar del día"
          onPress={() => void remove()}
          style={styles.remove}
        >
          <Icon name="trash" size={18} color="danger" />
          <Text variant="bodyStrong" color="danger">
            Quitar del día
          </Text>
        </PressableScale>
      </ScrollView>
      <RepsKeyboardBar bar={bar} onObscured={scrollBy} />
    </>
  );
}

function FillChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.fill}
    >
      <Text variant="segment" color="textBody">
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surfaceRaised },
  scroll: { flex: 1 },
  content: { gap: space.lg + 2, paddingHorizontal: space.lg, paddingTop: space.md + 2 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  group: { gap: space.sm + 2 },
  toggle: { width: 230 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm + 2,
    padding: space.md,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.accentMuted,
    borderWidth: stroke.hairline,
    borderColor: colors.accentBorder,
  },
  noticeText: { flex: 1 },
  sameBox: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  sameInput: { flex: 1, minWidth: 0, height: inputHeight.repsBig, justifyContent: 'center' },
  sameHint: { textAlign: 'right' },
  sameSets: { minHeight: hit.min, justifyContent: 'center' },
  setActions: { flexDirection: 'row', gap: space.sm, paddingTop: space.xs },
  setAction: {
    flex: 1,
    height: hit.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs + 2,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  setActionAdd: { borderColor: colors.accentBorder, backgroundColor: colors.accentMuted },
  setActionOff: { opacity: 0.3 },
  perSet: { gap: space.xs + 2 },
  fills: { gap: space.xs + 2, paddingBottom: space.xs },
  fill: {
    height: hit.min,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  hint: { paddingHorizontal: space.xs },
  restRow: {
    minHeight: hit.cta + space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md + 2,
    paddingRight: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  restText: { flex: 1, gap: 1 },
  notesBlock: { gap: space.xs + 2 },
  notes: {
    minHeight: hit.row - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  notesInput: {
    ...inputType.bodyInput,
    flex: 1,
    height: inputHeight.body,
    padding: 0,
    color: colors.textBody,
  },
  remove: {
    minHeight: hit.row - 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radii.lg - 2,
  },
});
