/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import { createSqliteUserSettingRepository } from '@/database/repositories/user-setting';
import type { UserSettingKey } from '@/domain/user-setting';

describe('SQLite UserSettingRepository', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', { useNewConnection: true });
    await enableForeignKeys(database);
    await runMigrations(database);
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('persists and updates a setting by key', async () => {
    const repository = createSqliteUserSettingRepository(database);
    const key = 'onboarding_state' as UserSettingKey;

    await repository.save({
      key,
      valueJson: JSON.stringify({ step: 'welcome' }),
      updatedAt: '2026-07-27T01:00:00.000Z',
    });
    const updated = await repository.save({
      key,
      valueJson: JSON.stringify({
        step: 'completed',
        completedAt: '2026-07-27T02:00:00.000Z',
      }),
      updatedAt: '2026-07-27T02:00:00.000Z',
    });

    expect(updated).toEqual({
      key,
      valueJson: JSON.stringify({
        step: 'completed',
        completedAt: '2026-07-27T02:00:00.000Z',
      }),
      updatedAt: '2026-07-27T02:00:00.000Z',
    });
    await expect(repository.findByKey(key)).resolves.toEqual(updated);
  });

  it('rejects invalid setting input before persisting', async () => {
    const repository = createSqliteUserSettingRepository(database);

    await expect(
      repository.save({
        key: 'onboarding_state',
        valueJson: '{broken',
        updatedAt: '2026-07-27T01:00:00.000Z',
      }),
    ).rejects.toThrow('UserSetting valueJson must be valid JSON.');
  });
});
