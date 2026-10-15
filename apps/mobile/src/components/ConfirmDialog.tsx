import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, elevation, motion, radii, space, stroke } from '../theme';

import { Button } from './Button';
import { Icon } from './icons';
import { Text } from './Text';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm action as destructive (danger button with icon). */
  destructive?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/** Set by <ConfirmHost/> while mounted. */
let present: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

/** Resolves true when the user confirms, false on cancel/dismiss. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (present) return present(options);
  // Fallback when no host is mounted (should not happen in the app).
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: options.cancelLabel ?? 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel ?? 'Confirmar',
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const FROM_SCALE = 0.94;

/** Mount once at the root: renders the confirm dialog (e2, radius xxl, scrim) for `confirm()`. */
export function ConfirmHost() {
  const reduced = useReducedMotion();
  const [pending, setPending] = useState<Pending | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    present = (options) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false);
          return { ...options, resolve };
        });
      });
    return () => {
      present = null;
    };
  }, []);

  useEffect(() => {
    if (pending) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: reduced ? motion.reduced : motion.base,
        easing: motion.easeOut,
      });
    }
  }, [pending, progress, reduced]);

  const close = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value);
        return null;
      });
    },
    [setPending],
  );

  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const card = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduced ? 1 : FROM_SCALE + (1 - FROM_SCALE) * progress.value }],
  }));

  if (!pending) return null;
  const destructive = pending.destructive ?? false;
  return (
    <Modal transparent animationType="none" visible onRequestClose={() => close(false)}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Cerrar"
            onPress={() => close(false)}
          />
        </Animated.View>
        <Animated.View style={[styles.card, card]} accessibilityViewIsModal>
          <View style={[styles.iconTile, destructive ? styles.iconDanger : styles.iconAccent]}>
            <Icon
              name={destructive ? 'trash' : 'warning'}
              size={22}
              color={destructive ? 'danger' : 'accent'}
            />
          </View>
          <Text variant="displayM" accessibilityRole="header">
            {pending.title}
          </Text>
          {pending.message ? (
            <Text variant="bodyS" color="textBody">
              {pending.message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                title={pending.cancelLabel ?? 'Cancelar'}
                variant="secondary"
                onPress={() => close(false)}
              />
            </View>
            <View style={styles.action}>
              <Button
                title={pending.confirmLabel ?? 'Confirmar'}
                variant={destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: space.xl },
  scrim: { backgroundColor: colors.scrim },
  card: {
    gap: space.sm + 2,
    padding: space.xl,
    borderRadius: radii.xxl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.borderRaised,
    ...elevation.floating,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.lg - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: colors.dangerMuted },
  iconAccent: { backgroundColor: colors.accentMuted },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  action: { flex: 1 },
});
