import {
  createExercise,
  validateExerciseInput,
  type Exercise,
  type ExerciseInput,
} from '@/domain/exercise';
import type { DatabaseConnection } from '@/database/types';

import {
  STARTER_EXERCISE_SEED_VERSION,
  STARTER_EXERCISES,
} from './starter-exercises';
import type {
  ExerciseSeedImportSummary,
  ExerciseSeedRow,
  ExerciseSeedValidationIssue,
} from './types';

export class ExerciseSeedValidationError extends Error {
  constructor(readonly issues: readonly ExerciseSeedValidationIssue[]) {
    super('Invalid exercise seed data.');
    this.name = 'ExerciseSeedValidationError';
  }
}

export async function importStarterExerciseSeed(
  database: DatabaseConnection,
): Promise<ExerciseSeedImportSummary> {
  return importExerciseSeed(database, {
    seedVersion: STARTER_EXERCISE_SEED_VERSION,
    rows: STARTER_EXERCISES,
  });
}

export async function importExerciseSeed(
  database: DatabaseConnection,
  seed: {
    readonly seedVersion: string;
    readonly rows: readonly ExerciseSeedRow[];
  },
): Promise<ExerciseSeedImportSummary> {
  const exercises = validateExerciseSeedRows(seed.rows);

  await database.execAsync('BEGIN IMMEDIATE;');

  try {
    for (const exercise of exercises) {
      await upsertExercise(database, exercise);
    }

    await database.execAsync('COMMIT;');
  } catch (error) {
    await rollback(database);
    throw error;
  }

  return {
    seedVersion: seed.seedVersion,
    attemptedRows: seed.rows.length,
    importedRows: exercises.length,
  };
}

export function validateExerciseSeedRows(
  rows: readonly ExerciseSeedRow[],
): readonly Exercise[] {
  const issues: ExerciseSeedValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  rows.forEach((row, index) => {
    if (!row.sourceName.trim()) {
      issues.push({
        rowIndex: index,
        exerciseId: row.id,
        message: 'Seed row must include sourceName.',
      });
    }

    if (!row.sourceReference.trim()) {
      issues.push({
        rowIndex: index,
        exerciseId: row.id,
        message: 'Seed row must include sourceReference.',
      });
    }

    if (!row.license.trim()) {
      issues.push({
        rowIndex: index,
        exerciseId: row.id,
        message: 'Seed row must include license.',
      });
    }

    if (seenIds.has(row.id)) {
      issues.push({
        rowIndex: index,
        exerciseId: row.id,
        message: `Duplicate seed exercise id: ${row.id}.`,
      });
    }
    seenIds.add(row.id);

    if (seenSlugs.has(row.slug)) {
      issues.push({
        rowIndex: index,
        exerciseId: row.id,
        message: `Duplicate seed exercise slug: ${row.slug}.`,
      });
    }
    seenSlugs.add(row.slug);

    const domainResult = validateExerciseInput(toExerciseInput(row));
    if (!domainResult.valid) {
      for (const domainIssue of domainResult.issues) {
        issues.push({
          rowIndex: index,
          exerciseId: row.id,
          message: `${domainIssue.path}: ${domainIssue.message}`,
        });
      }
    }
  });

  if (issues.length > 0) {
    throw new ExerciseSeedValidationError(issues);
  }

  return rows.map((row) => createExercise(toExerciseInput(row)));
}

async function upsertExercise(
  database: DatabaseConnection,
  exercise: Exercise,
): Promise<void> {
  await database.runAsync(
    `
    INSERT INTO exercises (
      id,
      slug,
      name_zh,
      name_en,
      exercise_type,
      primary_muscle_group,
      secondary_muscle_groups_json,
      equipment,
      description,
      image_uri,
      source_name,
      source_reference,
      is_active,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name_zh = excluded.name_zh,
      name_en = excluded.name_en,
      exercise_type = excluded.exercise_type,
      primary_muscle_group = excluded.primary_muscle_group,
      secondary_muscle_groups_json = excluded.secondary_muscle_groups_json,
      equipment = excluded.equipment,
      description = excluded.description,
      image_uri = excluded.image_uri,
      source_name = excluded.source_name,
      source_reference = excluded.source_reference,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at;
    `,
    exercise.id,
    exercise.slug,
    exercise.nameZh,
    exercise.nameEn ?? null,
    exercise.type,
    exercise.primaryMuscleGroup,
    JSON.stringify(exercise.secondaryMuscleGroups),
    exercise.equipment,
    exercise.description ?? null,
    exercise.imageUri ?? null,
    exercise.source?.name ?? null,
    exercise.source?.reference ?? null,
    exercise.status === 'active' ? 1 : 0,
    exercise.createdAt,
    exercise.updatedAt,
  );
}

async function rollback(database: DatabaseConnection): Promise<void> {
  try {
    await database.execAsync('ROLLBACK;');
  } catch {
    // Preserve the original import failure.
  }
}

function toExerciseInput(row: ExerciseSeedRow): ExerciseInput {
  return {
    ...row,
    sourceReference: formatSourceReference(row),
  };
}

function formatSourceReference(row: ExerciseSeedRow): string {
  return `${row.sourceReference}; license=${row.license}`;
}
