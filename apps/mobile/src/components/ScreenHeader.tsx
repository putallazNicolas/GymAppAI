import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space, stroke } from '../theme';

import { Text } from './Text';

interface ScreenHeaderProps {
  /** Small uppercase label above the title (e.g. the date). */
  label?: string;
  title: string;
  /** Highlights the label in accent (used while training). */
  accent?: boolean;
  /** Optional action on the right (e.g. "Finalizar"). */
  right?: ReactNode;
  /**
   * Optional mark before the label, separated by a thin rule (design/L4 B: the K of Kalk on Hoy).
   * Not interactive.
   */
  labelLeading?: ReactNode;
}

/** Screen header: label + displayL title, with an optional right action (design/S2). */
export function ScreenHeader({
  label,
  title,
  accent = false,
  right,
  labelLeading,
}: ScreenHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={[styles.texts, labelLeading ? styles.textsWithMark : null]}>
        {labelLeading ? (
          <View style={styles.labelRow}>
            {labelLeading}
            <View style={styles.rule} />
            {label ? (
              <Text
                variant="label"
                color={accent ? 'accent' : 'textSecondary'}
                numberOfLines={1}
                style={styles.labelText}
              >
                {label}
              </Text>
            ) : null}
          </View>
        ) : label ? (
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
  /** With a mark the label row is taller (22 pt K), so the title sits 8 pt below it (design/L4 B). */
  textsWithMark: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  /** Thin vertical rule between the mark and the label (1 × 14, borderStrong). */
  rule: { width: stroke.hairline, height: 14, backgroundColor: colors.borderStrong },
  labelText: { flexShrink: 1 },
});
