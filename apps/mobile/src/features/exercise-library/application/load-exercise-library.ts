import type { Exercise, ExerciseRepository } from '@/domain/exercise';

export type ExerciseLibraryResult =
  | {
      readonly status: 'ready';
      readonly exercises: readonly Exercise[];
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export async function loadExerciseLibrary(
  repository: ExerciseRepository,
): Promise<ExerciseLibraryResult> {
  try {
    const exercises = await repository.list();

    return {
      status: 'ready',
      exercises,
    };
  } catch {
    return {
      status: 'error',
      message: '动作库加载失败。已保存的训练数据不会受影响，请稍后重试。',
    };
  }
}
