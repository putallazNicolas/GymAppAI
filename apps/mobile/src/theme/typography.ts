/** Design tokens: fonts and type scale (design/S3). One family per weight; never fontWeight. */
export const fonts = {
  display: 'BarlowCondensed_800ExtraBold',
  displayBold: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_500Medium',
  bodyRegular: 'Barlow_400Regular',
  body: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
  bodyHeavy: 'Barlow_800ExtraBold',
} as const;

const tnum = { fontVariant: ['tabular-nums' as const] };
const upper = { textTransform: 'uppercase' as const };

export const type = {
  displayXL: { fontFamily: fonts.display, fontSize: 46, lineHeight: 42, ...upper },
  displayL: { fontFamily: fonts.display, fontSize: 38, lineHeight: 36, ...upper },
  displayM: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 28, ...upper },
  displayS: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 24, ...upper },
  numXL: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 40, ...tnum },
  numL: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 32, ...tnum },
  numM: { fontFamily: fonts.displayBold, fontSize: 25, lineHeight: 28, ...tnum },
  numS: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 20, ...tnum },
  badge: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, ...tnum },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  bodyS: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    ...upper,
  },
  button: { fontFamily: fonts.bodyHeavy, fontSize: 18, lineHeight: 22 },
  buttonM: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 20 },
  buttonS: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  tab: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14 },
} as const;

export type TypeToken = keyof typeof type;
