import {
  EQUIPMENT_TYPES,
  EXERCISE_STATUSES,
  EXERCISE_TYPES,
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type ExerciseId,
  type ExerciseInput,
  type ExerciseStatus,
  type ExerciseType,
  type MuscleGroup,
} from './types';

export type ExerciseValidationIssueCode =
  | 'exercise_id_required'
  | 'exercise_slug_invalid'
  | 'exercise_name_zh_required'
  | 'exercise_type_invalid'
  | 'exercise_primary_muscle_group_invalid'
  | 'exercise_secondary_muscle_group_invalid'
  | 'exercise_equipment_invalid'
  | 'exercise_status_invalid'
  | 'exercise_created_at_invalid'
  | 'exercise_updated_at_invalid';

export type ExerciseValidationIssue = {
  readonly code: ExerciseValidationIssueCode;
  readonly path: keyof ExerciseInput;
  readonly message: string;
};

export type ExerciseValidationResult =
  | {
      readonly valid: true;
      readonly exercise: Exercise;
    }
  | {
      readonly valid: false;
      readonly issues: readonly ExerciseValidationIssue[];
    };

export class ExerciseValidationError extends Error {
  constructor(readonly issues: readonly ExerciseValidationIssue[]) {
    super('Invalid Exercise data.');
    this.name = 'ExerciseValidationError';
  }
}

export function createExercise(input: ExerciseInput): Exercise {
  const result = validateExerciseInput(input);

  if (!result.valid) {
    throw new ExerciseValidationError(result.issues);
  }

  return result.exercise;
}

export function validateExerciseInput(
  input: ExerciseInput,
): ExerciseValidationResult {
  const issues: ExerciseValidationIssue[] = [];
  const id = input.id.trim();
  const slug = input.slug.trim();
  const nameZh = input.nameZh.trim();
  const nameEn = normalizeOptionalText(input.nameEn);
  const description = normalizeOptionalText(input.description);
  const imageUri = normalizeOptionalText(input.imageUri);
  const sourceName = normalizeOptionalText(input.sourceName);
  const sourceReference = normalizeOptionalText(input.sourceReference);
  const secondaryMuscleGroups = input.secondaryMuscleGroups ?? [];

  if (!id) {
    issues.push({
      code: 'exercise_id_required',
      path: 'id',
      message: 'Exercise must have a stable id.',
    });
  }

  if (!isValidSlug(slug)) {
    issues.push({
      code: 'exercise_slug_invalid',
      path: 'slug',
      message: 'Exercise slug must be lowercase letters, numbers, or hyphens.',
    });
  }

  if (!nameZh) {
    issues.push({
      code: 'exercise_name_zh_required',
      path: 'nameZh',
      message: 'Exercise must have a Chinese name.',
    });
  }

  if (!isExerciseType(input.type)) {
    issues.push({
      code: 'exercise_type_invalid',
      path: 'type',
      message: 'Exercise type must match the approved exercise_type values.',
    });
  }

  if (!isMuscleGroup(input.primaryMuscleGroup)) {
    issues.push({
      code: 'exercise_primary_muscle_group_invalid',
      path: 'primaryMuscleGroup',
      message: 'Primary muscle group must match the approved value set.',
    });
  }

  for (const secondaryMuscleGroup of secondaryMuscleGroups) {
    if (!isMuscleGroup(secondaryMuscleGroup)) {
      issues.push({
        code: 'exercise_secondary_muscle_group_invalid',
        path: 'secondaryMuscleGroups',
        message: 'Secondary muscle groups must match the approved value set.',
      });
      break;
    }
  }

  if (!isEquipment(input.equipment)) {
    issues.push({
      code: 'exercise_equipment_invalid',
      path: 'equipment',
      message: 'Equipment must match the approved value set.',
    });
  }

  if (!isExerciseStatus(input.status)) {
    issues.push({
      code: 'exercise_status_invalid',
      path: 'status',
      message: 'Exercise status must be active or inactive.',
    });
  }

  if (!isIsoDateTime(input.createdAt)) {
    issues.push({
      code: 'exercise_created_at_invalid',
      path: 'createdAt',
      message: 'createdAt must be an ISO 8601 timestamp.',
    });
  }

  if (!isIsoDateTime(input.updatedAt)) {
    issues.push({
      code: 'exercise_updated_at_invalid',
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
    exercise: {
      id: id as ExerciseId,
      slug,
      nameZh,
      ...(nameEn ? { nameEn } : {}),
      type: input.type as ExerciseType,
      primaryMuscleGroup: input.primaryMuscleGroup as MuscleGroup,
      secondaryMuscleGroups: secondaryMuscleGroups as readonly MuscleGroup[],
      equipment: input.equipment as Equipment,
      ...(description ? { description } : {}),
      ...(imageUri ? { imageUri } : {}),
      ...(sourceName || sourceReference
        ? {
            source: {
              ...(sourceName ? { name: sourceName } : {}),
              ...(sourceReference ? { reference: sourceReference } : {}),
            },
          }
        : {}),
      status: input.status as ExerciseStatus,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
  };
}

export function isExerciseType(value: string): value is ExerciseType {
  return EXERCISE_TYPES.includes(value as ExerciseType);
}

export function isMuscleGroup(value: string): value is MuscleGroup {
  return MUSCLE_GROUPS.includes(value as MuscleGroup);
}

export function isEquipment(value: string): value is Equipment {
  return EQUIPMENT_TYPES.includes(value as Equipment);
}

export function isExerciseStatus(value: string): value is ExerciseStatus {
  return EXERCISE_STATUSES.includes(value as ExerciseStatus);
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isIsoDateTime(value: string): boolean {
  const parsedTime = Date.parse(value);

  return Number.isFinite(parsedTime) && value.includes('T');
}
