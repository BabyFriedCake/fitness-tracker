import type {
  Exercise,
  ExerciseId,
  ExerciseRepository,
} from '@/domain/exercise';

export type ExerciseDetailResult =
  | {
      readonly status: 'ready';
      readonly exercise: Exercise;
    }
  | {
      readonly status: 'not-found';
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export async function loadExerciseDetail(
  repository: ExerciseRepository,
  exerciseId: string,
): Promise<ExerciseDetailResult> {
  const normalizedExerciseId = exerciseId.trim();

  if (!normalizedExerciseId) {
    return {
      status: 'not-found',
    };
  }

  try {
    const exercise = await repository.getById(
      normalizedExerciseId as ExerciseId,
    );

    return exercise
      ? {
          status: 'ready',
          exercise,
        }
      : {
          status: 'not-found',
        };
  } catch {
    return {
      status: 'error',
      message: '动作详情加载失败。已保存的训练数据不会受影响，请稍后重试。',
    };
  }
}
