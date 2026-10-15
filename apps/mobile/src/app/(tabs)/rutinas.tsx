import type { RoutineListItem } from '@gym/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import {
  ActionMenu,
  Button,
  EmptyState,
  ErrorState,
  ListItem,
  LoadingState,
  ScreenContainer,
  Text,
  confirm,
} from '../../components';
import { useRepositories } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { attempt } from '../../lib/errors';
import { colors, radii, spacing } from '../../theme';

export default function RutinasScreen() {
  const repos = useRepositories();
  const router = useRouter();
  const { data, loading, error, reload } = useFocusAsync(() => repos.routines.list());
  const [menuFor, setMenuFor] = useState<RoutineListItem | null>(null);

  async function createRoutine() {
    const routine = await attempt(() => repos.routines.create({ name: 'Nueva rutina' }));
    if (routine)
      router.push({ pathname: '/rutina/[routineId]', params: { routineId: routine.id } });
  }

  async function remove(r: RoutineListItem) {
    const ok = await confirm({
      title: 'Eliminar rutina',
      message: `Se va a eliminar "${r.name}" con todos sus días. Tus entrenamientos pasados se conservan.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await attempt(() => repos.routines.delete(r.id));
    reload();
  }

  const menuItems = menuFor
    ? [
        ...(menuFor.isActive
          ? []
          : [
              {
                label: 'Marcar como activa',
                onPress: async () => {
                  await attempt(() => repos.routines.setActive(menuFor.id));
                  reload();
                },
              },
            ]),
        {
          label: 'Duplicar',
          onPress: async () => {
            await attempt(() => repos.routines.duplicate(menuFor.id));
            reload();
          },
        },
        {
          label: 'Archivar',
          onPress: async () => {
            await attempt(() => repos.routines.update(menuFor.id, { archived: true }));
            reload();
          },
        },
        { label: 'Eliminar', destructive: true, onPress: () => remove(menuFor) },
      ]
    : [];

  let body;
  if (loading && !data) body = <LoadingState />;
  else if (error && !data)
    body = <ErrorState message="No pudimos cargar tus rutinas." onRetry={reload} />;
  else if (!data || data.length === 0)
    body = (
      <EmptyState
        icon="routines"
        title="Todavía no tenés rutinas"
        message="Armá tu primera rutina para empezar a entrenar."
        actionLabel="Armá tu primera rutina"
        onAction={createRoutine}
      />
    );
  else
    body = (
      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={`${item.dayCount} ${item.dayCount === 1 ? 'día' : 'días'}`}
            onPress={() =>
              router.push({ pathname: '/rutina/[routineId]', params: { routineId: item.id } })
            }
            trailing={
              <View style={styles.trailing}>
                {item.isActive ? (
                  <View style={styles.badge}>
                    <Text variant="caption" color="onSuccess">
                      Activa
                    </Text>
                  </View>
                ) : null}
                <Button
                  title="⋯"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => setMenuFor(item)}
                  style={styles.menuBtn}
                />
              </View>
            }
            chevron={false}
          />
        )}
      />
    );

  return (
    <ScreenContainer>
      <Text variant="heading">Mis rutinas</Text>
      <View style={styles.body}>{body}</View>
      {data && data.length > 0 ? (
        <Button title="Nueva rutina" size="lg" onPress={createRoutine} style={styles.cta} />
      ) : null}
      <ActionMenu
        visible={menuFor !== null}
        title={menuFor?.name}
        items={menuItems}
        onClose={() => setMenuFor(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  list: { paddingBottom: spacing.lg },
  cta: { marginVertical: spacing.md },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  menuBtn: { paddingHorizontal: spacing.md },
});
