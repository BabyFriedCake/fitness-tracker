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
  readonly image_count: number;
};

export async function importBundledExerciseDataset(
  database: DatabaseConnection,
): Promise<ExerciseSeedImportSummary> {
  const firstExercise = BUNDLED_EXERCISES[0];
  const importedRow = firstExercise
    ? await database.getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count,
                SUM(CASE WHEN image_uri IS NOT NULL THEN 1 ELSE 0 END) AS image_count
         FROM exercises
         WHERE source_name = ? AND source_reference = ?;`,
        firstExercise.sourceName,
        firstExercise.sourceReference,
      )
    : null;

  if (
    importedRow?.count === BUNDLED_EXERCISES.length &&
    importedRow?.image_count === BUNDLED_EXERCISES.length
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
