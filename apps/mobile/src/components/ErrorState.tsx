import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';

import { Button } from './Button';
import { Icon } from './Icon';
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
      <Icon name="warning" size={48} color="warning" />
      <Text style={styles.center}>{message}</Text>
      {onRetry ? (
        <Button title="Reintentar" onPress={onRetry} variant="secondary" size="lg" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  center: { textAlign: 'center' },
});
