import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '../theme';

import { Text } from './Text';

export interface BarItem {
  label: string;
  value: number;
  valueLabel: string;
}

/** Compact vertical bar chart built with plain Views. */
export function BarList({
  items,
  color = colors.accent,
  pastColor = colors.borderStrong,
}: {
  items: BarItem[];
  /** Color of the current (last) bar. */
  color?: string;
  /** Color of the earlier bars. */
  pastColor?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={styles.row}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.col}>
          <Text variant="label" style={styles.value} numberOfLines={1}>
            {item.value > 0 ? item.valueLabel : ''}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  height: `${(item.value / max) * 100}%`,
                  backgroundColor: idx === items.length - 1 ? color : pastColor,
                },
              ]}
            />
          </View>
          <Text variant="caption">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, height: 130 },
  col: { flex: 1, alignItems: 'center', gap: space.xs },
  value: { textAlign: 'center' },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', minHeight: 2, borderRadius: radii.sm },
});
