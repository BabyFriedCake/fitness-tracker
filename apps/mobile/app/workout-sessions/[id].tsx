import { useLocalSearchParams } from 'expo-router';

import { WorkoutSessionScreen } from '@/features/workout-session/screens/workout-session-screen';

export default function WorkoutSessionRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  return <WorkoutSessionScreen routeParams={params} />;
}
