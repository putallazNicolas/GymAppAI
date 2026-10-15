import { Easing } from 'react-native-reanimated';

/** Design tokens: space, radii, hit sizes, elevation and motion (design/S3). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, pill: 999 } as const;
export const hit = { min: 44, row: 52, rowFocus: 56, cta: 56 } as const;

/** Border widths. */
export const stroke = { hairline: 1, regular: 1.5, thick: 2 } as const;

export const elevation = {
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
} as const;

export const motion = {
  press: 90,
  fast: 160,
  base: 220,
  slow: 320,
  draw: 900,
  /** Reduced-motion fade duration. */
  reduced: 150,
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  springPop: { damping: 12, stiffness: 300, mass: 0.6 },
  springSoft: { damping: 18, stiffness: 220 },
} as const;
