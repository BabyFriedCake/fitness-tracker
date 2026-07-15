import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { APPLICATION_DATABASE_NAME } from '@/database/constants';
import { toDatabaseError } from '@/database/errors';
import type { DatabaseConnection } from '@/database/types';

export type OpenApplicationDatabaseOptions = {
  readonly databaseName?: string;
  readonly useNewConnection?: boolean;
};

export async function openApplicationDatabase({
  databaseName = APPLICATION_DATABASE_NAME,
  useNewConnection = false,
}: OpenApplicationDatabaseOptions = {}): Promise<SQLiteDatabase> {
  try {
    const database = await openDatabaseAsync(databaseName, {
      useNewConnection,
    });
    await enableForeignKeys(database);

    return database;
  } catch (error) {
    throw toDatabaseError(error, 'database_open_failed');
  }
}

export async function enableForeignKeys(
  database: DatabaseConnection,
): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');

  const row = await database.getFirstAsync<{ readonly foreign_keys: number }>(
    'PRAGMA foreign_keys;',
  );

  if (row?.foreign_keys !== 1) {
    throw toDatabaseError(null, 'database_unavailable');
  }
}
