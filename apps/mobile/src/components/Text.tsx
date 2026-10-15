import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorToken } from '../theme';

type Variant = 'body' | 'caption' | 'label' | 'title' | 'heading' | 'display';

const VARIANTS: Record<
  Variant,
  { fontSize: number; fontWeight: '400' | '500' | '600' | '700'; color: ColorToken }
> = {
  display: { fontSize: typography.size.display, fontWeight: '700', color: 'text' },
  heading: { fontSize: typography.size.xxl, fontWeight: '700', color: 'text' },
  title: { fontSize: typography.size.xl, fontWeight: '600', color: 'text' },
  label: { fontSize: typography.size.md, fontWeight: '600', color: 'text' },
  body: { fontSize: typography.size.md, fontWeight: '400', color: 'text' },
  caption: { fontSize: typography.size.sm, fontWeight: '400', color: 'textMuted' },
};

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorToken;
}

export function Text({ variant = 'body', color, style, ...rest }: TextProps) {
  const v = VARIANTS[variant];
  return (
    <RNText
      {...rest}
      style={[
        { fontSize: v.fontSize, fontWeight: v.fontWeight, color: colors[color ?? v.color] },
        style,
      ]}
    />
  );
}
