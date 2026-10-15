import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '../../lib/haptics';
import { colors, motion, radii, space } from '../../theme';

const LIGHT_DELAYS = [300, 480, 660] as const;
const LIGHT_MS = 220;
const SIZE = 20;
const HALO_RADIUS = 18;
const HALO_OPACITY = 0.45;

function Light({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      reduced ? 0 : delay,
      withTiming(1, { duration: reduced ? motion.reduced : LIGHT_MS, easing: motion.easeOut }),
    );
  }, [delay, reduced, t]);
  const animated = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [colors.border, colors.light]),
    shadowOpacity: t.value * HALO_OPACITY,
  }));
  return <Animated.View style={[styles.light, animated]} />;
}

/** "Tres luces blancas" (design/P04, S3): three discs light up in sequence, with haptics. */
export function RecordLights() {
  useEffect(() => {
    const timers = LIGHT_DELAYS.map((d) => setTimeout(haptics.light, d));
    timers.push(setTimeout(haptics.success, LIGHT_DELAYS[2] + LIGHT_MS));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel="Tres luces blancas: levantamiento válido"
    >
      {LIGHT_DELAYS.map((d) => (
        <Light key={d} delay={d} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  light: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    shadowColor: colors.light,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: HALO_RADIUS,
  },
});
