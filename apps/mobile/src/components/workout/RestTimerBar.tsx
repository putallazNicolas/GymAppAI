import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeOut,
  SlideInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { formatClock } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { useNow } from '../../lib/useNow';
import { colors, elevation, hit, motion, radii, space, stroke } from '../../theme';
import { Icon } from '../icons';
import { PressableScale } from '../PressableScale';
import { Text } from '../Text';

interface RestTimerBarProps {
  /** Epoch ms when the rest ends. */
  endsAt: number;
  /** Seconds the ring represents when full. */
  totalSeconds: number;
  /** Bumps the end by 15 s. */
  onAddTime: () => void;
  onDismiss: () => void;
}

const RING = 44;
const RING_STROKE = 4;
const RING_R = (RING - RING_STROKE) / 2;
const RING_LEN = 2 * Math.PI * RING_R;
const AUTO_DISMISS_MS = 5000;
const SWIPE_DISMISS = 40;
const BUMP = 1.12;
const SLIDE_OFFSET = 140;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Non-blocking rest countdown (design/P03): floating e2 card with a ring, "+15 s" and ✕.
 * At zero it reads "A LA BARRA", turns green and leaves by itself after 5 s; swiping it down
 * more than 40pt also dismisses it.
 */
export function RestTimerBar({ endsAt, totalSeconds, onAddTime, onDismiss }: RestTimerBarProps) {
  const reduced = useReducedMotion();
  const now = useNow(250);
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const done = remaining <= 0;
  const ratio = done ? 1 : totalSeconds > 0 ? Math.min(1, remaining / totalSeconds) : 0;

  const progress = useSharedValue(ratio);
  const bump = useSharedValue(1);
  const dragY = useSharedValue(0);

  // The ring goes down linearly, second by second.
  useEffect(() => {
    progress.value = reduced ? ratio : withTiming(ratio, { duration: 1000, easing: Easing.linear });
  }, [ratio, reduced, progress]);

  // Zero: warn once and leave after 5 s.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (!done) return;
    haptics.warning();
    const id = setTimeout(() => dismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [done]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * (1 - progress.value),
  }));
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  function addTime() {
    haptics.light();
    if (!reduced)
      bump.set(
        withSequence(withTiming(BUMP, { duration: motion.press }), withSpring(1, motion.springPop)),
      );
    onAddTime();
  }

  const swipe = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      dragY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > SWIPE_DISMISS) {
        dragY.set(
          withTiming(SLIDE_OFFSET, { duration: motion.base }, (finished) => {
            if (finished) scheduleOnRN(onDismiss);
          }),
        );
      } else {
        dragY.set(withSpring(0, motion.springSoft));
      }
    });

  const tint = done ? colors.success : colors.accent;

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        entering={reduced ? undefined : SlideInDown.duration(260).easing(motion.easeOut)}
        exiting={FadeOut.duration(reduced ? motion.reduced : motion.base)}
        style={[styles.wrap, dragStyle]}
        pointerEvents="box-none"
      >
        <View
          style={[styles.bar, done && styles.barDone]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={done ? 'Descanso terminado, a la barra' : 'Descanso'}
        >
          <Svg width={RING} height={RING} accessibilityElementsHidden>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              fill="none"
              stroke={colors.borderRaised}
              strokeWidth={RING_STROKE}
            />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              fill="none"
              stroke={tint}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={[RING_LEN, RING_LEN]}
              animatedProps={ringProps}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <View style={styles.texts}>
            <Text variant="label" color={done ? 'success' : 'textSecondary'}>
              {done ? 'A la barra' : 'Descanso'}
            </Text>
            <Animated.View style={[styles.timeWrap, bumpStyle]}>
              <Text variant="numL">{formatClock(remaining)}</Text>
            </Animated.View>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Sumar 15 segundos de descanso"
            onPress={addTime}
            style={styles.add}
          >
            <Text variant="buttonS">+15 s</Text>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Descartar descanso"
            onPress={onDismiss}
            style={styles.close}
          >
            <Icon name="close" size={20} color="textSecondary" strokeWidth={2.4} />
          </PressableScale>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.lg,
  },
  bar: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: radii.xxl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.borderRaised,
    ...elevation.floating,
  },
  barDone: { borderColor: colors.successBorderStrong },
  texts: { flex: 1 },
  timeWrap: { alignSelf: 'flex-start' },
  add: {
    height: hit.min,
    paddingHorizontal: space.md + 2,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
