import Svg, { Polygon } from 'react-native-svg';

import { brand } from '../../theme';

/** Smallest height the wordmark may be drawn at on screen (design/L1 §4). */
export const WORDMARK_MIN_HEIGHT = 16;
const WIDTH = 232;
const HEIGHT = 52;

interface KalkWordmarkProps {
  /** Height in points; never below 16. */
  height?: number;
  /**
   * 'mono' = one ink, bone (default). 'color' = orange arm. 'muted' = one ink, gray: only the
   * signature at the foot of Hoy (design/L4 C).
   */
  tone?: 'mono' | 'color' | 'muted';
}

/**
 * The KΛLK wordmark (design/S5 §3), drawn: never write "KALK" with a font. viewBox 232 × 52 (the
 * marketing package v1.0 says 230 and clips the tip of the last K). Not interactive: never put it
 * inside a Pressable.
 */
export function KalkWordmark({ height = WORDMARK_MIN_HEIGHT, tone = 'mono' }: KalkWordmarkProps) {
  const h = Math.max(height, WORDMARK_MIN_HEIGHT);
  const ink = tone === 'muted' ? brand.muted : brand.bone;
  const arm = tone === 'color' ? brand.signal : ink;
  return (
    <Svg
      width={(h * WIDTH) / HEIGHT}
      height={h}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Kalk"
    >
      <Polygon fill={ink} points="0,0 12,0 12,20 32,0 48,0 20,28 12,36 12,52 0,52" />
      <Polygon fill={arm} points="22,30 51,52 32,52 14,38" />
      <Polygon fill={ink} points="64,52 82,0 98,0 116,52 102,52 90,17 78,52" />
      <Polygon fill={ink} points="130,0 142,0 142,40 166,40 166,52 130,52" />
      <Polygon fill={ink} points="180,0 192,0 192,20 212,0 228,0 200,28 192,36 192,52 180,52" />
      <Polygon fill={ink} points="202,30 231,52 212,52 194,38" />
    </Svg>
  );
}
