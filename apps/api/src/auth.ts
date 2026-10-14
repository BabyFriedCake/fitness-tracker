import { z } from 'zod';

export const adminRoleSchema = z.enum([
  'content_editor',
  'content_reviewer',
  'content_admin',
]);

export const adminPermissionSchema = z.enum([
  'content:read',
  'content:create',
  'content:edit',
  'content:submit-review',
  'content:publish',
  'content:archive',
  'audit:read',
  'admin:user:read',
  'admin:user:manage',
]);

export type AdminRole = z.infer<typeof adminRoleSchema>;
export type AdminPermission = z.infer<typeof adminPermissionSchema>;

export type AdminActor = {
  id: string;
  roles: readonly AdminRole[];
};

export type AuthenticatedRequest = {
  actor: AdminActor;
};

export type AuditEvent = {
  actorId: string;
  action: string;
  resourceType: 'exercise' | 'workout_template' | 'admin_user' | 'media_asset';
  resourceId: string;
  beforeVersion: number | null;
  afterVersion: number | null;
  createdAt: string;
};

export class UnauthenticatedError extends Error {
  constructor() {
    super('Authentication is required.');
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  constructor(
    readonly actorId: string,
    readonly permission: AdminPermission,
  ) {
    super(`Actor ${actorId} lacks ${permission}.`);
    this.name = 'ForbiddenError';
  }
}

const rolePermissions: Record<AdminRole, readonly AdminPermission[]> = {
  content_editor: ['content:read', 'content:create', 'content:edit', 'content:submit-review'],
  content_reviewer: ['content:read', 'content:publish'],
  content_admin: ['content:read', 'content:archive', 'audit:read', 'admin:user:read', 'admin:user:manage'],
};

export const hasPermission = (
  actor: AdminActor,
  permission: AdminPermission,
): boolean =>
  actor.roles.some((role) => rolePermissions[role].includes(permission));

export const requirePermission = (
  request: AuthenticatedRequest | undefined,
  permission: AdminPermission,
): AdminActor => {
  if (!request) {
    throw new UnauthenticatedError();
  }
  if (!hasPermission(request.actor, permission)) {
    throw new ForbiddenError(request.actor.id, permission);
  }
  return request.actor;
};

export interface AdminAuthenticator {
  authenticate(token: string | undefined): Promise<AuthenticatedRequest>;
}

export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
  list(): Promise<AuditEvent[]>;
}

export class InMemoryAdminAuthenticator implements AdminAuthenticator {
  constructor(private readonly actors = new Map<string, AdminActor>()) {}

  register(token: string, actor: AdminActor): void {
    this.actors.set(token, actor);
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedRequest> {
    const actor = token ? this.actors.get(token) : undefined;
    if (!actor) {
      throw new UnauthenticatedError();
    }
    return { actor };
  }
}

export class InMemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  async record(event: AuditEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async list(): Promise<AuditEvent[]> {
    return this.events.map((event) => ({ ...event }));
  }
}
