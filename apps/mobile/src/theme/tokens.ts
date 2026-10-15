/** Centralized design tokens. Never hard-code colors or sizes in screens/components. */
export const colors = {
  background: '#0B0F0D',
  surface: '#141A17',
  surfaceElevated: '#1B2420',
  border: '#26312C',
  text: '#F2F5F3',
  textMuted: '#8A9A92',
  primary: '#3B82F6',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  successSurface: '#12301D',
  onSuccess: '#06210F',
  danger: '#EF4444',
  dangerSurface: '#3A1517',
  warning: '#F59E0B',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/** Minimum touch targets in pt (SCREENS.md: >= 48, primary actions >= 56). */
export const touch = {
  min: 48,
  primary: 56,
  /** Compact check button inside a set row; still meets the 48pt minimum. */
  check: 48,
} as const;

export const theme = { colors, spacing, radii, typography, touch } as const;
export type Theme = typeof theme;
