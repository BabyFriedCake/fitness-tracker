import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresPublicExerciseRepository } from './postgres-exercise-repository.js';

const row = {
  id: 'exercise-1',
  version: 2,
  status: 'published' as const,
  name: '杠铃深蹲',
  muscle_group: '腿',
  equipment: '杠铃',
  difficulty: '中等',
  instruction: '保持背部稳定。',
  image_uri: '/assets/squat.gif',
  source: 'dataset',
  source_id: 'squat',
  license: 'CC BY',
  created_at: '2026-08-05T00:00:00.000Z',
  updated_at: '2026-08-05T00:00:00.000Z',
};

describe('PostgresPublicExerciseRepository', () => {
  it('maps database rows to the public exercise contract', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [row] });
    const repository = new PostgresPublicExerciseRepository({ query } as unknown as Pool);

    await expect(repository.get('exercise-1')).resolves.toMatchObject({
      id: 'exercise-1',
      name: '杠铃深蹲',
      imageUri: '/assets/squat.gif',
      status: 'published',
    });
  });

  it('does not issue an update for a published exercise', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [] });
    const repository = new PostgresPublicExerciseRepository({ query } as unknown as Pool);

    await expect(repository.update('exercise-1', { name: '不应修改' })).rejects.toThrow(
      'cannot be edited directly',
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});
