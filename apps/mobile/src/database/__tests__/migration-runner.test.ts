/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { LATEST_SCHEMA_VERSION } from '@/database/constants';
import { enableForeignKeys } from '@/database/connection';
import { isDatabaseError } from '@/database/errors';
import {
  getCurrentSchemaVersion,
  runMigrations,
} from '@/database/migration-runner';
import type { Migration } from '@/database/migrations';

const REQUIRED_TABLES = [
  'schema_migrations',
  'exercises',
  'workout_templates',
  'workout_template_exercises',
  'workout_sessions',
  'workout_session_exercises',
  'workout_sets',
  'rest_timer_states',
  'daily_statuses',
  'user_settings',
] as const;

const REQUIRED_INDEXES = [
  'idx_exercises_name_zh',
  'idx_exercises_name_en',
  'idx_exercises_muscle_equipment',
  'idx_exercises_active',
  'idx_workout_templates_status',
  'idx_workout_templates_updated_at',
  'idx_template_exercise_position',
  'idx_template_exercises_template',
  'idx_template_exercises_exercise',
  'idx_sessions_status',
  'idx_sessions_started_at',
  'idx_sessions_template',
  'idx_sessions_deleted',
  'idx_session_exercise_position',
  'idx_session_exercises_session',
  'idx_session_exercises_exercise',
  'idx_set_number_active',
  'idx_sets_session_exercise',
  'idx_sets_completed_at',
  'idx_sets_deleted',
  'idx_rest_timer_status',
  'idx_rest_timer_target_end',
  'idx_daily_status_date',
] as const;

type SqliteNameRow = {
  readonly name: string;
};

type CountRow = {
  readonly count: number;
};

type ForeignKeyRow = {
  readonly foreign_keys: number;
};

describe('database migration runner', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('migrates a fresh database to the latest schema', async () => {
    const result = await runMigrations(database);

    expect(result.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(result.appliedVersions).toEqual([1]);
    await expectSqliteObjects('table', REQUIRED_TABLES);
    await expectSqliteObjects('index', REQUIRED_INDEXES);
  });

  it('can safely run migrations more than once', async () => {
    await runMigrations(database);
    const rerunResult = await runMigrations(database);

    const migrationRows = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM schema_migrations;',
    );

    expect(rerunResult.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(rerunResult.appliedVersions).toEqual([]);
    expect(migrationRows?.count).toBe(1);
  });

  it('rolls back a failed migration without recording success', async () => {
    const failingMigrations: readonly Migration[] = [
      {
        version: 1,
        name: '0001_broken_migration',
        sql: `
          CREATE TABLE schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
          );
          CREATE TABLE should_not_survive_rollback (id TEXT PRIMARY KEY);
          INSERT INTO missing_table (id) VALUES ('broken');
        `,
      },
    ];

    await expect(runMigrations(database, failingMigrations)).rejects.toEqual(
      expect.objectContaining({
        code: 'database_migration_failed',
      }),
    );

    expect(await getCurrentSchemaVersion(database)).toBe(0);
    await expectObjectToBeMissing('table', 'schema_migrations');
    await expectObjectToBeMissing('table', 'should_not_survive_rollback');
  });

  it('enforces foreign keys for migrated connections', async () => {
    await runMigrations(database);

    const foreignKeyState = await database.getFirstAsync<ForeignKeyRow>(
      'PRAGMA foreign_keys;',
    );

    expect(foreignKeyState?.foreign_keys).toBe(1);
    await expect(
      database.runAsync(
        `
        INSERT INTO workout_template_exercises (
          id,
          template_id,
          exercise_id,
          position,
          target_sets,
          target_reps_min,
          target_reps_max,
          rest_seconds,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        'template-exercise-1',
        'missing-template',
        'missing-exercise',
        1,
        3,
        8,
        10,
        90,
        '2026-07-15T00:00:00.000Z',
        '2026-07-15T00:00:00.000Z',
      ),
    ).rejects.toThrow();
  });

  it('maps migration failures to an application-safe database error', async () => {
    const invalidMigrations: readonly Migration[] = [
      {
        version: 1,
        name: '0001_invalid_sql',
        sql: 'CREATE TABLE broken_table (id TEXT PRIMARY KEY); SELECT * FROM missing_table;',
      },
    ];

    try {
      await runMigrations(database, invalidMigrations);
      throw new Error('Expected migration to fail.');
    } catch (error) {
      expect(isDatabaseError(error)).toBe(true);
      expect(error).toEqual({
        code: 'database_migration_failed',
        message: '本地数据库升级失败，训练数据未被修改。',
      });
    }
  });

  async function expectSqliteObjects(
    type: 'index' | 'table',
    names: readonly string[],
  ): Promise<void> {
    const rows = await database.getAllAsync<SqliteNameRow>(
      'SELECT name FROM sqlite_master WHERE type = ?;',
      type,
    );
    const actualNames = new Set(rows.map((row) => row.name));

    for (const name of names) {
      expect(actualNames.has(name)).toBe(true);
    }
  }

  async function expectObjectToBeMissing(
    type: 'index' | 'table',
    name: string,
  ): Promise<void> {
    const row = await database.getFirstAsync<SqliteNameRow>(
      'SELECT name FROM sqlite_master WHERE type = ? AND name = ?;',
      type,
      name,
    );

    expect(row).toBeNull();
  }
});
