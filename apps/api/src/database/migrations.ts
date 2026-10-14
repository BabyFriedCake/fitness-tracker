import { readFileSync } from 'node:fs';

const migrationSql = readFileSync(
  new URL('./migrations/0001-public-content.sql', import.meta.url),
  'utf8',
);
const mediaMigrationSql = readFileSync(
  new URL('./migrations/0002-public-media-assets.sql', import.meta.url),
  'utf8',
);

export type DatabaseClient = {
  query<T = unknown>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
};

export type Migration = {
  id: string;
  sql: string;
};

export const publicContentMigrations: readonly Migration[] = [
  { id: '0001-public-content', sql: migrationSql },
  { id: '0002-public-media-assets', sql: mediaMigrationSql },
];

export const runMigrations = async (client: DatabaseClient): Promise<void> => {
  await client.query('BEGIN');
  try {
    // Serialize startup migrations across API instances while keeping the lock transaction-scoped.
    await client.query('SELECT pg_advisory_xact_lock(74201918)');
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
    for (const migration of publicContentMigrations) {
      const applied = await client.query<{ id: string }>(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [migration.id],
      );
      if (applied.rows.length > 0) continue;
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
};
