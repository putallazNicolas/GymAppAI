import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const TAG = 'active-workout';

/**
 * Keeps the screen on while the component is mounted (Entrenando). Skipped on web, which is only
 * the preview build: the browser Wake Lock API rejects when released before it finishes activating.
 */
export function useScreenAwake(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(TAG).catch(() => undefined);
    };
  }, []);
}
