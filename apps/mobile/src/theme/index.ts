import { colors } from './colors';
import { elevation, hit, motion, radii, space, stroke } from './spacing';
import { fonts, type } from './typography';

export * from './colors';
export * from './spacing';
export * from './typography';

export const theme = { colors, fonts, type, space, radii, hit, stroke, elevation, motion };
export type Theme = typeof theme;

/** The app is dark-only in V1, so the theme is a constant; the hook keeps call sites future-proof. */
export function useTheme(): Theme {
  return theme;
}
