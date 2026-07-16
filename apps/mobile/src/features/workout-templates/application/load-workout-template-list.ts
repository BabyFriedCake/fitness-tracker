import type {
  WorkoutTemplate,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';

export type WorkoutTemplateListItem = {
  readonly id: WorkoutTemplate['id'];
  readonly name: string;
  readonly status: WorkoutTemplate['status'];
  readonly exerciseCount: number;
  readonly totalTargetSets: number;
};

export type WorkoutTemplateListLoadResult =
  | {
      readonly status: 'ready';
      readonly templates: readonly WorkoutTemplateListItem[];
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export async function loadWorkoutTemplateList(
  repository: WorkoutTemplateRepository,
): Promise<WorkoutTemplateListLoadResult> {
  try {
    const templates = await repository.list({
      filters: {
        statuses: ['active'],
      },
    });

    return {
      status: 'ready',
      templates: templates.map(toWorkoutTemplateListItem),
    };
  } catch {
    return {
      status: 'error',
      message: '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。',
    };
  }
}

function toWorkoutTemplateListItem(
  template: WorkoutTemplate,
): WorkoutTemplateListItem {
  const totalTargetSets = template.exercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );

  return {
    id: template.id,
    name: template.name,
    status: template.status,
    exerciseCount: template.exercises.length,
    totalTargetSets,
  };
}
