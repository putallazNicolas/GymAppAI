import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type, type ColorToken, type TypeToken } from '../theme';

const DEFAULT_COLOR: Partial<Record<TypeToken, ColorToken>> = {
  label: 'textSecondary',
  caption: 'textSecondary',
  bodyS: 'textBody',
};

interface TextProps extends RNTextProps {
  /** A token from the type scale (design/S3). */
  variant?: TypeToken;
  color?: ColorToken;
}

export function Text({ variant = 'body', color, style, ...rest }: TextProps) {
  const tint = colors[color ?? DEFAULT_COLOR[variant] ?? 'textPrimary'];
  return <RNText {...rest} style={[type[variant], { color: tint }, style]} />;
}
