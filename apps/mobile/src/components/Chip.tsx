import { StyleSheet } from 'react-native';

import { colors, hit, radii, space } from '../theme';

import { Icon, type IconName } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Small leading icon (e.g. the "Propios" filter). */
  icon?: IconName;
}

export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const tint = selected ? 'onAccent' : 'textBody';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, icon ? styles.withIcon : null, selected && styles.selected]}
    >
      {icon ? <Icon name={icon} size={14} color={tint} strokeWidth={2.4} /> : null}
      <Text variant="buttonS" color={tint}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: hit.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.lg - 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  withIcon: { paddingHorizontal: space.md },
  selected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
});
