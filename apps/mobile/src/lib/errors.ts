import { Alert } from 'react-native';

/** Runs a mutation; on failure shows an alert and resolves undefined. */
export async function attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    Alert.alert('No se pudo completar', e instanceof Error ? e.message : 'Probá de nuevo.');
    return undefined;
  }
}
