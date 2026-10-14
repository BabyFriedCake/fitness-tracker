import { z } from 'zod';

export const mediaReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const mediaDistributionScopeSchema = z.enum(['personal', 'public']);

export const mediaAssetInputSchema = z.object({
  exerciseId: z.string().trim().min(1),
  uri: z.string().trim().min(1),
  source: z.string().trim().min(1),
  sourceId: z.string().trim().min(1),
  license: z.string().trim().min(1),
  attribution: z.string().trim().min(1),
  distributionScope: mediaDistributionScopeSchema,
});

export type MediaAssetInput = z.infer<typeof mediaAssetInputSchema>;
export type MediaReviewStatus = z.infer<typeof mediaReviewStatusSchema>;
export type MediaDistributionScope = z.infer<typeof mediaDistributionScopeSchema>;

export type MediaAsset = MediaAssetInput & {
  id: string;
  version: number;
  reviewStatus: MediaReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export class InvalidMediaReviewTransitionError extends Error {
  constructor(readonly from: MediaReviewStatus, readonly to: MediaReviewStatus) {
    super(`Media review status cannot change from ${from} to ${to}.`);
    this.name = 'InvalidMediaReviewTransitionError';
  }
}

export class PublicMediaDistributionError extends Error {
  constructor() {
    super('Personal-use media cannot be published for public distribution.');
    this.name = 'PublicMediaDistributionError';
  }
}

export const transitionMediaReviewStatus = (
  asset: MediaAsset,
  reviewStatus: MediaReviewStatus,
  now = new Date().toISOString(),
): MediaAsset => {
  const allowed: Record<MediaReviewStatus, readonly MediaReviewStatus[]> = {
    pending: ['approved', 'rejected'],
    approved: ['pending'],
    rejected: ['pending'],
  };
  if (!allowed[asset.reviewStatus].includes(reviewStatus)) {
    throw new InvalidMediaReviewTransitionError(asset.reviewStatus, reviewStatus);
  }
  if (reviewStatus === 'approved' && asset.distributionScope !== 'public') {
    throw new PublicMediaDistributionError();
  }
  return { ...asset, reviewStatus, version: asset.version + 1, updatedAt: now };
};

export interface MediaAssetRepository {
  list(): Promise<MediaAsset[]>;
  get(id: string): Promise<MediaAsset | undefined>;
  create(input: MediaAssetInput, now?: string): Promise<MediaAsset>;
  transition(id: string, reviewStatus: MediaReviewStatus, now?: string): Promise<MediaAsset>;
}

export class InMemoryMediaAssetRepository implements MediaAssetRepository {
  private readonly assets = new Map<string, MediaAsset>();

  async list(): Promise<MediaAsset[]> {
    return [...this.assets.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  }

  async get(id: string): Promise<MediaAsset | undefined> {
    return this.assets.get(id);
  }

  async create(input: MediaAssetInput, now = new Date().toISOString()): Promise<MediaAsset> {
    const asset: MediaAsset = {
      ...input,
      id: crypto.randomUUID(),
      version: 1,
      reviewStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(asset.id, asset);
    return asset;
  }

  async transition(id: string, reviewStatus: MediaReviewStatus, now?: string): Promise<MediaAsset> {
    const current = await this.get(id);
    if (!current) throw new Error('Media asset not found.');
    const next = transitionMediaReviewStatus(current, reviewStatus, now);
    this.assets.set(id, next);
    return next;
  }
}
