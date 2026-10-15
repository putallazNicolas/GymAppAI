import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, hit, motion, radii } from '../theme';

import { PressableScale } from './PressableScale';

const TRACK_W = 52;
const TRACK_H = 32;
const KNOB = 26;
const INSET = 3;

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** Design switch (S2): 52x32 track, knob slides with a soft spring, 68x44 touch target. */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: SwitchProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = reduced
      ? withTiming(value ? 1 : 0, { duration: motion.reduced })
      : withSpring(value ? 1 : 0, motion.springSoft);
  }, [value, reduced, progress]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      Math.min(1, Math.max(0, progress.value)),
      [0, 1],
      [colors.borderStrong, colors.accent],
    ),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_W - KNOB - INSET * 2) }],
  }));

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.hit}
      scaleTo={1}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: { width: 68, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  track: { width: TRACK_W, height: TRACK_H, borderRadius: radii.pill, justifyContent: 'center' },
  knob: {
    width: KNOB,
    height: KNOB,
    marginLeft: INSET,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
});
