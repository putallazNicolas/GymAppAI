import type {
  PreviousPerformance,
  WeightUnit,
  WorkoutDetail,
  WorkoutExerciseDetail,
  WorkoutSet,
} from '@gym/core';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useRepositories, useServices } from '../../data/DataProvider';
import { attempt } from '../../lib/errors';
import { formatDuration, inputToKg, inputToReps, weightToInput } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { colors, spacing } from '../../theme';
import { ActionMenu } from '../ActionMenu';
import { Button } from '../Button';
import { confirm } from '../ConfirmDialog';
import { ScreenContainer } from '../ScreenContainer';
import { Text } from '../Text';
import { ExerciseBlock, type SetInput } from './ExerciseBlock';
import { RestTimerBar } from './RestTimerBar';

interface ActiveWorkoutProps {
  initial: WorkoutDetail;
  names: Record<string, string>;
  previous: Record<string, PreviousPerformance | null>;
  unit: WeightUnit;
  restTimerEnabled: boolean;
}

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

function firstPendingId(workout: WorkoutDetail, afterIndex = -1): string | null {
  const list = workout.exercises;
  const pick = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const e = list[i];
      if (e && !e.skipped && e.sets.some((s) => !s.completed)) return e.id;
    }
    return null;
  };
  return pick(afterIndex + 1, list.length) ?? pick(0, afterIndex + 1);
}

export function ActiveWorkout({
  initial,
  names,
  previous,
  unit,
  restTimerEnabled,
}: ActiveWorkoutProps) {
  useKeepAwake();
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const now = useNow();

  const [workout, setWorkout] = useState(initial);
  const [inputs, setInputs] = useState(() => buildInputs(initial, unit));
  const [expandedId, setExpandedId] = useState<string | null>(() => firstPendingId(initial));
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const inputRefs = useRef(new Map<string, TextInput>());
  const pendingFocus = useRef<string | null>(null);

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

  function patchSet(setId: string, patch: Partial<WorkoutSet>) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      })),
    }));
  }
  function patchExercise(id: string, fn: (e: WorkoutExerciseDetail) => WorkoutExerciseDetail) {
    setWorkout((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === id ? fn(e) : e)) }));
  }
  function setInput(setId: string, patch: Partial<SetInput>) {
    setInputs((m) => ({ ...m, [setId]: { kg: '', reps: '', ...m[setId], ...patch } }));
  }

  /** Persist the typed kg/reps of a set (called on blur). */
  async function persist(setId: string) {
    const input = inputs[setId];
    if (!input) return;
    const weightKg = inputToKg(input.kg, unit);
    const reps = inputToReps(input.reps);
    const updated = await attempt(() =>
      repos.workouts.updateSet(setId, { weightKg: weightKg ?? null, reps: reps ?? null }),
    );
    if (updated) patchSet(setId, { weightKg: updated.weightKg, reps: updated.reps });
  }

  async function toggleComplete(setId: string) {
    const exIndex = workout.exercises.findIndex((e) => e.sets.some((s) => s.id === setId));
    const ex = workout.exercises[exIndex];
    const setIdx = ex?.sets.findIndex((s) => s.id === setId) ?? -1;
    const set = ex?.sets[setIdx];
    if (!ex || !set) return;

    if (set.completed) {
      const updated = await attempt(() => services.uncompleteSet(setId));
      if (updated) patchSet(setId, { completed: false, completedAt: undefined });
      return;
    }

    const input = inputs[setId] ?? { kg: '', reps: '' };
    const weightKg = inputToKg(input.kg, unit);
    let reps = inputToReps(input.reps);
    if (reps === undefined) {
      // Empty reps: fall back to the planned number ("10", "8-10" -> 8); AMRAP stays empty.
      const planned = parseInt(ex.plannedReps, 10);
      if (Number.isFinite(planned)) reps = planned;
    }
    const updated = await attempt(() => services.completeSet(setId, { weightKg, reps }));
    if (!updated) return;
    patchSet(setId, updated);
    setInput(setId, { reps: updated.reps === undefined ? '' : String(updated.reps) });

    // Carry the weight over to the next empty set so it is prefilled.
    const next = ex.sets[setIdx + 1];
    if (next && !next.completed && weightKg !== undefined && !(inputs[next.id]?.kg ?? '')) {
      setInput(next.id, { kg: weightToInput(weightKg, unit) });
      void attempt(() => repos.workouts.updateSet(next.id, { weightKg }));
      patchSet(next.id, { weightKg });
    }

    if (restTimerEnabled && ex.restSeconds) {
      setRest({ endsAt: Date.now() + ex.restSeconds * 1000, total: ex.restSeconds });
    }

    const nextPending = ex.sets.find((s) => s.id !== setId && !s.completed);
    if (!nextPending) {
      // Exercise finished: collapse and open the following one.
      const after: WorkoutDetail = {
        ...workout,
        exercises: workout.exercises.map((e) =>
          e.id === ex.id ? { ...e, sets: e.sets.map((s) => ({ ...s, completed: true })) } : e,
        ),
      };
      const nextId = firstPendingId(after, exIndex);
      setExpandedId(nextId);
      const nextEx = after.exercises.find((e) => e.id === nextId);
      const firstSet = nextEx?.sets.find((s) => !s.completed);
      if (firstSet) focusKey(`${firstSet.id}:kg`);
    } else {
      focusKey(`${nextPending.id}:kg`);
    }
  }

  async function addSet(ex: WorkoutExerciseDetail) {
    const created = await attempt(() => repos.workouts.addSet(ex.id));
    if (!created) return;
    patchExercise(ex.id, (e) => ({ ...e, sets: [...e.sets, created] }));
    setInput(created.id, { kg: weightToInput(created.weightKg, unit), reps: '' });
    setExpandedId(ex.id);
  }

  async function removeLastSet(ex: WorkoutExerciseDetail) {
    const last = ex.sets[ex.sets.length - 1];
    if (!last || ex.sets.length <= 1) return;
    const ok = await attempt(async () => {
      await repos.workouts.removeSet(last.id);
      return true;
    });
    if (ok) patchExercise(ex.id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== last.id) }));
  }

  async function toggleSkip(ex: WorkoutExerciseDetail) {
    const skipped = !ex.skipped;
    const updated = await attempt(() => repos.workouts.updateWorkoutExercise(ex.id, { skipped }));
    if (!updated) return;
    patchExercise(ex.id, (e) => ({ ...e, skipped }));
    if (skipped && expandedId === ex.id) {
      const idx = workout.exercises.findIndex((e) => e.id === ex.id);
      const after: WorkoutDetail = {
        ...workout,
        exercises: workout.exercises.map((e) => (e.id === ex.id ? { ...e, skipped } : e)),
      };
      setExpandedId(firstPendingId(after, idx));
    } else if (!skipped) {
      setExpandedId(ex.id);
    }
  }

  async function finish() {
    const pending = workout.exercises
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
    const done = await attempt(() => services.finishWorkout(workout.id));
    setFinishing(false);
    if (done)
      router.replace({ pathname: '/resumen/[workoutId]', params: { workoutId: workout.id } });
  }

  const elapsed = (now - Date.parse(workout.startedAt)) / 1000;
  const restRemaining = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
  const menuExercise = workout.exercises.find((e) => e.id === menuId);

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} padded={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="title" numberOfLines={1}>
            {workout.dayNameSnapshot}
          </Text>
          <Text variant="label" color="primary">
            {formatDuration(elapsed)}
          </Text>
        </View>
        <Button
          title="Finalizar"
          fullWidth={false}
          loading={finishing}
          onPress={finish}
          variant="secondary"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {workout.exercises.map((e) => (
          <ExerciseBlock
            key={e.id}
            exercise={e}
            name={names[e.exerciseId] ?? 'Ejercicio'}
            expanded={expandedId === e.id}
            previous={previous[e.exerciseId]}
            unit={unit}
            inputs={inputs}
            onToggleExpand={() => setExpandedId(expandedId === e.id ? null : e.id)}
            onOpenMenu={() => setMenuId(e.id)}
            onChangeKg={(id, t) => setInput(id, { kg: t })}
            onChangeReps={(id, t) => setInput(id, { reps: t })}
            onBlurSet={persist}
            onToggleComplete={toggleComplete}
            registerRef={registerRef}
            focusKey={focusKey}
          />
        ))}
      </ScrollView>
      {rest && restRemaining > 0 ? (
        <RestTimerBar
          remainingSeconds={restRemaining}
          totalSeconds={rest.total}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerText: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
});
