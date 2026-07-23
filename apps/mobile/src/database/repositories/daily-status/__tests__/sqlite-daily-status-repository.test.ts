/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import { createSqliteDailyStatusRepository } from '@/database/repositories/daily-status';

describe('SQLite DailyStatusRepository', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', { useNewConnection: true });
    await enableForeignKeys(database);
    await runMigrations(database);
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('persists and updates one status per local date', async () => {
    const repository = createSqliteDailyStatusRepository(database);

    await repository.save({
      localDate: '2026-07-23',
      status: 'normal',
      updatedAt: '2026-07-23T01:00:00.000Z',
    });
    const updated = await repository.save({
      localDate: '2026-07-23',
      status: 'fatigued',
      updatedAt: '2026-07-23T02:00:00.000Z',
    });

    expect(updated).toMatchObject({
      id: 'daily-status-2026-07-23',
      localDate: '2026-07-23',
      status: 'fatigued',
      createdAt: '2026-07-23T01:00:00.000Z',
      updatedAt: '2026-07-23T02:00:00.000Z',
    });
    await expect(repository.findByLocalDate('2026-07-23')).resolves.toEqual(
      updated,
    );
  });
});
