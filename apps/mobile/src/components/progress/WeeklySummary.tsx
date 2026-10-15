import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatNumber, kgToUnit } from '../../lib/format';
import { colors, motion, radii, space, stroke } from '../../theme';
import { Text } from '../Text';

import type { WeightUnit } from '@gym/core';

export interface WeekBar {
  /** "13/10". */
  label: string;
  workouts: number;
  volumeKg: number;
}

interface WeeklySummaryProps {
  weeks: WeekBar[];
  unit: WeightUnit;
  /** Days of the active routine, when there is one. */
  routineDays?: number;
}

const BAR_AREA = 126;
const BAR_MAX = 96;
const LABEL_MIN = 0;

/** Volume in thousands: "47,9 t" (tonnes) in kg, "105,6 k" in lb. */
function thousands(volumeKg: number, unit: WeightUnit): string {
  return `${formatNumber(kgToUnit(volumeKg, unit) / 1000)}\u00A0${unit === 'kg' ? 't' : 'k'}`;
}

function Bar({ height, color, grow }: { height: number; color: string; grow: { value: number } }) {
  const style = useAnimatedStyle(() => ({ height: height * grow.value }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

/** "Resumen semanal": this week's volume plus a bar per week with its workout count. */
export function WeeklySummary({ weeks, unit, routineDays }: WeeklySummaryProps) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    grow.value = reduced
      ? 1
      : withTiming(1, {
          duration: motion.slow + motion.fast + motion.press,
          easing: motion.easeOut,
        });
  }, [reduced, grow]);

  const current = weeks[weeks.length - 1];
  const max = Math.max(1, ...weeks.map((w) => w.volumeKg));
  const lastIdx = weeks.length - 1;
  const done = current?.workouts ?? 0;
  const thisWeek =
    routineDays && routineDays > 0
      ? `esta semana · ${done} de ${routineDays} ${routineDays === 1 ? 'día' : 'días'}`
      : `esta semana · ${done} ${done === 1 ? 'entrenamiento' : 'entrenamientos'}`;
  const volume = kgToUnit(current?.volumeKg ?? 0, unit);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="label">RESUMEN SEMANAL</Text>
        <Text variant="caption">Volumen total · entrenamientos</Text>
      </View>
      <View style={styles.total}>
        <Text variant="numL">
          {formatNumber(volume, 0)}
          <Text variant="numS" color="textTertiary">{` ${unit}`}</Text>
        </Text>
        <Text variant="caption" style={styles.thisWeek}>
          {thisWeek}
        </Text>
      </View>

      <View style={styles.bars}>
        {weeks.map((w, i) => {
          const isCurrent = i === lastIdx;
          const showValue = i >= lastIdx - 1 && w.volumeKg > 0;
          return (
            <View key={i} style={styles.col}>
              {showValue ? (
                <Text
                  variant="numXS"
                  color={isCurrent ? 'textPrimary' : 'textBody'}
                  style={styles.label}
                >
                  {thousands(w.volumeKg, unit)}
                </Text>
              ) : null}
              <Bar
                height={(w.volumeKg / max) * BAR_MAX}
                color={
                  isCurrent
                    ? colors.accent
                    : i === lastIdx - 1
                      ? colors.textDisabled
                      : colors.borderStrong
                }
                grow={grow}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {weeks.map((w, i) => (
          <View key={i} style={styles.col}>
            {(lastIdx - i) % 2 === 0 ? (
              <Text
                variant="numAxis"
                color={i === lastIdx ? 'textPrimary' : 'textTertiary'}
                style={styles.label}
              >
                {w.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <View
        style={styles.counts}
        accessibilityLabel={`Entrenamientos por semana: ${weeks.map((w) => w.workouts).join(', ')}`}
      >
        {weeks.map((w, i) => (
          <View key={i} style={styles.col}>
            <Text
              variant="numXS"
              color={i === lastIdx ? 'accent' : w.workouts === 0 ? 'textDisabled' : 'textPrimary'}
              style={styles.count}
            >
              {w.workouts}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: space.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  total: { marginTop: 6, flexDirection: 'row', alignItems: 'baseline', gap: 14 },
  thisWeek: { flexShrink: 1 },
  bars: {
    marginTop: space.md,
    height: BAR_AREA,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
  },
  col: { flex: 1, alignItems: 'center', gap: space.xs },
  label: { textAlign: 'center', minWidth: LABEL_MIN },
  bar: { width: '100%', borderTopLeftRadius: space.xs, borderTopRightRadius: space.xs },
  axis: {
    flexDirection: 'row',
    gap: 4,
    borderTopWidth: stroke.hairline,
    borderTopColor: colors.borderStrong,
    paddingTop: 6,
  },
  counts: { flexDirection: 'row', gap: 4, paddingTop: 6 },
  count: { textAlign: 'center' },
});
