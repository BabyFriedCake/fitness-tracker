import bundledExerciseRows from './data/exercises-dataset-v7455efae.json';

import { importExerciseSeed } from './import-exercise-seed';
import type { ExerciseSeedImportSummary, ExerciseSeedRow } from './types';
import type { DatabaseConnection } from '@/database/types';

export const BUNDLED_EXERCISE_DATASET_VERSION =
  'hasaneyldrm-exercises-dataset-7455efae';

export const BUNDLED_EXERCISES =
  bundledExerciseRows as readonly ExerciseSeedRow[];

type CountRow = {
  readonly count: number;
  readonly first_image_uri: string | null;
  readonly first_name_zh: string | null;
};

export async function importBundledExerciseDataset(
  database: DatabaseConnection,
): Promise<ExerciseSeedImportSummary> {
  const firstExercise = BUNDLED_EXERCISES[0];
  const importedRow = firstExercise
    ? await database.getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count,
                (
                  SELECT image_uri
                  FROM exercises
                  WHERE id = ? AND source_name = ? AND source_reference = ?
                  LIMIT 1
                ) AS first_image_uri,
                (
                  SELECT name_zh
                  FROM exercises
                  WHERE id = ? AND source_name = ? AND source_reference = ?
                  LIMIT 1
                ) AS first_name_zh
         FROM exercises
         WHERE source_name = ? AND source_reference = ?;`,
        firstExercise.id,
        firstExercise.sourceName,
        firstExercise.sourceReference,
        firstExercise.id,
        firstExercise.sourceName,
        firstExercise.sourceReference,
        firstExercise.sourceName,
        firstExercise.sourceReference,
      )
    : null;

  if (
    importedRow?.count === BUNDLED_EXERCISES.length &&
    importedRow?.first_image_uri === firstExercise.imageUri &&
    importedRow?.first_name_zh === firstExercise.nameZh
  ) {
    return {
      seedVersion: BUNDLED_EXERCISE_DATASET_VERSION,
      attemptedRows: BUNDLED_EXERCISES.length,
      importedRows: 0,
    };
  }

  return importExerciseSeed(database, {
    seedVersion: BUNDLED_EXERCISE_DATASET_VERSION,
    rows: BUNDLED_EXERCISES,
  });
}
