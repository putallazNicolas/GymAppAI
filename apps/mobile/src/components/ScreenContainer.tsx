import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

interface ScreenContainerProps {
  children: ReactNode;
  /** Safe-area edges to pad. Use ['bottom'] under a native stack header. */
  edges?: Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  edges = ['top', 'left', 'right'],
  padded = true,
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, padded && styles.padded, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: spacing.lg },
});
