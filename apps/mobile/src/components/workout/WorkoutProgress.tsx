import type { WeightUnit, WorkoutDetail } from '@gym/core';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatClock, formatNumber, kgToUnit } from '../../lib/format';
import { colors, motion, radii, space, stroke } from '../../theme';
import { Text } from '../Text';

interface WorkoutStatsProps {
  elapsedSeconds: number;
  doneSets: number;
  totalSets: number;
  volumeKg: number;
  unit: WeightUnit;
}

/** TIEMPO · SERIES · VOLUMEN strip (design/P03). Volume counts completed sets only. */
export function WorkoutStats({
  elapsedSeconds,
  doneSets,
  totalSets,
  volumeKg,
  unit,
}: WorkoutStatsProps) {
  return (
    <View style={styles.strip} accessibilityRole="summary">
      <View style={styles.cell}>
        <Text variant="label">Tiempo</Text>
        <Text variant="numL">{formatClock(elapsedSeconds)}</Text>
      </View>
      <View style={[styles.cell, styles.cellBorder]}>
        <Text variant="label">Series</Text>
        <Text variant="numL">
          {doneSets}
          <Text variant="numL" color="textTertiary">
            /{totalSets}
          </Text>
        </Text>
      </View>
      <View style={[styles.cell, styles.cellBorder]}>
        <Text variant="label">Volumen</Text>
        <Text variant="numL" numberOfLines={1} adjustsFontSizeToFit>
          {formatNumber(kgToUnit(volumeKg, unit), 0)}
          <Text variant="numS" color="textTertiary">
            {' '}
            {unit}
          </Text>
        </Text>
      </View>
    </View>
  );
}

type SegmentState = 0 | 1 | 2;
const PENDING = 0;
const FOCUS = 1;
const DONE = 2;

function Segment({ state }: { state: SegmentState }) {
  const reduced = useReducedMotion();
  const t = useSharedValue<number>(state);
  useEffect(() => {
    t.value = withTiming(state, { duration: reduced ? motion.reduced : motion.base });
  }, [state, reduced, t]);
  const animated = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value,
      [PENDING, FOCUS, DONE],
      [colors.border, colors.accent, colors.success],
    ),
  }));
  return <Animated.View style={[styles.segment, animated]} />;
}

interface ProgressSegmentsProps {
  workout: WorkoutDetail;
  /** The first pending set of the open exercise, drawn in accent. */
  focusSetId: string | null;
}

/** One segment per set, grouped by exercise with gaps (green done, accent focus, grey pending). */
export function ProgressSegments({ workout, focusSetId }: ProgressSegmentsProps) {
  return (
    <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no">
      {workout.exercises
        .filter((e) => !e.skipped && e.sets.length > 0)
        .map((e) => (
          <View key={e.id} style={[styles.group, { flex: e.sets.length }]}>
            {e.sets.map((s) => (
              <Segment
                key={s.id}
                state={s.completed ? DONE : s.id === focusSetId ? FOCUS : PENDING}
              />
            ))}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    gap: 3,
  },
  cellBorder: { borderLeftWidth: stroke.hairline, borderLeftColor: colors.border },
  segments: { flexDirection: 'row', gap: space.sm - 1 },
  group: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 5, borderRadius: radii.xs },
});
