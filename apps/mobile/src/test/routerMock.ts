import { jest } from '@jest/globals';
import { useEffect } from 'react';

/** Route params the mocked `useLocalSearchParams` returns. Set before rendering a route. */
export const routeParams: { current: Record<string, string> } = { current: {} };

export const router = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
};

/** Minimal expo-router for screen tests: params, a router spy and focus effects run on mount. */
export const expoRouterMock = {
  useLocalSearchParams: () => routeParams.current,
  useRouter: () => router,
  // Callers pass a memoized callback (useCallback), so this runs once, like a first focus.
  useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
};
