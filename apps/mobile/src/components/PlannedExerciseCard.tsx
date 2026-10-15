import type { PlannedExercise } from '@gym/core';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, hit, motion, radii, space, stroke, type } from '../theme';

import { Icon } from './icons';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  planned: PlannedExercise;
  name: string;
  /** 1-based position shown in accent next to the name. */
  position?: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Persist a patch; fields not changed are omitted. `null` clears an optional field. */
  onSave: (patch: {
    sets?: number;
    reps?: string;
    restSeconds?: number | null;
    notes?: string | null;
  }) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}

const MIN_SETS = 1;
const MAX_SETS = 20;
const STEPPER_WIDTH = 132;

/** Boxed input (48 pt, radius 10) with an accent border on focus (design/P07). */
function Box({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.textDisabled}
      selectionColor={colors.accent}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.box, focused && styles.boxFocused, style]}
    />
  );
}

function FieldLabel({ children, suffix }: { children: string; suffix?: string }) {
  return (
    <Text variant="label" numberOfLines={1} style={styles.fieldLabel}>
      {children}
      {suffix ? <Text variant="label" style={styles.noUpper}>{` ${suffix}`}</Text> : null}
    </Text>
  );
}

/** One planned exercise of a day; edits persist on blur (steppers: on every tap). */
export function PlannedExerciseCard({
  planned,
  name,
  position,
  canMoveUp,
  canMoveDown,
  onSave,
  onMove,
  onDelete,
}: Props) {
  const reduced = useReducedMotion();
  const [sets, setSets] = useState(planned.sets);
  const [reps, setReps] = useState(planned.reps);
  const [rest, setRest] = useState(
    planned.restSeconds === undefined ? '' : String(planned.restSeconds),
  );
  const [notes, setNotes] = useState(planned.notes ?? '');

  const bump = useSharedValue(1);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduced) return;
    bump.set(
      withSequence(
        withTiming(1.18, { duration: 80 }),
        withTiming(1, { duration: motion.press + 30 }),
      ),
    );
  }, [sets, reduced, bump]);

  function step(delta: -1 | 1) {
    const next = Math.min(MAX_SETS, Math.max(MIN_SETS, sets + delta));
    if (next === sets) return;
    setSets(next);
    onSave({ sets: next });
  }
  function saveReps() {
    const v = reps.trim();
    if (!v) return setReps(planned.reps);
    if (v !== planned.reps) onSave({ reps: v });
  }
  function saveRest() {
    const v = rest.trim();
    if (!v) {
      if (planned.restSeconds !== undefined) onSave({ restSeconds: null });
      return;
    }
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0)
      return setRest(planned.restSeconds === undefined ? '' : String(planned.restSeconds));
    if (n !== planned.restSeconds) onSave({ restSeconds: n });
  }
  function saveNotes() {
    const v = notes.trim();
    if (v === (planned.notes ?? '')) return;
    onSave({ notes: v ? v : null });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {position !== undefined ? (
          <Text variant="displayS" color="accent" style={styles.position}>
            {position}
          </Text>
        ) : null}
        <Text variant="displayS" style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <IconButton
          glyph="↑"
          label={`Subir ${name}`}
          bare
          narrow
          tint="textBody"
          disabled={!canMoveUp}
          onPress={() => onMove(-1)}
        />
        <IconButton
          glyph="↓"
          label={`Bajar ${name}`}
          bare
          narrow
          tint="textBody"
          disabled={!canMoveDown}
          onPress={() => onMove(1)}
        />
        <IconButton
          glyph="trash"
          label={`Quitar ${name}`}
          bare
          tint="textSecondary"
          onPress={onDelete}
        />
      </View>

      <View style={styles.fields}>
        <View style={[styles.field, { width: STEPPER_WIDTH }]}>
          <FieldLabel>Series</FieldLabel>
          <View style={styles.stepper}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Una serie menos en ${name}`}
              disabled={sets <= MIN_SETS}
              onPress={() => step(-1)}
              style={[styles.stepBtn, sets <= MIN_SETS && styles.stepOff]}
            >
              <Icon name="minus" size={18} color="textBody" strokeWidth={2.6} />
            </PressableScale>
            <Animated.View style={bumpStyle} accessibilityLabel={`${sets} series`}>
              <Text variant="displayM" accessibilityLiveRegion="polite">
                {sets}
              </Text>
            </Animated.View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Una serie más en ${name}`}
              disabled={sets >= MAX_SETS}
              onPress={() => step(1)}
              style={[styles.stepBtn, sets >= MAX_SETS && styles.stepOff]}
            >
              <Icon name="add" size={18} color="accent" strokeWidth={2.6} />
            </PressableScale>
          </View>
        </View>
        <View style={styles.fieldFlex}>
          <FieldLabel>Reps</FieldLabel>
          <Box
            value={reps}
            onChangeText={setReps}
            onBlur={saveReps}
            placeholder="8-10"
            autoCapitalize="characters"
            accessibilityLabel={`Reps de ${name}`}
          />
        </View>
        <View style={styles.fieldFlex}>
          <FieldLabel suffix="(s)">Descanso</FieldLabel>
          <Box
            value={rest}
            onChangeText={setRest}
            onBlur={saveRest}
            keyboardType="number-pad"
            placeholder="—"
            accessibilityLabel={`Descanso en segundos de ${name}`}
          />
        </View>
      </View>

      <View style={styles.notes}>
        <Icon name="pencil" size={16} color="textTertiary" />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={saveNotes}
          placeholder="Notas (opcional)"
          placeholderTextColor={colors.textDisabled}
          selectionColor={colors.accent}
          accessibilityLabel={`Notas de ${name}`}
          style={styles.notesInput}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm + 2,
    paddingTop: space.sm + 2,
    paddingBottom: space.md + 2,
    paddingLeft: space.md + 2,
    paddingRight: space.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  position: { minWidth: 22 },
  name: { flex: 1, minWidth: 0 },
  fields: { flexDirection: 'row', gap: space.sm },
  field: { gap: space.xs },
  fieldFlex: { flex: 1, minWidth: 0, gap: space.xs },
  fieldLabel: { letterSpacing: type.label.letterSpacing * 0.8 },
  noUpper: { textTransform: 'none' },
  stepper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  stepBtn: {
    width: hit.min,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: { opacity: 0.3 },
  box: {
    ...type.numM,
    height: 48,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 0,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  boxFocused: { borderColor: colors.accent },
  notes: {
    minHeight: hit.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  notesInput: {
    ...type.bodyS,
    flex: 1,
    paddingVertical: 0,
    color: colors.textBody,
  },
});
