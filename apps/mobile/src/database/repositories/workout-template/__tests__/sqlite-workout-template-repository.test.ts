/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import {
  WorkoutTemplateRowMappingError,
  createSqliteWorkoutTemplateRepository,
  mapWorkoutTemplateRows,
  runWorkoutTemplateRepositoryTransaction,
  WorkoutTemplatePaginationError,
} from '@/database/repositories/workout-template';
import type { DatabaseConnection } from '@/database/types';
import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutTemplateId,
} from '@/domain/workout-template';

const CREATED_AT = '2026-07-16T00:00:00.000Z';
const UPDATED_AT = '2026-07-16T01:00:00.000Z';
const ARCHIVED_AT = '2026-07-16T02:00:00.000Z';

type CountRow = {
  readonly count: number;
};

describe('SQLite WorkoutTemplateRepository', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
    await runMigrations(database);
    await insertExercise('exercise-bench-press');
    await insertExercise('exercise-row');
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('creates templates and reads template exercises in position order', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    const template = await repository.create(
      buildCreateInput({
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-exercise-second',
            position: 2,
            exerciseId: 'exercise-row',
          }),
          buildTemplateExerciseInput({
            id: 'template-exercise-first',
            position: 1,
            exerciseId: 'exercise-bench-press',
          }),
        ],
      }),
    );
    const detail = await repository.getById(toTemplateId('template-push'));

    expect(template.status).toBe('active');
    expect(detail?.exercises.map((exercise) => exercise.id)).toEqual([
      'template-exercise-first',
      'template-exercise-second',
    ]);
    expect(detail?.exercises.map((exercise) => exercise.exerciseId)).toEqual([
      'exercise-bench-press',
      'exercise-row',
    ]);
  });

  it('lists active templates by default and can explicitly include archived templates', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await repository.create(
      buildCreateInput({
        id: 'template-active',
        name: 'Active Template',
        updatedAt: '2026-07-16T01:00:00.000Z',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-active-exercise',
            templateId: 'template-active',
            exerciseId: 'exercise-bench-press',
          }),
        ],
      }),
    );
    await repository.create(
      buildCreateInput({
        id: 'template-to-archive',
        name: 'Archived Template',
        updatedAt: '2026-07-16T02:00:00.000Z',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-archive-exercise',
            templateId: 'template-to-archive',
            exerciseId: 'exercise-row',
          }),
        ],
      }),
    );
    await repository.archive(toTemplateId('template-to-archive'), ARCHIVED_AT);

    const defaultList = await repository.list();
    const archivedList = await repository.list({
      filters: {
        statuses: ['archived'],
      },
    });
    const defaultArchivedDetail = await repository.getById(
      toTemplateId('template-to-archive'),
    );
    const explicitArchivedDetail = await repository.getById(
      toTemplateId('template-to-archive'),
      {
        includeArchived: true,
      },
    );

    expect(defaultList.map((template) => template.id)).toEqual([
      'template-active',
    ]);
    expect(archivedList.map((template) => template.id)).toEqual([
      'template-to-archive',
    ]);
    expect(defaultArchivedDetail).toBeNull();
    expect(explicitArchivedDetail).toEqual(
      expect.objectContaining({
        id: 'template-to-archive',
        status: 'archived',
        archivedAt: ARCHIVED_AT,
      }),
    );
  });

  it('supports list search, status filters, and pagination', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await repository.create(
      buildCreateInput({
        id: 'template-push',
        name: 'Push Strength',
        updatedAt: '2026-07-16T01:00:00.000Z',
      }),
    );
    await repository.create(
      buildCreateInput({
        id: 'template-pull',
        name: 'Pull Strength',
        description: 'Back day',
        updatedAt: '2026-07-16T02:00:00.000Z',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-pull-exercise',
            templateId: 'template-pull',
            exerciseId: 'exercise-row',
          }),
        ],
      }),
    );
    await repository.create(
      buildCreateInput({
        id: 'template-legs',
        name: 'Legs',
        description: 'Strength lower body',
        updatedAt: '2026-07-16T03:00:00.000Z',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-legs-exercise',
            templateId: 'template-legs',
            exerciseId: 'exercise-bench-press',
          }),
        ],
      }),
    );

    const searched = await repository.list({
      search: {
        text: 'strength',
      },
      limit: 2,
      offset: 1,
    });

    expect(searched.map((template) => template.id)).toEqual([
      'template-pull',
      'template-push',
    ]);
  });

  it('supports offset-only pagination with an implicit unlimited limit', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);
    await createPaginationTemplates(repository);

    const templates = await repository.list({
      offset: 1,
    });

    expect(templates.map((template) => template.id)).toEqual([
      'template-pull',
      'template-push',
    ]);
  });

  it('supports limit plus offset pagination', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);
    await createPaginationTemplates(repository);

    const templates = await repository.list({
      limit: 1,
      offset: 1,
    });

    expect(templates.map((template) => template.id)).toEqual(['template-pull']);
  });

  it('supports zero limit pagination', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);
    await createPaginationTemplates(repository);

    const templates = await repository.list({
      limit: 0,
    });

    expect(templates).toEqual([]);
  });

  it('rejects negative pagination values', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await expect(repository.list({ limit: -1 })).rejects.toThrow(
      WorkoutTemplatePaginationError,
    );
    await expect(repository.list({ offset: -1 })).rejects.toThrow(
      WorkoutTemplatePaginationError,
    );
  });

  it('rejects fractional pagination values', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await expect(repository.list({ limit: 1.5 })).rejects.toThrow(
      WorkoutTemplatePaginationError,
    );
    await expect(repository.list({ offset: 1.5 })).rejects.toThrow(
      WorkoutTemplatePaginationError,
    );
  });

  it('updates template metadata and replaces exercise configuration in a transaction', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await repository.create(
      buildCreateInput({
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-exercise-original',
            position: 1,
            exerciseId: 'exercise-bench-press',
          }),
        ],
      }),
    );

    const updated = await repository.update(
      buildUpdateInput({
        name: 'Updated Push',
        description: 'Updated description',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-exercise-row',
            position: 1,
            exerciseId: 'exercise-row',
            targetSets: 4,
            targetRepsMin: 10,
            targetRepsMax: 12,
            restSeconds: 120,
          }),
        ],
      }),
    );
    const detail = await repository.getById(toTemplateId('template-push'));

    expect(updated.createdAt).toBe(CREATED_AT);
    expect(updated.updatedAt).toBe(UPDATED_AT);
    expect(detail).toEqual(
      expect.objectContaining({
        name: 'Updated Push',
        description: 'Updated description',
      }),
    );
    expect(detail?.exercises).toHaveLength(1);
    expect(detail?.exercises[0]).toEqual(
      expect.objectContaining({
        id: 'template-exercise-row',
        exerciseId: 'exercise-row',
        targetSets: 4,
        restSeconds: 120,
      }),
    );
  });

  it('updates template content without overwriting lifecycle fields', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await repository.create(buildCreateInput());
    await repository.archive(toTemplateId('template-push'), ARCHIVED_AT);

    const updated = await repository.update(
      buildUpdateInput({
        name: 'Archived Content Update',
        updatedAt: '2026-07-16T03:00:00.000Z',
      }),
    );
    const detail = await repository.getById(toTemplateId('template-push'), {
      includeArchived: true,
    });

    expect(updated.status).toBe('archived');
    expect(updated.archivedAt).toBe(ARCHIVED_AT);
    expect(detail).toEqual(
      expect.objectContaining({
        name: 'Archived Content Update',
        status: 'archived',
        archivedAt: ARCHIVED_AT,
      }),
    );
  });

  it('rolls back create when an exercise reference is invalid', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await expect(
      repository.create(
        buildCreateInput({
          exercises: [
            buildTemplateExerciseInput({
              exerciseId: 'missing-exercise',
            }),
          ],
        }),
      ),
    ).rejects.toThrow();

    expect(await getTableCount('workout_templates')).toBe(0);
    expect(await getTableCount('workout_template_exercises')).toBe(0);
  });

  it('rolls back update and preserves existing exercise rows when replacement fails', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await repository.create(
      buildCreateInput({
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-exercise-original',
            position: 1,
            exerciseId: 'exercise-bench-press',
          }),
        ],
      }),
    );

    await expect(
      repository.update(
        buildUpdateInput({
          exercises: [
            buildTemplateExerciseInput({
              id: 'template-exercise-invalid',
              position: 1,
              exerciseId: 'missing-exercise',
            }),
          ],
        }),
      ),
    ).rejects.toThrow();

    const detail = await repository.getById(toTemplateId('template-push'));

    expect(detail?.name).toBe('Push');
    expect(detail?.exercises.map((exercise) => exercise.id)).toEqual([
      'template-exercise-original',
    ]);
  });

  it('archives templates without deleting exercise configuration', async () => {
    const repository = createSqliteWorkoutTemplateRepository(database);

    await repository.create(buildCreateInput());

    const archived = await repository.archive(
      toTemplateId('template-push'),
      ARCHIVED_AT,
    );
    const detail = await repository.getById(toTemplateId('template-push'), {
      includeArchived: true,
    });

    expect(archived.status).toBe('archived');
    expect(detail?.archivedAt).toBe(ARCHIVED_AT);
    expect(detail?.exercises).toHaveLength(1);
    expect(await getTableCount('workout_template_exercises')).toBe(1);
  });

  it('rejects malformed database rows during row mapping', () => {
    expect(() =>
      mapWorkoutTemplateRows(
        {
          id: 'template-broken',
          name: 'Broken Template',
          description: null,
          status: 'deleted',
          created_at: CREATED_AT,
          updated_at: UPDATED_AT,
          archived_at: null,
        },
        [],
      ),
    ).toThrow(WorkoutTemplateRowMappingError);
  });

  it('does not rollback when transaction begin fails', async () => {
    const beginError = new Error('begin failed');
    const fakeDatabase = createFakeTransactionDatabase({
      failOn: 'BEGIN IMMEDIATE;',
      error: beginError,
    });

    await expect(
      runWorkoutTemplateRepositoryTransaction(fakeDatabase, async () => {
        throw new Error('operation should not run');
      }),
    ).rejects.toBe(beginError);

    expect(fakeDatabase.getExecCalls()).toEqual(['BEGIN IMMEDIATE;']);
  });

  it('rolls back and preserves the original operation error', async () => {
    const operationError = new Error('operation failed');
    const fakeDatabase = createFakeTransactionDatabase();

    await expect(
      runWorkoutTemplateRepositoryTransaction(fakeDatabase, async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);

    expect(fakeDatabase.getExecCalls()).toEqual([
      'BEGIN IMMEDIATE;',
      'ROLLBACK;',
    ]);
  });

  it('preserves the original operation error when rollback fails', async () => {
    const operationError = new Error('operation failed');
    const fakeDatabase = createFakeTransactionDatabase({
      failOn: 'ROLLBACK;',
      error: new Error('rollback failed'),
    });

    await expect(
      runWorkoutTemplateRepositoryTransaction(fakeDatabase, async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);

    expect(fakeDatabase.getExecCalls()).toEqual([
      'BEGIN IMMEDIATE;',
      'ROLLBACK;',
    ]);
  });

  it('rolls back and preserves the original commit error', async () => {
    const commitError = new Error('commit failed');
    const fakeDatabase = createFakeTransactionDatabase({
      failOn: 'COMMIT;',
      error: commitError,
    });

    await expect(
      runWorkoutTemplateRepositoryTransaction(fakeDatabase, async () => {}),
    ).rejects.toBe(commitError);

    expect(fakeDatabase.getExecCalls()).toEqual([
      'BEGIN IMMEDIATE;',
      'COMMIT;',
      'ROLLBACK;',
    ]);
  });

  async function insertExercise(id: string): Promise<void> {
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
      id,
      id,
      id,
      id,
      'strength',
      'chest',
      '[]',
      'barbell',
      null,
      null,
      'test',
      'test',
      1,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function getTableCount(tableName: string): Promise<number> {
    const row = await database.getFirstAsync<CountRow>(
      `SELECT COUNT(*) AS count FROM ${tableName};`,
    );

    return row?.count ?? 0;
  }

  async function createPaginationTemplates(
    repository: ReturnType<typeof createSqliteWorkoutTemplateRepository>,
  ): Promise<void> {
    await repository.create(
      buildCreateInput({
        id: 'template-push',
        name: 'Push Strength',
        updatedAt: '2026-07-16T01:00:00.000Z',
      }),
    );
    await repository.create(
      buildCreateInput({
        id: 'template-pull',
        name: 'Pull Strength',
        description: 'Back day',
        updatedAt: '2026-07-16T02:00:00.000Z',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-pull-exercise',
            templateId: 'template-pull',
            exerciseId: 'exercise-row',
          }),
        ],
      }),
    );
    await repository.create(
      buildCreateInput({
        id: 'template-legs',
        name: 'Legs',
        description: 'Strength lower body',
        updatedAt: '2026-07-16T03:00:00.000Z',
        exercises: [
          buildTemplateExerciseInput({
            id: 'template-legs-exercise',
            templateId: 'template-legs',
            exerciseId: 'exercise-bench-press',
          }),
        ],
      }),
    );
  }
});

function buildCreateInput(
  overrides: Partial<CreateWorkoutTemplateInput> = {},
): CreateWorkoutTemplateInput {
  return {
    id: 'template-push',
    name: 'Push',
    description: 'Chest and shoulders',
    exercises: [
      buildTemplateExerciseInput({
        id: 'template-exercise-bench',
        position: 1,
        exerciseId: 'exercise-bench-press',
      }),
    ],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildUpdateInput(
  overrides: Partial<UpdateWorkoutTemplateInput> = {},
): UpdateWorkoutTemplateInput {
  return {
    id: 'template-push',
    name: 'Push',
    description: 'Chest and shoulders',
    exercises: [
      buildTemplateExerciseInput({
        id: 'template-exercise-bench',
        position: 1,
        exerciseId: 'exercise-bench-press',
      }),
    ],
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

function buildTemplateExerciseInput(
  overrides: {
    readonly id?: string;
    readonly templateId?: string;
    readonly exerciseId?: string;
    readonly position?: number;
    readonly targetSets?: number;
    readonly targetRepsMin?: number;
    readonly targetRepsMax?: number;
    readonly restSeconds?: number;
  } = {},
) {
  return {
    id: 'template-exercise-bench',
    templateId: 'template-push',
    exerciseId: 'exercise-bench-press',
    position: 1,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 10,
    restSeconds: 90,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function toTemplateId(value: string): WorkoutTemplateId {
  return value as WorkoutTemplateId;
}

function createFakeTransactionDatabase(
  options: {
    readonly failOn?: string;
    readonly error?: Error;
  } = {},
): DatabaseConnection & {
  readonly getExecCalls: () => readonly string[];
} {
  const execCalls: string[] = [];

  return {
    execAsync: async (source) => {
      execCalls.push(source);

      if (source === options.failOn) {
        throw options.error ?? new Error(`failed on ${source}`);
      }
    },
    runAsync: async () => ({}),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    getExecCalls: () => execCalls,
  };
}
