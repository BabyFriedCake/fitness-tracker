import type { Pool } from 'pg';
import type {
  ExerciseInput,
  ExerciseStatus,
  PublicExercise,
  PublicExerciseRepository,
} from '../exercises.js';

type ExerciseRow = {
  id: string;
  version: number;
  status: ExerciseStatus;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  instruction: string;
  image_uri: string | null;
  source: string;
  source_id: string;
  license: string;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapRow = (row: ExerciseRow): PublicExercise => ({
  id: row.id,
  version: row.version,
  status: row.status,
  name: row.name,
  muscleGroup: row.muscle_group,
  equipment: row.equipment,
  difficulty: row.difficulty,
  instruction: row.instruction,
  imageUri: row.image_uri ?? undefined,
  source: row.source,
  sourceId: row.source_id,
  license: row.license,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

export class PostgresPublicExerciseRepository implements PublicExerciseRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<PublicExercise[]> {
    const result = await this.pool.query<ExerciseRow>(
      `SELECT id, version, status, name, muscle_group, equipment, difficulty,
              instruction, image_uri, source, source_id, license, created_at, updated_at
         FROM public_exercises
        ORDER BY created_at ASC, id ASC`,
    );
    return result.rows.map(mapRow);
  }

  async get(id: string): Promise<PublicExercise | undefined> {
    const result = await this.pool.query<ExerciseRow>(
      `SELECT id, version, status, name, muscle_group, equipment, difficulty,
              instruction, image_uri, source, source_id, license, created_at, updated_at
         FROM public_exercises WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRow(row) : undefined;
  }

  async create(input: ExerciseInput, now = new Date().toISOString()): Promise<PublicExercise> {
    const id = crypto.randomUUID();
    const result = await this.pool.query<ExerciseRow>(
      `INSERT INTO public_exercises
        (id, version, status, name, muscle_group, equipment, difficulty, instruction,
         image_uri, source, source_id, license, created_at, updated_at)
       VALUES ($1, 1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING id, version, status, name, muscle_group, equipment, difficulty,
                 instruction, image_uri, source, source_id, license, created_at, updated_at`,
      [
        id,
        input.name,
        input.muscleGroup,
        input.equipment,
        input.difficulty,
        input.instruction,
        input.imageUri ?? null,
        input.source,
        input.sourceId,
        input.license,
        now,
      ],
    );
    return mapRow(result.rows[0]);
  }

  async update(
    id: string,
    input: Partial<ExerciseInput>,
    now = new Date().toISOString(),
  ): Promise<PublicExercise> {
    const current = await this.get(id);
    if (!current) throw new Error('Exercise not found.');
    if (current.status === 'published' || current.status === 'archived') {
      throw new Error('Published or archived exercises cannot be edited directly.');
    }
    const next = { ...current, ...input };
    const result = await this.pool.query<ExerciseRow>(
      `UPDATE public_exercises
          SET version = version + 1, name = $2, muscle_group = $3, equipment = $4,
              difficulty = $5, instruction = $6, image_uri = $7, source = $8,
              source_id = $9, license = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, version, status, name, muscle_group, equipment, difficulty,
                  instruction, image_uri, source, source_id, license, created_at, updated_at`,
      [
        id,
        next.name,
        next.muscleGroup,
        next.equipment,
        next.difficulty,
        next.instruction,
        next.imageUri ?? null,
        next.source,
        next.sourceId,
        next.license,
        now,
      ],
    );
    return mapRow(result.rows[0]);
  }

  async transition(id: string, status: ExerciseStatus, now = new Date().toISOString()) {
    const current = await this.get(id);
    if (!current) throw new Error('Exercise not found.');
    const allowed: Record<ExerciseStatus, readonly ExerciseStatus[]> = {
      draft: ['review'],
      review: ['draft', 'published'],
      published: ['archived'],
      archived: [],
    };
    if (!allowed[current.status].includes(status)) {
      throw new Error(`Exercise status cannot change from ${current.status} to ${status}.`);
    }
    const result = await this.pool.query<ExerciseRow>(
      `UPDATE public_exercises SET status = $2, version = version + 1, updated_at = $3
        WHERE id = $1
        RETURNING id, version, status, name, muscle_group, equipment, difficulty,
                  instruction, image_uri, source, source_id, license, created_at, updated_at`,
      [id, status, now],
    );
    return mapRow(result.rows[0]);
  }
}
