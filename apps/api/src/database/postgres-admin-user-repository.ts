import type { Pool } from 'pg';
import type { AdminRole } from '../auth.js';
import type {
  AdminUser,
  AdminUserInput,
  AdminUserRepository,
  AdminUserStatus,
} from '../admin-users.js';

type AdminUserRow = {
  id: string;
  email: string;
  roles: AdminRole[];
  status: AdminUserStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

const mapRow = (row: AdminUserRow): AdminUser => ({
  id: row.id,
  email: row.email,
  roles: row.roles,
  status: row.status,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
});

export class PostgresAdminUserRepository implements AdminUserRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<AdminUser[]> {
    const result = await this.pool.query<AdminUserRow>(
      `SELECT id, email, roles, status, created_at, updated_at
         FROM admin_users ORDER BY created_at ASC, id ASC`,
    );
    return result.rows.map(mapRow);
  }

  async create(input: AdminUserInput, now = new Date().toISOString()): Promise<AdminUser> {
    const result = await this.pool.query<AdminUserRow>(
      `INSERT INTO admin_users (id, email, roles, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', $4, $4)
       RETURNING id, email, roles, status, created_at, updated_at`,
      [crypto.randomUUID(), input.email, input.roles, now],
    );
    return mapRow(result.rows[0]);
  }

  async updateRoles(id: string, roles: AdminRole[], now = new Date().toISOString()) {
    const result = await this.pool.query<AdminUserRow>(
      `UPDATE admin_users SET roles = $2, updated_at = $3 WHERE id = $1
       RETURNING id, email, roles, status, created_at, updated_at`,
      [id, roles, now],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Admin user not found.');
    return mapRow(row);
  }

  async updateStatus(id: string, status: AdminUserStatus, now = new Date().toISOString()) {
    const result = await this.pool.query<AdminUserRow>(
      `UPDATE admin_users SET status = $2, updated_at = $3 WHERE id = $1
       RETURNING id, email, roles, status, created_at, updated_at`,
      [id, status, now],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Admin user not found.');
    return mapRow(row);
  }
}
