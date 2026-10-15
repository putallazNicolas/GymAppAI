import { EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '@gym/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackBar,
  Button,
  Chip,
  CreateExerciseDialog,
  ErrorState,
  Icon,
  LoadingState,
  ScreenContainer,
  SelectCheck,
  Text,
} from '../components';
import { useRepositories } from '../data/DataProvider';
import { useAsync } from '../data/useAsync';
import { attempt } from '../lib/errors';
import { haptics } from '../lib/haptics';
import { colors, hit, inputHeight, inputType, radii, space, stroke } from '../theme';

export default function PickExerciseScreen() {
  const { dayId } = useLocalSearchParams<{ dayId?: string }>();
  const repos = useRepositories();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => repos.exercises.list({ muscleGroup: group, search: search.trim() || undefined }),
    [group, search],
  );
  // Exercises already planned in the day get an "En el día" tag.
  const { data: inDay } = useAsync(async () => {
    const day = dayId ? await repos.routines.getDay(dayId) : null;
    return new Set(day?.exercises.map((e) => e.exerciseId) ?? []);
  }, [dayId]);

  function toggle(id: string) {
    haptics.selection();
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function add() {
    if (!dayId || selected.length === 0) return;
    setAdding(true);
    const ok = await attempt(() =>
      repos.routines.addPlannedExercises(
        dayId,
        selected.map((exerciseId) => ({ exerciseId })),
      ),
    );
    setAdding(false);
    if (ok) router.back();
  }

  async function createExercise(name: string, muscleGroup: MuscleGroup) {
    const created = await attempt(() => repos.exercises.create({ name, muscleGroup }));
    if (!created) return 'No pudimos crear el ejercicio. Probá de nuevo.';
    setSelected((s) => [...s, created.id]);
    setCreating(false);
    reload();
    return undefined;
  }

  const createRow = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Crear ejercicio"
      onPress={() => setCreating(true)}
      style={({ pressed }) => [styles.createRow, pressed && styles.createRowPressed]}
    >
      <View style={styles.createIcon}>
        <Icon name="add" size={18} color="accent" strokeWidth={2.8} />
      </View>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">Crear ejercicio</Text>
        <Text variant="caption">¿No está en la lista? Creá uno propio</Text>
      </View>
    </Pressable>
  );

  let list;
  if (loading && !data) list = <LoadingState />;
  else if (error && !data)
    list = <ErrorState message="No pudimos cargar los ejercicios." onRetry={reload} />;
  else
    list = (
      <FlatList
        data={data ?? []}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hit.cta + insets.bottom + space.xxxl }}
        ListHeaderComponent={createRow}
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={styles.empty}>
            {search.trim()
              ? `No encontramos “${search.trim()}”. Probá con otro nombre o creá el ejercicio.`
              : 'No hay ejercicios en este grupo. Creá uno propio.'}
          </Text>
        }
        renderItem={({ item }) => {
          const on = selected.includes(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`${item.name}, ${MUSCLE_GROUP_LABELS[item.muscleGroup]}`}
              accessibilityState={{ checked: on }}
              onPress={() => toggle(item.id)}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={styles.rowText}>
                <Text variant="bodyStrong">{item.name}</Text>
                <Text variant="caption">
                  {MUSCLE_GROUP_LABELS[item.muscleGroup]}
                  {item.equipment ? ` · ${EQUIPMENT_LABELS[item.equipment]}` : ''}
                </Text>
              </View>
              {inDay?.has(item.id) ? (
                <View style={styles.tag}>
                  <Text variant="caption" color="textSecondary">
                    En el día
                  </Text>
                </View>
              ) : null}
              <View style={styles.check}>
                <SelectCheck selected={on} />
              </View>
            </Pressable>
          );
        }}
      />
    );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <BackBar label="Cancelar" noChevron />
      <Text variant="displayL" accessibilityRole="header" style={styles.title}>
        Elegir ejercicio
      </Text>
      <View style={[styles.search, searchFocused && styles.searchFocused]}>
        <Icon name="search" size={20} color="textSecondary" strokeWidth={2.2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Buscar ejercicio"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          accessibilityLabel="Buscar ejercicio"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        <Chip label="Todos" selected={group === undefined} onPress={() => setGroup(undefined)} />
        {MUSCLE_GROUPS.map((g) => (
          <Chip
            key={g}
            label={MUSCLE_GROUP_LABELS[g]}
            selected={group === g}
            onPress={() => setGroup(g)}
          />
        ))}
      </ScrollView>
      <View style={styles.list}>{list}</View>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={[colors.backgroundClear, colors.background]}
          locations={[0, 0.34]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Button
          title={`Agregar (${selected.length})`}
          size="lg"
          disabled={selected.length === 0 || !dayId}
          loading={adding}
          onPress={add}
        />
      </View>

      {creating ? (
        <CreateExerciseDialog
          initialName={search.trim()}
          onCancel={() => setCreating(false)}
          onCreate={createExercise}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.xs },
  search: {
    height: 48,
    marginTop: space.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: space.md + 2,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  searchFocused: { borderColor: colors.accent },
  searchInput: {
    ...inputType.bodyInput,
    flex: 1,
    height: inputHeight.body,
    padding: 0,
    color: colors.textPrimary,
  },
  chipsScroll: { flexGrow: 0, marginTop: space.sm + 2, marginHorizontal: -space.lg },
  chips: { gap: space.sm - 2, paddingHorizontal: space.lg },
  list: { flex: 1, marginHorizontal: -space.lg, paddingHorizontal: space.lg, marginTop: space.sm },
  createRow: {
    minHeight: 60,
    marginBottom: space.sm - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radii.lg - 2,
    borderWidth: stroke.regular,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  createRowPressed: { backgroundColor: colors.surface },
  createIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md,
    paddingRight: space.xs + 2,
    borderBottomWidth: stroke.hairline,
    borderBottomColor: colors.divider,
    borderRadius: radii.md,
  },
  rowOn: { backgroundColor: colors.accentFaint },
  rowText: { flex: 1, gap: 1 },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm - 2,
    backgroundColor: colors.surfaceRaised,
    borderWidth: stroke.hairline,
    borderColor: colors.border,
  },
  check: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: space.xxl, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
  },
});
