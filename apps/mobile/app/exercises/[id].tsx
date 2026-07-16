import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseDetailScreen } from '@/features/exercise-library/screens/exercise-detail-screen';

export default function ExerciseDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <ExerciseDetailScreen
      exerciseId={exerciseId ?? ''}
      onBack={() => {
        router.back();
      }}
    />
  );
}
