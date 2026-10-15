import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';
import { formatDuration } from '../../lib/format';
import { Button } from '../Button';
import { Text } from '../Text';

interface RestTimerBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  onDismiss: () => void;
}

/** Non-blocking rest countdown shown after completing a set. */
export function RestTimerBar({ remainingSeconds, totalSeconds, onDismiss }: RestTimerBarProps) {
  const ratio = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text variant="label">Descanso {formatDuration(remainingSeconds)}</Text>
        <Button title="Omitir" variant="ghost" fullWidth={false} onPress={onDismiss} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary },
});
