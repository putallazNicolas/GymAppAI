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
  /**
   * The gray signature at the foot of Hoy (design/L4, option C). The only gray in the brand: an
   * exception approved by the owner (4.7:1 on ink). Same value as colors.textTertiary today.
   */
  muted: '#7C7C82',
} as const;
