import type { ColorValue } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors, type ColorToken } from '../theme';

const ICONS = {
  today: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center' },
  routines: { ios: 'list.bullet.rectangle', android: 'list_alt' },
  progress: { ios: 'chart.line.uptrend.xyaxis', android: 'show_chart' },
  profile: { ios: 'person.crop.circle', android: 'person' },
  check: { ios: 'checkmark', android: 'check' },
  add: { ios: 'plus', android: 'add' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  search: { ios: 'magnifyingglass', android: 'search' },
  empty: { ios: 'tray', android: 'inventory_2' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
} as const satisfies Record<string, { ios: string; android: string }>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 24, color = 'text' }: IconProps) {
  const def = ICONS[name];
  const tint = typeof color === 'string' && color in colors ? colors[color as ColorToken] : color;
  const symbol = { ios: def.ios, android: def.android } as SymbolViewProps['name'];
  return (
    <SymbolView name={symbol} size={size} tintColor={tint} style={{ width: size, height: size }} />
  );
}
