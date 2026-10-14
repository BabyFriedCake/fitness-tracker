import { Pool } from 'pg';
import { runMigrations } from './migrations.js';

export const createPostgresPool = (connectionString = process.env.DATABASE_URL): Pool => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for the PostgreSQL adapter.');
  }
  return new Pool({ connectionString });
};

export const migratePostgres = async (pool: Pool): Promise<void> => {
  const client = await pool.connect();
  try {
    await runMigrations(client);
  } finally {
    client.release();
  }
};
