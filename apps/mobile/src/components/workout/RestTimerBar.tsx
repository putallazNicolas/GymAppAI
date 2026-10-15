import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatDuration } from '../../lib/format';
import { colors, elevation, hit, radii, space, stroke } from '../../theme';
import { Icon } from '../icons';
import { PressableScale } from '../PressableScale';
import { Text } from '../Text';

interface RestTimerBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  onDismiss: () => void;
}

const RING = 44;
const RING_STROKE = 4;
const RING_R = (RING - RING_STROKE) / 2;
const RING_LEN = 2 * Math.PI * RING_R;

/** Non-blocking rest countdown shown after completing a set (floating e2 card with a ring). */
export function RestTimerBar({ remainingSeconds, totalSeconds, onDismiss }: RestTimerBarProps) {
  const ratio = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;
  const done = remainingSeconds <= 0;
  const tint = done ? colors.success : colors.accent;
  return (
    <View style={[styles.bar, done && styles.barDone]} accessibilityLiveRegion="polite">
      <Svg width={RING} height={RING} accessibilityElementsHidden>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RING_R}
          fill="none"
          stroke={colors.borderRaised}
          strokeWidth={RING_STROKE}
        />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RING_R}
          fill="none"
          stroke={tint}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={[RING_LEN, RING_LEN]}
          strokeDashoffset={RING_LEN * (1 - (done ? 1 : ratio))}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={styles.texts}>
        <Text variant="label" color={done ? 'success' : 'textSecondary'}>
          {done ? 'A la barra' : 'Descanso'}
        </Text>
        <Text variant="numL">{formatDuration(remainingSeconds)}</Text>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Omitir descanso"
        onPress={onDismiss}
        style={styles.close}
      >
        <Icon name="close" size={20} color="textSecondary" strokeWidth={2.4} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: radii.xxl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.borderRaised,
    ...elevation.floating,
  },
  barDone: { borderColor: colors.successBorderStrong },
  texts: { flex: 1 },
  close: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
});
