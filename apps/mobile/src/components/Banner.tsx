import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, hit, radii, space } from '../theme';

import { Icon, type IconName } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const PULSE_MS = 800;
const DOT = 10;
const HALO_MAX = 1.9;

/** Pulsing dot of the "Continuar entrenamiento" banner (loop 1.6 s). */
function PulseDot() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [reduced, t]);
  const halo = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 1 + (HALO_MAX - 1) * t.value }],
  }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.halo, halo]} />
      <View style={styles.dot} />
    </View>
  );
}

interface BannerProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** Pressable "Continuar entrenamiento" banner (design/S2 + P01). */
export function Banner({ title, subtitle, onPress, accessibilityLabel }: BannerProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      onPress={onPress}
      style={styles.banner}
    >
      <PulseDot />
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textBody" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.go}>
        <Icon name="chevron" size={20} color="onAccent" strokeWidth={2.8} />
      </View>
    </PressableScale>
  );
}

interface NoticeProps {
  message: string;
  icon?: IconName;
}

/** Static accent-tinted notice (e.g. "Tus datos se guardan solo en este teléfono"). */
export function Notice({ message, icon = 'phone' }: NoticeProps) {
  return (
    <View style={styles.notice}>
      <Icon name={icon} size={22} color="accent" />
      <Text variant="bodyStrong" style={styles.noticeText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md + 2,
    paddingRight: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: radii.pill, backgroundColor: colors.accent },
  halo: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.accentHalo,
  },
  texts: { flex: 1 },
  go: {
    width: hit.min,
    height: hit.min,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  noticeText: { flex: 1 },
});
