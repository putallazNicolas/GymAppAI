import type { PreviousPerformance, WeightUnit, WorkoutExerciseDetail } from '@gym/core';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';

import { formatClock, formatNumber, kgToUnit } from '../../lib/format';
import { bestCompletedSet } from '../../lib/workoutStats';
import { colors, hit, motion, radii, space, stroke } from '../../theme';
import { Icon } from '../icons';
import { SetRow } from '../SetRow';
import { Text } from '../Text';

export interface SetInput {
  kg: string;
  reps: string;
}

/** How an exercise is drawn: the open card, a green finished row, or a pending/skipped row. */
export type ExerciseMode = 'expanded' | 'done' | 'next' | 'later' | 'skipped';

interface ExerciseBlockProps {
  exercise: WorkoutExerciseDetail;
  name: string;
  /** 0-based position and total, for "EJERCICIO i DE n". */
  position: number;
  count: number;
  mode: ExerciseMode;
  previous: PreviousPerformance | null | undefined;
  unit: WeightUnit;
  inputs: Record<string, SetInput>;
  /** Completed sets whose e1RM beats the historical best (gold PR badge). */
  prSets: Set<string>;
  /** The set being worked on (first pending one) when the card is open. */
  focusSetId: string | null;
  onToggleExpand: () => void;
  onOpenMenu: () => void;
  onChangeKg: (setId: string, text: string) => void;
  onChangeReps: (setId: string, text: string) => void;
  onBlurSet: (setId: string) => void;
  onToggleComplete: (setId: string) => void;
  /** Registers/unregisters a TextInput under a key like `${setId}:kg`. */
  registerRef: (key: string, el: TextInput | null) => void;
  focusKey: (key: string) => void;
  /** Reports the block's y offset inside the scroll content (to scroll the next one into view). */
  onBlockLayout: (y: number) => void;
}

function previousText(
  prev: PreviousPerformance | null | undefined,
  setIndex: number,
  unit: WeightUnit,
) {
  const s = prev?.sets.find((p) => p.setIndex === setIndex);
  if (!s || (s.weightKg === undefined && s.reps === undefined)) return undefined;
  const w = s.weightKg === undefined ? '—' : formatNumber(kgToUnit(s.weightKg, unit));
  return `${w} × ${s.reps ?? '—'}`;
}

export function ExerciseBlock({
  exercise,
  name,
  position,
  count,
  mode,
  previous,
  unit,
  inputs,
  prSets,
  focusSetId,
  onToggleExpand,
  onOpenMenu,
  onChangeKg,
  onChangeReps,
  onBlurSet,
  onToggleComplete,
  registerRef,
  focusKey,
  onBlockLayout,
}: ExerciseBlockProps) {
  const reduced = useReducedMotion();
  const sets = exercise.sets;
  const done = sets.filter((s) => s.completed).length;
  const planned = `${exercise.plannedSets} × ${exercise.plannedReps}`;

  const layout = reduced
    ? undefined
    : LinearTransition.duration(motion.slow).easing(motion.easeOut);
  const enter = reduced ? FadeIn.duration(motion.reduced) : FadeInDown.duration(motion.slow);
  const exit = FadeOut.duration(reduced ? motion.reduced : motion.fast);

  let content;
  if (mode === 'done') {
    const best = bestCompletedSet(exercise);
    content = (
      <Animated.View key="done" entering={enter} exiting={exit}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, completado, ${done} de ${sets.length} series`}
          accessibilityHint="Tocá para abrir y editar"
          onPress={onToggleExpand}
          style={styles.doneRow}
        >
          <View style={styles.doneDisc}>
            <Icon name="check" size={16} color="onAccent" strokeWidth={3.2} />
          </View>
          <Text variant="displayS" color="success" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {done}/{sets.length}
            {best && best.weightKg !== undefined ? ' · mejor ' : ''}
          </Text>
          {best && best.weightKg !== undefined ? (
            <Text variant="numS" color="textPrimary" style={styles.bestText}>
              {formatNumber(kgToUnit(best.weightKg, unit))} × {best.reps}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  } else if (mode === 'expanded') {
    const restLabel =
      exercise.restSeconds !== undefined
        ? `Descanso ${formatClock(exercise.restSeconds)}`
        : undefined;
    const caption = [restLabel, exercise.notes].filter(Boolean).join(' · ');
    content = (
      <Animated.View key="open" entering={enter} exiting={exit}>
        <View style={styles.cardHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${done} de ${sets.length} series`}
            accessibilityHint="Tocá para contraer"
            accessibilityState={{ expanded: true }}
            onPress={onToggleExpand}
            style={styles.cardTitle}
          >
            <Text variant="label" color="accent">
              Ejercicio {position + 1} de {count}
            </Text>
            <Text variant="displayM">{name}</Text>
          </Pressable>
          <View style={styles.pill}>
            <Text variant="displayS">{planned}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Menú de ${name}`}
            onPress={onOpenMenu}
            style={styles.menuBtn}
          >
            <Icon name="more" size={22} color="textSecondary" />
          </Pressable>
        </View>
        {caption ? (
          <Text variant="caption" style={styles.caption}>
            {caption}
          </Text>
        ) : (
          <View style={styles.captionGap} />
        )}
        <View style={styles.colHeader}>
          <Text variant="label" color="textTertiary" style={styles.colIndex}>
            #
          </Text>
          <Text variant="label" color="textTertiary" style={styles.colPrev}>
            Anterior
          </Text>
          <Text variant="label" color="textTertiary" style={styles.colKg}>
            {unit === 'kg' ? 'Kg' : 'Lb'}
          </Text>
          <Text variant="label" color="textTertiary" style={styles.colReps}>
            Reps
          </Text>
          <Text variant="label" color="textTertiary" style={styles.colCheck}>
            OK
          </Text>
        </View>
        <View style={styles.sets}>
          {sets.map((s, i) => {
            const input = inputs[s.id] ?? { kg: '', reps: '' };
            const next = sets[i + 1];
            return (
              <SetRow
                key={s.id}
                index={i + 1}
                previousText={previousText(previous, s.setIndex, unit)}
                kg={input.kg}
                reps={input.reps}
                repsPlaceholder={exercise.plannedReps}
                completed={s.completed}
                focused={s.id === focusSetId}
                pr={prSets.has(s.id)}
                onChangeKg={(t) => onChangeKg(s.id, t)}
                onChangeReps={(t) => onChangeReps(s.id, t)}
                onBlurKg={() => onBlurSet(s.id)}
                onBlurReps={() => onBlurSet(s.id)}
                onToggleComplete={() => onToggleComplete(s.id)}
                kgInputRef={(el) => registerRef(`${s.id}:kg`, el)}
                repsInputRef={(el) => registerRef(`${s.id}:reps`, el)}
                onSubmitKg={() => focusKey(`${s.id}:reps`)}
                onSubmitReps={next ? () => focusKey(`${next.id}:kg`) : undefined}
              />
            );
          })}
        </View>
      </Animated.View>
    );
  } else if (mode === 'next') {
    content = (
      <Animated.View key="next" entering={enter} exiting={exit}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Siguiente: ${name}, ${planned}`}
          accessibilityHint="Tocá para abrir"
          onPress={onToggleExpand}
          style={styles.nextRow}
        >
          <View style={styles.flex}>
            <Text variant="label">Siguiente</Text>
            <Text variant="displayS" numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Text variant="numMd" color="textSecondary">
            {planned}
          </Text>
        </Pressable>
      </Animated.View>
    );
  } else if (mode === 'skipped') {
    content = (
      <Animated.View key="skipped" entering={enter} exiting={exit} style={styles.skipRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, saltado`}
          accessibilityHint="Tocá para ver opciones"
          onPress={onOpenMenu}
          style={styles.skipMain}
        >
          <Text variant="displayS" color="textTertiary" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="caption" color="textTertiary">
            Saltado
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Menú de ${name}`}
          onPress={onOpenMenu}
          style={styles.menuBtn}
        >
          <Icon name="more" size={22} color="textTertiary" />
        </Pressable>
      </Animated.View>
    );
  } else {
    content = (
      <Animated.View key="later" entering={enter} exiting={exit}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${planned}`}
          accessibilityHint="Tocá para abrir"
          onPress={onToggleExpand}
          style={styles.laterRow}
        >
          <Text variant="displayS" color="textTertiary" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="numMd" color="textTertiary">
            {planned}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      layout={layout}
      onLayout={(e) => onBlockLayout(e.nativeEvent.layout.y)}
      style={[
        styles.base,
        mode === 'expanded' && styles.cardOpen,
        mode === 'done' && styles.cardDone,
        mode === 'next' && styles.cardNext,
        (mode === 'later' || mode === 'skipped') && styles.cardLater,
      ]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', borderWidth: stroke.hairline },
  cardOpen: {
    paddingTop: space.md + 2,
    paddingBottom: space.sm + 2,
    paddingHorizontal: space.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderColor: colors.accentBorder,
  },
  cardDone: {
    borderRadius: radii.lg,
    backgroundColor: colors.successFaint,
    borderColor: colors.successBorder,
  },
  cardNext: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardLater: { borderRadius: radii.lg, borderColor: colors.divider },
  flex: { flex: 1 },
  doneRow: {
    minHeight: hit.cta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md + 2,
  },
  doneDisc: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestText: { marginLeft: -space.sm + 2 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingLeft: space.sm - 2,
  },
  cardTitle: { flex: 1, gap: 2, minHeight: hit.min },
  pill: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  menuBtn: {
    width: hit.min,
    height: hit.min,
    marginTop: -space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { paddingHorizontal: space.sm - 2, paddingBottom: space.md },
  captionGap: { height: space.md },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingBottom: space.xs + 2,
  },
  colIndex: { width: 24, textAlign: 'center' },
  colPrev: { flex: 1 },
  colKg: { width: 72, textAlign: 'center' },
  colReps: { width: 60, textAlign: 'center' },
  colCheck: { width: hit.min, textAlign: 'center' },
  sets: { gap: space.xs },
  nextRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md + 2,
  },
  laterRow: {
    minHeight: hit.cta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md + 2,
  },
  skipRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.md + 2 },
  skipMain: {
    flex: 1,
    minHeight: hit.cta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
});
