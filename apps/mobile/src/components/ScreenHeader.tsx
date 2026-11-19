import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '../theme';

import { Text } from './Text';

interface ScreenHeaderProps {
  /** Small uppercase label above the title (e.g. the date). */
  label?: string;
  title: string;
  /** Highlights the label in accent (used while training). */
  accent?: boolean;
  /** Optional action on the right (e.g. "Finalizar"). */
  right?: ReactNode;
}

/** Screen header: label + displayL title, with an optional right action (design/S2). */
export function ScreenHeader({ label, title, accent = false, right }: ScreenHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.texts}>
        {label ? (
          <Text variant="label" color={accent ? 'accent' : 'textSecondary'} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <Text variant="displayL" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  texts: { flex: 1, gap: space.xs },
});
