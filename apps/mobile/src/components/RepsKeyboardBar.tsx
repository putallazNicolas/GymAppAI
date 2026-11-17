import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  View,
  type KeyboardEvent,
  type ViewInstance,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { colors, hit, motion, radii, space, stroke } from '../theme';

import { PressableScale } from './PressableScale';
import type { RepsBar } from './RepsInput';
import { Text } from './Text';

/** Time a blurred field waits before hiding the bar ("Siguiente" refocuses right away). */
const HIDE_DELAY_MS = 150;
/** Gap kept between the focused field and the top of the bar. */
const FIELD_GAP = space.sm;
const DEFAULT_BAR_HEIGHT = hit.min + space.sm;

interface KeyboardFrame {
  /** Top of the keyboard, in window coordinates. */
  screenY: number;
  height: number;
  duration: number;
}

interface RepsKeyboardBarProps {
  bar: RepsBar;
  /**
   * The focused field is hidden behind the bar by `dy` points: scroll the content up by that much.
   * React Native's ScrollView only brings the field above the keyboard, not above this bar.
   */
  onObscured?: (dy: number) => void;
}

/**
 * Bar on top of the iOS number pad (design/P07c2 C): "AMRAP", "–" and "Siguiente". It replaces
 * `InputAccessoryView`, deprecated in React Native 0.88 and not attached to the keyboard inside
 * native sheets. Render it as the last child of a screen root with `flex: 1`; it positions itself
 * above the keyboard while a reps field of `bar` is focused. Android and web render nothing (their
 * reps fields use the keyboard with punctuation).
 */
export function RepsKeyboardBar({ bar, onObscured }: RepsKeyboardBarProps) {
  const enabled = Platform.OS === 'ios';
  const reduced = useReducedMotion();
  const active = useSyncExternalStore(bar.subscribe, bar.getActive);
  const [prevActive, setPrevActive] = useState(active);
  /** The field that was just blurred, kept for a moment (see HIDE_DELAY_MS). */
  const [lingering, setLingering] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState<KeyboardFrame | null>(null);
  const [anchorY, setAnchorY] = useState<number | null>(null);
  const [barHeight, setBarHeight] = useState(DEFAULT_BAR_HEIGHT);
  const anchorRef = useRef<ViewInstance>(null);
  const obscured = useRef(onObscured);
  useEffect(() => {
    obscured.current = onObscured;
  });

  // The fields use the number pad only while this bar exists.
  useEffect(() => {
    if (!enabled) return;
    bar.attachBar(true);
    return () => bar.attachBar(false);
  }, [bar, enabled]);

  // Show at once on focus; hide a moment after a blur so moving to the next field never flickers.
  if (active !== prevActive) {
    setPrevActive(active);
    setLingering(active === null ? prevActive : null);
  }
  useEffect(() => {
    if (lingering === null) return;
    const id = setTimeout(() => setLingering(null), HIDE_DELAY_MS);
    return () => clearTimeout(id);
  }, [lingering]);
  const shownActive = active ?? lingering;

  useEffect(() => {
    if (!enabled) return;
    const measureAnchor = () =>
      anchorRef.current?.measureInWindow((_x, y) => setAnchorY(y > 0 ? y : null));
    const onFrame = (e: KeyboardEvent) => {
      measureAnchor();
      setKeyboard({
        screenY: e.endCoordinates.screenY,
        height: e.endCoordinates.height,
        duration: e.duration ?? 0,
      });
    };
    const subs = [
      Keyboard.addListener('keyboardWillShow', onFrame),
      Keyboard.addListener('keyboardWillChangeFrame', onFrame),
      Keyboard.addListener('keyboardWillHide', () => setKeyboard(null)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [enabled]);

  const visible = enabled && keyboard !== null && keyboard.height > 0 && shownActive !== null;

  // After the keyboard settles (or focus moves with it open), keep the focused field above the bar.
  useEffect(() => {
    if (!visible || keyboard === null) return;
    const id = setTimeout(() => {
      bar.measureActive((_x, y, _w, h) => {
        const barTop = keyboard.screenY - barHeight;
        const dy = y + h + FIELD_GAP - barTop;
        if (dy > 0) obscured.current?.(dy);
      });
    }, keyboard.duration + 20);
    return () => clearTimeout(id);
  }, [bar, visible, keyboard, barHeight, shownActive]);

  // Distance from the bottom of the screen root to the top of the keyboard. Falls back to the
  // keyboard height (sheet bottom = screen bottom) until the root has been measured.
  const lift =
    keyboard === null
      ? 0
      : anchorY === null
        ? keyboard.height
        : Math.max(0, anchorY - keyboard.screenY);

  return (
    <>
      <View ref={anchorRef} collapsable={false} pointerEvents="none" style={styles.anchor} />
      {visible ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(motion.fast)}
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={[styles.bar, { bottom: lift }]}
          accessibilityLabel="Atajos del teclado de reps"
        >
          <BarButton label="AMRAP" onPress={bar.amrap} />
          <BarButton label="–" accessibilityLabel="Guion para rangos" onPress={bar.dash} />
          <View style={styles.spacer} />
          <BarButton label="Siguiente" accent onPress={bar.next} />
        </Animated.View>
      ) : null}
    </>
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

const styles = StyleSheet.create({
  /** Zero-height marker at the bottom of the screen root: its window Y is the root's bottom. */
  anchor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 0 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: DEFAULT_BAR_HEIGHT,
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
