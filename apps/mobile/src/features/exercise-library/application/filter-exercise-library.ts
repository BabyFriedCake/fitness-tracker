import type {
  Exercise,
  ExerciseFilters,
  ExerciseRepository,
} from '@/domain/exercise';

import type { ExerciseLibraryFilters } from './exercise-library-filters';

export type FilterExerciseLibraryResult =
  | {
      readonly status: 'ready';
      readonly exercises: readonly Exercise[];
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export async function filterExerciseLibrary(
  repository: ExerciseRepository,
  filters: ExerciseLibraryFilters,
): Promise<FilterExerciseLibraryResult> {
  try {
    const queryText = filters.queryText.trim();
    const repositoryFilters = toRepositoryFilters(filters);
    const exercises =
      queryText.length > 0
        ? await repository.search({ text: queryText }, repositoryFilters)
        : repositoryFilters
          ? await repository.listByFilters(repositoryFilters)
          : await repository.list();

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

function toRepositoryFilters(
  filters: ExerciseLibraryFilters,
): ExerciseFilters | undefined {
  const repositoryFilters: ExerciseFilters = {
    muscleGroups:
      filters.muscleGroups.length > 0 ? filters.muscleGroups : undefined,
    equipment: filters.equipment.length > 0 ? filters.equipment : undefined,
  };

  return repositoryFilters.muscleGroups || repositoryFilters.equipment
    ? repositoryFilters
    : undefined;
}
