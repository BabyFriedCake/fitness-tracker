import Fastify from 'fastify';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  exerciseInputSchema,
  exercisePatchSchema,
  exerciseStatusSchema,
  InMemoryPublicExerciseRepository,
  type PublicExerciseRepository,
} from './exercises.js';
import {
  templateInputSchema,
  templateStatusSchema,
  InMemoryPublicTemplateRepository,
  type PublicTemplateRepository,
} from './templates.js';
import {
  ForbiddenError,
  type AdminAuthenticator,
  type AdminPermission,
  adminRoleSchema,
  type AuditSink,
  requirePermission,
  UnauthenticatedError,
} from './auth.js';
import {
  adminUserInputSchema,
  adminUserStatusSchema,
  InMemoryAdminUserRepository,
  type AdminUserRepository,
} from './admin-users.js';
import {
  mediaAssetInputSchema,
  mediaReviewStatusSchema,
  InMemoryMediaAssetRepository,
  type MediaAssetRepository,
} from './media.js';

const errorResponse = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
});

export const buildApp = (
  exerciseRepository: PublicExerciseRepository =
    new InMemoryPublicExerciseRepository(),
  templateRepository: PublicTemplateRepository =
    new InMemoryPublicTemplateRepository(),
  authenticator?: AdminAuthenticator,
  auditSink?: AuditSink,
  adminUserRepository: AdminUserRepository = new InMemoryAdminUserRepository(),
  healthCheck?: () => Promise<void>,
  mediaRepository: MediaAssetRepository = new InMemoryMediaAssetRepository(),
) => {
  const app = Fastify({ logger: false });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/admin/') || request.url === '/health') {
      reply.header('Cache-Control', 'no-store');
    }
    return payload;
  });

  app.get('/health', async () => {
    await healthCheck?.();
    return {
      status: 'ok',
      service: 'fitness-tracker-api',
    };
  });

  app.get('/public/v1/content', async (request, reply) => {
    const allExercises = await exerciseRepository.list();
    const allTemplates = await templateRepository.list();
    const allMedia = await mediaRepository.list();
    const exercises = allExercises.filter((exercise) => exercise.status === 'published');
    const publishedExerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const templates = allTemplates.filter((template) =>
      template.status === 'published' &&
      template.exercises.every((exercise) => publishedExerciseIds.has(exercise.exerciseId)),
    );
    const media = allMedia.filter((asset) =>
      asset.reviewStatus === 'approved' &&
      asset.distributionScope === 'public' &&
      publishedExerciseIds.has(asset.exerciseId),
    );
    const version = Math.max(
      1,
      ...[...allExercises, ...allTemplates, ...allMedia].map((item) => item.version),
    );
    const snapshot = {
      version,
      exercises,
      templates,
      media,
    };
    const etag = `"${createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')}"`;
    const cacheControl = 'public, max-age=60, stale-while-revalidate=300';
    if (request.headers['if-none-match'] === etag) {
      return reply.header('ETag', etag).header('Cache-Control', cacheControl).code(304).send();
    }
    return reply.header('ETag', etag).header('Cache-Control', cacheControl).send(snapshot);
  });

  app.get('/admin/exercises', async (request) => {
    await authorize(request.headers.authorization, authenticator, 'content:read', auditSink, 'exercise', 'collection', 'list');
    return {
    items: await exerciseRepository.list(),
    };
  });

  app.post('/admin/exercises', async (request, reply) => {
    const actor = await authorize(request.headers.authorization, authenticator, 'content:create', auditSink, 'exercise', 'pending', 'create');
    const input = exerciseInputSchema.parse(request.body);
    const exercise = await exerciseRepository.create(input);
    await auditSink?.record({
      actorId: actor?.id ?? 'development',
      action: 'create',
      resourceType: 'exercise',
      resourceId: exercise.id,
      beforeVersion: null,
      afterVersion: exercise.version,
      createdAt: exercise.updatedAt,
    });
    return reply.status(201).send(exercise);
  });

  app.get<{ Params: { id: string } }>(
    '/admin/exercises/:id',
    async (request, reply) => {
      await authorize(request.headers.authorization, authenticator, 'content:read', auditSink, 'exercise', request.params.id, 'read');
      const exercise = await exerciseRepository.get(request.params.id);
      if (!exercise) {
        return reply.status(404).send({
          code: 'EXERCISE_NOT_FOUND',
          message: '动作不存在。',
          requestId: request.id,
        });
      }
      return exercise;
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/admin/exercises/:id',
    async (request, reply) => {
      const actor = await authorize(request.headers.authorization, authenticator, 'content:edit', auditSink, 'exercise', request.params.id, 'edit');
      const input = exercisePatchSchema.parse(request.body);
      const current = await exerciseRepository.get(request.params.id);
      if (!current) {
        return reply.status(404).send({
          code: 'EXERCISE_NOT_FOUND',
          message: '动作不存在。',
          requestId: request.id,
        });
      }
      const exercise = await exerciseRepository.update(request.params.id, input);
      await auditSink?.record({
        actorId: actor?.id ?? 'development',
        action: 'edit',
        resourceType: 'exercise',
        resourceId: exercise.id,
        beforeVersion: exercise.version - 1,
        afterVersion: exercise.version,
        createdAt: exercise.updatedAt,
      });
      return exercise;
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/exercises/:id/status',
    async (request) => {
      const { status } = z.object({ status: exerciseStatusSchema }).parse(request.body);
      const permission = status === 'published'
        ? 'content:publish'
        : status === 'archived'
          ? 'content:archive'
          : 'content:submit-review';
      const actor = await authorize(request.headers.authorization, authenticator, permission, auditSink, 'exercise', request.params.id, status);
      const exercise = await exerciseRepository.transition(request.params.id, status);
      await auditSink?.record({
        actorId: actor?.id ?? 'development',
        action: status,
        resourceType: 'exercise',
        resourceId: exercise.id,
        beforeVersion: exercise.version - 1,
        afterVersion: exercise.version,
        createdAt: exercise.updatedAt,
      });
      return exercise;
    },
  );

  app.get('/admin/templates', async (request) => {
    await authorize(request.headers.authorization, authenticator, 'content:read', auditSink, 'workout_template', 'collection', 'list');
    return {
    items: await templateRepository.list(),
    };
  });

  app.get('/admin/users', async (request) => {
    await authorize(request.headers.authorization, authenticator, 'admin:user:read', auditSink, 'admin_user', 'collection', 'list');
    return { items: await adminUserRepository.list() };
  });

  app.get('/admin/audit-events', async (request) => {
    await authorize(request.headers.authorization, authenticator, 'audit:read', auditSink, 'admin_user', 'audit-events', 'list');
    return { items: (await auditSink?.list()) ?? [] };
  });

  app.get('/admin/media', async (request) => {
    await authorize(request.headers.authorization, authenticator, 'content:read', auditSink, 'media_asset', 'collection', 'list');
    return { items: await mediaRepository.list() };
  });

  app.post('/admin/media', async (request, reply) => {
    const actor = await authorize(request.headers.authorization, authenticator, 'content:create', auditSink, 'media_asset', 'pending', 'create');
    const input = mediaAssetInputSchema.parse(request.body);
    if (!(await exerciseRepository.get(input.exerciseId))) {
      return reply.status(404).send({
        code: 'EXERCISE_NOT_FOUND',
        message: '媒体关联的动作不存在。',
        requestId: request.id,
      });
    }
    const asset = await mediaRepository.create(input);
    await auditSink?.record({ actorId: actor?.id ?? 'development', action: 'create', resourceType: 'media_asset', resourceId: asset.id, beforeVersion: null, afterVersion: asset.version, createdAt: asset.updatedAt });
    return reply.status(201).send(asset);
  });

  app.post<{ Params: { id: string } }>('/admin/media/:id/status', async (request) => {
    const { status } = z.object({ status: mediaReviewStatusSchema }).parse(request.body);
    const permission = status === 'approved' ? 'content:publish' : 'content:edit';
    const actor = await authorize(request.headers.authorization, authenticator, permission, auditSink, 'media_asset', request.params.id, status);
    const asset = await mediaRepository.transition(request.params.id, status);
    await auditSink?.record({ actorId: actor?.id ?? 'development', action: status, resourceType: 'media_asset', resourceId: asset.id, beforeVersion: asset.version - 1, afterVersion: asset.version, createdAt: asset.updatedAt });
    return asset;
  });

  app.post('/admin/users', async (request, reply) => {
    const actor = await authorize(request.headers.authorization, authenticator, 'admin:user:manage', auditSink, 'admin_user', 'pending', 'create');
    const input = adminUserInputSchema.parse(request.body);
    const user = await adminUserRepository.create(input);
    await auditSink?.record({
      actorId: actor?.id ?? 'development',
      action: 'create',
      resourceType: 'admin_user',
      resourceId: user.id,
      beforeVersion: null,
      afterVersion: null,
      createdAt: user.updatedAt,
    });
    return reply.status(201).send(user);
  });

  app.patch<{ Params: { id: string } }>('/admin/users/:id/status', async (request) => {
    const actor = await authorize(request.headers.authorization, authenticator, 'admin:user:manage', auditSink, 'admin_user', request.params.id, 'status');
    const { status } = z.object({ status: adminUserStatusSchema }).parse(request.body);
    const user = await adminUserRepository.updateStatus(request.params.id, status);
    await auditSink?.record({
      actorId: actor?.id ?? 'development',
      action: status,
      resourceType: 'admin_user',
      resourceId: user.id,
      beforeVersion: null,
      afterVersion: null,
      createdAt: user.updatedAt,
    });
    return user;
  });

  app.patch<{ Params: { id: string } }>('/admin/users/:id/roles', async (request) => {
    const actor = await authorize(request.headers.authorization, authenticator, 'admin:user:manage', auditSink, 'admin_user', request.params.id, 'roles');
    const { roles } = z.object({ roles: z.array(adminRoleSchema).min(1) }).parse(request.body);
    const user = await adminUserRepository.updateRoles(request.params.id, roles);
    await auditSink?.record({ actorId: actor?.id ?? 'development', action: 'roles', resourceType: 'admin_user', resourceId: user.id, beforeVersion: null, afterVersion: null, createdAt: user.updatedAt });
    return user;
  });

  app.post('/admin/templates', async (request, reply) => {
    const actor = await authorize(request.headers.authorization, authenticator, 'content:create', auditSink, 'workout_template', 'pending', 'create');
    const input = templateInputSchema.parse(request.body);
    const template = await templateRepository.create(input);
    await auditSink?.record({
      actorId: actor?.id ?? 'development',
      action: 'create',
      resourceType: 'workout_template',
      resourceId: template.id,
      beforeVersion: null,
      afterVersion: template.version,
      createdAt: template.updatedAt,
    });
    return reply.status(201).send(template);
  });

  app.get<{ Params: { id: string } }>(
    '/admin/templates/:id',
    async (request, reply) => {
      await authorize(request.headers.authorization, authenticator, 'content:read', auditSink, 'workout_template', request.params.id, 'read');
      const template = await templateRepository.get(request.params.id);
      if (!template) {
        return reply.status(404).send({
          code: 'TEMPLATE_NOT_FOUND',
          message: '模板不存在。',
          requestId: request.id,
        });
      }
      return template;
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/admin/templates/:id',
    async (request, reply) => {
      const actor = await authorize(request.headers.authorization, authenticator, 'content:edit', auditSink, 'workout_template', request.params.id, 'edit');
      const input = templateInputSchema.partial().parse(request.body);
      const current = await templateRepository.get(request.params.id);
      if (!current) {
        return reply.status(404).send({
          code: 'TEMPLATE_NOT_FOUND',
          message: '模板不存在。',
          requestId: request.id,
        });
      }
      const template = await templateRepository.update(request.params.id, input);
      await auditSink?.record({
        actorId: actor?.id ?? 'development',
        action: 'edit',
        resourceType: 'workout_template',
        resourceId: template.id,
        beforeVersion: template.version - 1,
        afterVersion: template.version,
        createdAt: template.updatedAt,
      });
      return template;
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/templates/:id/status',
    async (request) => {
      const { status } = z.object({ status: templateStatusSchema }).parse(request.body);
      const permission = status === 'published'
        ? 'content:publish'
        : status === 'archived'
          ? 'content:archive'
          : 'content:submit-review';
      const actor = await authorize(request.headers.authorization, authenticator, permission, auditSink, 'workout_template', request.params.id, status);
      const template = await templateRepository.transition(request.params.id, status);
      await auditSink?.record({
        actorId: actor?.id ?? 'development',
        action: status,
        resourceType: 'workout_template',
        resourceId: template.id,
        beforeVersion: template.version - 1,
        afterVersion: template.version,
        createdAt: template.updatedAt,
      });
      return template;
    },
  );

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error instanceof UnauthenticatedError
      ? 401
      : error instanceof ForbiddenError
        ? 403
        : error instanceof z.ZodError
          ? 400
          : 500;
    const response = errorResponse.parse({
      code: error instanceof UnauthenticatedError
        ? 'UNAUTHENTICATED'
        : error instanceof ForbiddenError
          ? 'FORBIDDEN'
          : error instanceof z.ZodError
            ? 'INVALID_INPUT'
            : 'INTERNAL_ERROR',
      message: error instanceof UnauthenticatedError
        ? '需要管理员登录。'
        : error instanceof ForbiddenError
          ? '没有执行此操作的权限。'
          : error instanceof z.ZodError
            ? '请求参数无效。'
            : '服务暂时不可用。',
      requestId: request.id,
    });

    request.log.error(error);
    return reply.status(statusCode).send(response);
  });

  return app;
};

const authorize = async (
  authorization: string | undefined,
  authenticator: AdminAuthenticator | undefined,
  permission: AdminPermission,
  auditSink: AuditSink | undefined,
  resourceType: 'exercise' | 'workout_template' | 'admin_user' | 'media_asset',
  resourceId: string,
  action: string,
) => {
  if (!authenticator) return undefined;
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;
  try {
    const request = await authenticator.authenticate(token);
    return requirePermission(request, permission);
  } catch (error) {
    await auditSink?.record({
      actorId: error instanceof ForbiddenError ? error.actorId : 'unknown',
      action: `denied:${action}`,
      resourceType,
      resourceId,
      beforeVersion: null,
      afterVersion: null,
      createdAt: new Date().toISOString(),
    });
    throw error;
  }
};
