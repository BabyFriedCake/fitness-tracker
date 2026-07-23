import {
  ExerciseValidationError,
  createExercise,
  type Exercise,
  type ExerciseInput,
} from '@/domain/exercise';

export type ExerciseRow = {
  readonly id: string;
  readonly slug: string;
  readonly name_zh: string;
  readonly name_en: string | null;
  readonly exercise_type: string;
  readonly primary_muscle_group: string;
  readonly secondary_muscle_groups_json: string | null;
  readonly equipment: string;
  readonly description: string | null;
  readonly instruction_steps_json: string | null;
  readonly image_uri: string | null;
  readonly source_name: string | null;
  readonly source_reference: string | null;
  readonly source_license: string | null;
  readonly source_attribution: string | null;
  readonly is_active: number;
  readonly created_at: string;
  readonly updated_at: string;
};

export class ExerciseRowMappingError extends Error {
  constructor(
    readonly exerciseId: string,
    readonly cause: unknown,
  ) {
    super(`Invalid Exercise database row: ${exerciseId}.`);
    this.name = 'ExerciseRowMappingError';
  }
}

export function mapExerciseRow(row: ExerciseRow): Exercise {
  try {
    return createExercise(toExerciseInput(row));
  } catch (error) {
    if (error instanceof ExerciseValidationError) {
      throw new ExerciseRowMappingError(row.id, error.issues);
    }

    throw new ExerciseRowMappingError(row.id, error);
  }
}

function toExerciseInput(row: ExerciseRow): ExerciseInput {
  return {
    id: row.id,
    slug: row.slug,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    type: row.exercise_type,
    primaryMuscleGroup: row.primary_muscle_group,
    secondaryMuscleGroups: parseSecondaryMuscleGroups(row),
    equipment: row.equipment,
    description: row.description,
    instructionSteps: parseInstructionSteps(row),
    imageUri: row.image_uri,
    sourceName: row.source_name,
    sourceReference: row.source_reference,
    sourceLicense: row.source_license,
    sourceAttribution: row.source_attribution,
    status: row.is_active === 1 ? 'active' : 'inactive',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseInstructionSteps(
  row: ExerciseRow,
): ExerciseInput['instructionSteps'] {
  if (!row.instruction_steps_json) {
    return undefined;
  }

  try {
    const parsedValue: unknown = JSON.parse(row.instruction_steps_json);

    if (
      typeof parsedValue !== 'object' ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      throw new Error('instruction_steps_json must be an object.');
    }

    for (const steps of Object.values(parsedValue)) {
      if (
        !Array.isArray(steps) ||
        steps.some((step) => typeof step !== 'string')
      ) {
        throw new Error('instruction_steps_json values must be string arrays.');
      }
    }

    return parsedValue as ExerciseInput['instructionSteps'];
  } catch (error) {
    throw new ExerciseRowMappingError(row.id, error);
  }
}

function parseSecondaryMuscleGroups(row: ExerciseRow): readonly string[] {
  if (!row.secondary_muscle_groups_json) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(row.secondary_muscle_groups_json);

    if (!Array.isArray(parsedValue)) {
      throw new Error('secondary_muscle_groups_json must be an array.');
    }

    return parsedValue;
  } catch (error) {
    throw new ExerciseRowMappingError(row.id, error);
  }
}
