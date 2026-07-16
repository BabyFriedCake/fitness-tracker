import {
  WORKOUT_TEMPLATE_STATUSES,
  type RestDurationSeconds,
  type TargetRepCount,
  type TargetSetCount,
  type TemplateExercise,
  type TemplateExerciseId,
  type TemplateExerciseInput,
  type TemplateExercisePosition,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateInput,
  type WorkoutTemplateStatus,
} from './types';
import type { ExerciseId } from '@/domain/exercise';

export type WorkoutTemplateValidationIssueCode =
  | 'workout_template_id_required'
  | 'workout_template_name_required'
  | 'workout_template_status_invalid'
  | 'workout_template_created_at_invalid'
  | 'workout_template_updated_at_invalid'
  | 'workout_template_archived_at_invalid'
  | 'workout_template_active_archived_at_invalid'
  | 'workout_template_archived_at_required'
  | 'template_exercise_id_required'
  | 'template_exercise_template_id_required'
  | 'template_exercise_template_id_mismatch'
  | 'template_exercise_exercise_id_required'
  | 'template_exercise_position_invalid'
  | 'template_exercise_target_sets_invalid'
  | 'template_exercise_target_reps_min_invalid'
  | 'template_exercise_target_reps_max_invalid'
  | 'template_exercise_target_reps_range_invalid'
  | 'template_exercise_rest_seconds_invalid'
  | 'template_exercise_created_at_invalid'
  | 'template_exercise_updated_at_invalid'
  | 'workout_template_start_requires_active_status'
  | 'workout_template_start_requires_exercise';

export type WorkoutTemplateValidationIssue = {
  readonly code: WorkoutTemplateValidationIssueCode;
  readonly path: string;
  readonly message: string;
};

export type WorkoutTemplateValidationResult =
  | {
      readonly valid: true;
      readonly template: WorkoutTemplate;
    }
  | {
      readonly valid: false;
      readonly issues: readonly WorkoutTemplateValidationIssue[];
    };

export type TemplateExerciseValidationResult =
  | {
      readonly valid: true;
      readonly templateExercise: TemplateExercise;
    }
  | {
      readonly valid: false;
      readonly issues: readonly WorkoutTemplateValidationIssue[];
    };

export class WorkoutTemplateValidationError extends Error {
  constructor(readonly issues: readonly WorkoutTemplateValidationIssue[]) {
    super('Invalid WorkoutTemplate data.');
    this.name = 'WorkoutTemplateValidationError';
  }
}

export function createWorkoutTemplate(
  input: WorkoutTemplateInput,
): WorkoutTemplate {
  const result = validateWorkoutTemplateInput(input);

  if (!result.valid) {
    throw new WorkoutTemplateValidationError(result.issues);
  }

  return result.template;
}

export function createTemplateExercise(
  input: TemplateExerciseInput,
): TemplateExercise {
  const result = validateTemplateExerciseInput(input);

  if (!result.valid) {
    throw new WorkoutTemplateValidationError(result.issues);
  }

  return result.templateExercise;
}

export function validateWorkoutTemplateInput(
  input: WorkoutTemplateInput,
): WorkoutTemplateValidationResult {
  const issues: WorkoutTemplateValidationIssue[] = [];
  const id = input.id.trim();
  const name = input.name.trim();
  const description = normalizeOptionalText(input.description);
  const archivedAt = normalizeOptionalText(input.archivedAt);
  const exercises = input.exercises ?? [];

  if (!id) {
    issues.push({
      code: 'workout_template_id_required',
      path: 'id',
      message: 'WorkoutTemplate must have a stable id.',
    });
  }

  if (!name) {
    issues.push({
      code: 'workout_template_name_required',
      path: 'name',
      message: 'WorkoutTemplate name cannot be empty.',
    });
  }

  if (!isWorkoutTemplateStatus(input.status)) {
    issues.push({
      code: 'workout_template_status_invalid',
      path: 'status',
      message: 'WorkoutTemplate status must be active or archived.',
    });
  }

  if (!isIsoDateTime(input.createdAt)) {
    issues.push({
      code: 'workout_template_created_at_invalid',
      path: 'createdAt',
      message: 'createdAt must be an ISO 8601 timestamp.',
    });
  }

  if (!isIsoDateTime(input.updatedAt)) {
    issues.push({
      code: 'workout_template_updated_at_invalid',
      path: 'updatedAt',
      message: 'updatedAt must be an ISO 8601 timestamp.',
    });
  }

  if (archivedAt && !isIsoDateTime(archivedAt)) {
    issues.push({
      code: 'workout_template_archived_at_invalid',
      path: 'archivedAt',
      message: 'archivedAt must be an ISO 8601 timestamp when provided.',
    });
  }

  if (input.status === 'active' && archivedAt) {
    issues.push({
      code: 'workout_template_active_archived_at_invalid',
      path: 'archivedAt',
      message: 'Active WorkoutTemplate cannot include archivedAt.',
    });
  }

  if (input.status === 'archived' && !archivedAt) {
    issues.push({
      code: 'workout_template_archived_at_required',
      path: 'archivedAt',
      message: 'Archived WorkoutTemplate must include archivedAt.',
    });
  }

  const templateExercises: TemplateExercise[] = [];

  exercises.forEach((exercise, index) => {
    const result = validateTemplateExerciseInput(exercise);

    if (result.valid) {
      if (id && result.templateExercise.templateId !== id) {
        issues.push({
          code: 'template_exercise_template_id_mismatch',
          path: `exercises.${index}.templateId`,
          message:
            'TemplateExercise templateId must match its parent WorkoutTemplate id.',
        });
      }
      templateExercises.push(result.templateExercise);
      return;
    }

    for (const issue of result.issues) {
      issues.push({
        ...issue,
        path: `exercises.${index}.${issue.path}`,
      });
    }
  });

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    template: {
      id: id as WorkoutTemplateId,
      name,
      ...(description ? { description } : {}),
      status: input.status as WorkoutTemplateStatus,
      exercises: sortTemplateExercises(templateExercises),
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      ...(archivedAt ? { archivedAt } : {}),
    },
  };
}

export function validateTemplateExerciseInput(
  input: TemplateExerciseInput,
): TemplateExerciseValidationResult {
  const issues: WorkoutTemplateValidationIssue[] = [];
  const id = input.id.trim();
  const templateId = input.templateId.trim();
  const exerciseId = input.exerciseId.trim();

  if (!id) {
    issues.push({
      code: 'template_exercise_id_required',
      path: 'id',
      message: 'TemplateExercise must have a stable id.',
    });
  }

  if (!templateId) {
    issues.push({
      code: 'template_exercise_template_id_required',
      path: 'templateId',
      message: 'TemplateExercise must reference a WorkoutTemplate.',
    });
  }

  if (!exerciseId) {
    issues.push({
      code: 'template_exercise_exercise_id_required',
      path: 'exerciseId',
      message: 'TemplateExercise must reference an Exercise.',
    });
  }

  if (!isPositiveInteger(input.position)) {
    issues.push({
      code: 'template_exercise_position_invalid',
      path: 'position',
      message: 'TemplateExercise position must be a positive integer.',
    });
  }

  if (!isPositiveInteger(input.targetSets)) {
    issues.push({
      code: 'template_exercise_target_sets_invalid',
      path: 'targetSets',
      message: 'Target sets must be greater than 0.',
    });
  }

  if (!isPositiveInteger(input.targetRepsMin)) {
    issues.push({
      code: 'template_exercise_target_reps_min_invalid',
      path: 'targetRepsMin',
      message: 'Minimum target reps must be greater than 0.',
    });
  }

  if (!isPositiveInteger(input.targetRepsMax)) {
    issues.push({
      code: 'template_exercise_target_reps_max_invalid',
      path: 'targetRepsMax',
      message: 'Maximum target reps must be greater than 0.',
    });
  }

  if (
    Number.isFinite(input.targetRepsMin) &&
    Number.isFinite(input.targetRepsMax) &&
    input.targetRepsMax < input.targetRepsMin
  ) {
    issues.push({
      code: 'template_exercise_target_reps_range_invalid',
      path: 'targetRepsMax',
      message: 'Target rep range cannot be reversed.',
    });
  }

  if (!isNonNegativeInteger(input.restSeconds)) {
    issues.push({
      code: 'template_exercise_rest_seconds_invalid',
      path: 'restSeconds',
      message: 'Rest seconds cannot be negative.',
    });
  }

  if (!isIsoDateTime(input.createdAt)) {
    issues.push({
      code: 'template_exercise_created_at_invalid',
      path: 'createdAt',
      message: 'createdAt must be an ISO 8601 timestamp.',
    });
  }

  if (!isIsoDateTime(input.updatedAt)) {
    issues.push({
      code: 'template_exercise_updated_at_invalid',
      path: 'updatedAt',
      message: 'updatedAt must be an ISO 8601 timestamp.',
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    templateExercise: {
      id: id as TemplateExerciseId,
      templateId: templateId as WorkoutTemplateId,
      exerciseId: exerciseId as ExerciseId,
      position: input.position as TemplateExercisePosition,
      targetSets: input.targetSets as TargetSetCount,
      targetReps: {
        min: input.targetRepsMin as TargetRepCount,
        max: input.targetRepsMax as TargetRepCount,
      },
      restSeconds: input.restSeconds as RestDurationSeconds,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
  };
}

export function canStartWorkoutFromTemplate(
  template: WorkoutTemplate,
): boolean {
  return template.status === 'active' && template.exercises.length > 0;
}

export function assertWorkoutTemplateCanStart(template: WorkoutTemplate): void {
  const issues: WorkoutTemplateValidationIssue[] = [];

  if (template.status !== 'active') {
    issues.push({
      code: 'workout_template_start_requires_active_status',
      path: 'status',
      message: 'Only active WorkoutTemplate can start a WorkoutSession.',
    });
  }

  if (template.exercises.length === 0) {
    issues.push({
      code: 'workout_template_start_requires_exercise',
      path: 'exercises',
      message:
        'WorkoutTemplate must include at least one exercise before starting.',
    });
  }

  if (issues.length > 0) {
    throw new WorkoutTemplateValidationError(issues);
  }
}

export function isWorkoutTemplateStatus(
  value: string,
): value is WorkoutTemplateStatus {
  return WORKOUT_TEMPLATE_STATUSES.includes(value as WorkoutTemplateStatus);
}

function sortTemplateExercises(
  exercises: readonly TemplateExercise[],
): readonly TemplateExercise[] {
  return [...exercises].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.id.localeCompare(right.id);
  });
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isIsoDateTime(value: string): boolean {
  const parsedTime = Date.parse(value);

  return Number.isFinite(parsedTime) && value.includes('T');
}
