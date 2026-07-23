import { useLocalSearchParams } from 'expo-router';

import { TodayPlanDetailScreen } from '@/features/workout-session/screens/today-plan-detail-screen';

export default function TodayPlanDetailRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  return <TodayPlanDetailScreen routeParams={params} />;
}
