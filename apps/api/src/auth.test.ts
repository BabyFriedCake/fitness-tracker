import { describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  InMemoryAdminAuthenticator,
  InMemoryAuditSink,
  requirePermission,
  UnauthenticatedError,
} from './auth.js';

describe('admin auth and authorization contracts', () => {
  it('authenticates a test actor and enforces role permissions', async () => {
    const authenticator = new InMemoryAdminAuthenticator();
    authenticator.register('editor-token', {
      id: 'admin-editor',
      roles: ['content_editor'],
    });

    const request = await authenticator.authenticate('editor-token');
    expect(requirePermission(request, 'content:edit')).toEqual(request.actor);
    expect(() => requirePermission(request, 'content:publish')).toThrow(
      ForbiddenError,
    );
  });

  it('rejects missing credentials before checking permissions', async () => {
    const authenticator = new InMemoryAdminAuthenticator();

    await expect(authenticator.authenticate(undefined)).rejects.toThrow(
      UnauthenticatedError,
    );
    expect(() => requirePermission(undefined, 'content:create')).toThrow(
      UnauthenticatedError,
    );
  });
});

describe('audit sink contract', () => {
  it('records versioned public-content writes without workout facts', async () => {
    const sink = new InMemoryAuditSink();
    await sink.record({
      actorId: 'admin-reviewer',
      action: 'publish',
      resourceType: 'workout_template',
      resourceId: 'template-1',
      beforeVersion: 2,
      afterVersion: 3,
      createdAt: '2026-08-05T00:00:00.000Z',
    });

    await expect(sink.list()).resolves.toEqual([
      {
        actorId: 'admin-reviewer',
        action: 'publish',
        resourceType: 'workout_template',
        resourceId: 'template-1',
        beforeVersion: 2,
        afterVersion: 3,
        createdAt: '2026-08-05T00:00:00.000Z',
      },
    ]);
  });
});
