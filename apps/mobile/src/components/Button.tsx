import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, hit, radii, space, stroke, type ColorToken } from '../theme';

import { Icon, type IconName } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  /** lg = 56pt CTA, md = 52pt, sm = 44pt compact. */
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Leading icon. Danger buttons default to a trash icon (danger never goes without one). */
  icon?: IconName;
  /** Spoken label when the visible title is not descriptive (e.g. "⋯"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = { sm: hit.min, md: hit.row, lg: hit.cta } as const;
const RADIUS = { sm: radii.md, md: radii.lg, lg: radii.lg } as const;
const LABEL = { sm: 'buttonS', md: 'buttonM', lg: 'button' } as const;

const FG: Record<Variant, ColorToken> = {
  primary: 'onAccent',
  secondary: 'textPrimary',
  ghost: 'textBody',
  outline: 'accent',
  danger: 'onAccent',
};

function background(variant: Variant, pressed: boolean, inactive: boolean) {
  if (inactive && (variant === 'primary' || variant === 'danger')) return colors.surfaceRaised;
  if (variant === 'primary') return pressed ? colors.accentPressed : colors.accent;
  if (variant === 'danger') return colors.danger;
  return colors.transparent;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const fg: ColorToken =
    inactive && (variant === 'primary' || variant === 'danger') ? 'textDisabled' : FG[variant];
  const leading = icon ?? (variant === 'danger' ? 'trash' : undefined);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={(pressed) => [
        styles.base,
        {
          minHeight: HEIGHT[size],
          borderRadius: RADIUS[size],
          backgroundColor: background(variant, pressed, inactive),
        },
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        fullWidth && styles.full,
        inactive && variant !== 'primary' && variant !== 'danger' && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[fg]} />
      ) : (
        <>
          {leading ? <Icon name={leading} size={size === 'sm' ? 18 : 20} color={fg} /> : null}
          <Text variant={LABEL[size]} color={fg} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minWidth: hit.min,
    paddingHorizontal: space.xl,
  },
  secondary: { borderWidth: stroke.regular, borderColor: colors.borderStrong },
  outline: { borderWidth: stroke.regular, borderColor: colors.accent },
  full: { alignSelf: 'stretch' },
  inactive: { opacity: 0.5 },
});
