import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { haptics } from '../lib/haptics';
import { colors, hit, motion, radii, stroke, type } from '../theme';

import { PressableScale } from './PressableScale';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /**
   * `unit` = full-width white pill with big labels (Perfil, role radio).
   * `range` = compact 44x32 segments with a raised pill (chart ranges).
   * `mode` = equal-width 40 pt segments with small labels (RepsModeToggle, design/P07c).
   */
  variant: 'unit' | 'range' | 'mode';
}

const RANGE_SEG_W = 44;
const RANGE_SEG_H = 32;
const RANGE_PAD = 3;
const UNIT_PAD = 4;
const UNIT_GAP = 4;
const UNIT_H = 48;
const MODE_PAD = 3;
const MODE_H = 40;

/**
 * Segmented control whose pill slides to the selected option (220 ms easeOut, design/S3).
 * Label colors cross-fade with the pill so text is never dark-on-dark mid-slide.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  variant,
}: SegmentedControlProps<T>) {
  const isMode = variant === 'mode';
  /** Equal-width segments with radio semantics (unit and mode). */
  const isUnit = variant !== 'range';
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const pos = useSharedValue(index);

  const pad = isMode ? MODE_PAD : isUnit ? UNIT_PAD : RANGE_PAD;
  const gap = isUnit && !isMode ? UNIT_GAP : 0;
  const segW = isUnit
    ? Math.max(0, (width - pad * 2 - gap * (options.length - 1)) / options.length)
    : RANGE_SEG_W;

  useEffect(() => {
    pos.value = withTiming(index, {
      duration: reduced ? motion.reduced : motion.base,
      easing: motion.easeOut,
    });
  }, [index, reduced, pos]);

  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * (segW + gap) }],
  }));

  return (
    <View
      accessibilityRole={isUnit ? 'radiogroup' : undefined}
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        isMode ? styles.modeTrack : isUnit ? styles.unitTrack : styles.rangeTrack,
      ]}
    >
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            isMode ? styles.modePill : isUnit ? styles.unitPill : styles.rangePill,
            { left: pad, top: pad, width: segW },
            pill,
          ]}
        />
      ) : null}
      {options.map((o, i) => (
        <PressableScale
          key={o.value}
          accessibilityRole={isUnit ? 'radio' : 'button'}
          accessibilityLabel={o.accessibilityLabel ?? o.label}
          accessibilityState={
            isUnit ? { checked: o.value === value } : { selected: o.value === value }
          }
          hitSlop={
            isUnit
              ? undefined
              : { top: (hit.min - RANGE_SEG_H) / 2, bottom: (hit.min - RANGE_SEG_H) / 2 }
          }
          scaleTo={1}
          onPress={() => {
            if (o.value === value) return;
            if (isUnit) haptics.light();
            else haptics.selection();
            onChange(o.value);
          }}
          style={isMode ? styles.modeSeg : isUnit ? styles.unitSeg : styles.rangeSeg}
        >
          <SegmentLabel label={o.label} index={i} pos={pos} variant={variant} />
        </PressableScale>
      ))}
    </View>
  );
}

function SegmentLabel({
  label,
  index,
  pos,
  variant,
}: {
  label: string;
  index: number;
  pos: SharedValue<number>;
  variant: 'unit' | 'range' | 'mode';
}) {
  const isUnit = variant !== 'range';
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, 1 - Math.abs(pos.value - index));
    return {
      color: interpolateColor(
        t,
        [0, 1],
        [colors.textSecondary, isUnit ? colors.onAccent : colors.textPrimary],
      ),
    };
  });
  return (
    <Animated.Text
      style={[
        variant === 'unit' ? type.unitPill : variant === 'mode' ? type.segmentM : type.segment,
        styles.label,
        style,
      ]}
    >
      {variant === 'unit' ? label.toUpperCase() : label}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  unitTrack: {
    padding: UNIT_PAD,
    gap: UNIT_GAP,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  modeTrack: {
    padding: MODE_PAD,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  rangeTrack: {
    padding: RANGE_PAD,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  pill: { position: 'absolute' },
  unitPill: {
    height: UNIT_H,
    borderRadius: radii.md,
    backgroundColor: colors.textPrimary,
  },
  modePill: {
    height: MODE_H,
    borderRadius: radii.md - 1,
    backgroundColor: colors.textPrimary,
  },
  rangePill: {
    height: RANGE_SEG_H,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  unitSeg: { flex: 1, height: UNIT_H, alignItems: 'center', justifyContent: 'center' },
  modeSeg: { flex: 1, height: MODE_H, alignItems: 'center', justifyContent: 'center' },
  rangeSeg: {
    width: RANGE_SEG_W,
    height: RANGE_SEG_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
});
