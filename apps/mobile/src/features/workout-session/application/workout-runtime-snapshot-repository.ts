import type {
  SessionExercise,
  WorkoutSessionId,
  WorkoutSet,
} from '@/domain/workout-session';

import type { WorkoutRuntimeSnapshot } from './workout-runtime-engine';

export type WorkoutRuntimeSnapshotSaveResult =
  | { readonly success: true }
  | {
      readonly success: false;
      readonly reason: 'snapshot_persist_failed';
      readonly error: Error;
    };

export function isValidWorkoutRuntimeSnapshot(
  value: unknown,
): value is WorkoutRuntimeSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.sessionId !== 'string' ||
    (value.status !== 'running' && value.status !== 'paused') ||
    !isUtcIsoTimestamp(value.updatedAt) ||
    !Array.isArray(value.orderedExercises) ||
    !value.orderedExercises.every(isSessionExerciseSnapshot) ||
    !isNonNegativeInteger(value.completedSetCount) ||
    !isNonNegativeInteger(value.completedSets) ||
    !isNonNegativeInteger(value.totalTargetSetCount) ||
    !isNonNegativeInteger(value.targetSets) ||
    !isOptionalPositiveInteger(value.currentSet) ||
    !isOptionalPositiveInteger(value.currentSetNumber) ||
    !isOptionalNonNegativeInteger(value.currentExerciseIndex) ||
    !isOptionalString(value.currentSessionExerciseId) ||
    !isOptionalRestTimerStatus(value.restTimerStatus)
  ) {
    return false;
  }

  if (
    value.completedSetCount !== value.completedSets ||
    value.totalTargetSetCount !== value.targetSets ||
    value.currentSet !== value.currentSetNumber ||
    value.orderedExercises.some(
      (exercise) => exercise.sessionId !== value.sessionId,
    ) ||
    new Set(value.orderedExercises.map((exercise) => exercise.id)).size !==
      value.orderedExercises.length
  ) {
    return false;
  }

  if (
    value.currentExercise !== undefined &&
    !isSessionExerciseSnapshot(value.currentExercise)
  ) {
    return false;
  }

  if (
    value.currentExercise &&
    (value.currentSessionExerciseId !== value.currentExercise.id ||
      value.currentExercise.sessionId !== value.sessionId)
  ) {
    return false;
  }

  if (value.currentExercise === undefined) {
    return (
      value.currentSessionExerciseId === undefined &&
      value.currentExerciseIndex === undefined &&
      value.currentSet === undefined
    );
  }

  return (
    value.currentExerciseIndex !== undefined &&
    value.currentExerciseIndex < value.orderedExercises.length &&
    value.orderedExercises[value.currentExerciseIndex]?.id ===
      value.currentExercise.id &&
    value.currentSet !== undefined
  );
}

export type WorkoutRuntimeSnapshotRepository = {
  readonly save: (
    snapshot: WorkoutRuntimeSnapshot,
  ) => Promise<WorkoutRuntimeSnapshotSaveResult>;
  readonly load: (
    sessionId: WorkoutSessionId,
  ) => Promise<WorkoutRuntimeSnapshot | null>;
  readonly clear: (sessionId: WorkoutSessionId) => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSessionExerciseSnapshot(value: unknown): value is SessionExercise {
  if (!isRecord(value) || !Array.isArray(value.sets)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.sourceExerciseId === 'string' &&
    typeof value.exerciseNameSnapshot === 'string' &&
    isNonNegativeInteger(value.position) &&
    typeof value.isEnabled === 'boolean' &&
    typeof value.isSkipped === 'boolean' &&
    typeof value.isCompleted === 'boolean' &&
    isNonNegativeInteger(value.targetSets) &&
    isNonNegativeInteger(value.targetRepsMin) &&
    isNonNegativeInteger(value.targetRepsMax) &&
    isNonNegativeInteger(value.currentRestSeconds) &&
    value.sets.every(isWorkoutSetSnapshot)
  );
}

function isWorkoutSetSnapshot(value: unknown): value is WorkoutSet {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sessionExerciseId === 'string' &&
    isPositiveInteger(value.setNumber) &&
    value.setType === 'normal' &&
    isNonNegativeInteger(value.actualReps) &&
    typeof value.weight === 'number' &&
    Number.isFinite(value.weight) &&
    value.weight >= 0 &&
    typeof value.isCompleted === 'boolean' &&
    typeof value.isExtraSet === 'boolean' &&
    isUtcIsoTimestamp(value.completedAt)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isOptionalPositiveInteger(
  value: unknown,
): value is number | undefined {
  return value === undefined || isPositiveInteger(value);
}

function isOptionalNonNegativeInteger(
  value: unknown,
): value is number | undefined {
  return value === undefined || isNonNegativeInteger(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalRestTimerStatus(value: unknown): boolean {
  return (
    value === undefined ||
    value === 'running' ||
    value === 'paused' ||
    value === 'completed' ||
    value === 'skipped' ||
    value === 'cancelled'
  );
}

function isUtcIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}
