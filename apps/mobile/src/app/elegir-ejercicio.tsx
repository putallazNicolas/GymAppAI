import { EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type MuscleGroup } from '@gym/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  ScreenContainer,
  Text,
  TextField,
} from '../components';
import { useRepositories } from '../data/DataProvider';
import { useAsync } from '../data/useAsync';
import { attempt } from '../lib/errors';
import { colors, radii, spacing, touch } from '../theme';

export default function PickExerciseScreen() {
  const { dayId } = useLocalSearchParams<{ dayId?: string }>();
  const repos = useRepositories();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<MuscleGroup | undefined>(undefined);
  const [newError, setNewError] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => repos.exercises.list({ muscleGroup: group, search: search.trim() || undefined }),
    [group, search],
  );

  function toggle(id: string) {
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

  async function createExercise() {
    if (!newName.trim()) return setNewError('Poné un nombre.');
    if (!newGroup) return setNewError('Elegí un grupo muscular.');
    setNewError(undefined);
    const created = await attempt(() =>
      repos.exercises.create({ name: newName.trim(), muscleGroup: newGroup }),
    );
    if (!created) return;
    setSelected((s) => [...s, created.id]);
    setCreating(false);
    setNewName('');
    setNewGroup(undefined);
    reload();
  }

  let list;
  if (loading && !data) list = <LoadingState />;
  else if (error && !data)
    list = <ErrorState message="No pudimos cargar los ejercicios." onRetry={reload} />;
  else if (!data || data.length === 0)
    list = (
      <EmptyState
        icon="search"
        title="Sin resultados"
        message="Probá con otra búsqueda o creá el ejercicio."
        actionLabel="Crear ejercicio"
        onAction={() => {
          setNewName(search.trim());
          setCreating(true);
        }}
      />
    );
  else
    list = (
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const on = selected.includes(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(item.id)}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={styles.rowText}>
                <Text variant="label">{item.name}</Text>
                <Text variant="caption">
                  {MUSCLE_GROUP_LABELS[item.muscleGroup]}
                  {item.equipment ? ` · ${EQUIPMENT_LABELS[item.equipment]}` : ''}
                </Text>
              </View>
              {on ? <Icon name="check" size={22} color="success" /> : null}
            </Pressable>
          );
        }}
      />
    );

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <View style={styles.top}>
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar ejercicio"
          accessibilityLabel="Buscar ejercicio"
          autoCorrect={false}
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
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
        {creating ? (
          <View style={styles.create}>
            <Text variant="label">Crear ejercicio</Text>
            <TextField label="Nombre" value={newName} onChangeText={setNewName} error={newError} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {MUSCLE_GROUPS.map((g) => (
                <Chip
                  key={g}
                  label={MUSCLE_GROUP_LABELS[g]}
                  selected={newGroup === g}
                  onPress={() => setNewGroup(g)}
                />
              ))}
            </ScrollView>
            <View style={styles.createActions}>
              <Button
                title="Cancelar"
                variant="ghost"
                fullWidth={false}
                onPress={() => setCreating(false)}
              />
              <Button title="Crear" fullWidth={false} onPress={createExercise} />
            </View>
          </View>
        ) : (
          <Button title="Crear ejercicio" variant="ghost" onPress={() => setCreating(true)} />
        )}
      </View>
      <View style={styles.list}>{list}</View>
      <Button
        title={`Agregar (${selected.length})`}
        size="lg"
        disabled={selected.length === 0 || !dayId}
        loading={adding}
        onPress={add}
        style={styles.cta}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.md, paddingTop: spacing.md },
  chips: { gap: spacing.sm },
  list: { flex: 1 },
  create: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min + spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderRadius: radii.md,
  },
  rowOn: { backgroundColor: colors.successSurface },
  rowText: { flex: 1, gap: spacing.xs },
  cta: { marginVertical: spacing.md },
});
