/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import { createSqliteTodayWorkoutPlanRepository } from '@/database/repositories/today-workout-plan';
import {
  TodayWorkoutPlanDuplicateTemplateError,
  type TodayWorkoutPlanId,
} from '@/domain/today-workout-plan';
import type { WorkoutSessionId } from '@/domain/workout-session';
import type { WorkoutTemplateId } from '@/domain/workout-template';

const CREATED_AT = '2026-07-23T01:00:00.000Z';
const UPDATED_AT = '2026-07-23T02:00:00.000Z';
const TEMPLATE_ID = 'template-legs' as WorkoutTemplateId;
const SESSION_ID = 'session-legs' as WorkoutSessionId;
const PLAN_ID = 'today-plan-legs' as TodayWorkoutPlanId;

describe('SQLite TodayWorkoutPlanRepository', () => {
  let database: SQLiteDatabase;
  let repository: ReturnType<typeof createSqliteTodayWorkoutPlanRepository>;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
    await runMigrations(database);
    repository = createSqliteTodayWorkoutPlanRepository(database);
    await insertExercise();
    await insertTemplate(TEMPLATE_ID, '下肢力量训练');
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('adds a planned template and lists plans by local date', async () => {
    await repository.addFromTemplate({
      id: PLAN_ID,
      localDate: '2026-07-23',
      sourceTemplateId: TEMPLATE_ID,
      titleSnapshot: '下肢力量训练',
      position: 1,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });

    await expect(repository.listByDate('2026-07-23')).resolves.toEqual([
      {
        id: PLAN_ID,
        localDate: '2026-07-23',
        sourceTemplateId: TEMPLATE_ID,
        sessionId: undefined,
        titleSnapshot: '下肢力量训练',
        position: 1,
        status: 'planned',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      },
    ]);
  });

  it('rejects duplicate same-date template and allows another date', async () => {
    await addPlan(PLAN_ID, '2026-07-23');

    await expect(
      addPlan('today-plan-duplicate' as TodayWorkoutPlanId, '2026-07-23'),
    ).rejects.toBeInstanceOf(TodayWorkoutPlanDuplicateTemplateError);
    await expect(
      addPlan('today-plan-tomorrow' as TodayWorkoutPlanId, '2026-07-24'),
    ).resolves.toMatchObject({
      id: 'today-plan-tomorrow',
      localDate: '2026-07-24',
      sourceTemplateId: TEMPLATE_ID,
    });
  });

  it('finds a plan by date and template', async () => {
    await addPlan(PLAN_ID, '2026-07-23');

    await expect(
      repository.findByDateAndTemplate('2026-07-23', TEMPLATE_ID),
    ).resolves.toMatchObject({
      id: PLAN_ID,
      localDate: '2026-07-23',
    });
  });

  it('attaches a WorkoutSession once and syncs status from the session', async () => {
    await addPlan(PLAN_ID, '2026-07-23');
    await insertSession(SESSION_ID);

    await expect(
      repository.attachSession(PLAN_ID, SESSION_ID, UPDATED_AT),
    ).resolves.toMatchObject({
      id: PLAN_ID,
      sessionId: SESSION_ID,
      status: 'draft',
      updatedAt: UPDATED_AT,
    });
    await expect(
      repository.syncStatusFromSession(PLAN_ID, 'completed', UPDATED_AT),
    ).resolves.toMatchObject({
      id: PLAN_ID,
      sessionId: SESSION_ID,
      status: 'completed',
    });
  });

  it('enforces one TodayWorkoutPlan per session id', async () => {
    await addPlan(PLAN_ID, '2026-07-23');
    await addPlan('today-plan-tomorrow' as TodayWorkoutPlanId, '2026-07-24');
    await insertSession(SESSION_ID);

    await repository.attachSession(PLAN_ID, SESSION_ID, UPDATED_AT);

    await expect(
      repository.attachSession(
        'today-plan-tomorrow' as TodayWorkoutPlanId,
        SESSION_ID,
        UPDATED_AT,
      ),
    ).rejects.toThrow();
  });

  async function addPlan(
    id: TodayWorkoutPlanId,
    localDate: string,
  ): Promise<Awaited<ReturnType<typeof repository.addFromTemplate>>> {
    return repository.addFromTemplate({
      id,
      localDate,
      sourceTemplateId: TEMPLATE_ID,
      titleSnapshot: '下肢力量训练',
      position: 1,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
  }

  async function insertExercise(): Promise<void> {
    await database.runAsync(
      `INSERT INTO exercises (
         id, slug, name_zh, exercise_type, primary_muscle_group,
         secondary_muscle_groups_json, equipment, is_active,
         created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      'exercise-squat',
      'barbell-squat',
      '杠铃深蹲',
      'strength',
      'legs',
      '[]',
      'barbell',
      1,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertTemplate(
    templateId: WorkoutTemplateId,
    name: string,
  ): Promise<void> {
    await database.runAsync(
      `INSERT INTO workout_templates (
         id, name, description, status, created_at, updated_at, archived_at
       )
       VALUES (?, ?, NULL, 'active', ?, ?, NULL);`,
      templateId,
      name,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertSession(sessionId: WorkoutSessionId): Promise<void> {
    await database.runAsync(
      `INSERT INTO workout_sessions (
         id, source_template_id, workout_name_snapshot, status,
         started_at, ended_at, created_at, updated_at
       )
       VALUES (?, ?, ?, 'draft', NULL, NULL, ?, ?);`,
      sessionId,
      TEMPLATE_ID,
      '下肢力量训练',
      CREATED_AT,
      CREATED_AT,
    );
  }
});
