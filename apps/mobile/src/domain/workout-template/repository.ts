import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutTemplate,
  WorkoutTemplateId,
  WorkoutTemplateListQuery,
} from './types';

export type WorkoutTemplateRepository = {
  readonly list: (
    query?: WorkoutTemplateListQuery,
  ) => Promise<readonly WorkoutTemplate[]>;
  readonly getById: (id: WorkoutTemplateId) => Promise<WorkoutTemplate | null>;
  readonly create: (
    input: CreateWorkoutTemplateInput,
  ) => Promise<WorkoutTemplate>;
  readonly update: (
    input: UpdateWorkoutTemplateInput,
  ) => Promise<WorkoutTemplate>;
  readonly archive: (
    id: WorkoutTemplateId,
    archivedAt: string,
  ) => Promise<WorkoutTemplate>;
};
