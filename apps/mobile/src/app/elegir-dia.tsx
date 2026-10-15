import { useRouter } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState, ErrorState, ListItem, LoadingState, ScreenContainer } from '../components';
import { useRepositories, useServices } from '../data/DataProvider';
import { useAsync } from '../data/useAsync';
import { attempt } from '../lib/errors';
import { space } from '../theme';

export default function PickDayScreen() {
  const repos = useRepositories();
  const services = useServices();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => repos.routines.getActive());

  async function start(dayId: string) {
    const workout = await attempt(() => services.startWorkoutFromDay(dayId));
    if (workout)
      router.replace({ pathname: '/entrenando/[workoutId]', params: { workoutId: workout.id } });
  }

  let body;
  if (loading && data === undefined) body = <LoadingState />;
  else if (error) body = <ErrorState message="No pudimos cargar los días." onRetry={reload} />;
  else if (!data || data.days.length === 0)
    body = (
      <EmptyState
        icon="routines"
        title="No hay días para elegir"
        message="Activá una rutina que tenga al menos un día."
      />
    );
  else
    body = (
      <FlatList
        data={data.days}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={`${item.exercises.length} ${item.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`}
            onPress={() => start(item.id)}
          />
        )}
      />
    );

  return <ScreenContainer edges={['bottom', 'left', 'right']}>{body}</ScreenContainer>;
}

const styles = StyleSheet.create({
  list: { paddingVertical: space.md },
});
