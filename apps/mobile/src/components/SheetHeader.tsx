import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, hit, space, stroke } from '../theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface SheetHeaderProps {
  /** Small uppercase line ("Ejercicio 2 de 5 · Piernas"). */
  eyebrow: string;
  /** Large title; omit when the eyebrow plus `subtitle` is enough. */
  title?: string;
  subtitle?: string;
  /** Closes the sheet. Defaults to `router.back()`. */
  onDone?: () => void;
  bordered?: boolean;
}

/** Header of the sheet routes (design/P07c, P07d): eyebrow, title and "Listo". */
export function SheetHeader({
  eyebrow,
  title,
  subtitle,
  onDone,
  bordered = false,
}: SheetHeaderProps) {
  const router = useRouter();
  return (
    <View style={[styles.root, bordered && styles.bordered]}>
      <View style={styles.text}>
        <Text variant="label" numberOfLines={1}>
          {eyebrow}
        </Text>
        {title ? (
          <Text variant="sheetTitle" numberOfLines={2} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Listo"
        onPress={onDone ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.done}
      >
        <Text variant="bodyStrong" color="accent">
          Listo
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.sm + 2,
    paddingLeft: space.lg,
    paddingRight: space.sm,
  },
  bordered: { borderBottomWidth: stroke.hairline, borderBottomColor: colors.border },
  text: { flex: 1, minWidth: 0, gap: 2 },
  done: { height: hit.min, paddingHorizontal: space.sm + 2, justifyContent: 'center' },
});
