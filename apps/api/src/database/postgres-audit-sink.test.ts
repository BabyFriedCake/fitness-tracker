import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresAuditSink } from './postgres-audit-sink.js';

describe('PostgresAuditSink', () => {
  it('persists the complete public-content audit contract', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const sink = new PostgresAuditSink({ query } as unknown as Pool);
    const event = {
      actorId: 'admin-1',
      action: 'publish',
      resourceType: 'exercise' as const,
      resourceId: 'exercise-1',
      beforeVersion: 1,
      afterVersion: 2,
      createdAt: '2026-08-05T00:00:00.000Z',
    };

    await sink.record(event);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO admin_audit_events'), [
      'admin-1',
      'publish',
      'exercise',
      'exercise-1',
      1,
      2,
      '2026-08-05T00:00:00.000Z',
    ]);
  });

  it('maps persisted events back to the audit contract', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        actor_id: 'admin-1',
        action: 'archive',
        resource_type: 'workout_template',
        resource_id: 'template-1',
        before_version: 2,
        after_version: 3,
        created_at: '2026-08-05T00:00:00.000Z',
      }],
    });
    const sink = new PostgresAuditSink({ query } as unknown as Pool);

    await expect(sink.list()).resolves.toEqual([{
      actorId: 'admin-1',
      action: 'archive',
      resourceType: 'workout_template',
      resourceId: 'template-1',
      beforeVersion: 2,
      afterVersion: 3,
      createdAt: '2026-08-05T00:00:00.000Z',
    }]);
  });
});
