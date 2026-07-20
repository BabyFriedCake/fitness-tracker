import { useLocalSearchParams } from 'expo-router';

import { WorkoutSessionSummaryScreen } from '@/features/workout-session/screens/workout-session-summary-screen';

export default function WorkoutSessionSummaryRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  return <WorkoutSessionSummaryScreen routeParams={params} />;
}
