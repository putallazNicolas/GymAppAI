import { StyleSheet, View } from 'react-native';

import { colors, hit, radii, space, stroke } from '../theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface PresetChipsProps {
  presets: readonly string[];
  /** The preset that matches the current value, if any. */
  value: string;
  onPick: (preset: string) => void;
  accessibilityLabel: string;
}

/** Reps presets as pill chips in figures (Barlow Condensed), design/P07c. */
export function PresetChips({ presets, value, onPick, accessibilityLabel }: PresetChipsProps) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.wrap}
    >
      {presets.map((p) => {
        const on = p === value;
        return (
          <PressableScale
            key={p}
            accessibilityRole="radio"
            accessibilityLabel={p}
            accessibilityState={{ checked: on }}
            onPress={() => onPick(p)}
            style={[styles.chip, on && styles.on]}
          >
            <Text variant="chipNum" color={on ? 'onAccent' : 'textBody'}>
              {p}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  chip: {
    height: hit.min,
    minWidth: 52,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  on: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
});
