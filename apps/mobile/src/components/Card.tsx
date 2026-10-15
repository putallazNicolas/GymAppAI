import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '../theme';

interface CardProps {
  children: ReactNode;
  /** Green tint, for completed things. */
  completed?: boolean;
  /** e0 = surface + border (default); e1 = surfaceRaised + borderRaised. */
  level?: 'e0' | 'e1';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, completed = false, level = 'e0', style }: CardProps) {
  return (
    <View
      style={[styles.card, level === 'e1' && styles.raised, completed && styles.completed, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  raised: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderRaised },
  completed: { backgroundColor: colors.successMuted, borderColor: colors.successBorder },
});
