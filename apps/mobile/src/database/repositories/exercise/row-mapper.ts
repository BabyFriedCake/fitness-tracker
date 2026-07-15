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
  readonly image_uri: string | null;
  readonly source_name: string | null;
  readonly source_reference: string | null;
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
    imageUri: row.image_uri,
    sourceName: row.source_name,
    sourceReference: row.source_reference,
    status: row.is_active === 1 ? 'active' : 'inactive',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
