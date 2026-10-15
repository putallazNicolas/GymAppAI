import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { formatNumber } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { niceScale, polylineLength } from '../../lib/progress';
import { colors, fonts, motion, radii, space, stroke, type } from '../../theme';
import { Text } from '../Text';

export interface ChartPoint {
  /** "15 oct". */
  label: string;
  /** Month bucket for the X axis labels ("2026-9"). */
  monthKey: string;
  /** "oct". */
  monthLabel: string;
  /** Best weight and e1RM, in the display unit. */
  weight: number;
  e1rm: number;
  /** Reps of the heaviest set. */
  reps: number;
  /** e1RM record (gold point and tag). */
  pr: boolean;
}

interface ProgressChartProps {
  points: ChartPoint[];
  unit: string;
  /** Accessible summary of the whole series. */
  summary: string;
}

const HEIGHT = 220;
const PAD = { left: 32, right: 8, top: 12, bottom: 24 };
const AXIS_Y = HEIGHT - PAD.bottom;
const PLOT_H = AXIS_Y - PAD.top;
const MIN_MONTH_GAP = 36;
const WHITE_R = 7;
const ACCENT = 14;
const HALO_R = 14;
const AREA_DELAY = 300;
const AREA_FADE = 600;
const AnimatedPath = Animated.createAnimatedComponent(Path);

function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('');
}

/** The chart card body: readout, svg lines, interactive cursor. Remount it to replay the intro. */
export function ProgressChart({ points, unit, summary }: ProgressChartProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const n = points.length;
  const [sel, setSel] = useState(Math.max(0, n - 1));

  const geo = useMemo(() => {
    const plotW = Math.max(0, width - PAD.left - PAD.right);
    const scale = niceScale(points.flatMap((p) => [p.weight, p.e1rm]));
    const x = (i: number) => (n <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (n - 1)) * plotW);
    const y = (v: number) => PAD.top + PLOT_H * (1 - (v - scale.min) / (scale.max - scale.min));
    const e1 = points.map((p, i) => ({ x: x(i), y: y(p.e1rm) }));
    const wt = points.map((p, i) => ({ x: x(i), y: y(p.weight) }));
    const months: { x: number; label: string; first: boolean }[] = [];
    points.forEach((p, i) => {
      if (i > 0 && points[i - 1]?.monthKey === p.monthKey) return;
      const last = months[months.length - 1];
      if (last && x(i) - last.x < MIN_MONTH_GAP) return;
      months.push({ x: x(i), label: p.monthLabel, first: months.length === 0 });
    });
    return { plotW, scale, y, e1, wt, months, length: polylineLength(e1) };
  }, [points, width, n]);

  // Intro: the e1RM line draws (900 ms), the area fades in (600 ms, starting at 300 ms).
  const draw = useSharedValue(reduced ? 1 : 0);
  const area = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      draw.value = 1;
      area.value = withTiming(1, { duration: motion.reduced });
      return;
    }
    draw.value = withTiming(1, { duration: motion.draw, easing: motion.easeOut });
    area.value = withDelay(AREA_DELAY, withTiming(1, { duration: AREA_FADE }));
  }, [reduced, draw, area]);
  const lineLength = geo.length;
  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLength * (1 - draw.value),
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: area.value }));

  // Cursor: dots and dashed line glide to the selected point (160 ms easeOut).
  const cx = useSharedValue(0);
  const wy = useSharedValue(0);
  const ey = useSharedValue(0);
  const placed = useRef(false);
  const cur = points[sel];
  const curX = geo.e1[sel]?.x ?? 0;
  const curWy = geo.wt[sel]?.y ?? 0;
  const curEy = geo.e1[sel]?.y ?? 0;
  useEffect(() => {
    if (width === 0) return;
    if (!placed.current || reduced) {
      placed.current = true;
      cx.value = curX;
      wy.value = curWy;
      ey.value = curEy;
      return;
    }
    const t = { duration: motion.fast, easing: motion.easeOut };
    cx.value = withTiming(curX, t);
    wy.value = withTiming(curWy, t);
    ey.value = withTiming(curEy, t);
  }, [curX, curWy, curEy, width, reduced, cx, wy, ey]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cx.value }] }));
  const whiteDot = useAnimatedStyle(() => ({
    transform: [{ translateX: cx.value - WHITE_R }, { translateY: wy.value - WHITE_R }],
  }));
  const accentDot = useAnimatedStyle(() => ({
    transform: [{ translateX: cx.value - HALO_R }, { translateY: ey.value - HALO_R }],
  }));

  const select = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(i, n - 1));
      if (next === sel) return;
      setSel(next);
      haptics.selection();
    },
    [n, sel],
  );

  const pickAt = useCallback(
    (px: number) => {
      if (n <= 1 || geo.plotW === 0) return;
      select(Math.round(((px - PAD.left) / geo.plotW) * (n - 1)));
    },
    [n, geo.plotW, select],
  );

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onBegin((e) => pickAt(e.x))
    .onUpdate((e) => pickAt(e.x));

  const { scale } = geo;

  return (
    <View>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text variant="numRead" style={styles.readDate}>
          {cur?.label ?? ''}
        </Text>
        <View style={styles.readSep} />
        <View style={styles.readCol}>
          <Text variant="label" color="accent">
            E1RM
          </Text>
          <Text variant="numRead">{cur ? `${formatNumber(cur.e1rm)} ${unit}` : ''}</Text>
        </View>
        <View style={styles.readCol}>
          <Text variant="label">MEJOR SERIE</Text>
          <Text variant="numRead">{cur ? `${formatNumber(cur.weight)} × ${cur.reps}` : ''}</Text>
        </View>
        {cur?.pr ? (
          <View style={styles.prTag}>
            <Text variant="badge" color="onAccent">
              PR
            </Text>
          </View>
        ) : null}
      </View>

      <GestureDetector gesture={pan}>
        <View
          style={styles.chart}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={summary}
          accessibilityValue={{
            text: cur
              ? `${cur.label}: mejor serie ${formatNumber(cur.weight)} por ${cur.reps}, e1RM ${formatNumber(cur.e1rm)} ${unit}${cur.pr ? ', PR' : ''}`
              : undefined,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            select(sel + (e.nativeEvent.actionName === 'increment' ? 1 : -1))
          }
        >
          {width > 0 && n > 0 ? (
            <>
              <Svg width={width} height={HEIGHT}>
                <Defs>
                  <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.accent} stopOpacity={0.32} />
                    <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {scale.ticks.slice(1).map((v) => (
                  <Line
                    key={v}
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={geo.y(v)}
                    y2={geo.y(v)}
                    stroke={colors.divider}
                    strokeWidth={stroke.hairline}
                  />
                ))}
                <Line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={AXIS_Y}
                  y2={AXIS_Y}
                  stroke={colors.borderStrong}
                  strokeWidth={stroke.hairline}
                />
                {scale.ticks.map((v) => (
                  <SvgText
                    key={`t${v}`}
                    x={PAD.left - 6}
                    y={geo.y(v) + 4}
                    fill={colors.textTertiary}
                    fontSize={type.numAxis.fontSize}
                    fontFamily={fonts.displayMedium}
                    textAnchor="end"
                  >
                    {formatNumber(v)}
                  </SvgText>
                ))}
                {geo.months.map((m) => (
                  <SvgText
                    key={`m${m.x}`}
                    x={m.x}
                    y={HEIGHT - 6}
                    fill={colors.textTertiary}
                    fontSize={type.axisX.fontSize}
                    fontFamily={fonts.bodySemi}
                    textAnchor={m.first && n > 1 ? 'start' : 'middle'}
                  >
                    {m.label}
                  </SvgText>
                ))}
                {n > 1 ? (
                  <AnimatedPath
                    animatedProps={areaProps}
                    d={`${linePath(geo.e1)}L${geo.e1[n - 1]?.x} ${AXIS_Y}L${geo.e1[0]?.x} ${AXIS_Y}Z`}
                    fill="url(#area)"
                  />
                ) : null}
                {n > 1 ? (
                  <Path
                    d={linePath(geo.wt)}
                    fill="none"
                    stroke={colors.chartWeight}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                ) : null}
                {geo.wt.map((p, i) => (
                  <Circle
                    key={`w${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={colors.background}
                    stroke={colors.chartWeight}
                    strokeWidth={2}
                  />
                ))}
                {n > 1 ? (
                  <AnimatedPath
                    animatedProps={lineProps}
                    d={linePath(geo.e1)}
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={[lineLength + 1, lineLength + 1]}
                  />
                ) : null}
                {points.map((p, i) =>
                  p.pr ? (
                    <Circle
                      key={`pr${i}`}
                      cx={geo.e1[i]?.x}
                      cy={geo.e1[i]?.y}
                      r={5}
                      fill={colors.record}
                      stroke={colors.surface}
                      strokeWidth={2}
                    />
                  ) : null,
                )}
              </Svg>
              <Animated.View pointerEvents="none" style={[styles.cursorLine, lineStyle]}>
                <Svg width={1} height={PLOT_H}>
                  <Line
                    x1={0.5}
                    x2={0.5}
                    y1={0}
                    y2={PLOT_H}
                    stroke={colors.textDisabled}
                    strokeWidth={stroke.hairline}
                    strokeDasharray={[3, 3]}
                  />
                </Svg>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.whiteRing, whiteDot]}>
                <View style={styles.whiteDot} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.halo, accentDot]}>
                <View style={styles.haloGap}>
                  <View style={styles.accentDot} />
                </View>
              </Animated.View>
            </>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.footnote}>
        <View style={styles.prDot} />
        <Text variant="caption" color="textTertiary" style={styles.footnoteText}>
          PR de e1RM · e1RM estimado con Epley: kg × (1 + reps/30)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    marginHorizontal: space.md,
    marginTop: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readDate: { minWidth: 58 },
  readSep: { width: 1, height: 26, backgroundColor: colors.border },
  readCol: { flex: 1, gap: 1 },
  prTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm / 2,
    backgroundColor: colors.record,
  },
  chart: { height: HEIGHT, marginTop: 6 },
  cursorLine: { position: 'absolute', left: 0, top: PAD.top, width: 1, height: PLOT_H },
  whiteRing: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: WHITE_R * 2,
    height: WHITE_R * 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  halo: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: HALO_R * 2,
    height: HALO_R * 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accentHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloGap: {
    width: ACCENT + 6,
    height: ACCENT + 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    width: ACCENT,
    height: ACCENT,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  footnote: {
    marginHorizontal: space.md,
    marginTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.record },
  footnoteText: { flex: 1 },
});
