import type { Pool, PoolClient } from 'pg';
import type {
  PublicTemplate,
  PublicTemplateRepository,
  TemplateInput,
  TemplateStatus,
} from '../templates.js';

type TemplateRow = {
  id: string;
  version: number;
  status: TemplateStatus;
  name: string;
  description: string;
  created_at: Date | string;
  updated_at: Date | string;
  exercises: Array<{
    exerciseId: string;
    sets: number;
    targetReps: number;
    restSeconds: number;
    weightKg?: number;
  }> | null;
};

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapRow = (row: TemplateRow): PublicTemplate => ({
  id: row.id,
  version: row.version,
  status: row.status,
  name: row.name,
  description: row.description,
  exercises: row.exercises ?? [],
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const selectTemplate = `
  SELECT t.id, t.version, t.status, t.name, t.description, t.created_at, t.updated_at,
         COALESCE(json_agg(
           json_build_object(
             'exerciseId', e.exercise_id,
             'sets', e.sets,
             'targetReps', e.target_reps,
             'restSeconds', e.rest_seconds,
             'weightKg', e.weight_kg
           ) ORDER BY e.position
         ) FILTER (WHERE e.template_id IS NOT NULL), '[]'::json) AS exercises
    FROM public_workout_templates t
    LEFT JOIN public_template_exercises e ON e.template_id = t.id`;

export class PostgresPublicTemplateRepository implements PublicTemplateRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<PublicTemplate[]> {
    const result = await this.pool.query<TemplateRow>(
      `${selectTemplate} GROUP BY t.id ORDER BY t.created_at ASC, t.id ASC`,
    );
    return result.rows.map(mapRow);
  }

  async get(id: string): Promise<PublicTemplate | undefined> {
    const result = await this.pool.query<TemplateRow>(
      `${selectTemplate} WHERE t.id = $1 GROUP BY t.id`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRow(row) : undefined;
  }

  async create(input: TemplateInput, now = new Date().toISOString()): Promise<PublicTemplate> {
    const client = await this.pool.connect();
    const id = crypto.randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO public_workout_templates
          (id, version, status, name, description, created_at, updated_at)
         VALUES ($1, 1, 'draft', $2, $3, $4, $4)`,
        [id, input.name, input.description, now],
      );
      await insertExercises(client, id, input);
      const created = await readTemplate(client, id);
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, input: Partial<TemplateInput>, now = new Date().toISOString()) {
    const current = await this.get(id);
    if (!current) throw new Error('Template not found.');
    if (current.status === 'published' || current.status === 'archived') {
      throw new Error('Published or archived templates cannot be edited directly.');
    }
    const next = {
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      exercises: input.exercises ?? current.exercises,
    };
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE public_workout_templates
            SET version = version + 1, name = $2, description = $3, updated_at = $4
          WHERE id = $1`,
        [id, next.name, next.description, now],
      );
      await client.query('DELETE FROM public_template_exercises WHERE template_id = $1', [id]);
      await insertExercises(client, id, next);
      const updated = await readTemplate(client, id);
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async transition(id: string, status: TemplateStatus, now = new Date().toISOString()) {
    const current = await this.get(id);
    if (!current) throw new Error('Template not found.');
    const allowed: Record<TemplateStatus, readonly TemplateStatus[]> = {
      draft: ['review'],
      review: ['draft', 'published'],
      published: ['archived'],
      archived: [],
    };
    if (!allowed[current.status].includes(status)) {
      throw new Error(`Template status cannot change from ${current.status} to ${status}.`);
    }
    const result = await this.pool.query<TemplateRow>(
      `UPDATE public_workout_templates SET status = $2, version = version + 1, updated_at = $3
        WHERE id = $1
        RETURNING id, version, status, name, description, created_at, updated_at,
                  '[]'::json AS exercises`,
      [id, status, now],
    );
    const next = result.rows[0];
    const complete = await this.get(id);
    return complete ?? mapRow(next);
  }
}

const insertExercises = async (
  client: PoolClient,
  templateId: string,
  input: Pick<TemplateInput, 'exercises'>,
) => {
  for (const [position, exercise] of input.exercises.entries()) {
    await client.query(
      `INSERT INTO public_template_exercises
        (template_id, position, exercise_id, sets, target_reps, rest_seconds, weight_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        templateId,
        position,
        exercise.exerciseId,
        exercise.sets,
        exercise.targetReps,
        exercise.restSeconds,
        exercise.weightKg ?? null,
      ],
    );
  }
};

const readTemplate = async (client: PoolClient, id: string): Promise<PublicTemplate> => {
  const result = await client.query<TemplateRow>(
    `${selectTemplate} WHERE t.id = $1 GROUP BY t.id`,
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Template not found.');
  return mapRow(row);
};
