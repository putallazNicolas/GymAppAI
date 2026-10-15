import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, type ColorToken } from '../../theme';

/**
 * Stroke icons built from the design's SVG paths (24x24 viewBox, round caps and joins).
 * The check uses a thicker stroke, per design/S1.
 */
const ICONS = {
  today: (
    <>
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  routines: (
    <>
      <Path d="M9 6h11M9 12h11M9 18h11" />
      <Path d="M4 6h1M4 12h1M4 18h1" />
    </>
  ),
  progress: (
    <>
      <Path d="M3 20h18" />
      <Path d="M4 16l5-5 4 3 7-8" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  play: <Path d="M7 4.5v15l13-7.5z" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  add: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  chevron: <Path d="M9 6l6 6-6 6" />,
  chevronLeft: <Path d="M15 6l-6 6 6 6" />,
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  up: <Path d="M12 19V5M6 11l6-6 6 6" />,
  down: <Path d="M12 5v14M6 13l6 6 6-6" />,
  more: (
    <>
      <Circle cx="5" cy="12" r="1" />
      <Circle cx="12" cy="12" r="1" />
      <Circle cx="19" cy="12" r="1" />
    </>
  ),
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  phone: (
    <>
      <Rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <Path d="M11 18.5h2" />
    </>
  ),
  warning: (
    <>
      <Path d="M12 3.5l9.5 16.5h-19z" />
      <Path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  radio: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  copy: (
    <>
      <Rect x="8" y="8" width="12" height="12" rx="2" />
      <Path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  archive: (
    <>
      <Rect x="3" y="4" width="18" height="5" rx="1" />
      <Path d="M5 9v10h14V9M10 13h4" />
    </>
  ),
  pencil: <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  empty: (
    <>
      <Path d="M3 13l2.5-7.5h13L21 13" />
      <Path d="M3 13v6.5h18V13h-5.5l-1 2.5h-5L8.5 13z" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

const DEFAULT_STROKE = 2;
const THICK_STROKE = 3;

interface IconProps {
  name: IconName;
  size?: number;
  /** A theme color token. */
  color?: ColorToken;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = 'textPrimary', strokeWidth }: IconProps) {
  const sw = strokeWidth ?? (name === 'check' ? THICK_STROKE : DEFAULT_STROKE);
  const tint = colors[color];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'play' ? tint : 'none'}
      stroke={tint}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ICONS[name]}
    </Svg>
  );
}
