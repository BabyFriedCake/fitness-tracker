import type { ExerciseId } from '@/domain/exercise';

export type WorkoutTemplateId = string & {
  readonly __brand: 'WorkoutTemplateId';
};

export type TemplateExerciseId = string & {
  readonly __brand: 'TemplateExerciseId';
};

export type TemplateExercisePosition = number & {
  readonly __brand: 'TemplateExercisePosition';
};

export type TargetSetCount = number & {
  readonly __brand: 'TargetSetCount';
};

export type TargetRepCount = number & {
  readonly __brand: 'TargetRepCount';
};

export type RestDurationSeconds = number & {
  readonly __brand: 'RestDurationSeconds';
};

export const WORKOUT_TEMPLATE_STATUSES = ['active', 'archived'] as const;

export type WorkoutTemplateStatus = (typeof WORKOUT_TEMPLATE_STATUSES)[number];

export type TargetRepRange = {
  readonly min: TargetRepCount;
  readonly max: TargetRepCount;
};

export type TemplateExercise = {
  readonly id: TemplateExerciseId;
  readonly templateId: WorkoutTemplateId;
  readonly exerciseId: ExerciseId;
  readonly position: TemplateExercisePosition;
  readonly targetSets: TargetSetCount;
  readonly targetReps: TargetRepRange;
  readonly restSeconds: RestDurationSeconds;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkoutTemplate = {
  readonly id: WorkoutTemplateId;
  readonly name: string;
  readonly description?: string;
  readonly status: WorkoutTemplateStatus;
  readonly exercises: readonly TemplateExercise[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt?: string;
};

export type TemplateExerciseInput = {
  readonly id: string;
  readonly templateId: string;
  readonly exerciseId: string;
  readonly position: number;
  readonly targetSets: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly restSeconds: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkoutTemplateInput = {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status: string;
  readonly exercises?: readonly TemplateExerciseInput[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt?: string | null;
};

export type WorkoutTemplateFilters = {
  readonly statuses?: readonly WorkoutTemplateStatus[];
};

export type WorkoutTemplateSearchQuery = {
  readonly text: string;
};

export type WorkoutTemplateListQuery = {
  readonly search?: WorkoutTemplateSearchQuery;
  readonly filters?: WorkoutTemplateFilters;
  readonly limit?: number;
  readonly offset?: number;
};

export type CreateWorkoutTemplateInput = {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly exercises?: readonly TemplateExerciseInput[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type UpdateWorkoutTemplateInput = {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly exercises?: readonly TemplateExerciseInput[] | null;
  readonly updatedAt: string;
};
