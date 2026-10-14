import type { Pool } from 'pg';
import {
  mediaAssetInputSchema,
  type MediaAsset,
  type MediaAssetInput,
  type MediaAssetRepository,
  type MediaDistributionScope,
  type MediaReviewStatus,
  transitionMediaReviewStatus,
} from '../media.js';

type MediaRow = {
  id: string;
  exercise_id: string;
  version: number;
  review_status: MediaReviewStatus;
  distribution_scope: MediaDistributionScope;
  uri: string;
  source: string;
  source_id: string;
  license: string;
  attribution: string;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapRow = (row: MediaRow): MediaAsset => ({
  id: row.id,
  exerciseId: row.exercise_id,
  version: row.version,
  reviewStatus: row.review_status,
  distributionScope: row.distribution_scope,
  uri: row.uri,
  source: row.source,
  sourceId: row.source_id,
  license: row.license,
  attribution: row.attribution,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const columns = `id, exercise_id, version, review_status, distribution_scope,
  uri, source, source_id, license, attribution, created_at, updated_at`;

export class PostgresMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<MediaAsset[]> {
    const result = await this.pool.query<MediaRow>(
      `SELECT ${columns} FROM public_media_assets ORDER BY created_at ASC, id ASC`,
    );
    return result.rows.map(mapRow);
  }

  async get(id: string): Promise<MediaAsset | undefined> {
    const result = await this.pool.query<MediaRow>(
      `SELECT ${columns} FROM public_media_assets WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : undefined;
  }

  async create(input: MediaAssetInput, now = new Date().toISOString()): Promise<MediaAsset> {
    const valid = mediaAssetInputSchema.parse(input);
    const id = crypto.randomUUID();
    const result = await this.pool.query<MediaRow>(
      `INSERT INTO public_media_assets
        (id, exercise_id, version, review_status, distribution_scope, uri, source,
         source_id, license, attribution, created_at, updated_at)
       VALUES ($1, $2, 1, 'pending', $3, $4, $5, $6, $7, $8, $9, $9)
       RETURNING ${columns}`,
      [id, valid.exerciseId, valid.distributionScope, valid.uri, valid.source,
        valid.sourceId, valid.license, valid.attribution, now],
    );
    return mapRow(result.rows[0]);
  }

  async transition(id: string, reviewStatus: MediaReviewStatus, now?: string): Promise<MediaAsset> {
    const current = await this.get(id);
    if (!current) throw new Error('Media asset not found.');
    const next = transitionMediaReviewStatus(current, reviewStatus, now);
    const result = await this.pool.query<MediaRow>(
      `UPDATE public_media_assets
          SET version = $2, review_status = $3, updated_at = $4
        WHERE id = $1
        RETURNING ${columns}`,
      [id, next.version, next.reviewStatus, next.updatedAt],
    );
    return mapRow(result.rows[0]);
  }
}
