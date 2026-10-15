import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, hit, space, stroke } from '../theme';

import { Icon, type IconName } from './icons';
import { Text } from './Text';

const TAB_ICONS: Record<string, IconName> = {
  index: 'today',
  rutinas: 'routines',
  progreso: 'progress',
  perfil: 'profile',
};

const BAR_HEIGHT = hit.cta;
const INDICATOR_WIDTH = 28;

/** Bottom tab bar per P01: accent indicator bar, accent icon + primary label when active. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const title = descriptors[route.key]?.options.title;
        const label = typeof title === 'string' ? title : route.name;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
          >
            {focused ? <View style={styles.indicator} /> : null}
            <Icon
              name={TAB_ICONS[route.name] ?? 'today'}
              size={24}
              color={focused ? 'accent' : 'textTertiary'}
            />
            <Text variant="tab" color={focused ? 'textPrimary' : 'textTertiary'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: stroke.hairline,
    borderTopColor: colors.divider,
  },
  tab: {
    flex: 1,
    minHeight: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs - 1,
  },
  indicator: {
    position: 'absolute',
    top: -stroke.hairline,
    width: INDICATOR_WIDTH,
    height: stroke.thick,
    backgroundColor: colors.accent,
  },
});
