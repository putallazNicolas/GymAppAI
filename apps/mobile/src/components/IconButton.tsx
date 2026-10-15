import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, touch } from '../theme';

import { Text } from './Text';

interface IconButtonProps {
  /** Glyph shown inside, e.g. "↑", "↓", "✕", "⋯". */
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/** 48pt square text-glyph button for row actions. */
export function IconButton({
  glyph,
  label,
  onPress,
  disabled = false,
  danger = false,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text variant="title" color={danger ? 'danger' : 'text'}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
});
