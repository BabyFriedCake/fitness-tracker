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

type ForeignKeyViolationRow = {
  readonly table: string;
  readonly rowid: number;
  readonly parent: string;
  readonly fkid: number;
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
  const shouldDisableForeignKeys =
    migration.disableForeignKeysDuringMigration === true;
  let transactionStarted = false;

  try {
    if (shouldDisableForeignKeys) {
      await database.execAsync('PRAGMA foreign_keys = OFF;');
    }

    await database.execAsync('BEGIN IMMEDIATE;');
    transactionStarted = true;

    await database.execAsync(migration.sql);
    await assertNoForeignKeyViolations(database);
    await database.runAsync(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
      migration.version,
      migration.name,
      now(),
    );
    await database.execAsync('COMMIT;');
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await rollback(database);
    }
    throw error;
  } finally {
    if (shouldDisableForeignKeys) {
      await database.execAsync('PRAGMA foreign_keys = ON;');
    }
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

async function assertNoForeignKeyViolations(
  database: DatabaseConnection,
): Promise<void> {
  const violations = await database.getAllAsync<ForeignKeyViolationRow>(
    'PRAGMA foreign_key_check;',
  );

  if (violations.length > 0) {
    throw new Error('Migration produced foreign key violations.');
  }
}
