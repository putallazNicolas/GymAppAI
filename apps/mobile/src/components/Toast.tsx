import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, hit, motion, radii, space, stroke } from '../theme';

import { Icon } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Auto-dismiss delay (design/S4: closes by itself after 3 s). */
const TOAST_MS = 3000;
const FROM_Y = -12;
const BADGE = 24;

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

/**
 * Top toast (design/P08c): success border, check, message and an accent action. Mount it while
 * visible (give it a `key` per message); it slides in, waits 3 s and calls `onDismiss` after fading.
 */
export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduced ? motion.reduced : motion.slow - 60,
      easing: motion.easeOut,
    });
    const timer = setTimeout(() => {
      if (closing.current) return;
      closing.current = true;
      progress.value = withTiming(0, { duration: motion.fast }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }, TOAST_MS);
    return () => clearTimeout(timer);
  }, [progress, reduced, onDismiss]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduced ? 0 : FROM_Y * (1 - progress.value) }],
  }));

  return (
    <View style={[styles.layer, { top: insets.top + space.sm }]} pointerEvents="box-none">
      <Animated.View style={[styles.toast, animated]} accessibilityLiveRegion="polite">
        <View style={styles.badge}>
          <Icon name="check" size={14} color="onAccent" strokeWidth={3.4} />
        </View>
        <Text variant="bodyMSemi" style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {actionLabel ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={() => {
              closing.current = true;
              onAction?.();
              onDismiss();
            }}
            style={styles.action}
          >
            <Text variant="buttonS" color="accent">
              {actionLabel}
            </Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 10 },
  toast: {
    minHeight: hit.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingLeft: space.lg - 2,
    paddingRight: space.xs + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.successBorderStrong,
    ...elevation.floating,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  message: { flex: 1 },
  action: {
    minHeight: hit.min,
    minWidth: hit.min,
    justifyContent: 'center',
    paddingHorizontal: space.sm + 2,
  },
});
