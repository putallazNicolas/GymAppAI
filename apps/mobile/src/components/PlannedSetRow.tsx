import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { isStepableReps, shiftReps } from '../lib/planFormat';
import { colors, hit, inputHeight, motion, radii, space, stroke } from '../theme';

import { HoldButton } from './HoldButton';
import { Icon } from './icons';
import { RepsInput, type RepsBar } from './RepsInput';
import { Bump } from './Stepper';
import { Text } from './Text';

interface PlannedSetRowProps {
  /** 0-based; shown as index + 1. */
  index: number;
  reps: string;
  onChange: (next: string) => void;
  bar: RepsBar;
}

const FIELD_HEIGHT = 48;

/**
 * One row of "Por serie" (design/P07c): set number, small reps stepper that is also editable as
 * text, and the CARGA cell, dashed, reserved for V4 and inert.
 */
export function PlannedSetRow({ index, reps, onChange, bar }: PlannedSetRowProps) {
  const reduced = useReducedMotion();
  const latest = useRef(reps);
  useEffect(() => {
    latest.current = reps;
  });
  const stepable = isStepableReps(reps);

  function step(delta: -1 | 1) {
    const next = shiftReps(latest.current, delta);
    if (next === latest.current) return false;
    latest.current = next;
    onChange(next);
    return true;
  }

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(motion.base)}
      layout={reduced ? undefined : LinearTransition.duration(motion.base)}
      style={styles.row}
    >
      <Text variant="numSet" color="accent" style={styles.number}>
        {index + 1}
      </Text>
      <View style={styles.field}>
        <HoldButton
          accessibilityLabel={`Menos reps en la serie ${index + 1}`}
          disabled={!stepable}
          step={() => step(-1)}
          style={styles.stepBtn}
        >
          <Icon name="minus" size={18} color="textBody" strokeWidth={2.6} />
        </HoldButton>
        <View style={styles.value}>
          <Bump trigger={reps}>
            <RepsInput
              value={reps}
              onCommit={onChange}
              index={index}
              bar={bar}
              size="set"
              textAlign="center"
              accessibilityLabel={`Reps de la serie ${index + 1}`}
            />
          </Bump>
        </View>
        <HoldButton
          accessibilityLabel={`Más reps en la serie ${index + 1}`}
          disabled={!stepable}
          step={() => step(1)}
          style={styles.stepBtn}
        >
          <Icon name="add" size={18} color="accent" strokeWidth={2.6} />
        </HoldButton>
      </View>
      <View style={styles.load} accessibilityElementsHidden importantForAccessibility="no">
        <Text variant="caption" color="textDisabled">
          —
        </Text>
      </View>
    </Animated.View>
  );
}

/** Column headers above the rows: SERIE, REPS, CARGA. */
export function PlannedSetHeader() {
  return (
    <View style={styles.header}>
      <Text variant="label" color="textTertiary" style={styles.number}>
        Serie
      </Text>
      <Text variant="label" color="textTertiary" style={styles.headReps}>
        Reps
      </Text>
      <Text variant="label" color="textTertiary" style={styles.headLoad}>
        Carga
      </Text>
    </View>
  );
}

const NUMBER_WIDTH = 52;
const LOAD_WIDTH = 58;

const styles = StyleSheet.create({
  row: {
    minHeight: hit.min + space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xs,
  },
  number: { width: NUMBER_WIDTH, textAlign: 'center' },
  headReps: { flex: 1, textAlign: 'center' },
  headLoad: { width: LOAD_WIDTH, textAlign: 'center' },
  field: {
    flex: 1,
    minWidth: 0,
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  stepBtn: {
    width: hit.min,
    height: FIELD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { flex: 1, minWidth: 0, height: inputHeight.repsSet, justifyContent: 'center' },
  load: {
    width: LOAD_WIDTH,
    height: hit.min - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: stroke.regular,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
});
