import { StyleSheet } from 'react-native';

import { colors, hit, radii } from '../theme';

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
}

/** 44pt square icon button for row actions. */
export function IconButton({
  glyph,
  label,
  onPress,
  disabled = false,
  danger = false,
}: IconButtonProps) {
  const name = GLYPHS[glyph] ?? (glyph as IconName);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.btn, disabled && styles.disabled]}
    >
      <Icon name={name} size={20} color={danger ? 'danger' : 'textPrimary'} />
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
  disabled: { opacity: 0.3 },
});
