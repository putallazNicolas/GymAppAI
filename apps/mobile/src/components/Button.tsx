import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing, touch, typography } from '../theme';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BG = {
  primary: colors.primary,
  secondary: colors.surfaceElevated,
  ghost: 'transparent',
  danger: colors.danger,
} as const;

const FG = {
  primary: colors.onPrimary,
  secondary: colors.text,
  ghost: colors.primary,
  danger: colors.onPrimary,
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === 'lg' ? touch.primary : touch.min, backgroundColor: BG[variant] },
        variant === 'secondary' && styles.bordered,
        fullWidth && styles.full,
        inactive && styles.inactive,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text
          style={{
            color: FG[variant],
            fontSize: size === 'lg' ? typography.size.lg : typography.size.md,
            fontWeight: typography.weight.semibold,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
  },
  bordered: { borderWidth: 1, borderColor: colors.border },
  full: { alignSelf: 'stretch' },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
