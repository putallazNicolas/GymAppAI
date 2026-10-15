import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Static style, or a function of the pressed state (for pressed colors). */
  style?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  /** Scale while pressed (design/S3: 0.97). */
  scaleTo?: number;
}

const PRESSED_SCALE = 0.97;

/** Pressable with the shared 90 ms press scale. Reduced motion: no scale. */
export function PressableScale({
  style,
  scaleTo = PRESSED_SCALE,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        if (!reduced) scale.set(withTiming(scaleTo, { duration: motion.press }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        if (!reduced) scale.set(withTiming(1, { duration: motion.press }));
        onPressOut?.(e);
      }}
      style={[typeof style === 'function' ? style(pressed) : style, animated]}
    />
  );
}
