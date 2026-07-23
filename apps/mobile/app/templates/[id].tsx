import { useLocalSearchParams } from 'expo-router';

import { WorkoutTemplateDetailScreen } from '@/features/workout-templates/screens/workout-template-detail-screen';

export default function WorkoutTemplateDetailRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  return <WorkoutTemplateDetailScreen routeParams={params} />;
}
