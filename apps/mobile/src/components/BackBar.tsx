import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { hit, motion, space } from '../theme';

import { Icon } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface BackBarProps {
  /** Text next to the chevron: the parent screen's name ("Rutinas"), or "Cancelar" without chevron. */
  label: string;
  /** Hide the chevron (modal "Cancelar"). */
  noChevron?: boolean;
  onPress?: () => void;
  right?: ReactNode;
}

/** Accent back link of the builder screens (design/P06-P08). */
export function BackBar({ label, noChevron = false, onPress, right }: BackBarProps) {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={noChevron ? label : `Volver a ${label}`}
        onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}
        scaleTo={0.97}
      >
        {noChevron ? null : <Icon name="chevronLeft" size={22} color="accent" strokeWidth={2.4} />}
        <Text variant="bodyStrong" color="accent" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </PressableScale>
      {right}
    </View>
  );
}

/** "✓ Guardado": hidden until the first persisted edit; every save re-fades it in. */
export function SavedIndicator({ stamp }: { stamp: number }) {
  const reduced = useReducedMotion();
  if (stamp === 0) return null;
  return (
    <Animated.View
      key={stamp}
      entering={FadeIn.duration(reduced ? motion.reduced : motion.fast)}
      style={styles.saved}
      accessibilityLiveRegion="polite"
    >
      <Icon name="check" size={14} color="success" strokeWidth={3} />
      <Text variant="caption">Guardado</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: hit.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -space.sm,
  },
  back: {
    minHeight: hit.min,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    gap: 2,
  },
  label: { flexShrink: 1 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.sm + 2,
  },
});
