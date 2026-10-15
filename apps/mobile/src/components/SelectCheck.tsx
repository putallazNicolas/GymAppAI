import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, stroke } from '../theme';

import { Icon } from './icons';

const SIZE = 28;
const FROM = 0.6;

/** Square (radius 8) selection check for multi-select rows: pops in 0.6 → 1 when selected. */
export function SelectCheck({ selected }: { selected: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(selected ? 1 : FROM);
  const opacity = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      opacity.value = withTiming(selected ? 1 : 0, { duration: motion.reduced });
      scale.value = 1;
      return;
    }
    opacity.value = withTiming(selected ? 1 : 0, { duration: motion.press });
    scale.value = selected ? withSpring(1, motion.springPop) : FROM;
  }, [selected, reduced, scale, opacity]);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={styles.ring}>
      <Animated.View style={[styles.fill, animated]}>
        <Icon name="check" size={16} color="onAccent" strokeWidth={3.2} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.sm,
    borderWidth: stroke.thick,
    borderColor: colors.borderStrong,
  },
  fill: {
    position: 'absolute',
    top: -stroke.thick,
    left: -stroke.thick,
    width: SIZE,
    height: SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
