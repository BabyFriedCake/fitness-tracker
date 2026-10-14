import { describe, expect, it } from 'vitest';
import { publicContentMigrations, runMigrations } from './migrations.js';

describe('public content migrations', () => {
  it('contains transactional public content schema and required boundaries', () => {
    const [migration] = publicContentMigrations;
    expect(migration.id).toBe('0001-public-content');
    expect(migration.sql).toContain('CREATE TABLE IF NOT EXISTS public_exercises');
    expect(migration.sql).toContain('CREATE TABLE IF NOT EXISTS public_workout_templates');
    expect(migration.sql).toContain('CREATE TABLE IF NOT EXISTS public_template_exercises');
    expect(migration.sql).toContain('CREATE TABLE IF NOT EXISTS admin_audit_events');
    expect(publicContentMigrations[1].id).toBe('0002-public-media-assets');
    expect(publicContentMigrations[1].sql).toContain('CREATE TABLE IF NOT EXISTS public_media_assets');
    expect(publicContentMigrations[1].sql).toContain('distribution_scope');
  });

  it('runs migrations in declared order and stops on failure', async () => {
    const queries: string[] = [];
    const client = {
      query: async <T = unknown>(sql: string) => {
        queries.push(sql);
        if (sql === 'BEGIN') throw new Error('database unavailable');
        return { rows: [] as T[] };
      },
    };

    await expect(runMigrations(client)).rejects.toThrow('database unavailable');
    expect(queries).toContain('BEGIN');
    expect(queries).not.toContain('COMMIT');
  });

  it('creates migration metadata inside the transaction and rolls it back on failure', async () => {
    const queries: string[] = [];
    const client = {
      query: async <T = unknown>(sql: string) => {
        queries.push(sql);
        if (sql.includes('public_exercises')) throw new Error('migration failed');
        return { rows: [] as T[] };
      },
    };

    await expect(runMigrations(client)).rejects.toThrow('migration failed');
    expect(queries.indexOf('BEGIN')).toBeLessThan(
      queries.findIndex(query => query.includes('schema_migrations')),
    );
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
  });
});
