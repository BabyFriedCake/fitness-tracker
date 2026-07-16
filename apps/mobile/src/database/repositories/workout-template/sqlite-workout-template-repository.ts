import type {
  CreateWorkoutTemplateInput,
  TemplateExercise,
  UpdateWorkoutTemplateInput,
  WorkoutTemplate,
  WorkoutTemplateDetailQuery,
  WorkoutTemplateId,
  WorkoutTemplateListQuery,
  WorkoutTemplateRepository,
  WorkoutTemplateStatus,
} from '@/domain/workout-template';
import { createWorkoutTemplate } from '@/domain/workout-template';
import type { DatabaseConnection, DatabaseValue } from '@/database/types';

import {
  mapWorkoutTemplateRows,
  type TemplateExerciseRow,
  type WorkoutTemplateRow,
} from './row-mapper';

export class WorkoutTemplatePaginationError extends Error {
  constructor(readonly fieldName: 'limit' | 'offset') {
    super(`WorkoutTemplate list ${fieldName} must be a non-negative integer.`);
    this.name = 'WorkoutTemplatePaginationError';
  }
}

export function createSqliteWorkoutTemplateRepository(
  database: DatabaseConnection,
): WorkoutTemplateRepository {
  return {
    list: (query) => listWorkoutTemplates(database, query),
    getById: (id, query) => getWorkoutTemplateById(database, id, query),
    create: (input) => createTemplate(database, input),
    update: (input) => updateTemplate(database, input),
    archive: (id, archivedAt) => archiveTemplate(database, id, archivedAt),
  };
}

async function listWorkoutTemplates(
  database: DatabaseConnection,
  query: WorkoutTemplateListQuery = {},
): Promise<readonly WorkoutTemplate[]> {
  const where = buildWhereClause(query);
  const pagination = buildPagination(query);
  const templateRows = await database.getAllAsync<WorkoutTemplateRow>(
    `
    ${selectTemplateRowsSql()}
    ${where.sql}
    ORDER BY updated_at DESC, id ASC
    ${pagination.sql}
    `,
    ...where.params,
    ...pagination.params,
  );

  return hydrateTemplates(database, templateRows);
}

async function getWorkoutTemplateById(
  database: DatabaseConnection,
  id: WorkoutTemplateId,
  query: WorkoutTemplateDetailQuery = {},
): Promise<WorkoutTemplate | null> {
  const clauses = ['id = ?'];
  const params: DatabaseValue[] = [id];

  if (query.includeArchived !== true) {
    clauses.push("status = 'active'");
  }

  const templateRow = await database.getFirstAsync<WorkoutTemplateRow>(
    `
    ${selectTemplateRowsSql()}
    WHERE ${clauses.join(' AND ')}
    LIMIT 1;
    `,
    ...params,
  );

  if (!templateRow) {
    return null;
  }

  const exerciseRows = await getTemplateExerciseRows(database, [
    templateRow.id,
  ]);

  return mapWorkoutTemplateRows(templateRow, exerciseRows);
}

async function createTemplate(
  database: DatabaseConnection,
  input: CreateWorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const template = createWorkoutTemplate({
    ...input,
    status: 'active',
  });

  await runWorkoutTemplateRepositoryTransaction(database, async () => {
    await insertTemplateRow(database, template);
    await replaceTemplateExerciseRows(database, template);
  });

  return template;
}

async function updateTemplate(
  database: DatabaseConnection,
  input: UpdateWorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const existingTemplate = await getWorkoutTemplateById(
    database,
    input.id as WorkoutTemplateId,
    {
      includeArchived: true,
    },
  );

  if (!existingTemplate) {
    throw new Error(`WorkoutTemplate not found: ${input.id}.`);
  }

  const template = createWorkoutTemplate({
    id: existingTemplate.id,
    name: input.name,
    description: input.description,
    status: existingTemplate.status,
    exercises: input.exercises ?? [],
    createdAt: existingTemplate.createdAt,
    updatedAt: input.updatedAt,
    archivedAt: existingTemplate.archivedAt,
  });

  await runWorkoutTemplateRepositoryTransaction(database, async () => {
    await updateTemplateContentRow(database, template);
    await replaceTemplateExerciseRows(database, template);
  });

  return template;
}

async function archiveTemplate(
  database: DatabaseConnection,
  id: WorkoutTemplateId,
  archivedAt: string,
): Promise<WorkoutTemplate> {
  const existingTemplate = await getWorkoutTemplateById(database, id, {
    includeArchived: true,
  });

  if (!existingTemplate) {
    throw new Error(`WorkoutTemplate not found: ${id}.`);
  }

  if (existingTemplate.status === 'archived') {
    return existingTemplate;
  }

  const template = createWorkoutTemplate({
    id: existingTemplate.id,
    name: existingTemplate.name,
    description: existingTemplate.description,
    status: 'archived',
    exercises: existingTemplate.exercises.map(toTemplateExerciseInput),
    createdAt: existingTemplate.createdAt,
    updatedAt: archivedAt,
    archivedAt,
  });

  await runWorkoutTemplateRepositoryTransaction(database, async () => {
    await archiveTemplateRow(database, template);
  });

  return template;
}

async function hydrateTemplates(
  database: DatabaseConnection,
  templateRows: readonly WorkoutTemplateRow[],
): Promise<readonly WorkoutTemplate[]> {
  if (templateRows.length === 0) {
    return [];
  }

  const exerciseRows = await getTemplateExerciseRows(
    database,
    templateRows.map((row) => row.id),
  );
  const exerciseRowsByTemplateId = new Map<string, TemplateExerciseRow[]>();

  for (const row of exerciseRows) {
    const rows = exerciseRowsByTemplateId.get(row.template_id) ?? [];
    rows.push(row);
    exerciseRowsByTemplateId.set(row.template_id, rows);
  }

  return templateRows.map((templateRow) =>
    mapWorkoutTemplateRows(
      templateRow,
      exerciseRowsByTemplateId.get(templateRow.id) ?? [],
    ),
  );
}

async function getTemplateExerciseRows(
  database: DatabaseConnection,
  templateIds: readonly string[],
): Promise<readonly TemplateExerciseRow[]> {
  if (templateIds.length === 0) {
    return [];
  }

  const placeholders = templateIds.map(() => '?').join(', ');

  return database.getAllAsync<TemplateExerciseRow>(
    `
    ${selectTemplateExerciseRowsSql()}
    WHERE template_id IN (${placeholders})
    ORDER BY position ASC, id ASC;
    `,
    ...templateIds,
  );
}

async function insertTemplateRow(
  database: DatabaseConnection,
  template: WorkoutTemplate,
): Promise<void> {
  await database.runAsync(
    `
    INSERT INTO workout_templates (
      id,
      name,
      description,
      status,
      created_at,
      updated_at,
      archived_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    template.id,
    template.name,
    template.description ?? null,
    template.status,
    template.createdAt,
    template.updatedAt,
    template.archivedAt ?? null,
  );
}

async function updateTemplateContentRow(
  database: DatabaseConnection,
  template: WorkoutTemplate,
): Promise<void> {
  await database.runAsync(
    `
    UPDATE workout_templates
    SET
      name = ?,
      description = ?,
      updated_at = ?
    WHERE id = ?;
    `,
    template.name,
    template.description ?? null,
    template.updatedAt,
    template.id,
  );
}

async function archiveTemplateRow(
  database: DatabaseConnection,
  template: WorkoutTemplate,
): Promise<void> {
  await database.runAsync(
    `
    UPDATE workout_templates
    SET
      status = ?,
      updated_at = ?,
      archived_at = ?
    WHERE id = ?;
    `,
    template.status,
    template.updatedAt,
    template.archivedAt ?? null,
    template.id,
  );
}

async function replaceTemplateExerciseRows(
  database: DatabaseConnection,
  template: WorkoutTemplate,
): Promise<void> {
  await database.runAsync(
    'DELETE FROM workout_template_exercises WHERE template_id = ?;',
    template.id,
  );

  for (const exercise of template.exercises) {
    await database.runAsync(
      `
      INSERT INTO workout_template_exercises (
        id,
        template_id,
        exercise_id,
        position,
        target_sets,
        target_reps_min,
        target_reps_max,
        rest_seconds,
        group_key,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      exercise.id,
      exercise.templateId,
      exercise.exerciseId,
      exercise.position,
      exercise.targetSets,
      exercise.targetReps.min,
      exercise.targetReps.max,
      exercise.restSeconds,
      null,
      exercise.createdAt,
      exercise.updatedAt,
    );
  }
}

export async function runWorkoutTemplateRepositoryTransaction(
  database: DatabaseConnection,
  operation: () => Promise<void>,
): Promise<void> {
  let transactionStarted = false;

  try {
    await database.execAsync('BEGIN IMMEDIATE;');
    transactionStarted = true;
    await operation();
    await database.execAsync('COMMIT;');
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await rollbackPreservingOriginalError(database);
    }

    throw error;
  }
}

async function rollbackPreservingOriginalError(
  database: DatabaseConnection,
): Promise<void> {
  try {
    await database.execAsync('ROLLBACK;');
  } catch {
    // Preserve the operation or COMMIT failure that triggered rollback.
  }
}

function selectTemplateRowsSql(): string {
  return `
    SELECT
      id,
      name,
      description,
      status,
      created_at,
      updated_at,
      archived_at
    FROM workout_templates
  `;
}

function selectTemplateExerciseRowsSql(): string {
  return `
    SELECT
      id,
      template_id,
      exercise_id,
      position,
      target_sets,
      target_reps_min,
      target_reps_max,
      rest_seconds,
      created_at,
      updated_at
    FROM workout_template_exercises
  `;
}

function buildWhereClause(query: WorkoutTemplateListQuery): {
  readonly sql: string;
  readonly params: readonly DatabaseValue[];
} {
  const clauses: string[] = [];
  const params: DatabaseValue[] = [];

  applyStatusFilter(query.filters?.statuses, clauses, params);
  applySearchFilter(query.search, clauses, params);

  if (clauses.length === 0) {
    return {
      sql: '',
      params,
    };
  }

  return {
    sql: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
}

function applyStatusFilter(
  statuses: readonly WorkoutTemplateStatus[] | undefined,
  clauses: string[],
  params: DatabaseValue[],
): void {
  if (!statuses || statuses.length === 0) {
    clauses.push("status = 'active'");
    return;
  }

  const placeholders = statuses.map(() => '?').join(', ');
  clauses.push(`status IN (${placeholders})`);
  params.push(...statuses);
}

function applySearchFilter(
  search: WorkoutTemplateListQuery['search'],
  clauses: string[],
  params: DatabaseValue[],
): void {
  const searchText = search?.text.trim();

  if (!searchText) {
    return;
  }

  const pattern = `%${escapeLikePattern(searchText)}%`;
  clauses.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
  params.push(pattern, pattern);
}

function buildPagination(query: WorkoutTemplateListQuery): {
  readonly sql: string;
  readonly params: readonly DatabaseValue[];
} {
  const clauses: string[] = [];
  const params: DatabaseValue[] = [];

  const hasLimit = typeof query.limit === 'number';
  const hasOffset = typeof query.offset === 'number';

  if (hasLimit) {
    assertNonNegativeInteger(query.limit, 'limit');
    clauses.push('LIMIT ?');
    params.push(query.limit);
  }

  if (hasOffset) {
    assertNonNegativeInteger(query.offset, 'offset');

    if (!hasLimit) {
      clauses.push('LIMIT -1');
    }

    clauses.push('OFFSET ?');
    params.push(query.offset);
  }

  return {
    sql: clauses.join(' '),
    params,
  };
}

function toTemplateExerciseInput(exercise: TemplateExercise): {
  readonly id: string;
  readonly templateId: string;
  readonly exerciseId: string;
  readonly position: number;
  readonly targetSets: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly restSeconds: number;
  readonly createdAt: string;
  readonly updatedAt: string;
} {
  return {
    id: exercise.id,
    templateId: exercise.templateId,
    exerciseId: exercise.exerciseId,
    position: exercise.position,
    targetSets: exercise.targetSets,
    targetRepsMin: exercise.targetReps.min,
    targetRepsMax: exercise.targetReps.max,
    restSeconds: exercise.restSeconds,
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function assertNonNegativeInteger(
  value: number,
  fieldName: 'limit' | 'offset',
): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new WorkoutTemplatePaginationError(fieldName);
  }
}

export type { WorkoutTemplate, WorkoutTemplateId };
