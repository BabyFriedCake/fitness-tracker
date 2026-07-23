import type {
  Equipment,
  Exercise,
  ExerciseFilters,
  ExerciseId,
  ExerciseListQuery,
  ExerciseRepository,
  ExerciseSearchField,
  ExerciseSearchQuery,
  ExerciseStatus,
  ExerciseType,
  MuscleGroup,
} from '@/domain/exercise';
import type { DatabaseConnection, DatabaseValue } from '@/database/types';

import { mapExerciseRow, type ExerciseRow } from './row-mapper';

export function createSqliteExerciseRepository(
  database: DatabaseConnection,
): ExerciseRepository {
  return {
    list: (query) => listExercises(database, query),
    getById: (id) => getExerciseById(database, id),
    search: (query, filters) => searchExercises(database, query, filters),
    listByFilters: (filters) => listExercises(database, { filters }),
    getSelectedByIds: (ids) => getSelectedExercisesByIds(database, ids),
  };
}

async function listExercises(
  database: DatabaseConnection,
  query: ExerciseListQuery = {},
): Promise<readonly Exercise[]> {
  const where = buildWhereClause(query.filters, query.search);
  const pagination = buildPagination(query);
  const rows = await database.getAllAsync<ExerciseRow>(
    `
    ${selectExerciseRowsSql()}
    ${where.sql}
    ${orderBySql()}
    ${pagination.sql}
    `,
    ...where.params,
    ...pagination.params,
  );

  return rows.map(mapExerciseRow);
}

async function getExerciseById(
  database: DatabaseConnection,
  id: ExerciseId,
): Promise<Exercise | null> {
  const row = await database.getFirstAsync<ExerciseRow>(
    `
    ${selectExerciseRowsSql()}
    WHERE id = ?
    LIMIT 1;
    `,
    id,
  );

  return row ? mapExerciseRow(row) : null;
}

async function searchExercises(
  database: DatabaseConnection,
  query: ExerciseSearchQuery,
  filters?: ExerciseFilters,
): Promise<readonly Exercise[]> {
  return listExercises(database, {
    search: query,
    filters,
  });
}

async function getSelectedExercisesByIds(
  database: DatabaseConnection,
  ids: readonly ExerciseId[],
): Promise<readonly Exercise[]> {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await database.getAllAsync<ExerciseRow>(
    `
    ${selectExerciseRowsSql()}
    WHERE is_active = 1
      AND id IN (${placeholders})
    ${orderBySql()}
    `,
    ...ids,
  );
  const rowById = new Map(rows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const row = rowById.get(id);

    return row ? [mapExerciseRow(row)] : [];
  });
}

function selectExerciseRowsSql(): string {
  return `
    SELECT
      id,
      slug,
      name_zh,
      name_en,
      exercise_type,
      primary_muscle_group,
      secondary_muscle_groups_json,
      equipment,
      description,
      instruction_steps_json,
      image_uri,
      source_name,
      source_reference,
      source_license,
      source_attribution,
      is_active,
      created_at,
      updated_at
    FROM exercises
  `;
}

function orderBySql(): string {
  return 'ORDER BY name_zh ASC, id ASC';
}

function buildWhereClause(
  filters?: ExerciseFilters,
  search?: ExerciseSearchQuery,
): {
  readonly sql: string;
  readonly params: readonly DatabaseValue[];
} {
  const clauses: string[] = [];
  const params: DatabaseValue[] = [];

  applyStatusFilter(filters?.statuses, clauses, params);
  applyInFilter('primary_muscle_group', filters?.muscleGroups, clauses, params);
  applyInFilter('equipment', filters?.equipment, clauses, params);
  applyInFilter('exercise_type', filters?.types, clauses, params);
  applySearchFilter(search, clauses, params);

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
  statuses: readonly ExerciseStatus[] | undefined,
  clauses: string[],
  params: DatabaseValue[],
): void {
  if (!statuses || statuses.length === 0) {
    clauses.push('is_active = 1');
    return;
  }

  const activeValues = statuses.map((status) => (status === 'active' ? 1 : 0));
  applyInFilter('is_active', activeValues, clauses, params);
}

function applySearchFilter(
  search: ExerciseSearchQuery | undefined,
  clauses: string[],
  params: DatabaseValue[],
): void {
  const searchText = search?.text.trim();

  if (!searchText) {
    return;
  }

  const fields = search?.fields ?? (['nameZh', 'nameEn'] as const);
  const fieldClauses: string[] = [];
  const pattern = `%${escapeLikePattern(searchText)}%`;

  if (fields.includes('nameZh')) {
    fieldClauses.push("name_zh LIKE ? ESCAPE '\\'");
    params.push(pattern);
  }

  if (fields.includes('nameEn')) {
    fieldClauses.push("LOWER(name_en) LIKE LOWER(?) ESCAPE '\\'");
    params.push(pattern);
  }

  if (fieldClauses.length > 0) {
    clauses.push(`(${fieldClauses.join(' OR ')})`);
  }
}

function applyInFilter<T extends DatabaseValue>(
  columnName: string,
  values: readonly T[] | undefined,
  clauses: string[],
  params: DatabaseValue[],
): void {
  if (!values || values.length === 0) {
    return;
  }

  const placeholders = values.map(() => '?').join(', ');
  clauses.push(`${columnName} IN (${placeholders})`);
  params.push(...values);
}

function buildPagination(query: ExerciseListQuery): {
  readonly sql: string;
  readonly params: readonly DatabaseValue[];
} {
  const clauses: string[] = [];
  const params: DatabaseValue[] = [];

  if (typeof query.limit === 'number') {
    clauses.push('LIMIT ?');
    params.push(query.limit);
  }

  if (typeof query.offset === 'number') {
    clauses.push('OFFSET ?');
    params.push(query.offset);
  }

  return {
    sql: clauses.join(' '),
    params,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export type {
  Equipment,
  Exercise,
  ExerciseFilters,
  ExerciseId,
  ExerciseSearchField,
  ExerciseSearchQuery,
  ExerciseType,
  MuscleGroup,
};
