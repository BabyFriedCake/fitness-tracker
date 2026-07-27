import type { ExerciseRepository } from '@/domain/exercise';
import type {
  TemplateExercise,
  WorkoutTemplate,
  WorkoutTemplateId,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';

export type WorkoutTemplateDetailExerciseItem = {
  readonly id: TemplateExercise['id'];
  readonly exerciseId: TemplateExercise['exerciseId'];
  readonly name: string;
  readonly position: number;
  readonly targetSets: number;
  readonly targetRepsLabel: string;
  readonly restSeconds: number;
};

export type WorkoutTemplateDetail = {
  readonly id: WorkoutTemplateId;
  readonly name: string;
  readonly description?: string;
  readonly status: WorkoutTemplate['status'];
  readonly exerciseCount: number;
  readonly totalTargetSets: number;
  readonly estimatedDurationMinutes: number | null;
  readonly estimatedCalories: number | null;
  readonly exercises: readonly WorkoutTemplateDetailExerciseItem[];
};

export type WorkoutTemplateDetailLoadResult =
  | {
      readonly status: 'ready';
      readonly template: WorkoutTemplateDetail;
    }
  | {
      readonly status: 'notFound';
      readonly message: string;
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

const TEMPLATE_DETAIL_LOAD_ERROR_MESSAGE =
  '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。';
const TEMPLATE_DETAIL_NOT_FOUND_MESSAGE = '找不到要查看的训练模板。';

export async function loadWorkoutTemplateDetail(
  dependencies: {
    readonly workoutTemplateRepository: WorkoutTemplateRepository;
    readonly exerciseRepository: ExerciseRepository;
  },
  templateId: WorkoutTemplateId,
): Promise<WorkoutTemplateDetailLoadResult> {
  try {
    const template =
      await dependencies.workoutTemplateRepository.getById(templateId);

    if (!template) {
      return {
        status: 'notFound',
        message: TEMPLATE_DETAIL_NOT_FOUND_MESSAGE,
      };
    }

    const selectedExercises =
      await dependencies.exerciseRepository.getSelectedByIds(
        template.exercises.map((exercise) => exercise.exerciseId),
      );
    const exerciseNameById = new Map(
      selectedExercises.map((exercise) => [exercise.id, exercise.nameZh]),
    );

    return {
      status: 'ready',
      template: toWorkoutTemplateDetail(template, exerciseNameById),
    };
  } catch {
    return {
      status: 'error',
      message: TEMPLATE_DETAIL_LOAD_ERROR_MESSAGE,
    };
  }
}

function toWorkoutTemplateDetail(
  template: WorkoutTemplate,
  exerciseNameById: ReadonlyMap<string, string>,
): WorkoutTemplateDetail {
  const sortedExercises = [...template.exercises].sort(
    (first, second) => first.position - second.position,
  );

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    status: template.status,
    exerciseCount: sortedExercises.length,
    totalTargetSets: sortedExercises.reduce(
      (total, exercise) => total + exercise.targetSets,
      0,
    ),
    estimatedDurationMinutes: null,
    estimatedCalories: null,
    exercises: sortedExercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exerciseNameById.get(exercise.exerciseId) ?? '未知动作',
      position: exercise.position,
      targetSets: exercise.targetSets,
      targetRepsLabel: formatTargetReps(
        exercise.targetReps.min,
        exercise.targetReps.max,
      ),
      restSeconds: exercise.restSeconds,
    })),
  };
}

function formatTargetReps(min: number, max: number): string {
  return min === max ? `${min}` : `${min}-${max}`;
}
