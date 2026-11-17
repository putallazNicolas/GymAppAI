import { useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '../../../components';

export default function EditExerciseScreen() {
  const { exerciseId, dayId } = useLocalSearchParams<{ exerciseId: string; dayId?: string }>();
  return <ExerciseForm exerciseId={exerciseId} dayId={dayId} />;
}
