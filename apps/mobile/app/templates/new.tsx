import { useLocalSearchParams } from 'expo-router';

import { WorkoutTemplateCreateScreen } from '@/features/workout-templates/screens/workout-template-create-screen';

export default function NewWorkoutTemplateRoute() {
  const params = useLocalSearchParams<{
    draftName?: string | string[];
    draftDescription?: string | string[];
    selectedIds?: string | string[];
    selectedExerciseId?: string | string[];
    selectionContext?: string | string[];
  }>();

  return <WorkoutTemplateCreateScreen routeParams={params} />;
}
