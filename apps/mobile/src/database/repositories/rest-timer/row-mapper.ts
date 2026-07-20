import type { RestTimerSchemaRow } from '@/database/schema';
import {
  REST_TIMER_STATUSES,
  type RestTimer,
  type RestTimerId,
  type RestTimerStatus,
  type SessionExerciseId,
  type WorkoutSessionId,
} from '@/domain/workout-session';

export class RestTimerRowMappingError extends Error {
  constructor(
    readonly restTimerId: string,
    readonly cause: unknown,
  ) {
    super(`Invalid RestTimer database row: ${restTimerId}.`);
    this.name = 'RestTimerRowMappingError';
  }
}

export function mapRestTimerRow(row: RestTimerSchemaRow): RestTimer {
  try {
    assertNonEmptyString(row.id, 'id');
    assertNonEmptyString(row.session_id, 'session_id');
    assertNonEmptyString(row.session_exercise_id, 'session_exercise_id');
    assertOptionalPositiveInteger(
      row.previous_set_number,
      'previous_set_number',
    );
    assertOptionalPositiveInteger(row.next_set_number, 'next_set_number');
    assertNonNegativeInteger(
      row.original_duration_seconds,
      'original_duration_seconds',
    );
    assertOptionalTimestamp(row.started_at, 'started_at');
    assertOptionalTimestamp(row.target_end_at, 'target_end_at');
    assertOptionalNonNegativeInteger(
      row.paused_remaining_seconds,
      'paused_remaining_seconds',
    );
    assertRestTimerStatus(row.status);
    assertTimestamp(row.created_at, 'created_at');
    assertTimestamp(row.updated_at, 'updated_at');
    assertStatusFields(row);

    return {
      id: row.id as RestTimerId,
      sessionId: row.session_id as WorkoutSessionId,
      sessionExerciseId: row.session_exercise_id as SessionExerciseId,
      previousSetNumber: row.previous_set_number ?? undefined,
      nextSetNumber: row.next_set_number ?? undefined,
      originalDurationSeconds: row.original_duration_seconds,
      startedAt: row.started_at ?? undefined,
      targetEndAt: row.target_end_at ?? undefined,
      pausedRemainingSeconds: row.paused_remaining_seconds ?? undefined,
      status: row.status as RestTimerStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    throw new RestTimerRowMappingError(row.id, error);
  }
}

export function toRestTimerRow(timer: RestTimer): RestTimerSchemaRow {
  return {
    id: timer.id,
    session_id: timer.sessionId,
    session_exercise_id: timer.sessionExerciseId,
    previous_set_number: timer.previousSetNumber ?? null,
    next_set_number: timer.nextSetNumber ?? null,
    original_duration_seconds: timer.originalDurationSeconds,
    started_at: timer.startedAt ?? null,
    target_end_at: timer.targetEndAt ?? null,
    paused_remaining_seconds: timer.pausedRemainingSeconds ?? null,
    status: timer.status,
    created_at: timer.createdAt,
    updated_at: timer.updatedAt,
  };
}

function assertStatusFields(row: RestTimerSchemaRow): void {
  if (row.status === 'running') {
    assert(
      row.started_at !== null &&
        row.target_end_at !== null &&
        row.paused_remaining_seconds === null,
      'running timer fields are invalid',
    );
  }

  if (row.status === 'paused') {
    assert(
      row.started_at !== null &&
        row.target_end_at !== null &&
        row.paused_remaining_seconds !== null,
      'paused timer fields are invalid',
    );
  }
}

function assertRestTimerStatus(value: string): void {
  assert(
    REST_TIMER_STATUSES.some((status) => status === value),
    'status is invalid',
  );
}

function assertOptionalPositiveInteger(
  value: number | null,
  field: string,
): void {
  if (value !== null) {
    assert(Number.isSafeInteger(value) && value > 0, `${field} is invalid`);
  }
}

function assertOptionalNonNegativeInteger(
  value: number | null,
  field: string,
): void {
  if (value !== null) {
    assert(Number.isSafeInteger(value) && value >= 0, `${field} is invalid`);
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  assert(Number.isSafeInteger(value) && value >= 0, `${field} is invalid`);
}

function assertOptionalTimestamp(value: string | null, field: string): void {
  if (value !== null) {
    assertTimestamp(value, field);
  }
}

function assertTimestamp(value: string, field: string): void {
  assertNonEmptyString(value, field);
  const timestamp = Date.parse(value);
  assert(
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value,
    `${field} is invalid`,
  );
}

function assertNonEmptyString(value: string, field: string): void {
  assert(value.trim().length > 0, `${field} is required`);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
