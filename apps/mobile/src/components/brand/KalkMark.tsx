import Svg, { Polygon, Rect } from 'react-native-svg';

import { brand } from '../../theme';

/** Smallest size the mark may be drawn at (design/L1 §6). */
export const MARK_MIN_SIZE = 16;
/** Corner radius of the icon tile, on the 100 × 100 grid (iOS-like preview). */
const TILE_RADIUS = 22.4;

/** Body of the K, on the 100 × 100 grid, with marketing's translate(-1, 0) already applied. */
export const K_BODY = '25,24 37,24 37,44 57,24 73,24 45,52 37,60 37,76 25,76';
/** Lower arm of the K. */
export const K_ARM = '47,54 76,76 57,76 39,62';

interface KalkMarkProps {
  /** Side in points; never below 16. */
  size?: number;
  /** Draw the ink tile behind the K (the app icon). */
  tile?: boolean;
  /** 'mono' = one ink, bone. 'color' = orange arm (icon, splash, "Acerca de Kalk" only). */
  tone?: 'mono' | 'color';
}

/** The K of Kalk (design/S5 §3), identical to the app icon. Not interactive. */
export function KalkMark({ size = 56, tile = false, tone = 'color' }: KalkMarkProps) {
  const s = Math.max(size, MARK_MIN_SIZE);
  return (
    <Svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Kalk"
    >
      {tile ? <Rect width={100} height={100} rx={TILE_RADIUS} fill={brand.ink} /> : null}
      <Polygon fill={brand.bone} points={K_BODY} />
      <Polygon fill={tone === 'color' ? brand.signal : brand.bone} points={K_ARM} />
    </Svg>
  );
}
