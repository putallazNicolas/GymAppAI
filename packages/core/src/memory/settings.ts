import type { SettingsRepo } from '../contracts';
import { assertSettingsPatch, compact } from '../rules';
import { fullSettings, type MemoryContext } from './state';

export function createSettingsRepo({ state }: MemoryContext): SettingsRepo {
  return {
    async get() {
      return fullSettings(state.settings);
    },
    async update(patch) {
      assertSettingsPatch(patch);
      state.settings = { ...state.settings, ...compact(patch) };
      return fullSettings(state.settings);
    },
  };
}
