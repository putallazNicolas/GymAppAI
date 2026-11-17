import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, hit, inputHeight, inputType, motion, radii, space, stroke } from '../theme';

import { Icon } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const MAX_LENGTH = 40;

/** On the web preview a mouse press would blur the input first; native touches never do. */
const keepFocusOnWeb = (
  Platform.OS === 'web'
    ? { onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault() }
    : {}
) as object;
const SHAKE_STEP = 50;
const SHAKE_DISTANCE = 6;

interface EditableTitleProps {
  /** Small uppercase label inside the box ("Nombre de la rutina", "Día 2 · nombre"). */
  label: string;
  /** The persisted name. */
  value: string;
  /**
   * Persists a valid, trimmed, changed name. Resolves true when it was saved; the parent should
   * resolve only after the new value has been reloaded so the title never flickers to the old one.
   */
  onCommit: (name: string) => Promise<boolean>;
  placeholder?: string;
  /** Helper shown while editing with an empty field (e.g. day name examples). */
  emptyHelper?: string;
  /** Focus on mount with the text selected (a freshly created day). */
  autoFocus?: boolean;
}

/** Trim and collapse inner whitespace. */
export function normalizeName(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Editable screen title (design/P06c): a visible field box with label and pencil. The input is
 * always mounted; the editing state comes from onFocus/onBlur. Saving happens exactly once per
 * editing session, in `onEndEditing` (fires for "done" and for leaving the field).
 */
export function EditableTitle({
  label,
  value,
  onCommit,
  placeholder = 'Nombre',
  emptyHelper,
  autoFocus = false,
}: EditableTitleProps) {
  const reduced = useReducedMotion();
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [prevValue, setPrevValue] = useState(value);

  // Latest values for callbacks that must never see a stale closure.
  const textRef = useRef(value);
  const valueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  const focusedRef = useRef(false);
  const sessionDone = useRef(true);
  useEffect(() => {
    valueRef.current = value;
    onCommitRef.current = onCommit;
  });

  const focus = useSharedValue(0);
  const shake = useSharedValue(0);

  // A reload that changes the persisted name clears the draft, unless the user is typing.
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setDraft(undefined);
  }

  const shown = draft ?? value;

  const boxStyle = useAnimatedStyle(() => {
    const width = interpolate(focus.get(), [0, 1], [stroke.hairline, stroke.thick]);
    const inset = stroke.thick - width;
    return {
      borderWidth: width,
      paddingTop: space.sm + 2 + inset,
      paddingBottom: space.sm + 2 + inset,
      paddingLeft: space.md + inset,
      paddingRight: space.xs + 2 + inset,
      borderColor: interpolateColor(focus.get(), [0, 1], [colors.border, colors.accent]),
      backgroundColor: interpolateColor(focus.get(), [0, 1], [colors.surface, colors.background]),
      transform: [{ translateX: shake.get() }],
    };
  });

  const commit = useCallback(async () => {
    if (sessionDone.current) return;
    sessionDone.current = true;
    const previous = valueRef.current;
    const name = normalizeName(textRef.current);
    if (!name) {
      setDraft(undefined);
      setError(`El nombre no puede quedar vacío. Dejamos «${previous}».`);
      if (!reduced)
        shake.set(
          withSequence(
            withTiming(-SHAKE_DISTANCE, { duration: SHAKE_STEP }),
            withTiming(SHAKE_DISTANCE, { duration: SHAKE_STEP * 2 }),
            withTiming(-SHAKE_DISTANCE, { duration: SHAKE_STEP * 2 }),
            withTiming(0, { duration: SHAKE_STEP }),
          ),
        );
      return;
    }
    if (name === previous) {
      setDraft(undefined);
      return;
    }
    setDraft(name); // keep the new name visible until the persisted value catches up
    const ok = await onCommitRef.current(name);
    if (!ok) setDraft(undefined);
  }, [reduced, shake]);

  // Leaving the screen while editing (e.g. the back button) must not lose the edit.
  useEffect(
    () => () => {
      if (focusedRef.current) void commit();
    },
    [commit],
  );

  const empty = focused && normalizeName(shown) === '';
  let helper = 'Tocá el nombre para cambiarlo';
  if (error && !focused) helper = error;
  else if (empty && emptyHelper) helper = emptyHelper;
  else if (focused) helper = 'Se guarda al tocar Listo o al salir del campo';

  function onFocus() {
    focusedRef.current = true;
    sessionDone.current = false;
    textRef.current = shown;
    setError(undefined);
    setFocused(true);
    focus.set(withTiming(1, { duration: reduced ? motion.reduced : motion.fast }));
  }

  function onBlur() {
    focusedRef.current = false;
    setFocused(false);
    focus.set(withTiming(0, { duration: reduced ? motion.reduced : motion.fast }));
    // react-native-web never emits onEndEditing; the commit guard keeps this to one save.
    if (Platform.OS === 'web') void commit();
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        // The whole box is a tap target; the pencil and the input inside handle their own taps.
      >
        <Animated.View style={[styles.box, boxStyle]}>
          <View style={styles.main}>
            <Text variant="label" color={focused ? 'accent' : 'textSecondary'}>
              {label}
            </Text>
            <View style={styles.fieldWrap}>
              <TextInput
                ref={inputRef}
                value={shown}
                onChangeText={(t) => {
                  textRef.current = t;
                  setDraft(t);
                }}
                onFocus={onFocus}
                onBlur={onBlur}
                onEndEditing={() => void commit()}
                placeholder={placeholder}
                placeholderTextColor={colors.textDisabled}
                selectionColor={colors.accent}
                accessibilityLabel={label}
                maxLength={MAX_LENGTH}
                returnKeyType="done"
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus={autoFocus}
                selectTextOnFocus={autoFocus}
                style={[styles.input, !focused && styles.inputIdle]}
              />
              {focused ? null : (
                <Text
                  variant="title"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  color={shown ? 'textPrimary' : 'textDisabled'}
                  style={styles.idleText}
                  pointerEvents="none"
                >
                  {shown || placeholder}
                </Text>
              )}
            </View>
          </View>
          {focused ? (
            <View style={styles.actions}>
              {shown.length > 0 ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Borrar nombre"
                  onPress={() => {
                    textRef.current = '';
                    setDraft('');
                  }}
                  style={styles.clear}
                  {...keepFocusOnWeb}
                >
                  <Icon name="close" size={18} color="textSecondary" />
                </PressableScale>
              ) : null}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Listo"
                onPress={() => inputRef.current?.blur()}
                style={styles.done}
              >
                <Text variant="buttonS" color="onAccent">
                  Listo
                </Text>
              </PressableScale>
            </View>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Editar ${label.toLowerCase()}`}
              onPress={() => inputRef.current?.focus()}
              style={styles.pencil}
            >
              <Icon name="pencil" size={20} color="accent" />
            </PressableScale>
          )}
        </Animated.View>
      </Pressable>
      <Animated.View
        key={helper}
        entering={FadeIn.duration(reduced ? motion.reduced : motion.fast)}
      >
        <Text
          variant="caption"
          color={error && !focused ? 'danger' : 'textSecondary'}
          accessibilityLiveRegion="polite"
        >
          {helper}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    borderRadius: radii.lg,
    borderColor: colors.border,
  },
  main: { flex: 1, minWidth: 0, gap: 2 },
  fieldWrap: { height: inputHeight.title, justifyContent: 'center' },
  input: {
    ...inputType.titleInput,
    height: inputHeight.title,
    padding: 0,
    color: colors.textPrimary,
  },
  /** Not editing: the input stays mounted (so it can take focus) but the ellipsis Text shows. */
  inputIdle: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  idleText: { position: 'absolute', left: 0, right: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  clear: {
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    height: hit.min,
    paddingHorizontal: space.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  pencil: {
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
});
