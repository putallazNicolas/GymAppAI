import { StyleSheet } from 'react-native';

import { colors, hit, radii, space } from '../theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text variant="buttonS" color={selected ? 'onAccent' : 'textBody'}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: hit.min,
    justifyContent: 'center',
    paddingHorizontal: space.lg - 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
});
