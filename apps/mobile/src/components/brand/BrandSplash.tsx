import { hideAsync } from 'expo-splash-screen';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { brand, motion, space } from '../../theme';
import { Text } from '../Text';

import { K_ARM, K_BODY } from './KalkMark';

/** Same box as the native splash: `imageWidth: 120` in app.json. */
export const SPLASH_K_SIZE = 120;
/** Same framing as assets/brand/src/icono/splash-icon.svg, so it matches the native splash. */
const SPLASH_VIEWBOX = '21 21 58 58';
/** "Preparando tus datos…" sits 40 pt below the K (design/S5 §5). */
const SLOW_TEXT_GAP = space.xxxl + space.sm;
const SLOW_TEXT_HALF_WIDTH = 160;

interface BrandSplashProps {
  /** Everything is loaded: play the exit and call `onGone` when it ends. */
  leaving: boolean;
  onGone: () => void;
  /** The fonts are loaded, so the "slow" caption can be drawn. */
  canShowText: boolean;
  /** Shown instead of the K (e.g. the ErrorState when the database fails to open). */
  children?: ReactNode;
}

/**
 * Exact replica of the native splash (design/L2, S5 §5): ink background and the K centered at
 * 120 × 120. The native splash is hidden in this view's first layout, so the swap is invisible;
 * the exit animation happens here (the native splash cannot animate).
 */
export function BrandSplash({ leaving, onGone, canShowText, children }: BrandSplashProps) {
  const reduced = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const hidden = useRef(false);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), motion.splashSlowAfter);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onGone);
    };
    if (reduced) {
      opacity.set(withTiming(0, { duration: motion.reduced }, done));
      return;
    }
    const exit = { duration: motion.splashExit, easing: Easing.in(Easing.ease) };
    scale.set(withTiming(motion.splashExitScale, exit));
    opacity.set(withTiming(0, exit, done));
  }, [leaving, reduced, onGone, opacity, scale]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      testID="brand-splash"
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      pointerEvents={leaving ? 'none' : 'auto'}
      onLayout={() => {
        if (hidden.current) return;
        hidden.current = true;
        hideAsync().catch(() => undefined);
      }}
    >
      {children ?? (
        <View style={styles.center}>
          <Animated.View style={markStyle}>
            <Svg
              width={SPLASH_K_SIZE}
              height={SPLASH_K_SIZE}
              viewBox={SPLASH_VIEWBOX}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Kalk"
            >
              <Polygon fill={brand.bone} points={K_BODY} />
              <Polygon fill={brand.signal} points={K_ARM} />
            </Svg>
          </Animated.View>
          {slow && canShowText && !leaving ? (
            <View style={styles.slow} accessibilityLiveRegion="polite">
              <Text variant="caption" color="textTertiary">
                Preparando tus datos…
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: brand.ink, alignItems: 'center', justifyContent: 'center' },
  center: { width: SPLASH_K_SIZE, height: SPLASH_K_SIZE },
  slow: {
    position: 'absolute',
    top: SPLASH_K_SIZE + SLOW_TEXT_GAP,
    left: SPLASH_K_SIZE / 2 - SLOW_TEXT_HALF_WIDTH,
    right: SPLASH_K_SIZE / 2 - SLOW_TEXT_HALF_WIDTH,
    alignItems: 'center',
  },
});
