import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '@gym/core';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, elevation, motion, radii, space, stroke } from '../theme';

import { Button } from './Button';
import { Chip } from './Chip';
import { Icon } from './icons';
import { Text } from './Text';
import { TextField } from './TextField';

interface CreateExerciseDialogProps {
  /** Mount it only while open. Prefills the name (e.g. the search text that found nothing). */
  initialName?: string;
  onCancel: () => void;
  /** Resolves with an error message to show, or undefined when the exercise was created. */
  onCreate: (name: string, group: MuscleGroup) => Promise<string | undefined>;
}

const FROM_SCALE = 0.94;

/** "Crear ejercicio" dialog (e2, radius xxl, scrim): name + muscle group. */
export function CreateExerciseDialog({
  initialName = '',
  onCancel,
  onCreate,
}: CreateExerciseDialogProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<MuscleGroup | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduced ? motion.reduced : motion.base,
      easing: motion.easeOut,
    });
  }, [progress, reduced]);

  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const card = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduced ? 1 : FROM_SCALE + (1 - FROM_SCALE) * progress.value }],
  }));

  async function submit() {
    if (!name.trim()) return setError('Poné un nombre.');
    if (!group) return setError('Elegí un grupo muscular.');
    setError(undefined);
    setBusy(true);
    const failure = await onCreate(name.trim(), group);
    setBusy(false);
    if (failure) setError(failure);
  }

  return (
    <Modal transparent animationType="none" visible onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Cerrar"
            onPress={onCancel}
          />
        </Animated.View>
        <Animated.View style={[styles.card, card]} accessibilityViewIsModal>
          <View style={styles.iconTile}>
            <Icon name="add" size={22} color="accent" strokeWidth={2.6} />
          </View>
          <Text variant="displayM" accessibilityRole="header">
            Crear ejercicio
          </Text>
          <Text variant="bodyS" color="textBody">
            ¿No está en la lista? Creá uno propio.
          </Text>
          <TextField
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Ej: Remo con mancuerna"
            autoCapitalize="sentences"
            returnKeyType="done"
          />
          <Text variant="label">Grupo muscular</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {MUSCLE_GROUPS.map((g) => (
              <Chip
                key={g}
                label={MUSCLE_GROUP_LABELS[g]}
                selected={group === g}
                onPress={() => setGroup(g)}
              />
            ))}
          </ScrollView>
          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <Icon name="warning" size={16} color="danger" />
              <Text variant="caption" color="danger">
                {error}
              </Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button title="Cancelar" variant="secondary" onPress={onCancel} />
            </View>
            <View style={styles.action}>
              <Button title="Crear" loading={busy} onPress={submit} />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.accentMuted,
  },
  chips: { gap: space.sm },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  action: { flex: 1 },
});
