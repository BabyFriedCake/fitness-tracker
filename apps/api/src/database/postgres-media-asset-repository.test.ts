import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresMediaAssetRepository } from './postgres-media-asset-repository.js';

const row = {
  id: 'media-1', exercise_id: 'exercise-1', version: 1, review_status: 'pending' as const,
  distribution_scope: 'public' as const, uri: 'https://cdn.example.test/one.gif',
  source: 'licensed-source', source_id: 'asset-1', license: 'CC BY',
  attribution: 'Example attribution', created_at: '2026-08-05T00:00:00.000Z',
  updated_at: '2026-08-05T00:00:00.000Z',
};

describe('PostgresMediaAssetRepository', () => {
  it('maps persisted media metadata', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [row] });
    const repository = new PostgresMediaAssetRepository({ query } as unknown as Pool);

    await expect(repository.get('media-1')).resolves.toMatchObject({
      id: 'media-1', exerciseId: 'exercise-1', reviewStatus: 'pending',
    });
  });

  it('rejects personal media before issuing an update', async () => {
    const personal = { ...row, distribution_scope: 'personal' as const };
    const query = vi.fn().mockResolvedValue({ rows: [personal] });
    const repository = new PostgresMediaAssetRepository({ query } as unknown as Pool);

    await expect(repository.transition('media-1', 'approved')).rejects.toThrow('Personal-use');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
