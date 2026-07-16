import {
  WorkoutTemplateValidationError,
  createWorkoutTemplate,
  type TemplateExerciseInput,
  type WorkoutTemplate,
  type WorkoutTemplateInput,
} from '@/domain/workout-template';

export type WorkoutTemplateRow = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly archived_at: string | null;
};

export type TemplateExerciseRow = {
  readonly id: string;
  readonly template_id: string;
  readonly exercise_id: string;
  readonly position: number;
  readonly target_sets: number;
  readonly target_reps_min: number;
  readonly target_reps_max: number;
  readonly rest_seconds: number;
  readonly created_at: string;
  readonly updated_at: string;
};

export class WorkoutTemplateRowMappingError extends Error {
  constructor(
    readonly templateId: string,
    readonly cause: unknown,
  ) {
    super(`Invalid WorkoutTemplate database row: ${templateId}.`);
    this.name = 'WorkoutTemplateRowMappingError';
  }
}

export function mapWorkoutTemplateRows(
  templateRow: WorkoutTemplateRow,
  exerciseRows: readonly TemplateExerciseRow[],
): WorkoutTemplate {
  try {
    return createWorkoutTemplate(
      toWorkoutTemplateInput(templateRow, exerciseRows),
    );
  } catch (error) {
    if (error instanceof WorkoutTemplateValidationError) {
      throw new WorkoutTemplateRowMappingError(templateRow.id, error.issues);
    }

    throw new WorkoutTemplateRowMappingError(templateRow.id, error);
  }
}

function toWorkoutTemplateInput(
  templateRow: WorkoutTemplateRow,
  exerciseRows: readonly TemplateExerciseRow[],
): WorkoutTemplateInput {
  return {
    id: templateRow.id,
    name: templateRow.name,
    description: templateRow.description,
    status: templateRow.status,
    exercises: exerciseRows.map(toTemplateExerciseInput),
    createdAt: templateRow.created_at,
    updatedAt: templateRow.updated_at,
    archivedAt: templateRow.archived_at,
  };
}

function toTemplateExerciseInput(
  row: TemplateExerciseRow,
): TemplateExerciseInput {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    position: row.position,
    targetSets: row.target_sets,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    restSeconds: row.rest_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
