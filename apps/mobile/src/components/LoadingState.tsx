import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, space } from '../theme';

import { Text } from './Text';

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <View style={styles.root} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.accent} />
      <Text variant="caption">{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
});
