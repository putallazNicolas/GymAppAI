import { normalizeReps } from '@gym/core';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputInstance,
  type TextStyle,
} from 'react-native';

import { colors, inputHeight, inputType } from '../theme';

const MAX_REPS_LENGTH = 9;

/**
 * Reps are text ("8-10", "AMRAP"). On iOS the number pad is used only while a `RepsKeyboardBar`
 * is mounted (it adds AMRAP, "–" and Siguiente on top of the keyboard). Without the bar, and on
 * Android and web, the keyboard with punctuation is used: it has the "-" so a range can always be
 * typed; AMRAP comes from the preset chips.
 */
function keyboardFor(hasBar: boolean): KeyboardTypeOptions {
  return Platform.OS === 'ios' && hasBar ? 'number-pad' : 'numbers-and-punctuation';
}

interface RepsFieldApi {
  focus: () => void;
  blur: () => void;
  /** Replaces the draft with `text`. */
  replace: (text: string) => void;
  /** Appends `text` to the draft. */
  append: (text: string) => void;
  /** Frame of the field in window coordinates. */
  measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void;
}

export interface RepsBar {
  register: (index: number, api: RepsFieldApi | null) => void;
  /** Called by the fields: on focus with their index, on blur with null. */
  setActive: (index: number | null, from?: number) => void;
  getActive: () => number | null;
  /** True while a `RepsKeyboardBar` is mounted for these fields. */
  hasBar: () => boolean;
  attachBar: (attached: boolean) => void;
  /** Re-renders subscribers when the focused field or the bar changes. */
  subscribe: (listener: () => void) => () => void;
  measureActive: (cb: (x: number, y: number, width: number, height: number) => void) => void;
  amrap: () => void;
  dash: () => void;
  next: () => void;
}

/** Tracks the reps fields of a screen so the keyboard bar can act on the focused one. */
export function useRepsBar(): RepsBar {
  const fields = useRef(new Map<number, RepsFieldApi>());
  const active = useRef<number | null>(null);
  const attached = useRef(false);
  const listeners = useRef(new Set<() => void>());
  return useMemo<RepsBar>(() => {
    const notify = () => listeners.current.forEach((l) => l());
    const current = () =>
      active.current === null ? undefined : fields.current.get(active.current);
    return {
      register: (index, api) => {
        if (api) fields.current.set(index, api);
        else fields.current.delete(index);
      },
      setActive: (index, from) => {
        // A blur only clears its own field ("Siguiente" may have focused the next one already).
        if (index === null && from !== undefined && active.current !== from) return;
        if (active.current === index) return;
        active.current = index;
        notify();
      },
      getActive: () => active.current,
      hasBar: () => attached.current,
      attachBar: (value) => {
        attached.current = value;
        notify();
      },
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
      measureActive: (cb) => current()?.measureInWindow(cb),
      amrap: () => {
        const field = current();
        field?.replace('AMRAP');
        field?.blur();
      },
      dash: () => current()?.append('-'),
      next: () => {
        if (active.current === null) return;
        const following = fields.current.get(active.current + 1);
        if (following) following.focus();
        else current()?.blur();
      },
    };
  }, []);
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
      measureInWindow: (cb) => inputRef.current?.measureInWindow(cb),
    });
    return () => bar.register(index, null);
  }, [bar, index]);

  const hasBar = useSyncExternalStore(bar.subscribe, bar.hasBar);

  function commit() {
    focused.current = false;
    bar.setActive(null, index);
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
      keyboardType={keyboardFor(hasBar)}
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
});
