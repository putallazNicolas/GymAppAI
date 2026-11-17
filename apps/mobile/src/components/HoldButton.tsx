import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '../lib/haptics';

import { PressableScale } from './PressableScale';

/** Wait before the first repeat, then the repeat interval (design/S4 "Stepper con repetición"). */
const REPEAT_DELAY_MS = 400;
const REPEAT_EVERY_MS = 90;

/**
 * Press-and-hold repeat: one step on press-in, after 400 ms a step every 90 ms until press-out.
 * `step` returns false when it could not apply (a limit): the repeat stops and a warning haptic
 * fires once. Every applied step fires a selection haptic.
 */
export function useHoldRepeat(step: () => boolean) {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (delay.current) clearTimeout(delay.current);
    if (timer.current) clearInterval(timer.current);
    delay.current = null;
    timer.current = null;
  }, []);

  const tick = useCallback(() => {
    if (stepRef.current()) {
      haptics.selection();
      return true;
    }
    return false;
  }, []);

  const start = useCallback(() => {
    stop();
    if (!tick()) return;
    delay.current = setTimeout(() => {
      timer.current = setInterval(() => {
        if (!tick()) {
          stop();
          haptics.warning();
        }
      }, REPEAT_EVERY_MS);
    }, REPEAT_DELAY_MS);
  }, [stop, tick]);

  const isHolding = useCallback(() => delay.current !== null || timer.current !== null, []);

  useEffect(() => stop, [stop]);
  return { start, stop, isHolding, once: tick };
}

interface HoldButtonProps {
  step: () => boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** A button that applies `step` on press and keeps applying it while held. */
export function HoldButton({
  step,
  disabled = false,
  accessibilityLabel,
  style,
  children,
}: HoldButtonProps) {
  const { start, stop, isHolding, once } = useHoldRepeat(step);
  // Some platforms (web with an instant click) deliver the press without a press-in.
  const started = useRef(false);
  // Reaching the limit disables the button mid-hold, so its press-out may never arrive: stop the
  // repeat here and warn once.
  useEffect(() => {
    if (!disabled || !isHolding()) return;
    stop();
    haptics.warning();
  }, [disabled, isHolding, stop]);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        started.current = true;
        start();
      }}
      onPress={() => {
        if (!started.current) once();
        started.current = false;
      }}
      onPressOut={stop}
      style={[style, disabled && styles.disabled]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.3 },
});
