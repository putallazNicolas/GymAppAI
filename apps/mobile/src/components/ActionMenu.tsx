import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, hit, motion, radii, space, stroke, type ColorToken } from '../theme';

import { Icon, type IconName } from './icons';
import { Text } from './Text';

export interface ActionMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: IconName;
  disabled?: boolean;
  /** Tint for the icon only (e.g. accent for "Activar"). */
  iconColor?: ColorToken;
  /** Draws a divider above this item. */
  separatorBefore?: boolean;
}

/** Where a popover menu hangs: `top` from the window top, `right` from the window's right edge. */
export interface MenuAnchor {
  top: number;
  right: number;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  items: ActionMenuItem[];
  onClose: () => void;
  /** Anchors the menu to a point (scales from its top-right corner). Default: under the header. */
  anchor?: MenuAnchor;
}

const FROM_SCALE = 0.92;
const MENU_WIDTH = 220;
/** The menu opens below the top-right "more" button of the screen header. */
const ANCHOR_OFFSET = hit.cta;

/** Popover menu (e2) that grows from the top-right corner. */
export function ActionMenu({ visible, title, items, onClose, anchor }: ActionMenuProps) {
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
    if (anchor) {
      // Anchored menus grow from their top-right corner (design/P05: scale 0.92 → 1, slight drop).
      return {
        opacity: progress.value,
        transformOrigin: 'top right',
        transform: [{ translateY: reduced ? 0 : -6 * (1 - progress.value) }, { scale }],
      };
    }
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
          style={[
            styles.menu,
            anchor
              ? { top: anchor.top, right: anchor.right }
              : { top: insets.top + ANCHOR_OFFSET, right: space.lg },
            animated,
          ]}
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
              <View key={item.label}>
                {item.separatorBefore ? <View style={styles.separator} /> : null}
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{ disabled: item.disabled }}
                  disabled={item.disabled}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                >
                  {icon ? (
                    <Icon
                      name={icon}
                      size={20}
                      color={item.disabled ? tint : (item.iconColor ?? tint)}
                    />
                  ) : null}
                  <Text variant="bodyStrong" color={tint}>
                    {item.label}
                  </Text>
                </Pressable>
              </View>
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
  separator: {
    height: stroke.hairline,
    marginVertical: space.xs,
    marginHorizontal: space.sm,
    backgroundColor: colors.border,
  },
  itemPressed: { backgroundColor: colors.border },
});
