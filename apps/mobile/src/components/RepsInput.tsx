import { normalizeReps } from '@gym/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputInstance,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { colors, hit, inputHeight, inputType, radii, space, stroke } from '../theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

const ACCESSORY_ID = 'repsKeyboardBar';
const MAX_REPS_LENGTH = 9;

/**
 * Reps are text ("8-10", "AMRAP"). iOS: the number pad plus an accessory bar with AMRAP, "–" and
 * Siguiente. Elsewhere (Android, web) InputAccessoryView does not exist, so the keyboard with
 * punctuation is used instead (it has the "-"); AMRAP comes from the preset chips.
 */
const KEYBOARD: KeyboardTypeOptions =
  Platform.OS === 'ios' ? 'number-pad' : 'numbers-and-punctuation';

interface RepsFieldApi {
  focus: () => void;
  blur: () => void;
  /** Replaces the draft with `text`. */
  replace: (text: string) => void;
  /** Appends `text` to the draft. */
  append: (text: string) => void;
}

export interface RepsBar {
  register: (index: number, api: RepsFieldApi | null) => void;
  setActive: (index: number | null) => void;
  amrap: () => void;
  dash: () => void;
  next: () => void;
}

/** Tracks the focused reps field so the keyboard bar can act on it ("Siguiente" focuses the next). */
export function useRepsBar(): RepsBar {
  const fields = useRef(new Map<number, RepsFieldApi>());
  const active = useRef<number | null>(null);
  return useMemo<RepsBar>(
    () => ({
      register: (index, api) => {
        if (api) fields.current.set(index, api);
        else fields.current.delete(index);
      },
      setActive: (index) => {
        active.current = index;
      },
      amrap: () => {
        const field = active.current === null ? undefined : fields.current.get(active.current);
        field?.replace('AMRAP');
        field?.blur();
      },
      dash: () => {
        const field = active.current === null ? undefined : fields.current.get(active.current);
        field?.append('-');
      },
      next: () => {
        if (active.current === null) return;
        const following = fields.current.get(active.current + 1);
        if (following) following.focus();
        else fields.current.get(active.current)?.blur();
      },
    }),
    [],
  );
}

/** Bar above the number pad (iOS only): "AMRAP", "–" and "Siguiente". */
export function NumericAccessoryBar({ bar }: { bar: RepsBar }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={ACCESSORY_ID} backgroundColor={colors.surfaceRaised}>
      <View style={styles.bar}>
        <BarButton label="AMRAP" onPress={bar.amrap} />
        <BarButton label="–" accessibilityLabel="Guion para rangos" onPress={bar.dash} />
        <View style={styles.spacer} />
        <BarButton label="Siguiente" accent onPress={bar.next} />
      </View>
    </InputAccessoryView>
  );
}

function BarButton({
  label,
  onPress,
  accent = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.barBtn, accent && styles.barBtnAccent]}
    >
      <Text variant="buttonS" color={accent ? 'onAccent' : 'textPrimary'}>
        {label}
      </Text>
    </PressableScale>
  );
}

interface RepsInputProps {
  /** The persisted value. */
  value: string;
  /** Called on blur with the normalized, non-empty, changed value. */
  onCommit: (next: string) => void;
  /** Position among the reps fields of the sheet (for "Siguiente"). */
  index: number;
  bar: RepsBar;
  /** `big` = the 44 pt field of "Igual en todas"; `set` = the 26 pt field of a per-set row. */
  size: 'big' | 'set';
  accessibilityLabel: string;
  placeholder?: string;
  textAlign?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
}

/**
 * Text input for reps. Keeps a local draft while focused; on blur it normalizes (trim, uppercase,
 * "8 - 10" -> "8-10"), reverts to the previous value when empty and commits when changed.
 */
export function RepsInput({
  value,
  onCommit,
  index,
  bar,
  size,
  accessibilityLabel,
  placeholder,
  textAlign = 'left',
  style,
}: RepsInputProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const focused = useRef(false);
  const draftRef = useRef(value);
  const [draft, setDraftState] = useState(value);

  function setDraft(text: string) {
    draftRef.current = text;
    setDraftState(text);
  }

  // Follow the persisted value (presets, steppers, quick fills) unless the user is typing.
  useEffect(() => {
    if (!focused.current) {
      draftRef.current = value;
      setDraftState(value);
    }
  }, [value]);

  useEffect(() => {
    bar.register(index, {
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      replace: (text) => setDraft(text),
      append: (text) => setDraft(`${draftRef.current}${text}`.slice(0, MAX_REPS_LENGTH)),
    });
    return () => bar.register(index, null);
  }, [bar, index]);

  function commit() {
    focused.current = false;
    const next = normalizeReps(draftRef.current);
    if (!next) {
      setDraft(value);
      return;
    }
    setDraft(next);
    if (next !== value) onCommit(next);
  }

  const numeric = /^[0-9\s-]*$/.test(draft);
  const font =
    size === 'big'
      ? inputType.repsBigInput
      : numeric
        ? inputType.repsSetInput
        : inputType.repsSetTextInput;

  return (
    <TextInput
      ref={inputRef}
      value={draft}
      onChangeText={setDraft}
      onFocus={() => {
        focused.current = true;
        bar.setActive(index);
      }}
      onBlur={commit}
      keyboardType={KEYBOARD}
      inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={MAX_REPS_LENGTH}
      selectTextOnFocus
      placeholder={placeholder}
      placeholderTextColor={colors.textDisabled}
      selectionColor={colors.accent}
      accessibilityLabel={accessibilityLabel}
      style={[font, styles.input, size === 'big' ? styles.big : styles.set, { textAlign }, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: { padding: 0, color: colors.textPrimary, textAlignVertical: 'center' },
  big: { height: inputHeight.repsBig },
  set: { height: inputHeight.repsSet },
  bar: {
    minHeight: hit.min + space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: stroke.hairline,
    borderTopColor: colors.border,
  },
  spacer: { flex: 1 },
  barBtn: {
    minHeight: hit.min,
    minWidth: hit.min + space.lg,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  barBtnAccent: { backgroundColor: colors.accent },
});
