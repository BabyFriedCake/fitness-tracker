/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import {
  getCurrentSchemaVersion,
  runMigrations,
} from '@/database/migration-runner';
import type { TodayWorkoutPlanSchemaRow } from '@/database/schema';

const CREATED_AT = '2026-07-23T01:00:00.000Z';

describe('TodayWorkoutPlan schema migration', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('creates today_workout_plans on fresh install at schema version 5', async () => {
    const result = await runMigrations(database);
    const version = await getCurrentSchemaVersion(database);
    const row = await database.getFirstAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = 'today_workout_plans';`,
    );

    expect(result.schemaVersion).toBe(5);
    expect(version).toBe(5);
    expect(result.appliedVersions).toEqual([1, 2, 3, 4, 5]);
    expect(row?.name).toBe('today_workout_plans');
  });

  it('enforces same-date template uniqueness and allows different dates', async () => {
    await runMigrations(database);
    await insertExercise();
    await insertTemplate();
    await insertTodayPlan('today-plan-1', '2026-07-23');

    await expect(
      insertTodayPlan('today-plan-duplicate', '2026-07-23'),
    ).rejects.toThrow();
    await expect(
      insertTodayPlan('today-plan-next-day', '2026-07-24'),
    ).resolves.toBeUndefined();
  });

  it('enforces session uniqueness and foreign keys', async () => {
    await runMigrations(database);
    await insertExercise();
    await insertTemplate();
    await insertSession('session-legs');
    await insertTodayPlan('today-plan-1', '2026-07-23', 'session-legs');

    await expect(
      insertTodayPlan('today-plan-2', '2026-07-24', 'session-legs'),
    ).rejects.toThrow();
    await expect(
      insertTodayPlan('today-plan-missing-session', '2026-07-25', 'missing'),
    ).rejects.toThrow();
  });

  it('enforces status and position constraints', async () => {
    await runMigrations(database);
    await insertExercise();
    await insertTemplate();

    await expect(
      insertTodayPlan('today-plan-invalid-position', '2026-07-23', null, {
        position: 0,
      }),
    ).rejects.toThrow();
    await expect(
      insertTodayPlan('today-plan-invalid-status', '2026-07-23', null, {
        status: 'ready',
      }),
    ).rejects.toThrow();
  });

  it('reads a valid planned row', async () => {
    await runMigrations(database);
    await insertExercise();
    await insertTemplate();
    await insertTodayPlan('today-plan-1', '2026-07-23');

    const plan = await database.getFirstAsync<TodayWorkoutPlanSchemaRow>(
      'SELECT * FROM today_workout_plans WHERE id = ?;',
      'today-plan-1',
    );

    expect(plan).toEqual(
      expect.objectContaining({
        id: 'today-plan-1',
        local_date: '2026-07-23',
        source_template_id: 'template-legs',
        session_id: null,
        title_snapshot: '下肢力量训练',
        position: 1,
        status: 'planned',
      }),
    );
  });

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

  async function insertTemplate(): Promise<void> {
    await database.runAsync(
      `INSERT INTO workout_templates (
         id, name, description, status, created_at, updated_at, archived_at
       )
       VALUES (?, ?, NULL, 'active', ?, ?, NULL);`,
      'template-legs',
      '下肢力量训练',
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertSession(sessionId: string): Promise<void> {
    await database.runAsync(
      `INSERT INTO workout_sessions (
         id, source_template_id, workout_name_snapshot, status,
         started_at, ended_at, created_at, updated_at
       )
       VALUES (?, ?, ?, 'draft', NULL, NULL, ?, ?);`,
      sessionId,
      'template-legs',
      '下肢力量训练',
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertTodayPlan(
    id: string,
    localDate: string,
    sessionId: string | null = null,
    overrides: {
      readonly position?: number;
      readonly status?: string;
    } = {},
  ): Promise<void> {
    await database.runAsync(
      `INSERT INTO today_workout_plans (
         id, local_date, source_template_id, session_id, title_snapshot,
         position, status, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      localDate,
      'template-legs',
      sessionId,
      '下肢力量训练',
      overrides.position ?? 1,
      overrides.status ?? 'planned',
      CREATED_AT,
      CREATED_AT,
    );
  }
});
