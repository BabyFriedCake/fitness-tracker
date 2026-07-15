/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import {
  ExerciseSeedValidationError,
  STARTER_EXERCISE_LICENSE,
  STARTER_EXERCISE_SEED_VERSION,
  STARTER_EXERCISES,
  importExerciseSeed,
  importStarterExerciseSeed,
} from '@/database/seed/exercises';
import type { ExerciseSeedRow } from '@/database/seed/exercises';

type CountRow = {
  readonly count: number;
};

type ExerciseRow = {
  readonly id: string;
  readonly name_zh: string;
  readonly source_reference: string;
  readonly updated_at: string;
};

describe('exercise seed import', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
    await runMigrations(database);
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('imports the starter exercise seed into a fresh database', async () => {
    const result = await importStarterExerciseSeed(database);

    const row = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM exercises;',
    );
    const sourceRow = await database.getFirstAsync<ExerciseRow>(
      'SELECT id, name_zh, source_reference, updated_at FROM exercises WHERE id = ?;',
      STARTER_EXERCISES[0].id,
    );

    expect(result).toEqual({
      seedVersion: STARTER_EXERCISE_SEED_VERSION,
      attemptedRows: STARTER_EXERCISES.length,
      importedRows: STARTER_EXERCISES.length,
    });
    expect(row?.count).toBe(STARTER_EXERCISES.length);
    expect(sourceRow).toEqual(
      expect.objectContaining({
        id: STARTER_EXERCISES[0].id,
        name_zh: STARTER_EXERCISES[0].nameZh,
        source_reference: `${STARTER_EXERCISE_SEED_VERSION}; license=${STARTER_EXERCISE_LICENSE}`,
      }),
    );
  });

  it('can safely import the same seed more than once without duplicates', async () => {
    await importStarterExerciseSeed(database);
    await importStarterExerciseSeed(database);

    const row = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM exercises;',
    );

    expect(row?.count).toBe(STARTER_EXERCISES.length);
  });

  it('rejects invalid seed rows before persistence with actionable errors', async () => {
    const invalidSeedRows: readonly ExerciseSeedRow[] = [
      {
        ...STARTER_EXERCISES[0],
        id: ' ',
        slug: 'Invalid Slug',
        nameZh: '',
        sourceName: '',
        sourceReference: '',
        license: '',
      },
    ];

    await expect(
      importExerciseSeed(database, {
        seedVersion: 'invalid-v1',
        rows: invalidSeedRows,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ExerciseSeedValidationError',
        issues: expect.arrayContaining([
          expect.objectContaining({
            message: 'Seed row must include sourceName.',
          }),
          expect.objectContaining({
            message: 'Seed row must include sourceReference.',
          }),
          expect.objectContaining({
            message: 'Seed row must include license.',
          }),
          expect.objectContaining({
            message: expect.stringContaining('Exercise must have a stable id.'),
          }),
        ]),
      } satisfies Partial<ExerciseSeedValidationError>),
    );

    const row = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM exercises;',
    );
    expect(row?.count).toBe(0);
  });

  it('updates existing seeded rows while preserving their stable IDs', async () => {
    await importStarterExerciseSeed(database);

    const upgradedRow: ExerciseSeedRow = {
      ...STARTER_EXERCISES[0],
      nameZh: '杠铃卧推（更新）',
      sourceReference: 'starter-v2',
      updatedAt: '2026-07-16T00:00:00.000Z',
    };

    await importExerciseSeed(database, {
      seedVersion: 'starter-v2',
      rows: [upgradedRow],
    });

    const countRow = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM exercises WHERE id = ?;',
      STARTER_EXERCISES[0].id,
    );
    const updatedRow = await database.getFirstAsync<ExerciseRow>(
      'SELECT id, name_zh, source_reference, updated_at FROM exercises WHERE id = ?;',
      STARTER_EXERCISES[0].id,
    );

    expect(countRow?.count).toBe(1);
    expect(updatedRow).toEqual({
      id: STARTER_EXERCISES[0].id,
      name_zh: '杠铃卧推（更新）',
      source_reference: 'starter-v2; license=CC0-1.0',
      updated_at: '2026-07-16T00:00:00.000Z',
    });
  });
});
