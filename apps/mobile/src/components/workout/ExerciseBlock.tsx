import type { PreviousPerformance, WeightUnit, WorkoutExerciseDetail } from '@gym/core';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatNumber, kgToUnit } from '../../lib/format';
import { colors, hit, radii, space } from '../../theme';
import { Icon } from '../icons';
import { SetRow } from '../SetRow';
import { Text } from '../Text';

export interface SetInput {
  kg: string;
  reps: string;
}

interface ExerciseBlockProps {
  exercise: WorkoutExerciseDetail;
  name: string;
  expanded: boolean;
  previous: PreviousPerformance | null | undefined;
  unit: WeightUnit;
  inputs: Record<string, SetInput>;
  onToggleExpand: () => void;
  onOpenMenu: () => void;
  onChangeKg: (setId: string, text: string) => void;
  onChangeReps: (setId: string, text: string) => void;
  onBlurSet: (setId: string) => void;
  onToggleComplete: (setId: string) => void;
  /** Registers/unregisters a TextInput under a key like `${setId}:kg`. */
  registerRef: (key: string, el: TextInput | null) => void;
  focusKey: (key: string) => void;
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
  expanded,
  previous,
  unit,
  inputs,
  onToggleExpand,
  onOpenMenu,
  onChangeKg,
  onChangeReps,
  onBlurSet,
  onToggleComplete,
  registerRef,
  focusKey,
}: ExerciseBlockProps) {
  const sets = exercise.sets;
  const done = sets.filter((s) => s.completed).length;
  const allDone = sets.length > 0 && done === sets.length;
  const planned = `${exercise.plannedSets} × ${exercise.plannedReps}`;

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${exercise.skipped ? 'saltado' : `${done} de ${sets.length} series`}`}
        accessibilityHint={expanded ? 'Tocá para contraer' : 'Tocá para abrir'}
        accessibilityState={{ expanded }}
        onPress={onToggleExpand}
        style={styles.headerMain}
      >
        {allDone ? <Icon name="check" size={22} color="success" /> : null}
        <View style={styles.headerText}>
          <Text
            variant="displayS"
            color={allDone ? 'success' : exercise.skipped ? 'textSecondary' : 'textPrimary'}
          >
            {name}
          </Text>
          <Text variant="caption">
            {exercise.skipped
              ? 'Saltado'
              : expanded
                ? planned
                : `${done}/${sets.length} series · ${planned}`}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Menú de ${name}`}
        onPress={onOpenMenu}
        style={styles.menuBtn}
      >
        <Icon name="more" size={22} color="textSecondary" />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      {header}
      {expanded && !exercise.skipped ? (
        <View>
          {exercise.notes ? (
            <Text variant="caption" style={styles.notes}>
              {exercise.notes}
            </Text>
          ) : null}
          <View style={styles.colHeader}>
            <Text variant="label" style={styles.colIndex}>
              #
            </Text>
            <Text variant="label" style={styles.colPrev}>
              Anterior
            </Text>
            <Text variant="label" style={styles.colKg}>
              {unit === 'kg' ? 'Kg' : 'Lb'}
            </Text>
            <Text variant="label" style={styles.colReps}>
              Reps
            </Text>
            <View style={styles.colCheck} />
          </View>
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.sm,
  },
  cardDone: { borderColor: colors.successBorder, backgroundColor: colors.successMuted },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: hit.cta,
    paddingHorizontal: space.sm,
  },
  headerText: { flex: 1 },
  menuBtn: {
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: { paddingHorizontal: space.sm, paddingBottom: space.sm },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
  },
  colIndex: { width: 24, textAlign: 'center' },
  colPrev: { flex: 1 },
  colKg: { width: 72, textAlign: 'center' },
  colReps: { width: 60, textAlign: 'center' },
  colCheck: { width: hit.min },
});
