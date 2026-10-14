import { describe, expect, it } from 'vitest';
import {
  InMemoryMediaAssetRepository,
  InvalidMediaReviewTransitionError,
  PublicMediaDistributionError,
} from './media.js';

const input = {
  exerciseId: 'exercise-1',
  uri: 'https://cdn.example.test/exercise-1.gif',
  source: 'licensed-source',
  sourceId: 'asset-1',
  license: 'CC BY',
  attribution: 'Example attribution',
  distributionScope: 'public' as const,
};

describe('MediaAsset contract', () => {
  it('keeps new media pending until explicit public approval', async () => {
    const repository = new InMemoryMediaAssetRepository();
    const asset = await repository.create(input, '2026-08-05T00:00:00.000Z');

    expect(asset).toMatchObject({ version: 1, reviewStatus: 'pending' });
    await expect(repository.transition(asset.id, 'approved')).resolves.toMatchObject({
      version: 2,
      reviewStatus: 'approved',
    });
  });

  it('rejects personal-use media from public approval', async () => {
    const repository = new InMemoryMediaAssetRepository();
    const asset = await repository.create({ ...input, distributionScope: 'personal' });

    await expect(repository.transition(asset.id, 'approved')).rejects.toThrow(PublicMediaDistributionError);
    await expect(repository.transition(asset.id, 'approved')).rejects.toThrow('Personal-use');
  });

  it('requires an explicit review transition and preserves version history', async () => {
    const repository = new InMemoryMediaAssetRepository();
    const asset = await repository.create(input);

    await expect(repository.transition(asset.id, 'pending')).rejects.toThrow(InvalidMediaReviewTransitionError);
    const approved = await repository.transition(asset.id, 'approved', '2026-08-05T01:00:00.000Z');
    const pending = await repository.transition(asset.id, 'pending', '2026-08-05T02:00:00.000Z');
    expect(approved.version).toBe(2);
    expect(pending).toMatchObject({ version: 3, reviewStatus: 'pending' });
    expect((await repository.list()).find((item) => item.id === asset.id)).toMatchObject({ version: 3 });
  });
});
