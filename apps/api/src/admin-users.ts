import { z } from 'zod';
import { adminRoleSchema, type AdminRole } from './auth.js';

export const adminUserStatusSchema = z.enum(['active', 'disabled']);
export const adminUserInputSchema = z.object({
  email: z.string().trim().email(),
  roles: z.array(adminRoleSchema).min(1),
});

export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>;
export type AdminUserInput = z.infer<typeof adminUserInputSchema>;
export type AdminUser = AdminUserInput & {
  id: string;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
};

export interface AdminUserRepository {
  list(): Promise<AdminUser[]>;
  create(input: AdminUserInput, now?: string): Promise<AdminUser>;
  updateRoles(id: string, roles: AdminRole[], now?: string): Promise<AdminUser>;
  updateStatus(id: string, status: AdminUserStatus, now?: string): Promise<AdminUser>;
}

export class InMemoryAdminUserRepository implements AdminUserRepository {
  private readonly users = new Map<string, AdminUser>();

  async list() {
    return [...this.users.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async create(input: AdminUserInput, now = new Date().toISOString()) {
    const user: AdminUser = {
      ...input,
      id: crypto.randomUUID(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateRoles(id: string, roles: AdminRole[], now = new Date().toISOString()) {
    const current = this.users.get(id);
    if (!current) throw new Error('Admin user not found.');
    const next = { ...current, roles: [...roles], updatedAt: now };
    this.users.set(id, next);
    return next;
  }

  async updateStatus(id: string, status: AdminUserStatus, now = new Date().toISOString()) {
    const current = this.users.get(id);
    if (!current) throw new Error('Admin user not found.');
    const next = { ...current, status, updatedAt: now };
    this.users.set(id, next);
    return next;
  }
}
