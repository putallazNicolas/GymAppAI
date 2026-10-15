import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '../../components';
import { colors, typography } from '../../theme';

function tabIcon(name: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color }: { color: ColorValue }) => <Icon name={name} size={26} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64 },
        tabBarLabelStyle: { fontSize: typography.size.xs, fontWeight: typography.weight.medium },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy', tabBarIcon: tabIcon('today') }} />
      <Tabs.Screen name="rutinas" options={{ title: 'Rutinas', tabBarIcon: tabIcon('routines') }} />
      <Tabs.Screen
        name="progreso"
        options={{ title: 'Progreso', tabBarIcon: tabIcon('progress') }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: tabIcon('profile') }} />
    </Tabs>
  );
}
