import { StyleSheet } from 'react-native';

import { colors, hit, radii, type ColorToken } from '../theme';

import { Icon, type IconName } from './icons';
import { PressableScale } from './PressableScale';

/** Text glyphs accepted by the existing API, mapped to stroke icons (no emoji). */
const GLYPHS: Record<string, IconName> = {
  '↑': 'up',
  '↓': 'down',
  '✕': 'close',
  '⋯': 'more',
  '+': 'add',
  '−': 'minus',
};

interface IconButtonProps {
  /** Glyph shown inside, e.g. "↑", "↓", "✕", "⋯" (rendered as an SVG icon), or an icon name. */
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** No background (rows of the builder screens). */
  bare?: boolean;
  /** 40pt wide instead of 44 (paired ↑/↓ buttons). Height stays 44. */
  narrow?: boolean;
  /** Icon color when not danger. Default textPrimary. */
  tint?: ColorToken;
}

/** 44pt square icon button for row actions. */
export function IconButton({
  glyph,
  label,
  onPress,
  disabled = false,
  danger = false,
  bare = false,
  narrow = false,
  tint = 'textPrimary',
}: IconButtonProps) {
  const name = GLYPHS[glyph] ?? (glyph as IconName);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        bare && styles.bare,
        narrow && styles.narrow,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={name} size={20} color={danger ? 'danger' : tint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  bare: { backgroundColor: colors.transparent },
  narrow: { width: hit.min - 4 },
  disabled: { opacity: 0.3 },
});
