import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing, touch } from '../theme';

import { Icon } from './Icon';
import { Text } from './Text';

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Right-hand content (badge, value…). */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Show a chevron when pressable. Default true. */
  chevron?: boolean;
}

export function ListItem({ title, subtitle, trailing, onPress, chevron = true }: ListItemProps) {
  const content = (
    <>
      <View style={styles.texts}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && chevron ? <Icon name="chevron" size={18} color="textMuted" /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min + spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  texts: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.7 },
});
