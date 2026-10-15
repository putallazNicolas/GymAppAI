import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, hit, radii, space, stroke } from '../theme';

import { Icon } from './icons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface RoutineCardProps {
  name: string;
  dayCount: number;
  isActive: boolean;
  /** Second line: day names (active) or "Último uso: …". */
  subtitle: string;
  menuOpen: boolean;
  onPress: () => void;
  /** Receives the window rect of the "more" button so the menu can hang from it. */
  onMenu: (rect: { x: number; y: number; width: number; height: number }) => void;
}

const COUNT_WIDTH = 72;
/** The "more" button sits just left of the day-count column (design/P05). */
const MENU_RIGHT = COUNT_WIDTH + space.sm + 2;

/** Routine card of "Mis rutinas" (design/P05): info, big day count, and a per-card menu button. */
export function RoutineCard({
  name,
  dayCount,
  isActive,
  subtitle,
  menuOpen,
  onPress,
  onMenu,
}: RoutineCardProps) {
  const menuRef = useRef<View>(null);
  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${dayCount} ${dayCount === 1 ? 'día' : 'días'}${isActive ? ', activa' : ''}`}
        onPress={onPress}
        scaleTo={0.985}
        style={[styles.card, isActive && styles.cardActive]}
      >
        <View style={[styles.info, isActive && styles.infoActive]}>
          {isActive ? (
            <View style={styles.activeRow}>
              <View style={styles.dot} />
              <Text variant="label" color="accent">
                Activa
              </Text>
            </View>
          ) : null}
          <Text variant="displayM" numberOfLines={2}>
            {name}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.count}>
          <Text variant="displayL" color={isActive ? 'textPrimary' : 'textBody'}>
            {dayCount}
          </Text>
          <Text variant="label">{dayCount === 1 ? 'Día' : 'Días'}</Text>
        </View>
      </PressableScale>
      <Pressable
        ref={menuRef}
        accessibilityRole="button"
        accessibilityLabel={`Opciones de ${name}`}
        accessibilityState={{ expanded: menuOpen }}
        hitSlop={4}
        onPress={() =>
          menuRef.current?.measureInWindow((x, y, width, height) => onMenu({ x, y, width, height }))
        }
        style={[styles.menuBtn, menuOpen && styles.menuBtnOpen]}
      >
        <Icon name="more" size={22} color={menuOpen ? 'textPrimary' : 'textSecondary'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 96,
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  cardActive: { minHeight: 108, borderColor: colors.accentBorder },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: space.sm - 2,
    paddingVertical: space.md + 2,
    paddingLeft: space.lg,
    paddingRight: hit.min + space.xs,
  },
  infoActive: { justifyContent: 'flex-start' },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm - 2 },
  dot: { width: 7, height: 7, borderRadius: radii.pill, backgroundColor: colors.accent },
  count: {
    width: COUNT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: stroke.hairline,
    borderLeftColor: colors.border,
  },
  menuBtn: {
    position: 'absolute',
    top: space.sm - 2,
    right: MENU_RIGHT,
    width: hit.min,
    height: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  menuBtnOpen: { backgroundColor: colors.border },
});
