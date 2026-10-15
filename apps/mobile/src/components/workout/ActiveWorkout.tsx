import type {
  PreviousPerformance,
  WeightUnit,
  WorkoutDetail,
  WorkoutExerciseDetail,
  WorkoutSet,
} from '@gym/core';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useRepositories, useServices } from '../../data/DataProvider';
import { attempt } from '../../lib/errors';
import { inputToKg, inputToReps, weightToInput } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { restSecondsFor } from '../../lib/rest';
import { useNow } from '../../lib/useNow';
import { firstPendingId, prSetIds, workoutTotals } from '../../lib/workoutStats';
import { colors, radii, space, stroke } from '../../theme';
import { ActionMenu } from '../ActionMenu';
import { Button } from '../Button';
import { confirm } from '../ConfirmDialog';
import { ScreenContainer } from '../ScreenContainer';
import { ScreenHeader } from '../ScreenHeader';
import { Text } from '../Text';
import { ExerciseBlock, type ExerciseMode, type SetInput } from './ExerciseBlock';
import { RestTimerBar } from './RestTimerBar';
import { ProgressSegments, WorkoutStats } from './WorkoutProgress';

interface ActiveWorkoutProps {
  initial: WorkoutDetail;
  names: Record<string, string>;
  previous: Record<string, PreviousPerformance | null>;
  /** Historical best e1RM (kg) per exercise id, from finished workouts (for the live PR badge). */
  bests: Record<string, number>;
  routineName?: string;
  unit: WeightUnit;
  restTimerEnabled: boolean;
}

/** Pause so the last row is seen turning green before the exercise folds (design/S3). */
const COLLAPSE_PAUSE_MS = 350;
/** Waits for the fold/unfold layout animation before scrolling to the next exercise. */
const SCROLL_DELAY_MS = 380;
const ADD_REST_SECONDS = 15;
/** Bottom padding of the list so the floating rest bar never covers the last rows. */
const REST_BAR_CLEARANCE = 140;

function buildInputs(workout: WorkoutDetail, unit: WeightUnit): Record<string, SetInput> {
  const out: Record<string, SetInput> = {};
  for (const e of workout.exercises)
    for (const s of e.sets)
      out[s.id] = {
        kg: weightToInput(s.weightKg, unit),
        reps: s.reps === undefined ? '' : String(s.reps),
      };
  return out;
}

function restFrom(seconds: number): { endsAt: number; total: number } {
  return { endsAt: Date.now() + seconds * 1000, total: seconds };
}

function patchSetIn(w: WorkoutDetail, setId: string, patch: Partial<WorkoutSet>): WorkoutDetail {
  return {
    ...w,
    exercises: w.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    })),
  };
}

export function ActiveWorkout({
  initial,
  names,
  previous,
  bests,
  routineName,
  unit,
  restTimerEnabled,
}: ActiveWorkoutProps) {
  useKeepAwake();
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const now = useNow();

  // The latest state also lives in refs: several ✓ taps can land before React re-renders or
  // before the previous save resolves, so every handler reads the refs, never a stale render.
  const [seed] = useState(() => ({
    inputs: buildInputs(initial, unit),
    expanded: firstPendingId(initial),
  }));
  const workoutRef = useRef(initial);
  const inputsRef = useRef(seed.inputs);
  const expandedRef = useRef<string | null>(seed.expanded);
  const [workout, setWorkoutState] = useState(initial);
  const [inputs, setInputsState] = useState(seed.inputs);
  const [expandedId, setExpandedState] = useState<string | null>(seed.expanded);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const inputRefs = useRef(new Map<string, TextInput>());
  const pendingFocus = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const blockY = useRef(new Map<string, number>());
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Saves run one after another, in tap order. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function mutateWorkout(fn: (w: WorkoutDetail) => WorkoutDetail) {
    workoutRef.current = fn(workoutRef.current);
    setWorkoutState(workoutRef.current);
  }
  function mutateInputs(setId: string, patch: Partial<SetInput>) {
    inputsRef.current = {
      ...inputsRef.current,
      [setId]: { kg: '', reps: '', ...inputsRef.current[setId], ...patch },
    };
    setInputsState(inputsRef.current);
  }
  function setExpanded(id: string | null) {
    expandedRef.current = id;
    setExpandedState(id);
  }
  function patchSet(setId: string, patch: Partial<WorkoutSet>) {
    mutateWorkout((w) => patchSetIn(w, setId, patch));
  }
  function patchExercise(id: string, fn: (e: WorkoutExerciseDetail) => WorkoutExerciseDetail) {
    mutateWorkout((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === id ? fn(e) : e)) }));
  }
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.current.then(job, job);
    queue.current = run.catch(() => undefined);
    return run;
  }

  useEffect(
    () => () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    },
    [],
  );

  function registerRef(key: string, el: TextInput | null) {
    if (!el) {
      inputRefs.current.delete(key);
      return;
    }
    inputRefs.current.set(key, el);
    if (pendingFocus.current === key) {
      pendingFocus.current = null;
      el.focus();
    }
  }
  function focusKey(key: string) {
    const el = inputRefs.current.get(key);
    if (el) el.focus();
    else pendingFocus.current = key;
  }

  /** Persist the typed kg/reps of a set (called on blur). */
  function persist(setId: string) {
    const input = inputsRef.current[setId];
    if (!input) return Promise.resolve();
    const weightKg = inputToKg(input.kg, unit);
    const reps = inputToReps(input.reps);
    return enqueue(async () => {
      const updated = await attempt(() =>
        repos.workouts.updateSet(setId, { weightKg: weightKg ?? null, reps: reps ?? null }),
      );
      // A completed set keeps its optimistic values until completeSet resolves.
      const stillPending = workoutRef.current.exercises.some((e) =>
        e.sets.some((s) => s.id === setId && !s.completed),
      );
      if (updated && stillPending)
        patchSet(setId, { weightKg: updated.weightKg, reps: updated.reps });
    });
  }

  /** Saves every set whose typed values differ from what is stored (nothing is lost on exit). */
  async function flushAll() {
    const writes: Promise<unknown>[] = [];
    for (const ex of workoutRef.current.exercises)
      for (const s of ex.sets) {
        const input = inputsRef.current[s.id];
        if (!input) continue;
        const weightKg = inputToKg(input.kg, unit);
        const reps = inputToReps(input.reps);
        const sameWeight =
          weightKg === s.weightKg ||
          (weightKg !== undefined &&
            s.weightKg !== undefined &&
            Math.abs(weightKg - s.weightKg) < 0.001);
        if (sameWeight && reps === s.reps) continue;
        writes.push(persist(s.id));
      }
    await Promise.all(writes);
  }

  // Persist pending edits when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushAll();
    });
    return () => sub.remove();
    // flushAll only reads refs and stable props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Folds the finished exercise and opens the next one (after a short pause). */
  function scheduleCollapse(exerciseId: string) {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    haptics.medium();
    collapseTimer.current = setTimeout(() => {
      collapseTimer.current = null;
      const w = workoutRef.current;
      const idx = w.exercises.findIndex((e) => e.id === exerciseId);
      const ex = w.exercises[idx];
      // Something was undone, or the person opened another exercise meanwhile: leave it.
      if (!ex || expandedRef.current !== exerciseId || ex.sets.some((s) => !s.completed)) return;
      const nextId = firstPendingId(w, idx);
      setExpanded(nextId);
      if (!nextId) return;
      // No keyboard here: the next exercise just opens with its first pending set framed.
      setTimeout(() => {
        const y = blockY.current.get(nextId);
        if (y !== undefined)
          scrollRef.current?.scrollTo({ y: Math.max(0, y - space.md), animated: true });
      }, SCROLL_DELAY_MS);
    }, COLLAPSE_PAUSE_MS);
  }

  function toggleComplete(setId: string) {
    const w = workoutRef.current;
    const exIndex = w.exercises.findIndex((e) => e.sets.some((s) => s.id === setId));
    const ex = w.exercises[exIndex];
    const setIdx = ex?.sets.findIndex((s) => s.id === setId) ?? -1;
    const set = ex?.sets[setIdx];
    if (!ex || !set) return;

    if (set.completed) {
      patchSet(setId, { completed: false, completedAt: undefined });
      void enqueue(async () => {
        const updated = await attempt(() => services.uncompleteSet(setId));
        if (!updated) patchSet(setId, { completed: true, completedAt: set.completedAt });
      });
      return;
    }

    const input = inputsRef.current[setId] ?? { kg: '', reps: '' };
    const weightKg = inputToKg(input.kg, unit);
    let reps = inputToReps(input.reps);
    if (reps === undefined) {
      // Empty reps: fall back to the planned number ("10", "8-10" -> 8); AMRAP stays empty.
      const planned = parseInt(ex.plannedReps, 10);
      if (Number.isFinite(planned)) reps = planned;
    }

    // Optimistic: the set is completed right now, before anything is saved.
    const completedAt = new Date().toISOString();
    patchSet(setId, { weightKg, reps, completed: true, completedAt });
    mutateInputs(setId, { reps: reps === undefined ? '' : String(reps) });

    // Carry the weight over to the next empty set so it is prefilled.
    const next = ex.sets[setIdx + 1];
    if (next && !next.completed && weightKg !== undefined && !inputsRef.current[next.id]?.kg) {
      mutateInputs(next.id, { kg: weightToInput(weightKg, unit) });
      patchSet(next.id, { weightKg });
      void enqueue(() => attempt(() => repos.workouts.updateSet(next.id, { weightKg })));
    }

    // Live PR: heavier e1RM than anything in the exercise's history.
    const after = workoutRef.current.exercises[exIndex];
    if (after && prSetIds(after, bests[ex.exerciseId] ?? 0).has(setId)) haptics.heavy();

    // Close the keyboard (its blur saves the typed values) so the rest bar is visible below.
    TextInput.State?.currentlyFocusedInput?.()?.blur(); // absent on web
    Keyboard.dismiss();

    // Every ✓ (also the last set) starts, or restarts, the rest. The next pending set only gets
    // the visual focus frame (focusSetId); its input is not focused.
    if (restTimerEnabled) setRest(restFrom(restSecondsFor(ex)));

    if (!after?.sets.some((s) => !s.completed)) scheduleCollapse(ex.id);

    void enqueue(async () => {
      const updated = await attempt(() => services.completeSet(setId, { weightKg, reps }));
      if (updated) patchSet(setId, { weightKg: updated.weightKg, reps: updated.reps });
      else patchSet(setId, { completed: false, completedAt: undefined });
    });
  }

  async function addSet(ex: WorkoutExerciseDetail) {
    const created = await enqueue(() => attempt(() => repos.workouts.addSet(ex.id)));
    if (!created) return;
    patchExercise(ex.id, (e) => ({ ...e, sets: [...e.sets, created] }));
    mutateInputs(created.id, { kg: weightToInput(created.weightKg, unit), reps: '' });
    setExpanded(ex.id);
  }

  async function removeLastSet(ex: WorkoutExerciseDetail) {
    const current = workoutRef.current.exercises.find((e) => e.id === ex.id);
    const last = current?.sets[current.sets.length - 1];
    if (!current || !last || current.sets.length <= 1) return;
    const ok = await enqueue(() =>
      attempt(async () => {
        await repos.workouts.removeSet(last.id);
        return true;
      }),
    );
    if (ok) patchExercise(ex.id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== last.id) }));
  }

  async function toggleSkip(ex: WorkoutExerciseDetail) {
    const skipped = !ex.skipped;
    const updated = await enqueue(() =>
      attempt(() => repos.workouts.updateWorkoutExercise(ex.id, { skipped })),
    );
    if (!updated) return;
    patchExercise(ex.id, (e) => ({ ...e, skipped }));
    if (skipped && expandedRef.current === ex.id) {
      const idx = workoutRef.current.exercises.findIndex((e) => e.id === ex.id);
      setExpanded(firstPendingId(workoutRef.current, idx));
    } else if (!skipped) {
      setExpanded(ex.id);
    }
  }

  async function finish() {
    const pending = workoutRef.current.exercises
      .filter((e) => !e.skipped)
      .reduce((n, e) => n + e.sets.filter((s) => !s.completed).length, 0);
    if (pending > 0) {
      const ok = await confirm({
        title: 'Finalizar entrenamiento',
        message: `Te quedan ${pending} ${pending === 1 ? 'serie' : 'series'} sin completar. ¿Finalizar igual?`,
        confirmLabel: 'Finalizar',
        cancelLabel: 'Seguir',
      });
      if (!ok) return;
    }
    setFinishing(true);
    await flushAll();
    await queue.current;
    const done = await attempt(() => services.finishWorkout(workoutRef.current.id));
    setFinishing(false);
    if (done)
      router.replace({
        pathname: '/resumen/[workoutId]',
        params: { workoutId: workoutRef.current.id },
      });
  }

  function addRest() {
    if (!rest) return;
    const endsAt = Math.max(Date.now(), rest.endsAt) + ADD_REST_SECONDS * 1000;
    setRest({ endsAt, total: Math.max(rest.total, Math.ceil((endsAt - Date.now()) / 1000)) });
  }

  const elapsed = (now - Date.parse(workout.startedAt)) / 1000;
  const menuExercise = workout.exercises.find((e) => e.id === menuId);
  const totals = workoutTotals(workout);

  // Mode of every exercise: the open one, finished ones, the next pending one and the rest.
  const openIndex = workout.exercises.findIndex((e) => e.id === expandedId && !e.skipped);
  const collapsedPending = workout.exercises
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => !e.skipped && i !== openIndex && e.sets.some((s) => !s.completed));
  const nextId = (collapsedPending.find(({ i }) => i > openIndex) ?? collapsedPending[0])?.e.id;
  const openExercise = openIndex >= 0 ? workout.exercises[openIndex] : undefined;
  const focusSetId = openExercise?.sets.find((s) => !s.completed)?.id ?? null;
  const allDone =
    totals.totalSets > 0 &&
    totals.doneSets === totals.totalSets &&
    expandedId === null &&
    !finishing;

  function modeOf(e: WorkoutExerciseDetail): ExerciseMode {
    if (e.skipped) return 'skipped';
    if (e.id === expandedId) return 'expanded';
    if (!e.sets.some((s) => !s.completed) && e.sets.length > 0) return 'done';
    return e.id === nextId ? 'next' : 'later';
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        accent
        label={routineName ? `Entrenando · ${routineName}` : 'Entrenando'}
        title={workout.dayNameSnapshot}
        right={
          <Button
            title="Finalizar"
            variant="outline"
            size="sm"
            fullWidth={false}
            loading={finishing}
            onPress={finish}
          />
        }
      />
      <View style={styles.strip}>
        <WorkoutStats
          elapsedSeconds={elapsed}
          doneSets={totals.doneSets}
          totalSets={totals.totalSets}
          volumeKg={totals.volumeKg}
          unit={unit}
        />
        <ProgressSegments workout={workout} focusSetId={focusSetId} />
      </View>
      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {workout.exercises.map((e, i) => (
          <ExerciseBlock
            key={e.id}
            exercise={e}
            name={names[e.exerciseId] ?? 'Ejercicio'}
            position={i}
            count={workout.exercises.length}
            mode={modeOf(e)}
            previous={previous[e.exerciseId]}
            unit={unit}
            inputs={inputs}
            prSets={prSetIds(e, bests[e.exerciseId] ?? 0)}
            focusSetId={e.id === expandedId ? focusSetId : null}
            onToggleExpand={() => {
              void flushAll();
              setExpanded(expandedRef.current === e.id ? null : e.id);
            }}
            onOpenMenu={() => setMenuId(e.id)}
            onChangeKg={(id, t) => mutateInputs(id, { kg: t })}
            onChangeReps={(id, t) => mutateInputs(id, { reps: t })}
            onBlurSet={persist}
            onToggleComplete={toggleComplete}
            registerRef={registerRef}
            focusKey={focusKey}
            onBlockLayout={(y) => blockY.current.set(e.id, y)}
          />
        ))}
        {allDone ? (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.allDone}>
            <Text variant="label" color="success">
              Todas las series completas
            </Text>
            <Text variant="displayM">Buen laburo</Text>
            <Button
              title="Finalizar y ver resumen"
              size="lg"
              onPress={finish}
              style={styles.allDoneButton}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
      {rest ? (
        <RestTimerBar
          endsAt={rest.endsAt}
          totalSeconds={rest.total}
          onAddTime={addRest}
          onDismiss={() => setRest(null)}
        />
      ) : null}
      <ActionMenu
        visible={menuExercise !== undefined}
        title={menuExercise ? names[menuExercise.exerciseId] : undefined}
        onClose={() => setMenuId(null)}
        items={
          menuExercise
            ? [
                { label: 'Agregar serie', onPress: () => addSet(menuExercise) },
                ...(menuExercise.sets.length > 1
                  ? [{ label: 'Quitar serie', onPress: () => removeLastSet(menuExercise) }]
                  : []),
                {
                  label: menuExercise.skipped ? 'Reactivar ejercicio' : 'Saltar ejercicio',
                  onPress: () => toggleSkip(menuExercise),
                },
              ]
            : []
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space.sm + 2, paddingBottom: space.md },
  content: { gap: space.sm, paddingBottom: REST_BAR_CLEARANCE },
  allDone: {
    marginTop: space.sm,
    alignItems: 'center',
    gap: space.xs + 2,
    padding: space.lg,
    paddingTop: space.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.successBorder,
  },
  allDoneButton: { marginTop: space.md },
});
