/// <reference types="jest" />

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { enableForeignKeys } from '@/database/connection';
import { runMigrations } from '@/database/migration-runner';
import {
  WorkoutSessionAggregateError,
  WorkoutSessionHistoricalRecordError,
  WorkoutSessionRowMappingError,
  createSqliteWorkoutSessionRepository,
  mapWorkoutSessionRows,
  runWorkoutSessionRepositoryTransaction,
} from '@/database/repositories/workout-session';
import type { WorkoutSessionSchemaRow } from '@/database/schema';
import type { DatabaseConnection } from '@/database/types';
import type { ExerciseId } from '@/domain/exercise';
import {
  WorkoutSessionCurrentPositionError,
  cancelWorkoutSession,
  startWorkoutSession,
  type CompletedWorkoutSession,
  type DraftWorkoutSession,
  type InProgressWorkoutSession,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSet,
  type WorkoutSetId,
} from '@/domain/workout-session';
import {
  ActiveWorkoutSessionExistsError,
  startSession,
} from '@/features/workout-session/application/workout-session-flow';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const STARTED_AT = '2026-07-17T01:00:00.000Z';
const SET_ONE_COMPLETED_AT = '2026-07-17T01:10:00.000Z';
const SET_TWO_COMPLETED_AT = '2026-07-17T01:20:00.000Z';
const ENDED_AT = '2026-07-17T02:00:00.000Z';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const SECOND_SESSION_ID = 'session-pull' as WorkoutSessionId;
const BENCH_SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const ROW_SESSION_EXERCISE_ID = 'session-exercise-row' as SessionExerciseId;

type CountRow = {
  readonly count: number;
};

describe('SQLite WorkoutSessionRepository', () => {
  let database: SQLiteDatabase;

  beforeEach(async () => {
    database = await openDatabaseAsync(':memory:', {
      useNewConnection: true,
    });
    await enableForeignKeys(database);
    await runMigrations(database);
    await insertExercise('exercise-bench-press', '杠铃卧推');
    await insertExercise('exercise-row', '坐姿划船');
  });

  afterEach(async () => {
    await database.closeAsync();
  });

  it('saves and restores a non-template draft with independent snapshots', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const draft = buildDraftSession();

    const saved = await repository.save(draft);
    await database.runAsync(
      'UPDATE exercises SET name_zh = ? WHERE id = ?;',
      '动作库新名称',
      'exercise-bench-press',
    );
    const restored = await repository.findById(SESSION_ID);

    expect(saved).toBe(draft);
    expect(restored).toEqual(draft);
    expect(restored?.sourceTemplateId).toBeUndefined();
    expect(restored?.workoutNameSnapshot).toBe('临时训练');
    expect(restored?.sessionExercises[0]?.exerciseNameSnapshot).toBe(
      '杠铃卧推快照',
    );
  });

  it('restores exercises and actual sets in stable position and set-number order', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const benchSetTwo = buildWorkoutSet(BENCH_SESSION_EXERCISE_ID, {
      id: 'set-bench-2' as WorkoutSetId,
      setNumber: 2,
      actualReps: 8,
      completedAt: SET_TWO_COMPLETED_AT,
    });
    const benchSetOne = buildWorkoutSet(BENCH_SESSION_EXERCISE_ID);
    const completed = buildCompletedSession({
      sessionExercises: [
        buildSessionExercise({
          id: ROW_SESSION_EXERCISE_ID,
          sourceExerciseId: 'exercise-row' as ExerciseId,
          exerciseNameSnapshot: '坐姿划船快照',
          position: 2,
        }),
        buildSessionExercise({
          sets: [benchSetTwo, benchSetOne],
        }),
      ],
    });

    await repository.save(completed);
    const restored = await repository.findById(SESSION_ID);

    expect(restored?.status).toBe('completed');
    expect(restored?.sessionExercises.map((exercise) => exercise.id)).toEqual([
      BENCH_SESSION_EXERCISE_ID,
      ROW_SESSION_EXERCISE_ID,
    ]);
    expect(restored?.sessionExercises[0]?.sets).toEqual([
      benchSetOne,
      benchSetTwo,
    ]);
    expect(restored?.sessionExercises[0]?.sets[0]).not.toHaveProperty(
      'targetReps',
    );
  });

  it('updates a draft to in-progress and appends completed sets atomically', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const draft = buildDraftSession();
    await repository.save(draft);

    const started = startWorkoutSession(draft, STARTED_AT);
    const next: InProgressWorkoutSession = {
      ...started,
      notes: '第一组完成',
      updatedAt: SET_ONE_COMPLETED_AT,
      sessionExercises: [
        {
          ...started.sessionExercises[0]!,
          sets: [buildWorkoutSet(BENCH_SESSION_EXERCISE_ID)],
        },
      ],
    };

    const updated = await repository.update(next);
    const restored = await repository.findById(SESSION_ID);

    expect(updated).toBe(next);
    expect(restored).toEqual(next);
  });

  it('saves and restores the current exercise and set position', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const active = buildInProgressSession({
      currentSessionExerciseId: BENCH_SESSION_EXERCISE_ID,
      currentSetNumber: 2,
    });

    await repository.save(active);

    await expect(repository.findById(SESSION_ID)).resolves.toEqual(active);
  });

  it('rejects an incomplete or unrelated current position before writing', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);

    await expect(
      repository.save(
        buildInProgressSession({
          currentSessionExerciseId: BENCH_SESSION_EXERCISE_ID,
        }),
      ),
    ).rejects.toBeInstanceOf(WorkoutSessionCurrentPositionError);
    await expect(
      repository.save(
        buildInProgressSession({
          currentSessionExerciseId:
            'session-exercise-missing' as SessionExerciseId,
          currentSetNumber: 1,
        }),
      ),
    ).rejects.toBeInstanceOf(WorkoutSessionCurrentPositionError);
    expect(await getTableCount('workout_sessions')).toBe(0);
  });

  it('updates existing exercise order without violating unique positions', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const benchExercise = buildSessionExercise();
    const rowExercise = buildSessionExercise({
      id: ROW_SESSION_EXERCISE_ID,
      sourceExerciseId: 'exercise-row' as ExerciseId,
      exerciseNameSnapshot: '坐姿划船快照',
      position: 2,
    });
    const draft = buildDraftSession({
      sessionExercises: [benchExercise, rowExercise],
    });
    await repository.save(draft);

    await repository.update({
      ...draft,
      sessionExercises: [
        { ...benchExercise, position: 2 },
        { ...rowExercise, position: 1 },
      ],
      updatedAt: STARTED_AT,
    });
    const restored = await repository.findById(SESSION_ID);

    expect(restored?.sessionExercises.map((exercise) => exercise.id)).toEqual([
      ROW_SESSION_EXERCISE_ID,
      BENCH_SESSION_EXERCISE_ID,
    ]);
    expect(
      restored?.sessionExercises.map((exercise) => exercise.position),
    ).toEqual([1, 2]);
  });

  it('lets the schema reject invalid lifecycle timestamps and rolls back the update', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const draft = buildDraftSession();
    await repository.save(draft);
    const invalid = {
      ...draft,
      status: 'in_progress',
      updatedAt: STARTED_AT,
    } as unknown as WorkoutSession;

    await expect(repository.update(invalid)).rejects.toThrow();

    const restored = await repository.findById(SESSION_ID);
    expect(restored).toEqual(draft);
  });

  it('does not modify existing WorkoutSet facts during an active-session update', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const existing = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({
          sets: [buildWorkoutSet(BENCH_SESSION_EXERCISE_ID)],
        }),
      ],
    });
    await repository.save(existing);
    const changedSetSession: InProgressWorkoutSession = {
      ...existing,
      updatedAt: SET_TWO_COMPLETED_AT,
      sessionExercises: [
        {
          ...existing.sessionExercises[0]!,
          sets: [
            {
              ...existing.sessionExercises[0]!.sets[0]!,
              actualReps: 7,
            },
          ],
        },
      ],
    };

    await expect(repository.update(changedSetSession)).rejects.toBeInstanceOf(
      WorkoutSessionHistoricalRecordError,
    );
    expect(await repository.findById(SESSION_ID)).toEqual(existing);
  });

  it('keeps completed sessions immutable', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const completed = buildCompletedSession();
    await repository.save(completed);

    await expect(
      repository.update({
        ...completed,
        notes: '不应写入历史',
        updatedAt: '2026-07-17T03:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(WorkoutSessionHistoricalRecordError);
    expect(await repository.findById(SESSION_ID)).toEqual(completed);
  });

  it('rolls back the complete aggregate when a child insert fails', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const invalid = buildDraftSession({
      sessionExercises: [
        buildSessionExercise(),
        buildSessionExercise({
          id: ROW_SESSION_EXERCISE_ID,
          sourceExerciseId: 'missing-exercise' as ExerciseId,
          exerciseNameSnapshot: '缺失动作快照',
          position: 2,
        }),
      ],
    });

    await expect(repository.save(invalid)).rejects.toThrow();

    expect(await getTableCount('workout_sessions')).toBe(0);
    expect(await getTableCount('workout_session_exercises')).toBe(0);
    expect(await getTableCount('workout_sets')).toBe(0);
  });

  it('rejects aggregate children that reference another parent before writing', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const invalid = buildDraftSession({
      sessionExercises: [
        {
          ...buildSessionExercise(),
          sessionId: 'another-session' as WorkoutSessionId,
        },
      ],
    });

    await expect(repository.save(invalid)).rejects.toBeInstanceOf(
      WorkoutSessionAggregateError,
    );
    expect(await getTableCount('workout_sessions')).toBe(0);
  });

  it('returns null when the session does not exist', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);

    await expect(
      repository.findById('missing-session' as WorkoutSessionId),
    ).resolves.toBeNull();
  });

  it('returns null when there is no active session', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);

    await expect(repository.findActiveSession()).resolves.toBeNull();
  });

  it('returns the active session', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const active = buildInProgressSession();
    await repository.save(active);

    await expect(repository.findActiveSession()).resolves.toEqual(active);
  });

  it('hydrates the active session exercises and sets', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const active = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({
          sets: [buildWorkoutSet(BENCH_SESSION_EXERCISE_ID)],
        }),
      ],
    });
    await repository.save(active);

    const restored = await repository.findActiveSession();

    expect(restored).toEqual(active);
    expect(restored?.sessionExercises[0]?.sets).toEqual(
      active.sessionExercises[0]?.sets,
    );
  });

  it('does not return a completed session as active', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    await repository.save(buildCompletedSession());

    await expect(repository.findActiveSession()).resolves.toBeNull();
  });

  it('does not return a cancelled session as active', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    await repository.save(cancelWorkoutSession(buildDraftSession(), ENDED_AT));

    await expect(repository.findActiveSession()).resolves.toBeNull();
  });

  it('allows only one of two concurrent draft sessions to start', async () => {
    const repository = createSqliteWorkoutSessionRepository(database);
    const firstDraft = buildDraftSession();
    const secondDraft = buildDraftSession({
      id: SECOND_SESSION_ID,
      workoutNameSnapshot: 'Pull',
      sessionExercises: [
        buildSessionExercise({
          id: ROW_SESSION_EXERCISE_ID,
          sessionId: SECOND_SESSION_ID,
          sourceExerciseId: 'exercise-row' as ExerciseId,
          exerciseNameSnapshot: '坐姿划船快照',
        }),
      ],
    });
    await repository.save(firstDraft);
    await repository.save(secondDraft);

    const results = await Promise.allSettled([
      startSession(repository, SESSION_ID, STARTED_AT),
      startSession(repository, SECOND_SESSION_ID, STARTED_AT),
    ]);
    const fulfilledResult = results.find(
      (result) => result.status === 'fulfilled',
    );
    const rejectedResult = results.find(
      (result) => result.status === 'rejected',
    );

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(rejectedResult).toMatchObject({
      status: 'rejected',
      reason: expect.any(ActiveWorkoutSessionExistsError),
    });

    const activeRows = await database.getAllAsync<{ readonly id: string }>(
      `
      SELECT id
      FROM workout_sessions
      WHERE status = 'in_progress' AND is_deleted = 0;
      `,
    );

    expect(activeRows).toHaveLength(1);
    expect(fulfilledResult).toMatchObject({
      status: 'fulfilled',
      value: expect.objectContaining({ id: activeRows[0]?.id }),
    });
  });

  it('rejects malformed database rows during mapping', () => {
    expect(() =>
      mapWorkoutSessionRows(buildSessionRow({ status: 'paused' }), [], []),
    ).toThrow(WorkoutSessionRowMappingError);
  });

  async function insertExercise(id: string, name: string): Promise<void> {
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
      name,
      'strength',
      'chest',
      'barbell',
      1,
      CREATED_AT,
      CREATED_AT,
    );
  }

  async function getTableCount(tableName: string): Promise<number> {
    const row = await database.getFirstAsync<CountRow>(
      `SELECT COUNT(*) AS count FROM ${tableName};`,
    );

    return row?.count ?? 0;
  }
});

describe('WorkoutSession repository transaction', () => {
  it('does not rollback when BEGIN fails', async () => {
    const beginError = new Error('begin failed');
    const { database, calls } = createTransactionDatabase({ beginError });

    await expect(
      runWorkoutSessionRepositoryTransaction(database, async () => undefined),
    ).rejects.toBe(beginError);
    expect(calls).toEqual(['BEGIN IMMEDIATE;']);
  });

  it('rolls back and preserves an operation error', async () => {
    const operationError = new Error('operation failed');
    const { database, calls } = createTransactionDatabase();

    await expect(
      runWorkoutSessionRepositoryTransaction(database, async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);
    expect(calls).toEqual(['BEGIN IMMEDIATE;', 'ROLLBACK;']);
  });

  it('rolls back and preserves a COMMIT error', async () => {
    const commitError = new Error('commit failed');
    const { database, calls } = createTransactionDatabase({ commitError });

    await expect(
      runWorkoutSessionRepositoryTransaction(database, async () => 'result'),
    ).rejects.toBe(commitError);
    expect(calls).toEqual(['BEGIN IMMEDIATE;', 'COMMIT;', 'ROLLBACK;']);
  });

  it('does not replace the operation error when rollback also fails', async () => {
    const operationError = new Error('operation failed');
    const rollbackError = new Error('rollback failed');
    const { database } = createTransactionDatabase({ rollbackError });

    await expect(
      runWorkoutSessionRepositoryTransaction(database, async () => {
        throw operationError;
      }),
    ).rejects.toBe(operationError);
  });
});

function buildDraftSession(
  overrides: Partial<DraftWorkoutSession> = {},
): DraftWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: '临时训练',
    status: 'draft',
    sessionExercises: [buildSessionExercise()],
    dailyStatus: 'normal',
    notes: '训练草稿',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildInProgressSession(
  overrides: Partial<InProgressWorkoutSession> = {},
): InProgressWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: '临时训练',
    status: 'in_progress',
    sessionExercises: [buildSessionExercise()],
    dailyStatus: 'normal',
    notes: '训练中',
    startedAt: STARTED_AT,
    createdAt: CREATED_AT,
    updatedAt: STARTED_AT,
    ...overrides,
  };
}

function buildCompletedSession(
  overrides: Partial<CompletedWorkoutSession> = {},
): CompletedWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: 'Push 快照',
    status: 'completed',
    sessionExercises: [
      buildSessionExercise({
        isCompleted: true,
        sets: [buildWorkoutSet(BENCH_SESSION_EXERCISE_ID)],
      }),
    ],
    dailyStatus: 'normal',
    notes: '训练完成',
    startedAt: STARTED_AT,
    endedAt: ENDED_AT,
    createdAt: CREATED_AT,
    updatedAt: ENDED_AT,
    ...overrides,
  };
}

function buildSessionExercise(
  overrides: Partial<SessionExercise> = {},
): SessionExercise {
  return {
    id: BENCH_SESSION_EXERCISE_ID,
    sessionId: SESSION_ID,
    sourceExerciseId: 'exercise-bench-press' as ExerciseId,
    exerciseNameSnapshot: '杠铃卧推快照',
    position: 1,
    isEnabled: true,
    isSkipped: false,
    isCompleted: false,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 10,
    currentRestSeconds: 90,
    sets: [],
    ...overrides,
  };
}

function buildWorkoutSet(
  sessionExerciseId: SessionExerciseId,
  overrides: Partial<WorkoutSet> = {},
): WorkoutSet {
  return {
    id: 'set-bench-1' as WorkoutSetId,
    sessionExerciseId,
    setNumber: 1,
    setType: 'normal',
    actualReps: 9,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: SET_ONE_COMPLETED_AT,
    ...overrides,
  };
}

function buildSessionRow(
  overrides: Partial<WorkoutSessionSchemaRow> = {},
): WorkoutSessionSchemaRow {
  return {
    id: SESSION_ID,
    source_template_id: null,
    workout_name_snapshot: '快照',
    status: 'draft',
    daily_status: null,
    notes: null,
    started_at: null,
    ended_at: null,
    current_session_exercise_id: null,
    current_set_number: null,
    was_edited: 0,
    edited_at: null,
    is_deleted: 0,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function createTransactionDatabase({
  beginError,
  commitError,
  rollbackError,
}: {
  readonly beginError?: Error;
  readonly commitError?: Error;
  readonly rollbackError?: Error;
} = {}): {
  readonly database: DatabaseConnection;
  readonly calls: string[];
} {
  const calls: string[] = [];
  const database: DatabaseConnection = {
    execAsync: async (source) => {
      calls.push(source);

      if (source === 'BEGIN IMMEDIATE;' && beginError) {
        throw beginError;
      }
      if (source === 'COMMIT;' && commitError) {
        throw commitError;
      }
      if (source === 'ROLLBACK;' && rollbackError) {
        throw rollbackError;
      }
    },
    runAsync: async () => ({}),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  };

  return { database, calls };
}
