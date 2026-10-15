import type { RoutineListItem } from '@gym/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  ActionMenu,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  RoutineCard,
  ScreenContainer,
  ScreenHeader,
  Text,
  confirm,
  type ActionMenuItem,
  type MenuAnchor,
} from '../../components';
import { useRepositories } from '../../data/DataProvider';
import { useFocusAsync } from '../../data/useFocusAsync';
import { attempt } from '../../lib/errors';
import { formatDayMonth } from '../../lib/routineFormat';
import { colors, hit, motion, space, stroke } from '../../theme';

interface RoutineRow {
  routine: RoutineListItem;
  dayNames: string[];
  lastUse?: string;
}

function subtitleOf({ routine, dayNames, lastUse }: RoutineRow): string {
  const names = dayNames.join(' · ');
  if (routine.isActive && names) return names;
  if (lastUse) return `Último uso: ${formatDayMonth(lastUse)}`;
  return names || 'Sin días todavía';
}

export default function RutinasScreen() {
  const repos = useRepositories();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const { data, loading, error, reload } = useFocusAsync(async (): Promise<RoutineRow[]> => {
    const all = await repos.routines.list({ includeArchived: true });
    return Promise.all(
      all.map(async (routine) => {
        const [detail, last] = await Promise.all([
          repos.routines.getById(routine.id),
          repos.workouts.getLastFinishedForRoutine(routine.id),
        ]);
        return {
          routine,
          dayNames: detail?.days.map((d) => d.name) ?? [],
          lastUse: last ? (last.finishedAt ?? last.startedAt) : undefined,
        };
      }),
    );
  });
  const [menu, setMenu] = useState<{ row: RoutineRow; anchor: MenuAnchor } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const chevron = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 90}deg` }],
  }));

  function openRoutine(id: string) {
    router.push({ pathname: '/rutina/[routineId]', params: { routineId: id } });
  }

  async function createRoutine() {
    const routine = await attempt(() => repos.routines.create({ name: 'Nueva rutina' }));
    if (routine) openRoutine(routine.id);
  }

  async function remove(r: RoutineListItem) {
    const ok = await confirm({
      title: `¿Eliminar ${r.name}?`,
      message: `${
        r.dayCount === 1 ? 'Se borra su día' : `Se borran sus ${r.dayCount} días`
      } y lo planificado. Los entrenamientos que ya registraste se conservan.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await attempt(() => repos.routines.delete(r.id));
    reload();
  }

  function itemsFor(r: RoutineListItem): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    if (r.isActive && !r.archived) {
      items.push({ label: 'Ya está activa', icon: 'radio', disabled: true, onPress: () => {} });
    } else {
      items.push({
        label: 'Activar',
        icon: 'radio',
        iconColor: 'accent',
        onPress: async () => {
          await attempt(() => repos.routines.setActive(r.id));
          reload();
        },
      });
    }
    items.push({
      label: 'Duplicar',
      icon: 'copy',
      onPress: async () => {
        await attempt(() => repos.routines.duplicate(r.id));
        reload();
      },
    });
    items.push(
      r.archived
        ? {
            label: 'Desarchivar',
            icon: 'archive',
            onPress: async () => {
              await attempt(() => repos.routines.update(r.id, { archived: false }));
              reload();
            },
          }
        : {
            label: 'Archivar',
            icon: 'archive',
            onPress: async () => {
              await attempt(() => repos.routines.update(r.id, { archived: true }));
              reload();
            },
          },
    );
    items.push({
      label: 'Eliminar',
      destructive: true,
      separatorBefore: true,
      onPress: () => remove(r),
    });
    return items;
  }

  function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    chevron.value = reduced
      ? next
        ? 1
        : 0
      : withTiming(next ? 1 : 0, { duration: motion.base, easing: motion.easeOut });
  }

  const rows = data ?? [];
  const live = rows.filter((r) => !r.routine.archived);
  const archived = rows.filter((r) => r.routine.archived);
  const label = data
    ? `${live.length} ${live.length === 1 ? 'RUTINA' : 'RUTINAS'}${
        archived.length > 0
          ? ` · ${archived.length} ${archived.length === 1 ? 'ARCHIVADA' : 'ARCHIVADAS'}`
          : ''
      }`
    : undefined;

  function renderCard({ routine, ...rest }: RoutineRow) {
    const row = { routine, ...rest };
    return (
      <Animated.View
        key={routine.id}
        entering={reduced ? undefined : FadeIn.duration(motion.fast)}
        layout={reduced ? undefined : LinearTransition.duration(motion.base)}
      >
        <RoutineCard
          name={routine.name}
          dayCount={routine.dayCount}
          isActive={routine.isActive && !routine.archived}
          subtitle={subtitleOf(row)}
          menuOpen={menu?.row.routine.id === routine.id}
          onPress={() => openRoutine(routine.id)}
          onMenu={(rect) =>
            setMenu({
              row,
              anchor: { top: rect.y + rect.height, right: windowWidth - (rect.x + rect.width) },
            })
          }
        />
      </Animated.View>
    );
  }

  let body;
  if (loading && !data) body = <LoadingState />;
  else if (error && !data)
    body = <ErrorState message="No pudimos cargar tus rutinas." onRetry={reload} />;
  else if (rows.length === 0)
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
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {live.length === 0 ? (
          <Text variant="bodyS" color="textSecondary" style={styles.note}>
            Todas tus rutinas están archivadas. Activá una o armá una nueva.
          </Text>
        ) : null}
        {live.map(renderCard)}
        {archived.length > 0 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Archivadas, ${archived.length}`}
              accessibilityState={{ expanded: showArchived }}
              onPress={toggleArchived}
              style={styles.archivedToggle}
            >
              <View style={styles.archivedLeft}>
                <Icon name="archive" size={20} color="textSecondary" />
                <Text variant="buttonS" color="textSecondary">
                  Archivadas
                </Text>
                <Text variant="numS">{archived.length}</Text>
              </View>
              <Animated.View style={chevronStyle}>
                <Icon name="chevron" size={20} color="textSecondary" strokeWidth={2.4} />
              </Animated.View>
            </Pressable>
            {showArchived ? archived.map(renderCard) : null}
          </>
        ) : null}
      </ScrollView>
    );

  return (
    <ScreenContainer>
      <ScreenHeader
        label={label}
        title="Rutinas"
        right={
          rows.length > 0 ? (
            <Button
              title="Nueva rutina"
              icon="add"
              size="sm"
              fullWidth={false}
              onPress={createRoutine}
            />
          ) : null
        }
      />
      <View style={styles.body}>{body}</View>
      <ActionMenu
        visible={menu !== null}
        anchor={menu?.anchor}
        items={menu ? itemsFor(menu.row.routine) : []}
        onClose={() => setMenu(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  list: { gap: space.sm + 2, paddingBottom: space.xl },
  note: { paddingVertical: space.sm },
  archivedToggle: {
    minHeight: hit.row,
    marginTop: space.xs,
    paddingHorizontal: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: stroke.hairline,
    borderTopColor: colors.divider,
  },
  archivedLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
});
