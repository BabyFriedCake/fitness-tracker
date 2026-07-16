import { useLocalSearchParams } from 'expo-router';

import { WorkoutTemplateEntryPlaceholderScreen } from '@/features/workout-templates/screens/workout-template-entry-placeholder-screen';

export default function WorkoutTemplateDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const templateId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <WorkoutTemplateEntryPlaceholderScreen
      title="编辑训练模板"
      note={`模板 ${templateId ?? ''} 的编辑页面将在后续任务实现。`}
    />
  );
}
