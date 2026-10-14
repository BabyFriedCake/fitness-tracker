import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresAdminUserRepository } from './postgres-admin-user-repository.js';

describe('PostgresAdminUserRepository', () => {
  it('maps persisted administrator roles and status', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{
      id: 'admin-1',
      email: 'owner@example.com',
      roles: ['content_admin'],
      status: 'active',
      created_at: '2026-08-05T00:00:00.000Z',
      updated_at: '2026-08-05T00:00:00.000Z',
    }] });
    const repository = new PostgresAdminUserRepository({ query } as unknown as Pool);

    await expect(repository.list()).resolves.toEqual([{
      id: 'admin-1',
      email: 'owner@example.com',
      roles: ['content_admin'],
      status: 'active',
      createdAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
    }]);
  });

  it('updates roles using a parameterized query and maps the returned row', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{
      id: 'admin-1',
      email: 'owner@example.com',
      roles: ['content_reviewer', 'content_admin'],
      status: 'active',
      created_at: '2026-08-05T00:00:00.000Z',
      updated_at: '2026-08-05T01:00:00.000Z',
    }] });
    const repository = new PostgresAdminUserRepository({ query } as unknown as Pool);

    await expect(repository.updateRoles('admin-1', ['content_reviewer', 'content_admin'], '2026-08-05T01:00:00.000Z')).resolves.toMatchObject({
      id: 'admin-1',
      roles: ['content_reviewer', 'content_admin'],
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE admin_users SET roles'), [
      'admin-1',
      ['content_reviewer', 'content_admin'],
      '2026-08-05T01:00:00.000Z',
    ]);
  });
});
