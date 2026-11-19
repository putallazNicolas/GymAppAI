import Svg, { Polygon, Rect } from 'react-native-svg';

import { brand } from '../../theme';

/** Smallest size the mark may be drawn at (design/L1 §6). */
export const MARK_MIN_SIZE = 16;
/** Box of the K alone on the 100 grid (design/L4 B): for the K without its tile, inline in text. */
const CROPPED_VIEWBOX = { x: 25, y: 24, w: 51, h: 52 };
/** Corner radius of the icon tile, on the 100 × 100 grid (iOS-like preview). */
const TILE_RADIUS = 22.4;

/** Body of the K, on the 100 × 100 grid, with marketing's translate(-1, 0) already applied. */
export const K_BODY = '25,24 37,24 37,44 57,24 73,24 45,52 37,60 37,76 25,76';
/** Lower arm of the K. */
export const K_ARM = '47,54 76,76 57,76 39,62';

interface KalkMarkProps {
  /** Side in points (height when `cropped`); never below 16. */
  size?: number;
  /** Frame the K alone (no tile, no margins): `size` is then the height of the K. */
  cropped?: boolean;
  /** Draw the ink tile behind the K (the app icon). */
  tile?: boolean;
  /** 'mono' = one ink, bone. 'color' = orange arm (icon, splash, "Acerca de Kalk" only). */
  tone?: 'mono' | 'color';
  /** 1-unit outline around the tile, so it reads on a dark surface (design/L4, "Acerca de Kalk"). */
  outline?: string;
}

/** The K of Kalk (design/S5 §3), identical to the app icon. Not interactive. */
export function KalkMark({
  size = 56,
  tile = false,
  tone = 'color',
  outline,
  cropped = false,
}: KalkMarkProps) {
  const s = Math.max(size, MARK_MIN_SIZE);
  const box = cropped ? CROPPED_VIEWBOX : { x: 0, y: 0, w: 100, h: 100 };
  return (
    <Svg
      width={(s * box.w) / box.h}
      height={s}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Kalk"
    >
      {tile && !cropped ? (
        <Rect width={100} height={100} rx={TILE_RADIUS} fill={brand.ink} />
      ) : null}
      {tile && outline && !cropped ? (
        <Rect
          x={0.5}
          y={0.5}
          width={99}
          height={99}
          rx={TILE_RADIUS - 0.4}
          fill="none"
          stroke={outline}
        />
      ) : null}
      <Polygon fill={brand.bone} points={K_BODY} />
      <Polygon fill={tone === 'color' ? brand.signal : brand.bone} points={K_ARM} />
    </Svg>
  );
}
