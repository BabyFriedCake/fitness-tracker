import { describe, expect, it } from 'vitest';
import { InMemoryAdminUserRepository } from './admin-users.js';

describe('admin user contract', () => {
  it('creates and disables an administrator without storing credentials', async () => {
    const repository = new InMemoryAdminUserRepository();
    const created = await repository.create({ email: 'owner@example.com', roles: ['content_admin'] });
    const disabled = await repository.updateStatus(created.id, 'disabled');

    expect(disabled).toMatchObject({ email: 'owner@example.com', status: 'disabled' });
    expect(disabled).not.toHaveProperty('password');
  });

  it('updates roles without changing the administrator identity', async () => {
    const repository = new InMemoryAdminUserRepository();
    const created = await repository.create({ email: 'owner@example.com', roles: ['content_editor'] });
    const updated = await repository.updateRoles(created.id, ['content_reviewer', 'content_admin']);

    expect(updated).toMatchObject({ id: created.id, email: created.email, roles: ['content_reviewer', 'content_admin'] });
    expect(updated.createdAt).toBe(created.createdAt);
  });
});
