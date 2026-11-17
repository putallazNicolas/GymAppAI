import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type Exercise } from '@gym/core';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, hit, radii, space, stroke } from '../theme';

import { Icon } from './icons';
import { SelectCheck } from './SelectCheck';
import { Text } from './Text';

/** Highlight of a just-saved exercise: accentHighlight fades to accentFaint in 1.2 s (design/S4). */
export const HIGHLIGHT_MS = 1200;

export interface MenuRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExercisePickRowProps {
  exercise: Exercise;
  selected: boolean;
  inDay: boolean;
  highlighted: boolean;
  onToggle: () => void;
  /** Custom exercises only: opens the ⋯ menu, anchored to this rect (window coordinates). */
  onMenu: (rect: MenuRect) => void;
  menuOpen: boolean;
}

/** Row of Elegir ejercicio (design/P08, P08c): name, PROPIO tag, group · equipment, ⋯ and check. */
export function ExercisePickRow({
  exercise,
  selected,
  inDay,
  highlighted,
  onToggle,
  onMenu,
  menuOpen,
}: ExercisePickRowProps) {
  const reduced = useReducedMotion();
  const menuRef = useRef<ViewInstance>(null);
  const progress = useSharedValue(highlighted ? 0 : 1);

  useEffect(() => {
    if (!highlighted) return;
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: HIGHLIGHT_MS });
  }, [highlighted, reduced, progress]);

  const flash = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.accentHighlight, colors.accentFaint],
    ),
  }));

  const extra = exercise.secondaryMuscleGroups?.length ?? 0;
  const detail = [
    MUSCLE_GROUP_LABELS[exercise.muscleGroup],
    exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null,
    extra > 0 ? `+${extra} ${extra === 1 ? 'grupo' : 'grupos'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View style={[styles.row, selected && styles.rowOn, highlighted && !reduced && flash]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${exercise.name}, ${detail}${exercise.isCustom ? ', propio' : ''}`}
        accessibilityState={{ checked: selected }}
        onPress={onToggle}
        style={styles.main}
      >
        <View style={styles.text}>
          <View style={styles.nameRow}>
            <Text variant="bodyStrong" style={styles.name} numberOfLines={2}>
              {exercise.name}
            </Text>
            {exercise.isCustom ? (
              <View style={styles.own}>
                <Text variant="tagSmall" color="accent">
                  Propio
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="caption">{detail}</Text>
        </View>
        {inDay ? (
          <View style={styles.tag}>
            <Text variant="caption" color="textSecondary">
              En el día
            </Text>
          </View>
        ) : null}
      </Pressable>
      {exercise.isCustom ? (
        <View ref={menuRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Opciones de ${exercise.name}`}
            accessibilityState={{ expanded: menuOpen }}
            onPress={() =>
              menuRef.current?.measureInWindow((x, y, width, height) =>
                onMenu({ x, y, width, height }),
              )
            }
            style={[styles.menuBtn, menuOpen && styles.menuBtnOpen]}
          >
            <Icon name="more" size={20} color={menuOpen ? 'textPrimary' : 'textSecondary'} />
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onPress={onToggle}
        style={styles.check}
      >
        <SelectCheck selected={selected} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.md,
    paddingRight: space.xs + 2,
    borderBottomWidth: stroke.hairline,
    borderBottomColor: colors.divider,
    borderRadius: radii.md,
  },
  rowOn: { backgroundColor: colors.accentFaint },
  main: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  text: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flexShrink: 1 },
  own: {
    paddingVertical: 1,
    paddingHorizontal: space.sm - 2,
    borderRadius: radii.sm - 3,
    borderWidth: stroke.hairline,
    borderColor: colors.accent,
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm - 2,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  menuBtn: {
    width: hit.min,
    height: hit.min,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnOpen: { backgroundColor: colors.border },
  check: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
});
