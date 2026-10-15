import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAsync, type AsyncState } from './useAsync';

/**
 * Like `useAsync`, but also reloads every time the screen regains focus
 * (e.g. coming back from a child screen). Show a spinner only when `loading && data === undefined`.
 */
export function useFocusAsync<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const state = useAsync(fn, deps);
  const { reload } = state;
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return state;
}
