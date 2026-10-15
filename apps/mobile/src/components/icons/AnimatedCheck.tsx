import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, type ColorToken } from '../../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Approximate length of the check path (M5 12.5l4.5 4.5L19 7.5). */
const PATH_LENGTH = 20;

interface AnimatedCheckProps {
  /** 1 = not drawn, 0 = fully drawn (strokeDashoffset / length). */
  progress: SharedValue<number>;
  size?: number;
  color?: ColorToken;
  strokeWidth?: number;
}

/** The ✓ that draws itself (design/S3: strokeDashoffset 1 → 0). */
export function AnimatedCheck({
  progress,
  size = 20,
  color = 'textPrimary',
  strokeWidth = 3,
}: AnimatedCheckProps) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value * PATH_LENGTH,
  }));
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AnimatedPath
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={colors[color]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[PATH_LENGTH, PATH_LENGTH]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
