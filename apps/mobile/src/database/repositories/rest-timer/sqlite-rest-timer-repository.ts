import type { RestTimerSchemaRow } from '@/database/schema';
import { runWorkoutSessionRepositoryTransaction } from '@/database/repositories/workout-session';
import type { DatabaseConnection } from '@/database/types';
import {
  type RestTimer,
  type RestTimerRepository,
  type RestTimerStatus,
  type StartRestTimerPersistenceInput,
  type StartRestTimerPersistenceResult,
  type WorkoutSessionId,
} from '@/domain/workout-session';

import { mapRestTimerRow, toRestTimerRow } from './row-mapper';

type ExclusiveDatabaseConnection = DatabaseConnection & {
  readonly withExclusiveTransactionAsync: (
    task: (transaction: DatabaseConnection) => Promise<void>,
  ) => Promise<void>;
};

class RestTimerSessionConflictRollbackError extends Error {}

export class RestTimerPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestTimerPersistenceError';
  }
}

export function createSqliteRestTimerRepository(
  database: DatabaseConnection,
): RestTimerRepository {
  return {
    findBySessionId: (sessionId) =>
      findRestTimerBySessionId(database, sessionId),
    startIfNoActiveTimer: (input) => startRestTimerIfNoActive(database, input),
    update: (timer, expectedStatus, expectedUpdatedAt) =>
      updateRestTimer(database, timer, expectedStatus, expectedUpdatedAt),
    completeIfExpired: (sessionId, now) =>
      completeRestTimerIfExpired(database, sessionId, now),
  };
}

async function findRestTimerBySessionId(
  database: DatabaseConnection,
  sessionId: WorkoutSessionId,
): Promise<RestTimer | null> {
  const row = await database.getFirstAsync<RestTimerSchemaRow>(
    `
    SELECT *
    FROM rest_timer_states
    WHERE session_id = ?
    LIMIT 1;
    `,
    sessionId,
  );

  return row ? mapRestTimerRow(row) : null;
}

async function startRestTimerIfNoActive(
  database: DatabaseConnection,
  input: StartRestTimerPersistenceInput,
): Promise<StartRestTimerPersistenceResult> {
  mapRestTimerRow(toRestTimerRow(input.timer));

  if (input.timer.status !== 'running') {
    throw new RestTimerPersistenceError(
      'startIfNoActiveTimer requires a running RestTimer.',
    );
  }

  if (
    !Number.isSafeInteger(input.currentSetNumber) ||
    input.currentSetNumber < 1
  ) {
    throw new RestTimerPersistenceError(
      'startIfNoActiveTimer requires a positive current set number.',
    );
  }

  try {
    return await runRestTimerTransaction(database, async (transaction) => {
      const timerRow = await upsertRunningRestTimer(transaction, input.timer);

      if (!timerRow) {
        const activeTimer = await findRestTimerBySessionId(
          transaction,
          input.timer.sessionId,
        );

        if (!activeTimer) {
          throw new RestTimerPersistenceError(
            'Active RestTimer conflict could not be resolved.',
          );
        }

        return { status: 'active_timer_exists', activeTimer };
      }

      const updatedSession = await transaction.getFirstAsync<{
        readonly id: string;
      }>(
        `
        UPDATE workout_sessions
        SET
          current_session_exercise_id = ?,
          current_set_number = ?,
          updated_at = ?
        WHERE id = ?
          AND status = 'in_progress'
          AND is_deleted = 0
          AND updated_at = ?
          AND EXISTS (
            SELECT 1
            FROM workout_session_exercises
            WHERE id = ? AND session_id = workout_sessions.id
          )
        RETURNING id;
        `,
        input.currentSessionExerciseId,
        input.currentSetNumber,
        input.sessionUpdatedAt,
        input.timer.sessionId,
        input.expectedSessionUpdatedAt,
        input.currentSessionExerciseId,
      );

      if (!updatedSession) {
        throw new RestTimerSessionConflictRollbackError();
      }

      return { status: 'started', timer: mapRestTimerRow(timerRow) };
    });
  } catch (error) {
    if (error instanceof RestTimerSessionConflictRollbackError) {
      return { status: 'session_conflict' };
    }

    throw error;
  }
}

async function upsertRunningRestTimer(
  database: DatabaseConnection,
  timer: RestTimer,
): Promise<RestTimerSchemaRow | null> {
  const row = toRestTimerRow(timer);

  return database.getFirstAsync<RestTimerSchemaRow>(
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      id = excluded.id,
      session_exercise_id = excluded.session_exercise_id,
      previous_set_number = excluded.previous_set_number,
      next_set_number = excluded.next_set_number,
      original_duration_seconds = excluded.original_duration_seconds,
      started_at = excluded.started_at,
      target_end_at = excluded.target_end_at,
      paused_remaining_seconds = excluded.paused_remaining_seconds,
      status = excluded.status,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
    WHERE rest_timer_states.status IN ('completed', 'skipped', 'cancelled')
      OR (
        rest_timer_states.status = 'running'
        AND rest_timer_states.target_end_at IS NOT NULL
        AND rest_timer_states.target_end_at <= excluded.started_at
      )
    RETURNING *;
    `,
    row.id,
    row.session_id,
    row.session_exercise_id,
    row.previous_set_number,
    row.next_set_number,
    row.original_duration_seconds,
    row.started_at,
    row.target_end_at,
    row.paused_remaining_seconds,
    row.status,
    row.created_at,
    row.updated_at,
  );
}

async function updateRestTimer(
  database: DatabaseConnection,
  timer: RestTimer,
  expectedStatus: RestTimerStatus,
  expectedUpdatedAt: string,
): Promise<RestTimer | null> {
  const row = toRestTimerRow(timer);
  mapRestTimerRow(row);

  const updated = await database.getFirstAsync<RestTimerSchemaRow>(
    `
    UPDATE rest_timer_states
    SET
      session_exercise_id = ?,
      previous_set_number = ?,
      next_set_number = ?,
      original_duration_seconds = ?,
      started_at = ?,
      target_end_at = ?,
      paused_remaining_seconds = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
      AND session_id = ?
      AND status = ?
      AND updated_at = ?
    RETURNING *;
    `,
    row.session_exercise_id,
    row.previous_set_number,
    row.next_set_number,
    row.original_duration_seconds,
    row.started_at,
    row.target_end_at,
    row.paused_remaining_seconds,
    row.status,
    row.updated_at,
    row.id,
    row.session_id,
    expectedStatus,
    expectedUpdatedAt,
  );

  return updated ? mapRestTimerRow(updated) : null;
}

async function completeRestTimerIfExpired(
  database: DatabaseConnection,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<RestTimer | null> {
  const updated = await database.getFirstAsync<RestTimerSchemaRow>(
    `
    UPDATE rest_timer_states
    SET status = 'completed', updated_at = ?
    WHERE session_id = ?
      AND status = 'running'
      AND target_end_at IS NOT NULL
      AND target_end_at <= ?
    RETURNING *;
    `,
    now,
    sessionId,
    now,
  );

  return updated ? mapRestTimerRow(updated) : null;
}

async function runRestTimerTransaction(
  database: DatabaseConnection,
  operation: (
    transaction: DatabaseConnection,
  ) => Promise<StartRestTimerPersistenceResult>,
): Promise<StartRestTimerPersistenceResult> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runRestTimerTransactionAttempt(database, operation);
    } catch (error) {
      if (
        !isTransientSqliteTransactionError(error) ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      await waitForTransactionRetry(attempt);
    }
  }

  throw new RestTimerPersistenceError(
    'RestTimer transaction retry limit was exhausted.',
  );
}

async function runRestTimerTransactionAttempt(
  database: DatabaseConnection,
  operation: (
    transaction: DatabaseConnection,
  ) => Promise<StartRestTimerPersistenceResult>,
): Promise<StartRestTimerPersistenceResult> {
  if (hasExclusiveTransaction(database)) {
    let outcome: StartRestTimerPersistenceResult | null = null;

    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync('PRAGMA busy_timeout = 1000;');
      outcome = await operation(transaction);
    });

    if (outcome) {
      return outcome;
    }

    throw new RestTimerPersistenceError(
      'Exclusive RestTimer transaction completed without a result.',
    );
  }

  return runWorkoutSessionRepositoryTransaction(database, () =>
    operation(database),
  );
}

function isTransientSqliteTransactionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('database is locked') ||
    message.includes('database is busy') ||
    message.includes('sqlite_busy') ||
    message.includes('cannot start a transaction within a transaction')
  );
}

function waitForTransactionRetry(attempt: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, attempt * 10);
  });
}

function hasExclusiveTransaction(
  database: DatabaseConnection,
): database is ExclusiveDatabaseConnection {
  return (
    'withExclusiveTransactionAsync' in database &&
    typeof database.withExclusiveTransactionAsync === 'function'
  );
}
