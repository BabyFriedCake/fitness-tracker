import {
  WORKOUT_SESSION_STATUSES,
  assertWorkoutSessionStatusTransition,
  type SessionExercise,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
  type WorkoutSessionStatus,
  type WorkoutSet,
} from '@/domain/workout-session';
import type {
  SessionExerciseSchemaRow,
  WorkoutSessionSchemaRow,
  WorkoutSetSchemaRow,
} from '@/database/schema';
import type { DatabaseConnection } from '@/database/types';

import { mapWorkoutSessionRows } from './row-mapper';

export class WorkoutSessionNotFoundError extends Error {
  constructor(readonly sessionId: WorkoutSessionId) {
    super(`WorkoutSession not found: ${sessionId}.`);
    this.name = 'WorkoutSessionNotFoundError';
  }
}

export class WorkoutSessionAggregateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkoutSessionAggregateError';
  }
}

export class WorkoutSessionHistoricalRecordError extends Error {
  constructor(
    readonly sessionId: WorkoutSessionId,
    message: string,
  ) {
    super(message);
    this.name = 'WorkoutSessionHistoricalRecordError';
  }
}

export function createSqliteWorkoutSessionRepository(
  database: DatabaseConnection,
): WorkoutSessionRepository {
  return {
    save: (session) => saveWorkoutSession(database, session),
    findById: (id) => findWorkoutSessionById(database, id),
    findActiveSession: () => findActiveWorkoutSession(database),
    update: (session) => updateWorkoutSession(database, session),
  };
}

async function saveWorkoutSession(
  database: DatabaseConnection,
  session: WorkoutSession,
): Promise<WorkoutSession> {
  assertAggregateRelationships(session);

  await runWorkoutSessionRepositoryTransaction(database, async () => {
    await insertSessionRow(database, session);

    for (const exercise of session.sessionExercises) {
      await insertSessionExerciseRow(
        database,
        exercise,
        session.createdAt,
        session.updatedAt,
      );

      for (const workoutSet of exercise.sets) {
        await insertWorkoutSetRow(database, workoutSet);
      }
    }
  });

  return session;
}

async function findWorkoutSessionById(
  database: DatabaseConnection,
  id: WorkoutSessionId,
): Promise<WorkoutSession | null> {
  const sessionRow = await database.getFirstAsync<WorkoutSessionSchemaRow>(
    `
    SELECT *
    FROM workout_sessions
    WHERE id = ? AND is_deleted = 0
    LIMIT 1;
    `,
    id,
  );

  if (!sessionRow) {
    return null;
  }

  return hydrateWorkoutSession(database, sessionRow);
}

async function findActiveWorkoutSession(
  database: DatabaseConnection,
): Promise<WorkoutSession | null> {
  const sessionRow = await database.getFirstAsync<WorkoutSessionSchemaRow>(
    `
    SELECT *
    FROM workout_sessions
    WHERE status = 'in_progress' AND is_deleted = 0
    ORDER BY started_at ASC, id ASC
    LIMIT 1;
    `,
  );

  if (!sessionRow) {
    return null;
  }

  return hydrateWorkoutSession(database, sessionRow);
}

async function hydrateWorkoutSession(
  database: DatabaseConnection,
  sessionRow: WorkoutSessionSchemaRow,
): Promise<WorkoutSession> {
  const exerciseRows = await database.getAllAsync<SessionExerciseSchemaRow>(
    `
      SELECT *
      FROM workout_session_exercises
      WHERE session_id = ?
      ORDER BY position ASC, id ASC;
      `,
    sessionRow.id,
  );
  const setRows = await getWorkoutSetRows(database, exerciseRows);

  return mapWorkoutSessionRows(sessionRow, exerciseRows, setRows);
}

async function getWorkoutSetRows(
  database: DatabaseConnection,
  exerciseRows: readonly SessionExerciseSchemaRow[],
): Promise<readonly WorkoutSetSchemaRow[]> {
  if (exerciseRows.length === 0) {
    return [];
  }

  const placeholders = exerciseRows.map(() => '?').join(', ');

  return database.getAllAsync<WorkoutSetSchemaRow>(
    `
    SELECT *
    FROM workout_sets
    WHERE session_exercise_id IN (${placeholders})
      AND is_deleted = 0
    ORDER BY session_exercise_id ASC, set_number ASC, id ASC;
    `,
    ...exerciseRows.map((row) => row.id),
  );
}

async function updateWorkoutSession(
  database: DatabaseConnection,
  session: WorkoutSession,
): Promise<WorkoutSession> {
  assertAggregateRelationships(session);

  await runWorkoutSessionRepositoryTransaction(database, async () => {
    const existing = await findWorkoutSessionById(database, session.id);

    if (!existing) {
      throw new WorkoutSessionNotFoundError(session.id);
    }

    assertUpdateAllowed(existing, session);
    await updateSessionRow(database, session);
    await syncSessionExerciseRows(database, existing, session);
  });

  return session;
}

function assertUpdateAllowed(
  existing: WorkoutSession,
  next: WorkoutSession,
): void {
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new WorkoutSessionHistoricalRecordError(
      existing.id,
      `Terminal WorkoutSession cannot be updated: ${existing.id}.`,
    );
  }

  if (existing.createdAt !== next.createdAt) {
    throw new WorkoutSessionHistoricalRecordError(
      existing.id,
      `WorkoutSession createdAt cannot be changed: ${existing.id}.`,
    );
  }

  if (existing.status !== next.status && isWorkoutSessionStatus(next.status)) {
    assertWorkoutSessionStatusTransition(existing.status, next.status);
  }

  const nextExercisesById = new Map(
    next.sessionExercises.map((exercise) => [exercise.id, exercise]),
  );
  const nextSetsById = new Map(
    next.sessionExercises.flatMap((exercise) =>
      exercise.sets.map((workoutSet) => [workoutSet.id, workoutSet] as const),
    ),
  );

  for (const existingExercise of existing.sessionExercises) {
    for (const existingSet of existingExercise.sets) {
      const nextSet = nextSetsById.get(existingSet.id);

      if (!nextSet || !areWorkoutSetsEqual(existingSet, nextSet)) {
        throw new WorkoutSessionHistoricalRecordError(
          existing.id,
          `Existing WorkoutSet cannot be changed or removed: ${existingSet.id}.`,
        );
      }
    }

    if (existingExercise.sets.length > 0) {
      const nextExercise = nextExercisesById.get(existingExercise.id);

      if (
        !nextExercise ||
        nextExercise.sourceExerciseId !== existingExercise.sourceExerciseId ||
        nextExercise.exerciseNameSnapshot !==
          existingExercise.exerciseNameSnapshot
      ) {
        throw new WorkoutSessionHistoricalRecordError(
          existing.id,
          `Exercise identity for completed sets cannot be changed: ${existingExercise.id}.`,
        );
      }
    }
  }
}

async function syncSessionExerciseRows(
  database: DatabaseConnection,
  existing: WorkoutSession,
  next: WorkoutSession,
): Promise<void> {
  const existingExercisesById = new Map(
    existing.sessionExercises.map((exercise) => [exercise.id, exercise]),
  );
  const nextExerciseIds = new Set(
    next.sessionExercises.map((exercise) => exercise.id),
  );

  await stageExistingExercisePositions(database, existing, next);

  for (const existingExercise of existing.sessionExercises) {
    if (!nextExerciseIds.has(existingExercise.id)) {
      await database.runAsync(
        `
        DELETE FROM workout_session_exercises
        WHERE id = ? AND session_id = ?;
        `,
        existingExercise.id,
        next.id,
      );
    }
  }

  for (const exercise of next.sessionExercises) {
    if (existingExercisesById.has(exercise.id)) {
      await updateSessionExerciseRow(database, exercise, next.updatedAt);
    } else {
      await insertSessionExerciseRow(
        database,
        exercise,
        next.updatedAt,
        next.updatedAt,
      );
    }
  }

  const existingSetIds = new Set(
    existing.sessionExercises.flatMap((exercise) =>
      exercise.sets.map((workoutSet) => workoutSet.id),
    ),
  );

  for (const exercise of next.sessionExercises) {
    for (const workoutSet of exercise.sets) {
      if (!existingSetIds.has(workoutSet.id)) {
        await insertWorkoutSetRow(database, workoutSet);
      }
    }
  }
}

async function stageExistingExercisePositions(
  database: DatabaseConnection,
  existing: WorkoutSession,
  next: WorkoutSession,
): Promise<void> {
  const highestPosition = Math.max(
    0,
    ...existing.sessionExercises.map((exercise) => exercise.position),
    ...next.sessionExercises.map((exercise) => exercise.position),
  );

  for (const [index, exercise] of existing.sessionExercises.entries()) {
    await database.runAsync(
      `
      UPDATE workout_session_exercises
      SET position = ?
      WHERE id = ? AND session_id = ?;
      `,
      highestPosition + index + 1,
      exercise.id,
      next.id,
    );
  }
}

async function insertSessionRow(
  database: DatabaseConnection,
  session: WorkoutSession,
): Promise<void> {
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
    session.id,
    session.sourceTemplateId ?? null,
    session.workoutNameSnapshot,
    session.status,
    session.dailyStatus ?? null,
    session.notes ?? null,
    session.startedAt ?? null,
    session.endedAt ?? null,
    session.createdAt,
    session.updatedAt,
  );
}

async function updateSessionRow(
  database: DatabaseConnection,
  session: WorkoutSession,
): Promise<void> {
  await database.runAsync(
    `
    UPDATE workout_sessions
    SET
      source_template_id = ?,
      workout_name_snapshot = ?,
      status = ?,
      daily_status = ?,
      notes = ?,
      started_at = ?,
      ended_at = ?,
      updated_at = ?
    WHERE id = ? AND is_deleted = 0;
    `,
    session.sourceTemplateId ?? null,
    session.workoutNameSnapshot,
    session.status,
    session.dailyStatus ?? null,
    session.notes ?? null,
    session.startedAt ?? null,
    session.endedAt ?? null,
    session.updatedAt,
    session.id,
  );
}

async function insertSessionExerciseRow(
  database: DatabaseConnection,
  exercise: SessionExercise,
  createdAt: string,
  updatedAt: string,
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
    exercise.id,
    exercise.sessionId,
    exercise.sourceExerciseId,
    exercise.exerciseNameSnapshot,
    exercise.position,
    toDatabaseBoolean(exercise.isEnabled),
    toDatabaseBoolean(exercise.isSkipped),
    toDatabaseBoolean(exercise.isCompleted),
    exercise.targetSets,
    exercise.targetRepsMin,
    exercise.targetRepsMax,
    exercise.currentRestSeconds,
    createdAt,
    updatedAt,
  );
}

async function updateSessionExerciseRow(
  database: DatabaseConnection,
  exercise: SessionExercise,
  updatedAt: string,
): Promise<void> {
  await database.runAsync(
    `
    UPDATE workout_session_exercises
    SET
      source_exercise_id = ?,
      exercise_name_snapshot = ?,
      position = ?,
      is_enabled = ?,
      is_skipped = ?,
      is_completed = ?,
      target_sets = ?,
      target_reps_min = ?,
      target_reps_max = ?,
      current_rest_seconds = ?,
      updated_at = ?
    WHERE id = ? AND session_id = ?;
    `,
    exercise.sourceExerciseId,
    exercise.exerciseNameSnapshot,
    exercise.position,
    toDatabaseBoolean(exercise.isEnabled),
    toDatabaseBoolean(exercise.isSkipped),
    toDatabaseBoolean(exercise.isCompleted),
    exercise.targetSets,
    exercise.targetRepsMin,
    exercise.targetRepsMax,
    exercise.currentRestSeconds,
    updatedAt,
    exercise.id,
    exercise.sessionId,
  );
}

async function insertWorkoutSetRow(
  database: DatabaseConnection,
  workoutSet: WorkoutSet,
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
    workoutSet.id,
    workoutSet.sessionExerciseId,
    workoutSet.setNumber,
    workoutSet.setType,
    workoutSet.actualReps,
    workoutSet.weight,
    toDatabaseBoolean(workoutSet.isCompleted),
    toDatabaseBoolean(workoutSet.isExtraSet),
    workoutSet.completedAt,
    workoutSet.completedAt,
    workoutSet.completedAt,
  );
}

function assertAggregateRelationships(session: WorkoutSession): void {
  const exerciseIds = new Set<string>();
  const exercisePositions = new Set<number>();
  const setIds = new Set<string>();

  for (const exercise of session.sessionExercises) {
    if (exercise.sessionId !== session.id) {
      throw new WorkoutSessionAggregateError(
        `SessionExercise ${exercise.id} does not belong to ${session.id}.`,
      );
    }

    if (exerciseIds.has(exercise.id)) {
      throw new WorkoutSessionAggregateError(
        `Duplicate SessionExercise id: ${exercise.id}.`,
      );
    }
    exerciseIds.add(exercise.id);

    if (exercisePositions.has(exercise.position)) {
      throw new WorkoutSessionAggregateError(
        `Duplicate SessionExercise position: ${exercise.position}.`,
      );
    }
    exercisePositions.add(exercise.position);

    const setNumbers = new Set<number>();

    for (const workoutSet of exercise.sets) {
      if (workoutSet.sessionExerciseId !== exercise.id) {
        throw new WorkoutSessionAggregateError(
          `WorkoutSet ${workoutSet.id} does not belong to ${exercise.id}.`,
        );
      }

      if (setIds.has(workoutSet.id)) {
        throw new WorkoutSessionAggregateError(
          `Duplicate WorkoutSet id: ${workoutSet.id}.`,
        );
      }
      setIds.add(workoutSet.id);

      if (setNumbers.has(workoutSet.setNumber)) {
        throw new WorkoutSessionAggregateError(
          `Duplicate WorkoutSet number: ${workoutSet.setNumber}.`,
        );
      }
      setNumbers.add(workoutSet.setNumber);
    }
  }
}

function areWorkoutSetsEqual(left: WorkoutSet, right: WorkoutSet): boolean {
  return (
    left.id === right.id &&
    left.sessionExerciseId === right.sessionExerciseId &&
    left.setNumber === right.setNumber &&
    left.setType === right.setType &&
    left.actualReps === right.actualReps &&
    left.weight === right.weight &&
    left.isCompleted === right.isCompleted &&
    left.isExtraSet === right.isExtraSet &&
    left.completedAt === right.completedAt
  );
}

function isWorkoutSessionStatus(value: string): value is WorkoutSessionStatus {
  return WORKOUT_SESSION_STATUSES.some((status) => status === value);
}

function toDatabaseBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export async function runWorkoutSessionRepositoryTransaction<T>(
  database: DatabaseConnection,
  operation: () => Promise<T>,
): Promise<T> {
  let transactionStarted = false;

  try {
    await database.execAsync('BEGIN IMMEDIATE;');
    transactionStarted = true;
    const result = await operation();
    await database.execAsync('COMMIT;');
    transactionStarted = false;
    return result;
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
