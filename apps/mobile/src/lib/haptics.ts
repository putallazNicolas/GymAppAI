import * as Haptics from 'expo-haptics';

/** Fire-and-forget haptics: never throws, never blocks (unsupported devices just ignore them). */
function safe(run: () => Promise<void>): void {
  run().catch(() => undefined);
}

export const haptics = {
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => safe(() => Haptics.selectionAsync()),
};
