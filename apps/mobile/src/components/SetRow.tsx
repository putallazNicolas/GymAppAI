import { useEffect, useRef, useState, type Ref } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '../lib/haptics';
import { colors, hit, motion, radii, space, stroke, type } from '../theme';

import { AnimatedCheck } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface SetRowProps {
  /** 1-based set number shown in the first column. */
  index: number;
  /** What was done last time, e.g. "80 × 8". */
  previousText?: string;
  kg: string;
  reps: string;
  repsPlaceholder?: string;
  completed: boolean;
  /** Marks the row as the one being worked on (also set automatically while an input has focus). */
  focused?: boolean;
  /** Shows the gold PR badge next to the previous text. */
  pr?: boolean;
  onChangeKg: (value: string) => void;
  onChangeReps: (value: string) => void;
  onToggleComplete: () => void;
  kgInputRef?: Ref<TextInput>;
  repsInputRef?: Ref<TextInput>;
  /** Called when the keyboard "next" key is pressed on the kg input. */
  onSubmitKg?: () => void;
  onSubmitReps?: () => void;
  /** Fired when an input loses focus: persist edited values here. */
  onBlurKg?: () => void;
  onBlurReps?: () => void;
}

const CHECK_STROKE = 3;
const CHECK_DONE_STROKE = 3.2;
const POP_DOWN = 0.86;
const POP_UP = 1.08;
const FLASH_MS = 600;
const PR_START = 0.4;
const PR_OVERSHOOT = 1.15;
const PR_DELAY = 150;

function PrBadge() {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : PR_START);
  useEffect(() => {
    if (reduced) return;
    scale.value = withDelay(
      PR_DELAY,
      withSequence(
        withTiming(PR_OVERSHOOT, { duration: motion.fast, easing: motion.easeOut }),
        withSpring(1, motion.springPop),
      ),
    );
  }, [reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.prBadge, animated]} accessibilityLabel="Récord personal">
      <Text variant="badge" color="onAccent">
        PR
      </Text>
    </Animated.View>
  );
}

/** `# | Anterior | Kg | Reps | ✓` row (SCREENS.md 4.2): pending, focus and completed states. */
export function SetRow({
  index,
  previousText,
  kg,
  reps,
  repsPlaceholder,
  completed,
  focused = false,
  pr = false,
  onChangeKg,
  onChangeReps,
  onToggleComplete,
  kgInputRef,
  repsInputRef,
  onSubmitKg,
  onSubmitReps,
  onBlurKg,
  onBlurReps,
}: SetRowProps) {
  const reduced = useReducedMotion();
  const [kgFocus, setKgFocus] = useState(false);
  const [repsFocus, setRepsFocus] = useState(false);
  const isFocus = !completed && (focused || kgFocus || repsFocus);

  const flash = useSharedValue(0);
  const pop = useSharedValue(1);
  const draw = useSharedValue(0);
  const wasCompleted = useRef(completed);

  useEffect(() => {
    if (wasCompleted.current === completed) return;
    wasCompleted.current = completed;
    if (!completed) {
      flash.value = 0;
      draw.value = 0;
      return;
    }
    if (reduced) {
      flash.value = 0;
      draw.value = 0;
      return;
    }
    flash.value = 1;
    flash.value = withTiming(0, { duration: FLASH_MS, easing: motion.easeOut });
    draw.value = 1;
    draw.value = withTiming(0, { duration: motion.base, easing: motion.easeOut });
    pop.value = withSequence(
      withTiming(POP_DOWN, { duration: motion.press }),
      withSpring(POP_UP, motion.springPop),
      withSpring(1, motion.springPop),
    );
  }, [completed, reduced, flash, pop, draw]);

  const rowAnimated = useAnimatedStyle(() => ({
    backgroundColor: completed
      ? interpolateColor(flash.value, [0, 1], [colors.successMuted, colors.successPressed])
      : isFocus
        ? colors.surfaceRaised
        : colors.surface,
  }));
  const popAnimated = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  function toggle() {
    if (!completed) haptics.success();
    onToggleComplete();
  }

  const inputBase = [styles.input, completed && styles.inputCompleted];

  return (
    <Animated.View
      style={[
        styles.row,
        { minHeight: isFocus ? hit.rowFocus : hit.row },
        isFocus && styles.rowFocus,
        rowAnimated,
      ]}
    >
      <Text
        variant="numM"
        style={styles.index}
        color={completed ? 'success' : isFocus ? 'accent' : 'textTertiary'}
      >
        {index}
      </Text>
      <View style={styles.previousWrap}>
        <Text variant="numS" color={isFocus ? 'textSecondary' : 'textTertiary'} numberOfLines={1}>
          {previousText ?? '—'}
        </Text>
        {pr ? <PrBadge /> : null}
      </View>
      <TextInput
        ref={kgInputRef}
        style={[
          ...inputBase,
          !completed && (kgFocus ? styles.inputActive : styles.inputPending),
          kgFocus && styles.inputFocused,
        ]}
        value={kg}
        onChangeText={onChangeKg}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textDisabled}
        selectionColor={colors.accent}
        selectTextOnFocus
        accessibilityLabel={`Kg, serie ${index}`}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={onSubmitKg}
        onFocus={() => setKgFocus(true)}
        onBlur={() => {
          setKgFocus(false);
          onBlurKg?.();
        }}
      />
      <TextInput
        ref={repsInputRef}
        style={[
          ...inputBase,
          styles.inputReps,
          !completed && (repsFocus ? styles.inputActive : styles.inputPending),
          repsFocus && styles.inputFocused,
        ]}
        value={reps}
        onChangeText={onChangeReps}
        keyboardType="number-pad"
        placeholder={repsPlaceholder}
        placeholderTextColor={colors.textDisabled}
        selectionColor={colors.accent}
        selectTextOnFocus
        accessibilityLabel={`Repeticiones, serie ${index}`}
        onSubmitEditing={onSubmitReps}
        onFocus={() => setRepsFocus(true)}
        onBlur={() => {
          setRepsFocus(false);
          onBlurReps?.();
        }}
      />
      <Animated.View style={popAnimated}>
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityLabel={`Completar serie ${index}`}
          accessibilityState={{ checked: completed }}
          onPress={toggle}
          scaleTo={1}
          style={[styles.check, isFocus && styles.checkFocus, completed && styles.checkCompleted]}
        >
          <AnimatedCheck
            progress={draw}
            strokeWidth={completed ? CHECK_DONE_STROKE : CHECK_STROKE}
            color={completed ? 'onAccent' : isFocus ? 'accent' : 'textDisabled'}
          />
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radii.md,
    borderWidth: stroke.regular,
    borderColor: colors.transparent,
  },
  rowFocus: { borderColor: colors.accent },
  index: { width: 24, textAlign: 'center' },
  previousWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm - 2 },
  input: {
    ...type.numM,
    width: 72,
    height: 42,
    padding: 0,
    textAlign: 'center',
    color: colors.textPrimary,
    borderRadius: radii.sm,
  },
  inputReps: { width: 60 },
  inputPending: { borderWidth: stroke.hairline, borderColor: colors.border },
  inputActive: {
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  inputFocused: { borderWidth: stroke.thick, borderColor: colors.accent },
  inputCompleted: { color: colors.textPrimary },
  check: {
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: stroke.regular,
    borderColor: colors.borderStrong,
  },
  checkFocus: { borderColor: colors.accent, backgroundColor: colors.accentFaint },
  checkCompleted: { backgroundColor: colors.success, borderColor: colors.success },
  prBadge: {
    paddingHorizontal: space.xs + 2,
    borderRadius: space.xs + 1,
    backgroundColor: colors.record,
  },
});
