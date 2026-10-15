import { theme, type Theme } from './tokens';

export * from './tokens';

/** The app is dark-only in V1, so the theme is a constant; the hook keeps call sites future-proof. */
export function useTheme(): Theme {
  return theme;
}
