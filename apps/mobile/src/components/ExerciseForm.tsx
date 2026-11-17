import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISE_NAME_MAX_LENGTH,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '@gym/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRepositories } from '../data/DataProvider';
import { useAsync } from '../data/useAsync';
import { attempt } from '../lib/errors';
import { haptics } from '../lib/haptics';
import { colors, hit, inputHeight, inputType, motion, radii, space, stroke } from '../theme';

import { BackBar } from './BackBar';
import { Button } from './Button';
import { Chip } from './Chip';
import { ErrorState } from './ErrorState';
import { Icon } from './icons';
import { LoadingState } from './LoadingState';
import { PressableScale } from './PressableScale';
import { ScreenContainer } from './ScreenContainer';
import { Text } from './Text';

interface ExerciseFormProps {
  /** Present when editing a custom exercise; absent when creating. */
  exerciseId?: string;
  /** The day Elegir ejercicio was opened for; handed back so the picker can restore itself. */
  dayId?: string;
  /** Prefill for a new exercise (the search text that found nothing). */
  initialName?: string;
}

/**
 * CreateExerciseScreen (design/P08b): name + primary group are enough; "Más detalles" holds the
 * secondary groups, equipment and technique notes. Editing reuses it with the data loaded.
 * On save it goes back to Elegir ejercicio with the saved id, which the picker pre-selects.
 */
export function ExerciseForm({ exerciseId, dayId, initialName }: ExerciseFormProps) {
  const repos = useRepositories();
  const { data, loading, error, reload } = useAsync(
    () => (exerciseId ? repos.exercises.getById(exerciseId) : Promise.resolve(null)),
    [exerciseId],
  );

  if (exerciseId && loading && data === undefined) {
    return (
      <ScreenContainer>
        <BackBar label="Cancelar" noChevron />
        <LoadingState />
      </ScreenContainer>
    );
  }
  if (exerciseId && (error || !data || !data.isCustom || data.archived)) {
    return (
      <ScreenContainer>
        <BackBar label="Cancelar" noChevron />
        <ErrorState
          message={
            error
              ? 'No pudimos cargar el ejercicio.'
              : 'Este ejercicio no se puede editar: ya no está en tu lista.'
          }
          onRetry={error ? reload : undefined}
        />
      </ScreenContainer>
    );
  }
  return <FormBody exercise={data ?? undefined} dayId={dayId} initialName={initialName} />;
}

function FormBody({
  exercise,
  dayId,
  initialName,
}: {
  exercise?: Exercise;
  dayId?: string;
  initialName?: string;
}) {
  const repos = useRepositories();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const editing = exercise !== undefined;

  const [name, setName] = useState(exercise?.name ?? initialName ?? '');
  const [primary, setPrimary] = useState<MuscleGroup | undefined>(exercise?.muscleGroup);
  const [secondary, setSecondary] = useState<MuscleGroup[]>(exercise?.secondaryMuscleGroups ?? []);
  const [equipment, setEquipment] = useState<Equipment | undefined>(exercise?.equipment);
  const [notes, setNotes] = useState(exercise?.notes ?? '');
  const [open, setOpen] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const chevron = useSharedValue(0);
  useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, { duration: reduced ? motion.reduced : motion.base });
  }, [open, reduced, chevron]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  const trimmed = name.trim();
  const ready = trimmed.length > 0 && primary !== undefined;
  const secondaryShown = secondary.filter((g) => g !== primary);

  function pickPrimary(group: MuscleGroup) {
    haptics.selection();
    setPrimary(group);
    setSecondary((s) => s.filter((g) => g !== group));
  }

  function toggleSecondary(group: MuscleGroup) {
    haptics.selection();
    setSecondary((s) => (s.includes(group) ? s.filter((g) => g !== group) : [...s, group]));
  }

  function pickEquipment(item: Equipment) {
    haptics.selection();
    setEquipment((current) => (current === item ? undefined : item));
  }

  async function save() {
    if (!ready || primary === undefined || saving) return;
    setSaving(true);
    const common = { name: trimmed, muscleGroup: primary, secondaryMuscleGroups: secondaryShown };
    const saved = await attempt(() =>
      exercise
        ? // In a patch, null clears an optional field.
          repos.exercises.update(exercise.id, {
            ...common,
            equipment: equipment ?? null,
            notes: notes.trim() || null,
          })
        : repos.exercises.create({
            ...common,
            equipment,
            notes: notes.trim() || undefined,
          }),
    );
    setSaving(false);
    if (!saved) return;
    haptics.success();
    // Goes back to the existing Elegir ejercicio and hands it the saved id (it pre-selects it).
    router.dismissTo({
      pathname: '/elegir-ejercicio',
      params: {
        ...(dayId ? { dayId } : {}),
        savedId: saved.id,
        savedKind: editing ? 'edited' : 'created',
        savedAt: String(Date.now()),
      },
    });
  }

  const summary = [
    equipment ? EQUIPMENT_LABELS[equipment] : null,
    secondaryShown.length > 0 ? `+${secondaryShown.length} grupos` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const hint = ready
    ? 'Con esto ya podés guardar'
    : `Falta ${trimmed.length === 0 ? 'el nombre' : 'el grupo'}`;

  return (
    <ScreenContainer>
      <BackBar label="Cancelar" noChevron />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: hit.cta + insets.bottom + space.xxxl + space.xxl }}
      >
        <Text variant="displayL" accessibilityRole="header" style={styles.title}>
          {editing ? 'Editar ejercicio' : 'Crear ejercicio'}
        </Text>

        <Animated.View
          style={styles.form}
          layout={reduced ? undefined : LinearTransition.duration(motion.base)}
        >
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text variant="label">Nombre</Text>
              <Text variant="label" color="accent">
                *
              </Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="Ej.: Sentadilla con pausa"
              placeholderTextColor={colors.textDisabled}
              selectionColor={colors.accent}
              accessibilityLabel="Nombre del ejercicio"
              maxLength={EXERCISE_NAME_MAX_LENGTH}
              autoCapitalize="sentences"
              returnKeyType="done"
              style={[
                styles.nameInput,
                trimmed.length === 0 && nameFocused ? styles.ringAccent : null,
                trimmed.length > 0 && nameFocused ? styles.ringFocus : null,
              ]}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text variant="label">Grupo muscular principal</Text>
              <Text variant="label" color="accent">
                *
              </Text>
            </View>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {MUSCLE_GROUPS.map((g) => (
                <Chip
                  key={g}
                  label={MUSCLE_GROUP_LABELS[g]}
                  selected={primary === g}
                  onPress={() => pickPrimary(g)}
                />
              ))}
            </View>
          </View>

          <View style={styles.ready} accessibilityLiveRegion="polite">
            <Icon
              name="check"
              size={14}
              color={ready ? 'success' : 'textTertiary'}
              strokeWidth={3}
            />
            <Text variant="caption" color={ready ? 'success' : 'textTertiary'}>
              {hint}
            </Text>
          </View>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Más detalles"
            accessibilityState={{ expanded: open }}
            onPress={() => {
              haptics.light();
              setOpen((o) => !o);
            }}
            style={styles.moreToggle}
          >
            <View style={styles.moreLabel}>
              <Text variant="bodyMSemi">Más detalles</Text>
              <Text variant="bodyM" color="textSecondary">
                · opcional
              </Text>
            </View>
            <View style={styles.moreRight}>
              {!open && summary ? (
                <Text
                  variant="caption"
                  color="textSecondary"
                  numberOfLines={1}
                  style={styles.summary}
                >
                  {summary}
                </Text>
              ) : null}
              <Animated.View style={chevronStyle}>
                <Icon name="chevronDown" size={20} color="textSecondary" strokeWidth={2.4} />
              </Animated.View>
            </View>
          </PressableScale>

          {open ? (
            <Animated.View
              entering={FadeIn.duration(reduced ? motion.reduced : motion.base + 20)}
              style={styles.details}
            >
              <View style={styles.field}>
                <Text variant="label">Grupos secundarios</Text>
                <View style={styles.chips}>
                  {MUSCLE_GROUPS.filter((g) => g !== primary).map((g) => (
                    <Chip
                      key={g}
                      label={MUSCLE_GROUP_LABELS[g]}
                      selected={secondary.includes(g)}
                      onPress={() => toggleSecondary(g)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text variant="label">Equipamiento</Text>
                <View style={styles.equipGrid} accessibilityRole="radiogroup">
                  {EQUIPMENT.map((item) => {
                    const on = equipment === item;
                    return (
                      <PressableScale
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() => pickEquipment(item)}
                        style={[styles.equip, on && styles.equipOn]}
                      >
                        <Text
                          variant="segmentM"
                          color={on ? 'onAccent' : 'textBody'}
                          style={styles.equipLabel}
                          numberOfLines={2}
                        >
                          {EQUIPMENT_LABELS[item]}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text variant="label">Notas y cues de técnica</Text>
                <Pressable
                  accessible={false}
                  style={[styles.notesBox, notesFocused && styles.ringFocus]}
                >
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                    placeholder="Ej.: pausa de 2 s abajo, rodillas afuera"
                    placeholderTextColor={colors.textDisabled}
                    selectionColor={colors.accent}
                    accessibilityLabel="Notas y cues de técnica"
                    multiline
                    textAlignVertical="top"
                    style={styles.notesInput}
                  />
                </Pressable>
                <Text variant="caption" color="textTertiary">
                  Se muestran debajo del nombre cuando entrenás este ejercicio.
                </Text>
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={[colors.backgroundClear, colors.background]}
          locations={[0, 0.3]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Button
          title={editing ? 'Guardar cambios' : 'Guardar ejercicio'}
          size="lg"
          disabled={!ready}
          loading={saving}
          onPress={save}
        />
        {editing ? null : (
          <Text variant="caption" color="textTertiary" style={styles.footnote}>
            Solo hacen falta nombre y grupo principal
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.xs },
  form: { paddingTop: space.lg, gap: space.xl - 2 },
  field: { gap: space.sm },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  nameInput: {
    ...inputType.bodyInput,
    height: hit.row,
    paddingHorizontal: space.lg - 2,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  ringAccent: { borderColor: colors.accent, borderWidth: stroke.thick },
  ringFocus: { borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm - 2 },
  ready: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: -space.xs },
  moreToggle: {
    height: hit.row,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.lg - 2,
    paddingRight: space.md,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  moreLabel: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs + 2 },
  moreRight: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  summary: { flexShrink: 1 },
  details: { gap: space.xl - 2 },
  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm - 2 },
  equip: {
    flexBasis: '23%',
    flexGrow: 1,
    minHeight: hit.min + space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  equipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  equipLabel: { textAlign: 'center' },
  notesBox: {
    paddingHorizontal: space.lg - 2,
    paddingVertical: space.md,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  notesInput: {
    ...inputType.bodyInput,
    height: inputHeight.body * 3 + space.xs,
    padding: 0,
    color: colors.textPrimary,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
  },
  footnote: { textAlign: 'center' },
});
