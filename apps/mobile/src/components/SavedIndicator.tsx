import { StyleSheet } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { motion, space } from '../theme';

import { Icon } from './icons';
import { Text } from './Text';

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
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.sm + 2,
  },
});
