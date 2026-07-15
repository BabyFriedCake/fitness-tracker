/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import {
  createSqliteExerciseRepository,
  ExerciseRowMappingError,
} from '@/database/repositories/exercise';
import { importExerciseSeed } from '@/database/seed/exercises';
import type { ExerciseSeedRow } from '@/database/seed/exercises';
import type { ExerciseId } from '@/domain/exercise';

const EXERCISE_SEED_ROWS = [
  buildSeedExercise({
    id: 'exercise-barbell-bench-press',
    slug: 'barbell-bench-press',
    nameZh: '杠铃卧推',
    nameEn: 'Barbell Bench Press',
    primaryMuscleGroup: 'chest',
    equipment: 'barbell',
  }),
  buildSeedExercise({
    id: 'exercise-incline-dumbbell-press',
    slug: 'incline-dumbbell-press',
    nameZh: '上斜哑铃卧推',
    nameEn: 'Incline Dumbbell Press',
    primaryMuscleGroup: 'chest',
    equipment: 'dumbbell',
  }),
  buildSeedExercise({
    id: 'exercise-lat-pulldown',
    slug: 'lat-pulldown',
    nameZh: '高位下拉',
    nameEn: 'Lat Pulldown',
    primaryMuscleGroup: 'back',
    equipment: 'machine',
  }),
  buildSeedExercise({
    id: 'exercise-archived-chest-fly',
    slug: 'archived-chest-fly',
    nameZh: '停用飞鸟',
    nameEn: 'Archived Chest Fly',
    primaryMuscleGroup: 'chest',
    equipment: 'machine',
    status: 'inactive',
  }),
] as const satisfies readonly ExerciseSeedRow[];

describe('SQLite ExerciseRepository', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
    await runMigrations(database);
    await importExerciseSeed(database, {
      seedVersion: 'repository-test-v1',
      rows: EXERCISE_SEED_ROWS,
    });
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('lists active exercises in deterministic order by default', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.list();

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-incline-dumbbell-press',
      'exercise-barbell-bench-press',
      'exercise-lat-pulldown',
    ]);
    expect(exercises.every((exercise) => exercise.status === 'active')).toBe(
      true,
    );
  });

  it('returns an inactive exercise by explicit detail lookup', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercise = await repository.getById(
      toExerciseId('exercise-archived-chest-fly'),
    );

    expect(exercise).toEqual(
      expect.objectContaining({
        id: 'exercise-archived-chest-fly',
        status: 'inactive',
      }),
    );
  });

  it('searches by Chinese name substring', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.search({ text: '卧推' });

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-incline-dumbbell-press',
      'exercise-barbell-bench-press',
    ]);
  });

  it('searches by English name substring case-insensitively', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.search({ text: 'bench PRESS' });

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-barbell-bench-press',
    ]);
  });

  it('ignores search whitespace and combines search with filters', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.search(
      { text: '  PRESS  ' },
      {
        muscleGroups: ['chest'],
        equipment: ['dumbbell'],
      },
    );

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-incline-dumbbell-press',
    ]);
  });

  it('treats empty search text as the normal filtered list', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.search({
      text: '   ',
    });

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-incline-dumbbell-press',
      'exercise-barbell-bench-press',
      'exercise-lat-pulldown',
    ]);
  });

  it('combines muscle-group and equipment filters', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.listByFilters({
      muscleGroups: ['chest'],
      equipment: ['dumbbell'],
    });

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-incline-dumbbell-press',
    ]);
  });

  it('can include inactive exercises when the status filter requests them', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.list({
      filters: {
        statuses: ['inactive'],
      },
    });

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-archived-chest-fly',
    ]);
  });

  it('looks up selected active IDs in the requested order', async () => {
    const repository = createSqliteExerciseRepository(database);

    const exercises = await repository.getSelectedByIds([
      toExerciseId('exercise-barbell-bench-press'),
      toExerciseId('exercise-archived-chest-fly'),
      toExerciseId('exercise-lat-pulldown'),
    ]);

    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'exercise-barbell-bench-press',
      'exercise-lat-pulldown',
    ]);
  });

  it('rejects malformed database rows during row mapping', async () => {
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      'exercise-broken-row',
      'broken-row',
      '坏数据',
      null,
      'strength',
      'chest',
      'not-json',
      'barbell',
      null,
      null,
      'test',
      'test',
      1,
      '2026-07-15T00:00:00.000Z',
      '2026-07-15T00:00:00.000Z',
    );

    const repository = createSqliteExerciseRepository(database);

    await expect(
      repository.getById(toExerciseId('exercise-broken-row')),
    ).rejects.toBeInstanceOf(ExerciseRowMappingError);
  });
});

function buildSeedExercise(
  overrides: Partial<ExerciseSeedRow>,
): ExerciseSeedRow {
  return {
    id: 'exercise-default',
    slug: 'exercise-default',
    nameZh: '默认动作',
    nameEn: 'Default Exercise',
    type: 'strength',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: [],
    equipment: 'barbell',
    description: null,
    imageUri: null,
    sourceName: 'Repository Test Seed',
    sourceReference: 'repository-test-v1',
    license: 'CC0-1.0',
    status: 'active',
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

function toExerciseId(value: string): ExerciseId {
  return value as ExerciseId;
}
