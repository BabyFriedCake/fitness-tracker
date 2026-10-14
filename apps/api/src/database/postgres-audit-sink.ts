import type { Pool } from 'pg';
import type { AuditEvent, AuditSink } from '../auth.js';

type AuditRow = {
  actor_id: string;
  action: string;
  resource_type: AuditEvent['resourceType'];
  resource_id: string;
  before_version: number | null;
  after_version: number | null;
  created_at: Date | string;
};

export class PostgresAuditSink implements AuditSink {
  constructor(private readonly pool: Pool) {}

  async record(event: AuditEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO admin_audit_events
        (actor_id, action, resource_type, resource_id, before_version, after_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.actorId,
        event.action,
        event.resourceType,
        event.resourceId,
        event.beforeVersion,
        event.afterVersion,
        event.createdAt,
      ],
    );
  }

  async list(): Promise<AuditEvent[]> {
    const result = await this.pool.query<AuditRow>(
      `SELECT actor_id, action, resource_type, resource_id, before_version,
              after_version, created_at
         FROM admin_audit_events
        ORDER BY created_at ASC, id ASC`,
    );
    return result.rows.map((row) => ({
      actorId: row.actor_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      beforeVersion: row.before_version,
      afterVersion: row.after_version,
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    }));
  }
}
