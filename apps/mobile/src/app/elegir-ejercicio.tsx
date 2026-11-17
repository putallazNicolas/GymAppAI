import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup } from '@gym/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActionMenu,
  BackBar,
  Button,
  Chip,
  ErrorState,
  ExercisePickRow,
  HIGHLIGHT_MS,
  Icon,
  LoadingState,
  ScreenContainer,
  Text,
  Toast,
  confirm,
  type ActionMenuItem,
  type MenuRect,
} from '../components';
import { useRepositories } from '../data/DataProvider';
import { useAsync } from '../data/useAsync';
import { attempt } from '../lib/errors';
import { haptics } from '../lib/haptics';
import { colors, hit, inputHeight, inputType, radii, space, stroke } from '../theme';

let toastCounter = 0;
function nextToastId() {
  toastCounter += 1;
  return toastCounter;
}

interface ToastState {
  key: string;
  message: string;
  /** Exercise the "Editar" action opens; no action when absent. */
  editId?: string;
}

export default function PickExerciseScreen() {
  const { dayId, savedId, savedKind, savedAt } = useLocalSearchParams<{
    dayId?: string;
    savedId?: string;
    savedKind?: string;
    savedAt?: string;
  }>();
  const repos = useRepositories();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | undefined>(undefined);
  const [customOnly, setCustomOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [menu, setMenu] = useState<{
    exercise: Exercise;
    anchor: { top: number; right: number };
  }>();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);
  const listRef = useRef<FlatList<Exercise>>(null);
  const pendingScroll = useRef<string | undefined>(undefined);
  const handledSave = useRef<string | undefined>(undefined);

  const { data, loading, error, reload } = useAsync(
    () =>
      repos.exercises.list({
        muscleGroup: group,
        customOnly: customOnly || undefined,
        search: search.trim() || undefined,
      }),
    [group, customOnly, search],
  );
  // Exercises already planned in the day get an "En el día" tag.
  const { data: inDay } = useAsync(async () => {
    const day = dayId ? await repos.routines.getDay(dayId) : null;
    return new Set(day?.exercises.map((e) => e.exerciseId) ?? []);
  }, [dayId]);

  // Coming back from the create/edit screen: pre-select, scroll to, highlight and announce it.
  useEffect(() => {
    if (!savedId || !savedAt || handledSave.current === savedAt) return;
    handledSave.current = savedAt;
    setSearch('');
    setGroup(undefined);
    setCustomOnly(false);
    setSelected((s) => (s.includes(savedId) ? s : [...s, savedId]));
    setHighlightId(savedId);
    pendingScroll.current = savedId;
    setToast({
      key: savedAt,
      message: savedKind === 'edited' ? 'Cambios guardados' : 'Creado y seleccionado',
      editId: savedId,
    });
    reload();
    const timer = setTimeout(() => setHighlightId(undefined), HIGHLIGHT_MS + 200);
    return () => clearTimeout(timer);
  }, [savedId, savedKind, savedAt, reload]);

  // Once the refreshed list is in, bring the saved exercise into view.
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id || loading || !data) return;
    const index = data.findIndex((e) => e.id === id);
    if (index < 0) return;
    pendingScroll.current = undefined;
    listRef.current?.scrollToIndex({ index, viewPosition: 0.3, animated: true });
  }, [data, loading]);

  const dismissToast = useCallback(() => setToast(null), []);

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

  function openCreate() {
    router.push({
      pathname: '/ejercicio/nuevo',
      params: { ...(dayId ? { dayId } : {}), ...(search.trim() ? { name: search.trim() } : {}) },
    });
  }

  function openEdit(exerciseId: string) {
    router.push({
      pathname: '/ejercicio/[exerciseId]/editar',
      params: { exerciseId, ...(dayId ? { dayId } : {}) },
    });
  }

  async function remove(exercise: Exercise) {
    const ok = await confirm({
      title: `¿Eliminar ${exercise.name}?`,
      message: 'Si ya lo usaste, se oculta del catálogo pero tu historial queda.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const outcome = await attempt(() => repos.exercises.delete(exercise.id));
    if (!outcome) return;
    haptics.success();
    setSelected((s) => s.filter((x) => x !== exercise.id));
    setToast({
      key: `removed-${nextToastId()}`,
      message:
        outcome === 'archived'
          ? 'Ya lo usaste: lo ocultamos de la lista, pero tu historial queda.'
          : 'Ejercicio eliminado',
    });
    reload();
  }

  function menuItems(exercise: Exercise): ActionMenuItem[] {
    return [
      { label: 'Editar ejercicio', icon: 'pencil', onPress: () => openEdit(exercise.id) },
      {
        label: 'Eliminar',
        destructive: true,
        separatorBefore: true,
        onPress: () => void remove(exercise),
      },
    ];
  }

  const createRow = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Crear ejercicio"
      onPress={openCreate}
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
        ref={listRef}
        data={data ?? []}
        extraData={{ selected, highlightId, inDay, menuId: menu?.exercise.id }}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hit.cta + insets.bottom + space.xxxl }}
        ListHeaderComponent={createRow}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          // Rows further down aren't measured yet: jump close, then retry.
          listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: false });
          setTimeout(
            () => listRef.current?.scrollToIndex({ index, viewPosition: 0.3, animated: true }),
            120,
          );
        }}
        ListEmptyComponent={
          <Text variant="body" color="textSecondary" style={styles.empty}>
            {search.trim()
              ? `No encontramos “${search.trim()}”. Probá con otro nombre o creá el ejercicio.`
              : customOnly
                ? 'Todavía no creaste ejercicios propios.'
                : 'No hay ejercicios en este grupo. Creá uno propio.'}
          </Text>
        }
        renderItem={({ item }) => (
          <ExercisePickRow
            exercise={item}
            selected={selected.includes(item.id)}
            inDay={inDay?.has(item.id) ?? false}
            highlighted={highlightId === item.id}
            menuOpen={menu?.exercise.id === item.id}
            onToggle={() => toggle(item.id)}
            onMenu={(rect: MenuRect) =>
              setMenu({
                exercise: item,
                anchor: { top: rect.y + rect.height, right: windowWidth - (rect.x + rect.width) },
              })
            }
          />
        )}
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
        <Chip
          label="Todos"
          selected={group === undefined && !customOnly}
          onPress={() => {
            setGroup(undefined);
            setCustomOnly(false);
          }}
        />
        <Chip
          label="Propios"
          icon="profile"
          selected={customOnly}
          onPress={() => setCustomOnly((on) => !on)}
        />
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

      <ActionMenu
        visible={menu !== undefined}
        anchor={menu?.anchor}
        items={menu ? menuItems(menu.exercise) : []}
        onClose={() => setMenu(undefined)}
      />

      {toast ? (
        <Toast
          key={toast.key}
          message={toast.message}
          actionLabel={toast.editId ? 'Editar' : undefined}
          onAction={toast.editId ? () => openEdit(toast.editId as string) : undefined}
          onDismiss={dismissToast}
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
  rowText: { flex: 1, gap: 1 },
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
