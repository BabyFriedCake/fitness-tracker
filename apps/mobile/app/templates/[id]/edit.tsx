import { useLocalSearchParams } from 'expo-router';

import { WorkoutTemplateEditScreen } from '@/features/workout-templates/screens/workout-template-edit-screen';

export default function WorkoutTemplateEditRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    draftName?: string | string[];
    draftDescription?: string | string[];
    draftExercises?: string | string[];
    selectedExerciseId?: string | string[];
    selectionContext?: string | string[];
  }>();

  return <WorkoutTemplateEditScreen routeParams={params} />;
}
