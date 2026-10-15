import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme';

interface CardProps {
  children: ReactNode;
  /** Green tint, for completed things. */
  completed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, completed = false, style }: CardProps) {
  return <View style={[styles.card, completed && styles.completed, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  completed: { backgroundColor: colors.successSurface, borderColor: colors.success },
});
