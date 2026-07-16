import type {
  Exercise,
  ExerciseFilters,
  ExerciseId,
  ExerciseListQuery,
  ExerciseSearchQuery,
} from './types';

export type ExerciseRepository = {
  readonly list: (query?: ExerciseListQuery) => Promise<readonly Exercise[]>;
  readonly getById: (id: ExerciseId) => Promise<Exercise | null>;
  readonly search: (
    query: ExerciseSearchQuery,
    filters?: ExerciseFilters,
  ) => Promise<readonly Exercise[]>;
  readonly listByFilters: (
    filters: ExerciseFilters,
  ) => Promise<readonly Exercise[]>;
  readonly getSelectedByIds: (
    ids: readonly ExerciseId[],
  ) => Promise<readonly Exercise[]>;
};
