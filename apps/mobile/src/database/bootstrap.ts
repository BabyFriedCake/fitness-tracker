import { LATEST_SCHEMA_VERSION } from '@/database/constants';
import { openApplicationDatabase } from '@/database/connection';
import { toDatabaseError, type DatabaseError } from '@/database/errors';
import { runMigrations } from '@/database/migration-runner';
import { importStarterExerciseSeed } from '@/database/seed/exercises';
import type { DatabaseConnection } from '@/database/types';

export type DatabaseStartupResult =
  | {
      readonly status: 'ready';
      readonly database: DatabaseConnection;
      readonly schemaVersion: number;
    }
  | {
      readonly status: 'error';
      readonly error: DatabaseError;
    };

export async function initializeApplicationDatabase(
  openDatabase: () => Promise<DatabaseConnection> = openApplicationDatabase,
  importSeedData: (
    database: DatabaseConnection,
  ) => Promise<unknown> = importStarterExerciseSeed,
): Promise<DatabaseStartupResult> {
  try {
    const database = await openDatabase();
    const migrationResult = await runMigrations(database);
    await importSeedData(database);

    return {
      status: 'ready',
      database,
      schemaVersion: migrationResult.schemaVersion,
    };
  } catch (error) {
    return {
      status: 'error',
      error: toDatabaseError(error, 'database_migration_failed'),
    };
  }
}

export function isDatabaseReady(
  result: DatabaseStartupResult,
): result is Extract<DatabaseStartupResult, { readonly status: 'ready' }> {
  return (
    result.status === 'ready' && result.schemaVersion === LATEST_SCHEMA_VERSION
  );
}
