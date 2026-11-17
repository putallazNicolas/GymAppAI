import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, space } from '../theme';

import { HoldButton } from './HoldButton';
import { Icon } from './icons';
import { Text } from './Text';

const BUMP_SCALE = 1.16;
const BUMP_UP_MS = 80;
const BUMP_DOWN_MS = 120;

/** Scales its children 1 -> 1.16 -> 1 (200 ms) every time `trigger` changes (not on mount). */
export function Bump({ trigger, children }: { trigger: unknown; children: ReactNode }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    scale.set(
      withSequence(
        withTiming(BUMP_SCALE, { duration: BUMP_UP_MS }),
        withTiming(1, { duration: BUMP_DOWN_MS }),
      ),
    );
  }, [trigger, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  /** "Una serie menos" / "Una serie más". */
  decLabel: string;
  incLabel: string;
  /** Spoken value, e.g. "4 series". */
  valueLabel: string;
}

const BUTTON = 56;
const VALUE_WIDTH = 64;

/**
 * Large stepper (design/P07c): 56 pt buttons, 46 pt number, "-" on border and "+" on accentMuted.
 * Hold to repeat; the number bumps on every change.
 */
export function Stepper({
  value,
  min,
  max,
  onChange,
  decLabel,
  incLabel,
  valueLabel,
}: StepperProps) {
  // Always the latest value, including steps applied before the parent re-rendered.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });

  function step(delta: -1 | 1) {
    const next = Math.min(max, Math.max(min, latest.current + delta));
    if (next === latest.current) return false;
    latest.current = next;
    onChange(next);
    return true;
  }

  return (
    <View style={styles.row}>
      <HoldButton
        accessibilityLabel={decLabel}
        disabled={value <= min}
        step={() => step(-1)}
        style={[styles.btn, styles.minus]}
      >
        <Icon name="minus" size={22} color="textPrimary" strokeWidth={2.8} />
      </HoldButton>
      <View style={styles.value} accessible accessibilityLabel={valueLabel}>
        <Bump trigger={value}>
          <Text variant="displayXL" accessibilityLiveRegion="polite" style={styles.valueText}>
            {value}
          </Text>
        </Bump>
      </View>
      <HoldButton
        accessibilityLabel={incLabel}
        disabled={value >= max}
        step={() => step(1)}
        style={[styles.btn, styles.plus]}
      >
        <Icon name="add" size={22} color="accent" strokeWidth={2.8} />
      </HoldButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  btn: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { backgroundColor: colors.border },
  plus: { backgroundColor: colors.accentMuted },
  value: { width: VALUE_WIDTH, alignItems: 'center', justifyContent: 'center' },
  valueText: { textAlign: 'center' },
});
