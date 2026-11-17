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
  /** Editable screen title (design/P06c), 28. */
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, ...upper },
  numXL: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 40, ...tnum },
  numL: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 32, ...tnum },
  numM: { fontFamily: fonts.displayBold, fontSize: 25, lineHeight: 28, ...tnum },
  /** Row values (history best set), 22. */
  numRow: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 24, ...tnum },
  /** Chart readout values, 20. */
  numRead: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 22, ...tnum },
  /** Small numbers: deltas, bar values, counts, 14. */
  numXS: { fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 16, ...tnum },
  /** Chart axis labels (Y and week dates), 12. */
  numAxis: { fontFamily: fonts.displayMedium, fontSize: 12, lineHeight: 14, ...tnum },
  numS: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 20, ...tnum },
  /** Exercise name inside a selector card, 24. */
  displayName: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 26, ...upper },
  /** kg / lb segmented pill labels, 22. */
  unitPill: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, ...tnum },
  /** Rest readout of the RestPicker (design/P07d), 76. */
  numHero: { fontFamily: fonts.display, fontSize: 76, lineHeight: 70, ...tnum },
  /** Planned-exercise summary in the closed row ("4 × 8-10"), 26. */
  numSummary: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, ...tnum },
  /** Set number in a PlannedSetRow, 24. */
  numSet: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, ...tnum },
  /** Preset chip figures (reps presets), 19. */
  chipNum: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 22, ...tnum },
  /** "-15 s" / "+15 s" buttons and the small AMRAP-sized reps, 20. */
  stepLabel: { fontFamily: fonts.display, fontSize: 20, lineHeight: 22, ...tnum },
  /** Long preset ("Sin descanso") in the rest grid, 17. */
  presetSmall: { fontFamily: fonts.display, fontSize: 17, lineHeight: 20, ...upper },
  /** Non-numeric reps inside a PlannedSetRow ("8-10", "AMRAP"), 18. */
  repsText: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, ...tnum },
  /** Row title of a planned exercise, 20. */
  rowName: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 22, ...upper },
  /** Sheet title (design/P07c), 27 ExtraBold. */
  sheetTitle: { fontFamily: fonts.display, fontSize: 27, lineHeight: 28, ...upper },
  /** "POR SERIE" tag, 11. */
  tag: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    ...upper,
  },
  /** "PROPIO" tag of custom exercises (design/P08c), 10. */
  tagSmall: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1,
    ...upper,
  },
  /** Labels of the compact segmented control, 14. */
  segmentM: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18 },
  numD: { fontFamily: fonts.display, fontSize: 28, lineHeight: 28, ...tnum },
  numMd: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 22, ...tnum },
  badge: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, ...tnum },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  bodyM: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20 },
  bodyMSemi: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
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
  /** Range segmented control labels (1M, 3M…), 13. */
  segment: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16 },
  /** SVG month labels on the chart X axis, 11. */
  axisX: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14 },
  tab: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14 },
} as const;

/**
 * TextInput variants: same font, size and case as the display/body tokens but NO lineHeight.
 * On iOS a single-line TextInput with lineHeight < fontSize (or tight, while editing) clips
 * glyphs that rise above the line box (accents on capitals). Pair with `inputHeight`.
 */
const { lineHeight: _dl, ...displayLInput } = type.displayL;
const { lineHeight: _tl, ...titleInput } = type.title;
const { lineHeight: _nm, ...numMInput } = type.numM;
const { lineHeight: _bd, ...bodyInput } = type.body;
const { lineHeight: _bs, ...bodySInput } = type.bodyS;
/** Reps inputs of the edit sheet (44 for "same", 26 / 18 inside a per-set row). */
const repsBigInput = { fontFamily: fonts.display, fontSize: 44, ...tnum, ...upper };
const repsSetInput = { fontFamily: fonts.display, fontSize: 26, ...tnum, ...upper };
const repsSetTextInput = { fontFamily: fonts.display, fontSize: 18, ...tnum, ...upper };
export const inputType = {
  displayLInput,
  titleInput,
  numMInput,
  bodyInput,
  bodySInput,
  repsBigInput,
  repsSetInput,
  repsSetTextInput,
} as const;

/** Explicit input heights that fit the glyphs (about fontSize x 1.3). */
export const inputHeight = {
  displayL: 50,
  title: 38,
  numM: 34,
  body: 24,
  bodyS: 20,
  repsBig: 58,
  repsSet: 36,
} as const;

export type TypeToken = keyof typeof type;
