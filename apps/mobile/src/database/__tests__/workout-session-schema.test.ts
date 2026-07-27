/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import {
  getCurrentSchemaVersion,
  runMigrations,
} from '@/database/migration-runner';
import { INITIAL_SCHEMA_SQL } from '@/database/migrations/0001-initial-schema';
import { WORKOUT_TEMPLATE_CONSTRAINTS_SQL } from '@/database/migrations/0002-workout-template-constraints';
import type {
  SessionExerciseSchemaRow,
  WorkoutSessionSchemaRow,
  WorkoutSetSchemaRow,
} from '@/database/schema';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const STARTED_AT = '2026-07-17T01:00:00.000Z';
const ENDED_AT = '2026-07-17T02:00:00.000Z';

type ColumnInfoRow = {
  readonly name: string;
};

type CountRow = {
  readonly count: number;
};

type ForeignKeyRow = {
  readonly foreign_keys: number;
};

describe('WorkoutSession schema migration', () => {
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

  it('upgrades version 2 session data without losing historical values or dependent timer rows', async () => {
    await applyVersion2Schema();
    await insertExercise('exercise-bench-press');
    await insertTemplate('template-push');
    await insertVersion2CompletedSessionGraph();

    const result = await runMigrations(database);
    const session = await database.getFirstAsync<WorkoutSessionSchemaRow>(
      'SELECT * FROM workout_sessions WHERE id = ?;',
      'session-push',
    );
    const sessionExercise =
      await database.getFirstAsync<SessionExerciseSchemaRow>(
        'SELECT * FROM workout_session_exercises WHERE id = ?;',
        'session-exercise-bench-press',
      );
    const workoutSet = await database.getFirstAsync<WorkoutSetSchemaRow>(
      'SELECT * FROM workout_sets WHERE id = ?;',
      'set-bench-press-1',
    );
    const timerCount = await database.getFirstAsync<CountRow>(
      'SELECT COUNT(*) AS count FROM rest_timer_states;',
    );
    const foreignKeyViolations = await database.getAllAsync(
      'PRAGMA foreign_key_check;',
    );

    expect(result.schemaVersion).toBe(5);
    expect(result.appliedVersions).toEqual([3, 4, 5]);
    expect(session).toEqual(
      expect.objectContaining({
        source_template_id: 'template-push',
        workout_name_snapshot: 'Push Snapshot',
        status: 'completed',
        notes: 'Historical note',
        started_at: STARTED_AT,
        ended_at: ENDED_AT,
        current_session_exercise_id: 'session-exercise-bench-press',
        current_set_number: 1,
        was_edited: 1,
      }),
    );
    expect(sessionExercise).toEqual(
      expect.objectContaining({
        source_exercise_id: 'exercise-bench-press',
        exercise_name_snapshot: 'Bench Snapshot',
        is_completed: 1,
        target_sets: 4,
        target_reps_min: 8,
        target_reps_max: 10,
        current_rest_seconds: 90,
      }),
    );
    expect(workoutSet).toEqual(
      expect.objectContaining({
        actual_reps: 9,
        weight: 80,
        is_extra_set: 0,
        completed_at: ENDED_AT,
        weight_unit: 'kg',
        was_edited: 1,
      }),
    );
    expect(timerCount?.count).toBe(1);
    expect(foreignKeyViolations).toEqual([]);
  });

  it('enforces every WorkoutSession lifecycle timestamp invariant', async () => {
    await runMigrations(database);

    await insertSession({
      id: 'session-draft',
      status: 'draft',
      startedAt: null,
      endedAt: null,
    });
    await insertSession({
      id: 'session-in-progress',
      status: 'in_progress',
      startedAt: STARTED_AT,
      endedAt: null,
    });
    await insertSession({
      id: 'session-completed',
      status: 'completed',
      startedAt: STARTED_AT,
      endedAt: ENDED_AT,
    });
    await insertSession({
      id: 'session-cancelled-before-start',
      status: 'cancelled',
      startedAt: null,
      endedAt: ENDED_AT,
    });
    await insertSession({
      id: 'session-cancelled-after-start',
      status: 'cancelled',
      startedAt: STARTED_AT,
      endedAt: ENDED_AT,
    });

    await expect(
      insertSession({
        id: 'invalid-draft-started',
        status: 'draft',
        startedAt: STARTED_AT,
        endedAt: null,
      }),
    ).rejects.toThrow();
    await expect(
      insertSession({
        id: 'invalid-in-progress-not-started',
        status: 'in_progress',
        startedAt: null,
        endedAt: null,
      }),
    ).rejects.toThrow();
    await expect(
      insertSession({
        id: 'invalid-completed-not-started',
        status: 'completed',
        startedAt: null,
        endedAt: ENDED_AT,
      }),
    ).rejects.toThrow();
    await expect(
      insertSession({
        id: 'invalid-completed-not-ended',
        status: 'completed',
        startedAt: STARTED_AT,
        endedAt: null,
      }),
    ).rejects.toThrow();
    await expect(
      insertSession({
        id: 'invalid-cancelled-not-ended',
        status: 'cancelled',
        startedAt: null,
        endedAt: null,
      }),
    ).rejects.toThrow();
    await expect(
      insertSession({
        id: 'invalid-status',
        status: 'paused',
        startedAt: null,
        endedAt: null,
      }),
    ).rejects.toThrow();

    const draft = await database.getFirstAsync<WorkoutSessionSchemaRow>(
      'SELECT * FROM workout_sessions WHERE id = ?;',
      'session-draft',
    );

    expect(draft?.source_template_id).toBeNull();
    expect(draft?.started_at).toBeNull();
    expect(draft?.ended_at).toBeNull();
  });

  it('enforces snapshot, foreign-key, and actual WorkoutSet constraints without target reps', async () => {
    await runMigrations(database);
    await insertExercise('exercise-bench-press');
    await insertSession({
      id: 'session-strength',
      status: 'in_progress',
      startedAt: STARTED_AT,
      endedAt: null,
    });
    await insertSessionExercise();
    await insertWorkoutSet();

    const workoutSetColumns = await getColumnNames('workout_sets');

    expect(workoutSetColumns).toEqual(
      expect.arrayContaining([
        'actual_reps',
        'weight',
        'completed_at',
        'is_extra_set',
      ]),
    );
    expect(workoutSetColumns).not.toContain('target_reps');
    expect(workoutSetColumns).not.toContain('reps');
    expect(workoutSetColumns).not.toContain('weight_value');

    await database.runAsync(
      'UPDATE exercises SET name_zh = ? WHERE id = ?;',
      '新动作名称',
      'exercise-bench-press',
    );
    const snapshot = await database.getFirstAsync<{
      readonly exercise_name_snapshot: string;
    }>(
      'SELECT exercise_name_snapshot FROM workout_session_exercises WHERE id = ?;',
      'session-exercise-bench-press',
    );
    expect(snapshot?.exercise_name_snapshot).toBe('Bench Snapshot');

    await expect(
      insertSessionExercise({
        id: 'session-exercise-missing-session',
        sessionId: 'missing-session',
      }),
    ).rejects.toThrow();
    await expect(
      insertSessionExercise({
        id: 'session-exercise-invalid-position',
        position: 0,
      }),
    ).rejects.toThrow();
    await expect(
      insertSessionExercise({
        id: 'session-exercise-invalid-reps',
        targetRepsMin: 12,
        targetRepsMax: 8,
      }),
    ).rejects.toThrow();
    await expect(
      insertSessionExercise({
        id: 'session-exercise-invalid-rest',
        currentRestSeconds: -1,
      }),
    ).rejects.toThrow();
    await expect(
      insertWorkoutSet({ id: 'set-invalid-number', setNumber: 0 }),
    ).rejects.toThrow();
    await expect(
      insertWorkoutSet({ id: 'set-invalid-reps', actualReps: -1 }),
    ).rejects.toThrow();
    await expect(
      insertWorkoutSet({ id: 'set-invalid-weight', weight: -1 }),
    ).rejects.toThrow();
  });

  it('rolls back an invalid version 3 upgrade and keeps version 2 data and columns', async () => {
    await applyVersion2Schema();
    await database.runAsync(
      `
      INSERT INTO workout_sessions (
        id,
        source_template_id,
        name_snapshot,
        status,
        daily_status,
        started_at,
        ended_at,
        note,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      'invalid-draft-session',
      null,
      'Invalid Draft',
      'draft',
      null,
      STARTED_AT,
      null,
      null,
      CREATED_AT,
      CREATED_AT,
    );

    await expect(runMigrations(database)).rejects.toEqual(
      expect.objectContaining({
        code: 'database_migration_failed',
      }),
    );

    const oldColumns = await getColumnNames('workout_sessions');
    const existingSession = await database.getFirstAsync<{
      readonly name_snapshot: string;
    }>(
      'SELECT name_snapshot FROM workout_sessions WHERE id = ?;',
      'invalid-draft-session',
    );
    const foreignKeyState = await database.getFirstAsync<ForeignKeyRow>(
      'PRAGMA foreign_keys;',
    );

    expect(await getCurrentSchemaVersion(database)).toBe(2);
    expect(oldColumns).toContain('name_snapshot');
    expect(oldColumns).not.toContain('workout_name_snapshot');
    expect(existingSession?.name_snapshot).toBe('Invalid Draft');
    expect(foreignKeyState?.foreign_keys).toBe(1);
    await expectTableToBeMissing('workout_sessions_v3');
    await expectTableToBeMissing('workout_session_exercises_v3');
    await expectTableToBeMissing('workout_sets_v3');
  });

  async function applyVersion2Schema(): Promise<void> {
    await database.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await database.execAsync('BEGIN IMMEDIATE;');
      await database.execAsync(INITIAL_SCHEMA_SQL);
      await database.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        1,
        '0001_initial_schema',
        CREATED_AT,
      );
      await database.execAsync(WORKOUT_TEMPLATE_CONSTRAINTS_SQL);
      await database.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        2,
        '0002_workout_template_constraints',
        CREATED_AT,
      );
      await database.execAsync('COMMIT;');
    } catch (error) {
      await database.execAsync('ROLLBACK;');
      throw error;
    } finally {
      await database.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  async function insertVersion2CompletedSessionGraph(): Promise<void> {
    await database.runAsync(
      `
      INSERT INTO workout_sessions (
        id,
        source_template_id,
        name_snapshot,
        status,
        daily_status,
        started_at,
        ended_at,
        note,
        current_session_exercise_id,
        current_set_number,
        was_edited,
        edited_at,
        is_deleted,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      'session-push',
      'template-push',
      'Push Snapshot',
      'completed',
      'normal',
      STARTED_AT,
      ENDED_AT,
      'Historical note',
      'session-exercise-bench-press',
      1,
      1,
      ENDED_AT,
      0,
      CREATED_AT,
      ENDED_AT,
    );
    await database.runAsync(
      `
      INSERT INTO workout_session_exercises (
        id,
        session_id,
        exercise_id,
        exercise_name_snapshot,
        primary_muscle_group_snapshot,
        equipment_snapshot,
        position,
        target_sets,
        target_reps_min,
        target_reps_max,
        rest_seconds,
        group_key,
        is_enabled,
        is_skipped,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      'session-exercise-bench-press',
      'session-push',
      'exercise-bench-press',
      'Bench Snapshot',
      'chest',
      'barbell',
      1,
      4,
      8,
      10,
      90,
      null,
      1,
      0,
      ENDED_AT,
      CREATED_AT,
      ENDED_AT,
    );
    await database.runAsync(
      `
      INSERT INTO workout_sets (
        id,
        session_exercise_id,
        set_number,
        set_type,
        weight_value,
        weight_unit,
        reps,
        is_completed,
        is_extra,
        is_deleted,
        was_edited,
        edited_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      'set-bench-press-1',
      'session-exercise-bench-press',
      1,
      'normal',
      80,
      'kg',
      9,
      1,
      0,
      0,
      1,
      ENDED_AT,
      ENDED_AT,
      CREATED_AT,
      ENDED_AT,
    );
    await database.runAsync(
      `
      INSERT INTO rest_timer_states (
        id,
        session_id,
        session_exercise_id,
        previous_set_number,
        next_set_number,
        original_duration_seconds,
        started_at,
        target_end_at,
        paused_remaining_seconds,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      'timer-session-push',
      'session-push',
      'session-exercise-bench-press',
      1,
      2,
      90,
      STARTED_AT,
      ENDED_AT,
      null,
      'completed',
      CREATED_AT,
      ENDED_AT,
    );
  }

  async function insertExercise(id: string): Promise<void> {
    await database.runAsync(
      `
      INSERT INTO exercises (
        id,
        slug,
        name_zh,
        exercise_type,
        primary_muscle_group,
        equipment,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      id,
      id,
      '杠铃卧推',
      'strength',
      'chest',
      'barbell',
      1,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertTemplate(id: string): Promise<void> {
    await database.runAsync(
      `
      INSERT INTO workout_templates (
        id,
        name,
        status,
        created_at,
        updated_at,
        archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
      `,
      id,
      'Push',
      'active',
      CREATED_AT,
      CREATED_AT,
      null,
    );
  }

  async function insertSession(input: {
    readonly id: string;
    readonly status: string;
    readonly startedAt: string | null;
    readonly endedAt: string | null;
  }): Promise<void> {
    await database.runAsync(
      `
      INSERT INTO workout_sessions (
        id,
        source_template_id,
        workout_name_snapshot,
        status,
        daily_status,
        notes,
        started_at,
        ended_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      input.id,
      null,
      input.id,
      input.status,
      'normal',
      null,
      input.startedAt,
      input.endedAt,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertSessionExercise(
    input: {
      readonly id?: string;
      readonly sessionId?: string;
      readonly position?: number;
      readonly targetRepsMin?: number;
      readonly targetRepsMax?: number;
      readonly currentRestSeconds?: number;
    } = {},
  ): Promise<void> {
    await database.runAsync(
      `
      INSERT INTO workout_session_exercises (
        id,
        session_id,
        source_exercise_id,
        exercise_name_snapshot,
        position,
        is_enabled,
        is_skipped,
        is_completed,
        target_sets,
        target_reps_min,
        target_reps_max,
        current_rest_seconds,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      input.id ?? 'session-exercise-bench-press',
      input.sessionId ?? 'session-strength',
      'exercise-bench-press',
      'Bench Snapshot',
      input.position ?? 1,
      1,
      0,
      0,
      4,
      input.targetRepsMin ?? 8,
      input.targetRepsMax ?? 10,
      input.currentRestSeconds ?? 90,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function insertWorkoutSet(
    input: {
      readonly id?: string;
      readonly setNumber?: number;
      readonly actualReps?: number;
      readonly weight?: number;
    } = {},
  ): Promise<void> {
    await database.runAsync(
      `
      INSERT INTO workout_sets (
        id,
        session_exercise_id,
        set_number,
        set_type,
        actual_reps,
        weight,
        is_completed,
        is_extra_set,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      input.id ?? 'set-bench-press-1',
      'session-exercise-bench-press',
      input.setNumber ?? 1,
      'normal',
      input.actualReps ?? 9,
      input.weight ?? 80,
      1,
      0,
      ENDED_AT,
      CREATED_AT,
      ENDED_AT,
    );
  }

  async function getColumnNames(tableName: string): Promise<readonly string[]> {
    const rows = await database.getAllAsync<ColumnInfoRow>(
      `PRAGMA table_info(${tableName});`,
    );

    return rows.map((row) => row.name);
  }

  async function expectTableToBeMissing(tableName: string): Promise<void> {
    const row = await database.getFirstAsync<{ readonly name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;",
      tableName,
    );

    expect(row).toBeNull();
  }
});
