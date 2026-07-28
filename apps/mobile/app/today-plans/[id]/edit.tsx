import { useLocalSearchParams } from 'expo-router';

import { TodayPlanEditScreen } from '@/features/workout-session/screens/today-plan-edit-screen';

export default function TodayPlanEditRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    selectedExerciseId?: string | string[];
    selectionContext?: string | string[];
  }>();

  return <TodayPlanEditScreen routeParams={params} />;
}
