import { useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '../../components';

export default function NewExerciseScreen() {
  const { dayId, name } = useLocalSearchParams<{ dayId?: string; name?: string }>();
  return <ExerciseForm dayId={dayId} initialName={name} />;
}
