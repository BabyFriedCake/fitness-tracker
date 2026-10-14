import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { InMemoryAdminAuthenticator, InMemoryAuditSink } from './auth.js';
import { InMemoryMediaAssetRepository } from './media.js';

describe('API foundation', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('reports service health without a database dependency', async () => {
    app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'fitness-tracker-api',
    });
  });

  it('reports a database health failure instead of claiming readiness', async () => {
    app = buildApp(undefined, undefined, undefined, undefined, undefined, async () => {
      throw new Error('database unavailable');
    });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('validates and publishes a public exercise through the API boundary', async () => {
    app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      payload: {
        name: '杠铃深蹲',
        muscleGroup: '腿',
        equipment: '杠铃',
        difficulty: '中级',
        instruction: '保持背部稳定。',
        source: 'exercises-dataset',
        sourceId: '0001',
        license: 'MIT',
      },
    });

    expect(response.statusCode).toBe(201);
    const created = response.json<{ id: string }>();
    const review = await app.inject({
      method: 'POST',
      url: `/admin/exercises/${created.id}/status`,
      payload: { status: 'review' },
    });
    const published = await app.inject({
      method: 'POST',
      url: `/admin/exercises/${created.id}/status`,
      payload: { status: 'published' },
    });

    expect(review.statusCode).toBe(200);
    expect(published.json()).toMatchObject({ status: 'published', version: 3 });
  });

  it('returns only published content from the versioned public API', async () => {
    app = buildApp();
    const draft = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      payload: {
        name: '草稿动作', muscleGroup: '腿', equipment: '自重', difficulty: '初级',
        instruction: '动作说明', source: 'test', sourceId: 'draft-1', license: 'test',
      },
    });
    const published = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      payload: {
        name: '已发布动作', muscleGroup: '胸', equipment: '哑铃', difficulty: '中级',
        instruction: '动作说明', source: 'test', sourceId: 'published-1', license: 'test',
      },
    });
    const publishedId = published.json<{ id: string }>().id;
    await app.inject({ method: 'POST', url: `/admin/exercises/${publishedId}/status`, payload: { status: 'review' } });
    await app.inject({ method: 'POST', url: `/admin/exercises/${publishedId}/status`, payload: { status: 'published' } });

    const response = await app.inject({ method: 'GET', url: '/public/v1/content' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(response.json()).toMatchObject({
      version: 3,
      exercises: [{ id: publishedId, status: 'published' }],
      templates: [],
    });
    expect(response.json().exercises).not.toContainEqual(expect.objectContaining({ id: draft.json().id }));
    const cached = await app.inject({
      method: 'GET',
      url: '/public/v1/content',
      headers: { 'if-none-match': response.headers.etag },
    });
    expect(cached.statusCode).toBe(304);
    expect(cached.headers.etag).toBe(response.headers.etag);
    expect(cached.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
  });

  it('does not publish a template until every referenced exercise is published', async () => {
    app = buildApp();
    const exercise = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      payload: { name: '已发布动作', muscleGroup: '胸', equipment: '自重', difficulty: '初级', instruction: '动作', source: 'test', sourceId: 'exercise-1', license: 'test' },
    });
    const exerciseId = exercise.json<{ id: string }>().id;
    const template = await app.inject({
      method: 'POST',
      url: '/admin/templates',
      payload: { name: '依赖草稿动作的模板', description: '', exercises: [{ exerciseId, sets: 3, targetReps: 8, restSeconds: 60 }] },
    });
    const templateId = template.json<{ id: string }>().id;
    await app.inject({ method: 'POST', url: `/admin/templates/${templateId}/status`, payload: { status: 'review' } });
    await app.inject({ method: 'POST', url: `/admin/templates/${templateId}/status`, payload: { status: 'published' } });

    const hidden = await app.inject({ method: 'GET', url: '/public/v1/content' });
    expect(hidden.json().templates).toEqual([]);

    await app.inject({ method: 'POST', url: `/admin/exercises/${exerciseId}/status`, payload: { status: 'review' } });
    await app.inject({ method: 'POST', url: `/admin/exercises/${exerciseId}/status`, payload: { status: 'published' } });
    const visible = await app.inject({ method: 'GET', url: '/public/v1/content' });
    expect(visible.json().templates).toMatchObject([{ id: templateId, status: 'published' }]);
  });

  it('does not move the public snapshot version backwards after archiving content', async () => {
    app = buildApp();
    const exercise = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      payload: {
        name: '版本动作', muscleGroup: '胸', equipment: '自重', difficulty: '初级',
        instruction: '动作', source: 'test', sourceId: 'version-1', license: 'test',
      },
    });
    const id = exercise.json<{ id: string }>().id;
    await app.inject({ method: 'POST', url: `/admin/exercises/${id}/status`, payload: { status: 'review' } });
    await app.inject({ method: 'POST', url: `/admin/exercises/${id}/status`, payload: { status: 'published' } });
    const published = await app.inject({ method: 'GET', url: '/public/v1/content' });
    const publishedVersion = published.json<{ version: number }>().version;

    await app.inject({ method: 'POST', url: `/admin/exercises/${id}/status`, payload: { status: 'archived' } });
    const archived = await app.inject({ method: 'GET', url: '/public/v1/content' });
    expect(archived.json<{ version: number }>().version).toBeGreaterThanOrEqual(publishedVersion);
  });

  it('enforces injected RBAC and records content writes', async () => {
    const authenticator = new InMemoryAdminAuthenticator();
    const audit = new InMemoryAuditSink();
    authenticator.register('editor', { id: 'admin-editor', roles: ['content_editor'] });
    authenticator.register('reviewer', { id: 'admin-reviewer', roles: ['content_reviewer'] });
    app = buildApp(undefined, undefined, authenticator, audit);

    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      payload: { name: '无权限', muscleGroup: '腿', equipment: '杠铃', difficulty: '中级', instruction: '动作', source: 'test', sourceId: '1', license: 'test' },
    });
    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.json()).toMatchObject({ code: 'UNAUTHENTICATED' });

    const unauthenticatedList = await app.inject({
      method: 'GET',
      url: '/admin/exercises',
    });
    expect(unauthenticatedList.statusCode).toBe(401);

    const created = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      headers: { authorization: 'Bearer editor' },
      payload: { name: '受保护动作', muscleGroup: '腿', equipment: '杠铃', difficulty: '中级', instruction: '动作', source: 'test', sourceId: '2', license: 'test' },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json<{ id: string }>().id;

    const forbidden = await app.inject({
      method: 'POST',
      url: `/admin/exercises/${id}/status`,
      headers: { authorization: 'Bearer editor' },
      payload: { status: 'published' },
    });
    expect(forbidden.statusCode).toBe(403);

    const listed = await app.inject({
      method: 'GET',
      url: '/admin/exercises',
      headers: { authorization: 'Bearer editor' },
    });
    expect(listed.statusCode).toBe(200);

    const review = await app.inject({
      method: 'POST',
      url: `/admin/exercises/${id}/status`,
      headers: { authorization: 'Bearer editor' },
      payload: { status: 'review' },
    });
    expect(review.statusCode).toBe(200);
    const published = await app.inject({
      method: 'POST',
      url: `/admin/exercises/${id}/status`,
      headers: { authorization: 'Bearer reviewer' },
      payload: { status: 'published' },
    });
    expect(published.statusCode).toBe(200);
    await expect(audit.list()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'denied:create', actorId: 'unknown' }),
      expect.objectContaining({ action: 'denied:published', actorId: 'admin-editor' }),
    ]));
    await expect(audit.list()).resolves.toHaveLength(6);
  });

  it('prevents caching administrator responses', async () => {
    app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/admin/exercises' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('keeps unapproved media out of public content and protects media review routes', async () => {
    const authenticator = new InMemoryAdminAuthenticator();
    const audit = new InMemoryAuditSink();
    const media = new InMemoryMediaAssetRepository();
    authenticator.register('editor', { id: 'admin-editor', roles: ['content_editor'] });
    authenticator.register('reviewer', { id: 'admin-reviewer', roles: ['content_reviewer'] });
    app = buildApp(undefined, undefined, authenticator, audit, undefined, undefined, media);

    const exercise = await app.inject({
      method: 'POST',
      url: '/admin/exercises',
      headers: { authorization: 'Bearer editor' },
      payload: {
        name: '已发布动作', muscleGroup: '胸', equipment: '自重', difficulty: '初级',
        instruction: '动作说明', source: 'licensed', sourceId: 'exercise-1', license: 'CC BY',
      },
    });
    const exerciseId = exercise.json<{ id: string }>().id;
    await app.inject({ method: 'POST', url: `/admin/exercises/${exerciseId}/status`, headers: { authorization: 'Bearer editor' }, payload: { status: 'review' } });
    await app.inject({ method: 'POST', url: `/admin/exercises/${exerciseId}/status`, headers: { authorization: 'Bearer reviewer' }, payload: { status: 'published' } });

    const created = await app.inject({
      method: 'POST',
      url: '/admin/media',
      headers: { authorization: 'Bearer editor' },
      payload: {
        exerciseId, uri: 'https://cdn.example.test/one.gif', source: 'licensed',
        sourceId: 'one', license: 'CC BY', attribution: 'Example', distributionScope: 'public',
      },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json<{ id: string }>().id;

    const hidden = await app.inject({ method: 'GET', url: '/public/v1/content' });
    expect(hidden.json()).toMatchObject({ media: [] });

    const approved = await app.inject({
      method: 'POST', url: `/admin/media/${id}/status`,
      headers: { authorization: 'Bearer reviewer' }, payload: { status: 'approved' },
    });
    expect(approved.statusCode).toBe(200);
    const visible = await app.inject({ method: 'GET', url: '/public/v1/content' });
    expect(visible.json().media).toMatchObject([{ id, reviewStatus: 'approved' }]);
  });

  it('rejects media registration for a missing exercise', async () => {
    const authenticator = new InMemoryAdminAuthenticator();
    authenticator.register('editor', { id: 'admin-editor', roles: ['content_editor'] });
    app = buildApp(undefined, undefined, authenticator, new InMemoryAuditSink());

    const response = await app.inject({
      method: 'POST',
      url: '/admin/media',
      headers: { authorization: 'Bearer editor' },
      payload: {
        exerciseId: 'missing-exercise', uri: 'local://missing.gif', source: 'test',
        sourceId: 'missing', license: 'test', attribution: 'test', distributionScope: 'public',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'EXERCISE_NOT_FOUND' });
  });

  it('limits administrator user management to content admins', async () => {
    const authenticator = new InMemoryAdminAuthenticator();
    authenticator.register('editor', { id: 'admin-editor', roles: ['content_editor'] });
    authenticator.register('owner', { id: 'admin-owner', roles: ['content_admin'] });
    app = buildApp(undefined, undefined, authenticator, new InMemoryAuditSink());

    const forbidden = await app.inject({
      method: 'POST',
      url: '/admin/users',
      headers: { authorization: 'Bearer editor' },
      payload: { email: 'new@example.com', roles: ['content_editor'] },
    });
    expect(forbidden.statusCode).toBe(403);

    const created = await app.inject({
      method: 'POST',
      url: '/admin/users',
      headers: { authorization: 'Bearer owner' },
      payload: { email: 'new@example.com', roles: ['content_editor'] },
    });
    expect(created.statusCode).toBe(201);
    const user = created.json<{ id: string; status: string }>();
    expect(user.status).toBe('active');

    const updatedRoles = await app.inject({
      method: 'PATCH',
      url: `/admin/users/${user.id}/roles`,
      headers: { authorization: 'Bearer owner' },
      payload: { roles: ['content_reviewer'] },
    });
    expect(updatedRoles.statusCode).toBe(200);
    expect(updatedRoles.json()).toMatchObject({ id: user.id, roles: ['content_reviewer'] });

    const listed = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: { authorization: 'Bearer owner' },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json<{ items: unknown[] }>().items).toHaveLength(1);
  });

  it('allows content admins to read audit events', async () => {
    const authenticator = new InMemoryAdminAuthenticator();
    authenticator.register('admin-token', { id: 'admin-1', roles: ['content_admin'] });
    const audit = new InMemoryAuditSink();
    await audit.record({
      actorId: 'admin-1',
      action: 'publish',
      resourceType: 'exercise',
      resourceId: 'exercise-1',
      beforeVersion: 1,
      afterVersion: 2,
      createdAt: '2026-08-05T00:00:00.000Z',
    });
    app = buildApp(undefined, undefined, authenticator, audit);
    const response = await app.inject({
      method: 'GET',
      url: '/admin/audit-events',
      headers: { authorization: 'Bearer admin-token' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ items: unknown[] }>().items).toHaveLength(1);
  });

});
