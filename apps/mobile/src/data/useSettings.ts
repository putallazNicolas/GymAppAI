import { DEFAULT_SETTINGS, type Settings } from '@gym/core';

import { useRepositories } from './DataProvider';
import { useFocusAsync } from './useFocusAsync';

/** Current settings (defaults until loaded). */
export function useSettings(): Settings {
  const repos = useRepositories();
  const { data } = useFocusAsync(() => repos.settings.get());
  return data ?? DEFAULT_SETTINGS;
}
