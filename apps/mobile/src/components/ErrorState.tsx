import { StyleSheet, View } from 'react-native';

import { space } from '../theme';

import { Button } from './Button';
import { Icon } from './icons';
import { Text } from './Text';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Algo salió mal. Probá de nuevo.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.root}>
      <Icon name="warning" size={48} color="danger" />
      <Text style={styles.center}>{message}</Text>
      {onRetry ? <Button title="Reintentar" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xl,
  },
  center: { textAlign: 'center' },
});
