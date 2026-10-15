import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, hit, motion, radii, space, stroke } from '../theme';

import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface ActionMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: IconName;
  disabled?: boolean;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}

const FROM_SCALE = 0.92;
const MENU_WIDTH = 220;
/** The menu opens below the top-right "more" button of the screen header. */
const ANCHOR_OFFSET = hit.cta;

/** Popover menu (e2) that grows from the top-right corner. */
export function ActionMenu({ visible, title, items, onClose }: ActionMenuProps) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduced ? motion.reduced : motion.base - 40,
      easing: motion.easeOut,
    });
  }, [visible, progress, reduced]);

  const animated = useAnimatedStyle(() => {
    const scale = reduced ? 1 : FROM_SCALE + (1 - FROM_SCALE) * progress.value;
    // Scale from the top-right corner: re-anchor the center-based transform by half the shrink.
    const shiftX = reduced ? 0 : (MENU_WIDTH * (1 - scale)) / 2;
    return {
      opacity: progress.value,
      transform: [{ translateX: shiftX }, { scale }],
    };
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar menú">
        <Animated.View
          style={[styles.menu, { top: insets.top + ANCHOR_OFFSET }, animated]}
          accessibilityRole="menu"
        >
          {title ? (
            <Text variant="label" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {items.map((item) => {
            const icon = item.icon ?? (item.destructive ? 'trash' : undefined);
            const tint = item.disabled
              ? 'textDisabled'
              : item.destructive
                ? 'danger'
                : 'textPrimary';
            return (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                accessibilityState={{ disabled: item.disabled }}
                disabled={item.disabled}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                {icon ? <Icon name={icon} size={20} color={tint} /> : null}
                <Text variant="bodyStrong" color={tint}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    right: space.lg,
    width: MENU_WIDTH,
    padding: space.xs + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.borderRaised,
    ...elevation.floating,
  },
  title: { paddingHorizontal: space.md, paddingVertical: space.sm },
  item: {
    minHeight: hit.row - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
  },
  itemPressed: { backgroundColor: colors.border },
});
