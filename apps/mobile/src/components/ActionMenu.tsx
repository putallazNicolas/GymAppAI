import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, touch } from '../theme';

import { Text } from './Text';

export interface ActionMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}

/** Cross-platform bottom sheet menu (Alert supports too few buttons on Android). */
export function ActionMenu({ visible, title, items, onClose }: ActionMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar menú">
        <View style={styles.sheet}>
          {title ? (
            <Text variant="caption" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              style={styles.item}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <Text variant="label" color={item.destructive ? 'danger' : 'text'}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" style={styles.item} onPress={onClose}>
            <Text variant="label" color="textMuted">
              Cancelar
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  item: { minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
});
