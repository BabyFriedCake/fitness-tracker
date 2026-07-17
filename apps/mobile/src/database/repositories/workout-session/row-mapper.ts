import type { ExerciseId } from '@/domain/exercise';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import {
  WORKOUT_SESSION_DAILY_STATUSES,
  WORKOUT_SESSION_STATUSES,
  WORKOUT_SET_TYPES,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionDailyStatus,
  type WorkoutSessionId,
  type WorkoutSessionStatus,
  type WorkoutSet,
  type WorkoutSetId,
  type WorkoutSetType,
} from '@/domain/workout-session';
import type {
  SessionExerciseSchemaRow,
  WorkoutSessionSchemaRow,
  WorkoutSetSchemaRow,
} from '@/database/schema';

export class WorkoutSessionRowMappingError extends Error {
  constructor(
    readonly sessionId: string,
    readonly cause: unknown,
  ) {
    super(`Invalid WorkoutSession database rows: ${sessionId}.`);
    this.name = 'WorkoutSessionRowMappingError';
  }
}

export function mapWorkoutSessionRows(
  sessionRow: WorkoutSessionSchemaRow,
  exerciseRows: readonly SessionExerciseSchemaRow[],
  setRows: readonly WorkoutSetSchemaRow[],
): WorkoutSession {
  try {
    return mapRows(sessionRow, exerciseRows, setRows);
  } catch (error) {
    throw new WorkoutSessionRowMappingError(sessionRow.id, error);
  }
}

function mapRows(
  sessionRow: WorkoutSessionSchemaRow,
  exerciseRows: readonly SessionExerciseSchemaRow[],
  setRows: readonly WorkoutSetSchemaRow[],
): WorkoutSession {
  assertNonEmptyString(sessionRow.id, 'session id');
  assertNonEmptyString(
    sessionRow.workout_name_snapshot,
    'workout name snapshot',
  );
  assertNonEmptyString(sessionRow.created_at, 'session created_at');
  assertNonEmptyString(sessionRow.updated_at, 'session updated_at');
  assertNullableNonEmptyString(
    sessionRow.source_template_id,
    'source template id',
  );
  assertNullableString(sessionRow.notes, 'session notes');
  assertWorkoutSessionStatus(sessionRow.status);
  assertDailyStatus(sessionRow.daily_status);
  assertLifecycleTimestamps(sessionRow);

  const sessionId = sessionRow.id as WorkoutSessionId;
  const exercises = mapSessionExercises(sessionId, exerciseRows, setRows);
  const base = {
    id: sessionId,
    sourceTemplateId:
      (sessionRow.source_template_id as WorkoutTemplateId | null) ?? undefined,
    workoutNameSnapshot: sessionRow.workout_name_snapshot,
    sessionExercises: exercises,
    dailyStatus:
      (sessionRow.daily_status as WorkoutSessionDailyStatus | null) ??
      undefined,
    notes: sessionRow.notes ?? undefined,
    createdAt: sessionRow.created_at,
    updatedAt: sessionRow.updated_at,
  };

  switch (sessionRow.status) {
    case 'draft':
      return { ...base, status: 'draft' };
    case 'in_progress':
      return {
        ...base,
        status: 'in_progress',
        startedAt: sessionRow.started_at as string,
      };
    case 'completed':
      return {
        ...base,
        status: 'completed',
        startedAt: sessionRow.started_at as string,
        endedAt: sessionRow.ended_at as string,
      };
    case 'cancelled':
      return {
        ...base,
        status: 'cancelled',
        startedAt: sessionRow.started_at ?? undefined,
        endedAt: sessionRow.ended_at as string,
      };
  }
}

function mapSessionExercises(
  sessionId: WorkoutSessionId,
  exerciseRows: readonly SessionExerciseSchemaRow[],
  setRows: readonly WorkoutSetSchemaRow[],
): readonly SessionExercise[] {
  const exerciseIds = new Set(exerciseRows.map((row) => row.id));

  for (const row of setRows) {
    assert(
      exerciseIds.has(row.session_exercise_id),
      `WorkoutSet ${row.id} does not belong to this session.`,
    );
  }

  const sortedRows = [...exerciseRows].sort(
    (left, right) =>
      left.position - right.position || left.id.localeCompare(right.id),
  );
  assertUniqueValues(
    sortedRows.map((row) => row.id),
    'SessionExercise id',
  );
  assertUniqueValues(
    sortedRows.map((row) => row.position),
    'SessionExercise position',
  );

  return sortedRows.map((row) => {
    assert(
      row.session_id === sessionId,
      'SessionExercise session id mismatch.',
    );
    assertNonEmptyString(row.id, 'session exercise id');
    assertNonEmptyString(row.source_exercise_id, 'source exercise id');
    assertNonEmptyString(row.exercise_name_snapshot, 'exercise name snapshot');
    assertPositiveInteger(row.position, 'exercise position');
    assertBooleanInteger(row.is_enabled, 'exercise is_enabled');
    assertBooleanInteger(row.is_skipped, 'exercise is_skipped');
    assertBooleanInteger(row.is_completed, 'exercise is_completed');
    assertPositiveInteger(row.target_sets, 'exercise target_sets');
    assertPositiveInteger(row.target_reps_min, 'exercise target_reps_min');
    assert(
      Number.isInteger(row.target_reps_max) &&
        row.target_reps_max >= row.target_reps_min,
      'Exercise target_reps_max is invalid.',
    );
    assertNonNegativeInteger(
      row.current_rest_seconds,
      'exercise current_rest_seconds',
    );

    return {
      id: row.id as SessionExerciseId,
      sessionId,
      sourceExerciseId: row.source_exercise_id as ExerciseId,
      exerciseNameSnapshot: row.exercise_name_snapshot,
      position: row.position,
      isEnabled: row.is_enabled === 1,
      isSkipped: row.is_skipped === 1,
      isCompleted: row.is_completed === 1,
      targetSets: row.target_sets,
      targetRepsMin: row.target_reps_min,
      targetRepsMax: row.target_reps_max,
      currentRestSeconds: row.current_rest_seconds,
      sets: mapWorkoutSets(row.id as SessionExerciseId, setRows),
    };
  });
}

function mapWorkoutSets(
  sessionExerciseId: SessionExerciseId,
  rows: readonly WorkoutSetSchemaRow[],
): readonly WorkoutSet[] {
  const matchingRows = rows
    .filter((row) => row.session_exercise_id === sessionExerciseId)
    .sort(
      (left, right) =>
        left.set_number - right.set_number || left.id.localeCompare(right.id),
    );

  assertUniqueValues(
    matchingRows.map((row) => row.id),
    'WorkoutSet id',
  );
  assertUniqueValues(
    matchingRows.map((row) => row.set_number),
    'WorkoutSet number',
  );

  return matchingRows.map((row) => {
    assertNonEmptyString(row.id, 'workout set id');
    assertPositiveInteger(row.set_number, 'workout set number');
    assertWorkoutSetType(row.set_type);
    assertNonNegativeInteger(row.actual_reps, 'workout set actual_reps');
    assert(
      Number.isFinite(row.weight) && row.weight >= 0,
      'WorkoutSet weight is invalid.',
    );
    assertBooleanInteger(row.is_completed, 'workout set is_completed');
    assertBooleanInteger(row.is_extra_set, 'workout set is_extra_set');
    assertNonEmptyString(row.completed_at, 'workout set completed_at');

    return {
      id: row.id as WorkoutSetId,
      sessionExerciseId,
      setNumber: row.set_number,
      setType: row.set_type as WorkoutSetType,
      actualReps: row.actual_reps,
      weight: row.weight,
      isCompleted: row.is_completed === 1,
      isExtraSet: row.is_extra_set === 1,
      completedAt: row.completed_at,
    };
  });
}

function assertLifecycleTimestamps(row: WorkoutSessionSchemaRow): void {
  assertNullableNonEmptyString(row.started_at, 'session started_at');
  assertNullableNonEmptyString(row.ended_at, 'session ended_at');

  const isValid =
    (row.status === 'draft' &&
      row.started_at === null &&
      row.ended_at === null) ||
    (row.status === 'in_progress' &&
      row.started_at !== null &&
      row.ended_at === null) ||
    (row.status === 'completed' &&
      row.started_at !== null &&
      row.ended_at !== null) ||
    (row.status === 'cancelled' && row.ended_at !== null);

  assert(isValid, 'WorkoutSession lifecycle timestamps are invalid.');
}

function assertWorkoutSessionStatus(
  value: string,
): asserts value is WorkoutSessionStatus {
  assert(
    WORKOUT_SESSION_STATUSES.some((status) => status === value),
    'WorkoutSession status is invalid.',
  );
}

function assertDailyStatus(value: string | null): void {
  assert(
    value === null ||
      WORKOUT_SESSION_DAILY_STATUSES.some((status) => status === value),
    'WorkoutSession daily status is invalid.',
  );
}

function assertWorkoutSetType(value: string): void {
  assert(
    WORKOUT_SET_TYPES.some((setType) => setType === value),
    'WorkoutSet type is invalid.',
  );
}

function assertNonEmptyString(value: unknown, fieldName: string): void {
  assert(
    typeof value === 'string' && value.trim().length > 0,
    `${fieldName} must be a non-empty string.`,
  );
}

function assertNullableNonEmptyString(value: unknown, fieldName: string): void {
  assert(
    value === null || typeof value === 'string',
    `${fieldName} is invalid.`,
  );

  if (value !== null) {
    assertNonEmptyString(value, fieldName);
  }
}

function assertNullableString(value: unknown, fieldName: string): void {
  assert(
    value === null || typeof value === 'string',
    `${fieldName} is invalid.`,
  );
}

function assertPositiveInteger(value: number, fieldName: string): void {
  assert(
    Number.isInteger(value) && value > 0,
    `${fieldName} must be a positive integer.`,
  );
}

function assertNonNegativeInteger(value: number, fieldName: string): void {
  assert(
    Number.isInteger(value) && value >= 0,
    `${fieldName} must be a non-negative integer.`,
  );
}

function assertBooleanInteger(value: number, fieldName: string): void {
  assert(value === 0 || value === 1, `${fieldName} must be 0 or 1.`);
}

function assertUniqueValues(
  values: readonly (string | number)[],
  fieldName: string,
): void {
  assert(
    new Set(values).size === values.length,
    `${fieldName} values must be unique.`,
  );
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
