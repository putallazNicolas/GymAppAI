import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { formatNumber } from '../lib/format';
import { colors, spacing, typography } from '../theme';

import { Text } from './Text';

export interface ChartSeries {
  label: string;
  color: string;
  /** One value per x position, already in the display unit. */
  values: number[];
}

interface LineChartProps {
  series: ChartSeries[];
  /** One label per x position; only the first and last are drawn. */
  xLabels: string[];
  unitLabel: string;
  height?: number;
}

const PAD = { left: 44, right: 12, top: 12, bottom: 24 };
const GRID_LINES = 4;

/** Minimal multi-series line chart on react-native-svg. */
export function LineChart({ series, xLabels, unitLabel, height = 200 }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.values);
  const n = xLabels.length;

  let body = null;
  if (width > 0 && all.length > 0) {
    const rawMin = Math.min(...all);
    const rawMax = Math.max(...all);
    const span = rawMax - rawMin || Math.max(1, rawMax * 0.1);
    const min = Math.max(0, rawMin - span * 0.1);
    const max = rawMax + span * 0.1;
    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

    body = (
      <Svg width={width} height={height}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const v = min + ((max - min) * i) / GRID_LINES;
          return (
            <G key={i}>
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 6}
                y={y(v) + 4}
                fill={colors.textMuted}
                fontSize={typography.size.xs}
                textAnchor="end"
              >
                {formatNumber(v, 0)}
              </SvgText>
            </G>
          );
        })}
        {xLabels.length > 0 ? (
          <SvgText
            x={x(0)}
            y={height - 6}
            fill={colors.textMuted}
            fontSize={typography.size.xs}
            textAnchor={n <= 1 ? 'middle' : 'start'}
          >
            {xLabels[0]}
          </SvgText>
        ) : null}
        {n > 1 ? (
          <SvgText
            x={x(n - 1)}
            y={height - 6}
            fill={colors.textMuted}
            fontSize={typography.size.xs}
            textAnchor="end"
          >
            {xLabels[n - 1]}
          </SvgText>
        ) : null}
        {series.map((s) => (
          <G key={s.label}>
            {s.values.length > 1 ? (
              <Polyline
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
              />
            ) : null}
            {s.values.map((v, i) => (
              <Circle key={i} cx={x(i)} cy={y(v)} r={4} fill={s.color} />
            ))}
          </G>
        ))}
      </Svg>
    );
  }

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={`Gráfico de progreso en ${unitLabel}`}
      >
        {body}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text variant="caption">
              {s.label} ({unitLabel})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: 6 },
});
