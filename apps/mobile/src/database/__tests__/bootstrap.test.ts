/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  initializeApplicationDatabase,
  isDatabaseReady,
} from '@/database/bootstrap';
import { enableForeignKeys } from '@/database/connection';
import { toDatabaseError } from '@/database/errors';
import { BUNDLED_EXERCISES } from '@/database/seed/exercises';

type CountRow = {
  readonly count: number;
};

describe('database bootstrap service', () => {
  let database: SQLiteDatabase | undefined;

  afterEach(async () => {
    await database?.closeAsync();
    database = undefined;
  });

  it('returns a ready startup result after migrations complete', async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);

    const result = await initializeApplicationDatabase(async () => database!);
    const seededExercises = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM exercises;',
    );

    expect(isDatabaseReady(result)).toBe(true);
    expect(result.status).toBe('ready');
    expect(seededExercises?.count).toBe(BUNDLED_EXERCISES.length);
  });

  it('returns an error startup result when database initialization fails', async () => {
    const result = await initializeApplicationDatabase(async () => {
      throw toDatabaseError(null, 'database_migration_failed');
    });

    expect(result).toEqual({
      status: 'error',
      error: {
        code: 'database_migration_failed',
        message: '本地数据库升级失败，训练数据未被修改。',
      },
    });
  });
});
