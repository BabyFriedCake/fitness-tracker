import type { DatabaseConnection } from '@/database/types';
import {
  TodayWorkoutPlanDuplicateTemplateError,
  createTodayWorkoutPlan,
  toTodayWorkoutPlanStatusFromSession,
  type AddTodayWorkoutPlanInput,
  type TodayWorkoutPlan,
  type TodayWorkoutPlanId,
  type TodayWorkoutPlanRepository,
} from '@/domain/today-workout-plan';
import type { WorkoutTemplateId } from '@/domain/workout-template';

type TodayWorkoutPlanRow = {
  readonly id: string;
  readonly local_date: string;
  readonly source_template_id: string;
  readonly session_id: string | null;
  readonly title_snapshot: string;
  readonly position: number;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export function createSqliteTodayWorkoutPlanRepository(
  database: DatabaseConnection,
): TodayWorkoutPlanRepository {
  return {
    listByDate: async (localDate) => {
      assertLocalDate(localDate);
      const rows = await database.getAllAsync<TodayWorkoutPlanRow>(
        `SELECT id, local_date, source_template_id, session_id,
                title_snapshot, position, status, created_at, updated_at
         FROM today_workout_plans
         WHERE local_date = ?
         ORDER BY position ASC, created_at ASC, id ASC;`,
        localDate,
      );

      return rows.map(mapTodayWorkoutPlanRow);
    },
    findById: async (id) => {
      const row = await database.getFirstAsync<TodayWorkoutPlanRow>(
        `SELECT id, local_date, source_template_id, session_id,
                title_snapshot, position, status, created_at, updated_at
         FROM today_workout_plans
         WHERE id = ?;`,
        id,
      );

      return row ? mapTodayWorkoutPlanRow(row) : null;
    },
    findByDateAndTemplate: async (localDate, templateId) => {
      assertLocalDate(localDate);
      const row = await database.getFirstAsync<TodayWorkoutPlanRow>(
        `SELECT id, local_date, source_template_id, session_id,
                title_snapshot, position, status, created_at, updated_at
         FROM today_workout_plans
         WHERE local_date = ? AND source_template_id = ?;`,
        localDate,
        templateId,
      );

      return row ? mapTodayWorkoutPlanRow(row) : null;
    },
    addFromTemplate: async (input) => {
      validateAddInput(input);

      try {
        await database.runAsync(
          `INSERT INTO today_workout_plans (
             id, local_date, source_template_id, session_id,
             title_snapshot, position, status, created_at, updated_at
           )
           VALUES (?, ?, ?, NULL, ?, ?, 'planned', ?, ?);`,
          input.id,
          input.localDate,
          input.sourceTemplateId,
          input.titleSnapshot.trim(),
          input.position,
          input.createdAt,
          input.updatedAt,
        );
      } catch (error) {
        if (isConstraintError(error)) {
          throw new TodayWorkoutPlanDuplicateTemplateError(
            input.localDate,
            input.sourceTemplateId as WorkoutTemplateId,
          );
        }

        throw error;
      }

      return getRequiredPlan(database, input.id as TodayWorkoutPlanId);
    },
    attachSession: async (planId, sessionId, updatedAt) => {
      assertTimestamp(updatedAt);
      await database.runAsync(
        `UPDATE today_workout_plans
         SET session_id = ?,
             status = 'draft',
             updated_at = ?
         WHERE id = ?;`,
        sessionId,
        updatedAt,
        planId,
      );

      return getRequiredPlan(database, planId);
    },
    syncStatusFromSession: async (planId, sessionStatus, updatedAt) => {
      assertTimestamp(updatedAt);
      const status = toTodayWorkoutPlanStatusFromSession(sessionStatus);
      await database.runAsync(
        `UPDATE today_workout_plans
         SET status = ?,
             updated_at = ?
         WHERE id = ?;`,
        status,
        updatedAt,
        planId,
      );

      return getRequiredPlan(database, planId);
    },
  };
}

async function getRequiredPlan(
  database: DatabaseConnection,
  id: TodayWorkoutPlanId,
): Promise<TodayWorkoutPlan> {
  const row = await database.getFirstAsync<TodayWorkoutPlanRow>(
    `SELECT id, local_date, source_template_id, session_id,
            title_snapshot, position, status, created_at, updated_at
     FROM today_workout_plans
     WHERE id = ?;`,
    id,
  );

  if (!row) {
    throw new Error('TodayWorkoutPlan was not persisted.');
  }

  return mapTodayWorkoutPlanRow(row);
}

function mapTodayWorkoutPlanRow(row: TodayWorkoutPlanRow): TodayWorkoutPlan {
  return createTodayWorkoutPlan({
    id: row.id,
    localDate: row.local_date,
    sourceTemplateId: row.source_template_id,
    sessionId: row.session_id,
    titleSnapshot: row.title_snapshot,
    position: row.position,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function validateAddInput(input: AddTodayWorkoutPlanInput): void {
  if (!input.id.trim()) {
    throw new Error('TodayWorkoutPlan id is required.');
  }

  assertLocalDate(input.localDate);

  if (!input.sourceTemplateId.trim()) {
    throw new Error('TodayWorkoutPlan sourceTemplateId is required.');
  }

  if (!input.titleSnapshot.trim()) {
    throw new Error('TodayWorkoutPlan titleSnapshot is required.');
  }

  if (!Number.isInteger(input.position) || input.position < 1) {
    throw new Error('TodayWorkoutPlan position must be a positive integer.');
  }

  assertTimestamp(input.createdAt);
  assertTimestamp(input.updatedAt);
}

function assertLocalDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('TodayWorkoutPlan localDate must use YYYY-MM-DD.');
  }
}

function assertTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error('TodayWorkoutPlan timestamp is invalid.');
  }
}

function isConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /constraint|unique|foreign key/i.test(error.message)
  );
}
