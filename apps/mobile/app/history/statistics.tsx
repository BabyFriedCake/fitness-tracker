import { useRouter } from 'expo-router';

import { WorkoutHistoryStatisticsScreen } from '@/features/workout-session/screens/workout-history-statistics-screen';

export default function WorkoutHistoryStatisticsRoute() {
  const router = useRouter();

  return <WorkoutHistoryStatisticsScreen onBack={() => router.back()} />;
}
