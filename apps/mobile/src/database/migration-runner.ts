import { LATEST_SCHEMA_VERSION } from '@/database/constants';
import { toDatabaseError } from '@/database/errors';
import { MIGRATIONS, type Migration } from '@/database/migrations';
import type { DatabaseConnection } from '@/database/types';

export type MigrationResult = {
  readonly appliedVersions: readonly number[];
  readonly schemaVersion: number;
};

type MigrationTableRow = {
  readonly exists_count: number;
};

type SchemaVersionRow = {
  readonly version: number;
};

export async function runMigrations(
  database: DatabaseConnection,
  migrations: readonly Migration[] = MIGRATIONS,
  now: () => string = () => new Date().toISOString(),
): Promise<MigrationResult> {
  try {
    assertMigrationsAreOrdered(migrations);

    const currentVersion = await getCurrentSchemaVersion(database);
    const pendingMigrations = migrations.filter(
      (migration) => migration.version > currentVersion,
    );
    const appliedVersions: number[] = [];

    for (const migration of pendingMigrations) {
      await runMigration(database, migration, now);
      appliedVersions.push(migration.version);
    }

    return {
      appliedVersions,
      schemaVersion: await getCurrentSchemaVersion(database),
    };
  } catch (error) {
    throw toDatabaseError(error, 'database_migration_failed');
  }
}

export async function getCurrentSchemaVersion(
  database: DatabaseConnection,
): Promise<number> {
  const migrationTable = await database.getFirstAsync<MigrationTableRow>(
    "SELECT COUNT(*) AS exists_count FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations';",
  );

  if (migrationTable?.exists_count !== 1) {
    return 0;
  }

  const currentVersion = await database.getFirstAsync<SchemaVersionRow>(
    'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;',
  );

  return currentVersion?.version ?? 0;
}

async function runMigration(
  database: DatabaseConnection,
  migration: Migration,
  now: () => string,
): Promise<void> {
  await database.execAsync('BEGIN IMMEDIATE;');

  try {
    await database.execAsync(migration.sql);
    await database.runAsync(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
      migration.version,
      migration.name,
      now(),
    );
    await database.execAsync('COMMIT;');
  } catch (error) {
    await rollback(database);
    throw error;
  }
}

async function rollback(database: DatabaseConnection): Promise<void> {
  try {
    await database.execAsync('ROLLBACK;');
  } catch {
    // A failed migration may leave no active transaction; preserve the original error.
  }
}

function assertMigrationsAreOrdered(migrations: readonly Migration[]): void {
  let previousVersion = 0;

  for (const migration of migrations) {
    if (migration.version <= previousVersion) {
      throw new Error('Migrations must be strictly ordered.');
    }
    previousVersion = migration.version;
  }

  const latestMigrationVersion = migrations.at(-1)?.version ?? 0;

  if (latestMigrationVersion !== LATEST_SCHEMA_VERSION) {
    throw new Error('Latest migration does not match the schema version.');
  }
}
