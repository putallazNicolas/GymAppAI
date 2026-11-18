/**
 * Kalk brand colors (design/S5 §4, L1 §3). Literals on purpose: they never reference `colors.*`,
 * because the UI palette may change and the brand does not. Only for the logo and the splash.
 */
export const brand = {
  /** The K and the wordmark ("hueso"). Same value as colors.textPrimary today, but fixed. */
  bone: '#F4F4F2',
  /** Lower arm of the K ("naranja señal"). */
  signal: '#FF5B1F',
  /** Icon tile and splash background. */
  ink: '#0B0B0C',
  /** Tile of the lockup on a dark surface (marketing LEEME §1). */
  tileRaised: '#1C1C1F',
} as const;
