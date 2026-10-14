import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresPublicTemplateRepository } from './postgres-template-repository.js';

const input = {
  name: '下肢力量',
  description: '基础训练',
  exercises: [{ exerciseId: 'squat', sets: 3, targetReps: 8, restSeconds: 90 }],
};

describe('PostgresPublicTemplateRepository', () => {
  it('protects published templates from direct edits before opening a write transaction', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'template-1',
          version: 3,
          status: 'published',
          name: input.name,
          description: input.description,
          created_at: '2026-08-05T00:00:00.000Z',
          updated_at: '2026-08-05T00:00:00.000Z',
          exercises: input.exercises,
        },
      ],
    });
    const connect = vi.fn();
    const repository = new PostgresPublicTemplateRepository({ query, connect } as unknown as Pool);

    await expect(repository.update('template-1', { name: '不应修改' })).rejects.toThrow(
      'cannot be edited directly',
    );
    expect(connect).not.toHaveBeenCalled();
  });

  it('rolls back a failed transactional create', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('insert failed'))
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
      query: vi.fn(),
    };
    const repository = new PostgresPublicTemplateRepository(pool as unknown as Pool);

    await expect(repository.create(input)).rejects.toThrow('insert failed');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledOnce();
  });
});
