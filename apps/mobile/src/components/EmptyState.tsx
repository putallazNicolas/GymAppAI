import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, radii, space } from '../theme';

import { Button } from './Button';
import type { IconName } from './icons';
import { Text } from './Text';

interface EmptyStateProps {
  /** Kept for call-site compatibility; the empty illustration is always the empty barbell. */
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** The empty barbell of design/S2 (plates as dashed outlines: nothing loaded yet). */
function EmptyBarbell() {
  return (
    <Svg width={220} height={60} viewBox="0 0 320 110" accessibilityElementsHidden>
      <Rect
        x={44}
        y={12}
        width={20}
        height={86}
        rx={4}
        fill="none"
        stroke={colors.borderStrong}
        strokeWidth={2}
        strokeDasharray="5 5"
      />
      <Rect
        x={256}
        y={12}
        width={20}
        height={86}
        rx={4}
        fill="none"
        stroke={colors.borderStrong}
        strokeWidth={2}
        strokeDasharray="5 5"
      />
      <Rect x={8} y={49} width={80} height={12} rx={3} fill={colors.border} />
      <Rect x={232} y={49} width={80} height={12} rx={3} fill={colors.border} />
      <Rect x={86} y={43} width={8} height={24} rx={2} fill={colors.borderStrong} />
      <Rect x={226} y={43} width={8} height={24} rx={2} fill={colors.borderStrong} />
      <Rect x={94} y={52} width={132} height={6} rx={3} fill={colors.textDisabled} />
    </Svg>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <EmptyBarbell />
        <Text variant="displayM" style={styles.center}>
          {title}
        </Text>
        {message ? (
          <Text variant="bodyS" color="textBody" style={styles.center}>
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} style={styles.cta} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingVertical: space.lg },
  card: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  center: { textAlign: 'center' },
  cta: { marginTop: space.sm },
});
