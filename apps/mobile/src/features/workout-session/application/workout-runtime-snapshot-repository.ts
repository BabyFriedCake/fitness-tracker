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
    !isNonEmptyString(value.sessionId) ||
    (value.status !== 'running' && value.status !== 'paused') ||
    !isUtcIsoTimestamp(value.updatedAt) ||
    !Array.isArray(value.orderedExercises) ||
    !value.orderedExercises.every((exercise, index, exercises) =>
      isSessionExerciseSnapshot(exercise, index + 1, exercises.length),
    ) ||
    !isNonNegativeInteger(value.completedSetCount) ||
    !isNonNegativeInteger(value.completedSets) ||
    !isNonNegativeInteger(value.totalTargetSetCount) ||
    !isNonNegativeInteger(value.targetSets) ||
    !isOptionalPositiveInteger(value.currentSet) ||
    !isOptionalPositiveInteger(value.currentSetNumber) ||
    !isOptionalNonNegativeInteger(value.currentExerciseIndex) ||
    !isOptionalNonEmptyString(value.currentSessionExerciseId) ||
    !isOptionalRestTimerStatus(value.restTimerStatus)
  ) {
    return false;
  }

  const completedSetCount = value.orderedExercises.reduce(
    (count, exercise) =>
      count +
      exercise.sets.filter((workoutSet) => workoutSet.isCompleted).length,
    0,
  );
  const targetSetCount = value.orderedExercises.reduce(
    (count, exercise) => count + exercise.targetSets,
    0,
  );
  const workoutSetIds = value.orderedExercises.flatMap((exercise) =>
    exercise.sets.map((workoutSet) => workoutSet.id),
  );

  if (
    value.completedSetCount !== value.completedSets ||
    value.totalTargetSetCount !== value.targetSets ||
    value.completedSetCount !== completedSetCount ||
    value.totalTargetSetCount !== targetSetCount ||
    value.currentSet !== value.currentSetNumber ||
    value.orderedExercises.some(
      (exercise) => exercise.sessionId !== value.sessionId,
    ) ||
    new Set(value.orderedExercises.map((exercise) => exercise.id)).size !==
      value.orderedExercises.length ||
    new Set(workoutSetIds).size !== workoutSetIds.length
  ) {
    return false;
  }

  if (value.currentExercise !== undefined) {
    const currentExercisePosition = isRecord(value.currentExercise)
      ? value.currentExercise.position
      : undefined;

    if (
      !isPositiveInteger(currentExercisePosition) ||
      !isSessionExerciseSnapshot(
        value.currentExercise,
        currentExercisePosition,
        value.orderedExercises.length,
      )
    ) {
      return false;
    }
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
      value.orderedExercises.length === 0 &&
      value.currentSessionExerciseId === undefined &&
      value.currentExerciseIndex === undefined &&
      value.currentSet === undefined
    );
  }

  if (
    value.currentExerciseIndex === undefined ||
    value.currentExerciseIndex >= value.orderedExercises.length ||
    value.currentSet === undefined
  ) {
    return false;
  }

  const orderedCurrentExercise =
    value.orderedExercises[value.currentExerciseIndex];

  return (
    orderedCurrentExercise !== undefined &&
    orderedCurrentExercise.position === value.currentExerciseIndex + 1 &&
    isSameSessionExerciseSnapshot(orderedCurrentExercise, value.currentExercise)
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

function isSessionExerciseSnapshot(
  value: unknown,
  expectedPosition: number,
  exerciseCount: number,
): value is SessionExercise {
  if (!isRecord(value) || !Array.isArray(value.sets)) {
    return false;
  }

  const exerciseId = value.id;

  if (
    !isNonEmptyString(exerciseId) ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.sourceExerciseId) ||
    typeof value.exerciseNameSnapshot !== 'string' ||
    !isPositiveInteger(value.position) ||
    value.position > exerciseCount ||
    value.position !== expectedPosition ||
    typeof value.isEnabled !== 'boolean' ||
    typeof value.isSkipped !== 'boolean' ||
    typeof value.isCompleted !== 'boolean' ||
    !isPositiveInteger(value.targetSets) ||
    !isPositiveInteger(value.targetRepsMin) ||
    !isPositiveInteger(value.targetRepsMax) ||
    value.targetRepsMax < value.targetRepsMin ||
    !isNonNegativeInteger(value.currentRestSeconds)
  ) {
    return false;
  }

  return (
    value.sets.every((workoutSet) =>
      isWorkoutSetSnapshot(workoutSet, exerciseId),
    ) &&
    new Set(value.sets.map((workoutSet) => workoutSet.id)).size ===
      value.sets.length &&
    new Set(value.sets.map((workoutSet) => workoutSet.setNumber)).size ===
      value.sets.length
  );
}

function isWorkoutSetSnapshot(
  value: unknown,
  parentSessionExerciseId: string,
): value is WorkoutSet {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.sessionExerciseId) &&
    value.sessionExerciseId === parentSessionExerciseId &&
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

function isSameSessionExerciseSnapshot(
  left: SessionExercise,
  right: SessionExercise,
): boolean {
  return (
    left.id === right.id &&
    left.sessionId === right.sessionId &&
    left.sourceExerciseId === right.sourceExerciseId &&
    left.exerciseNameSnapshot === right.exerciseNameSnapshot &&
    left.position === right.position &&
    left.isEnabled === right.isEnabled &&
    left.isSkipped === right.isSkipped &&
    left.isCompleted === right.isCompleted &&
    left.targetSets === right.targetSets &&
    left.targetRepsMin === right.targetRepsMin &&
    left.targetRepsMax === right.targetRepsMax &&
    left.currentRestSeconds === right.currentRestSeconds &&
    left.sets.length === right.sets.length &&
    left.sets.every((workoutSet, index) =>
      isSameWorkoutSetSnapshot(workoutSet, right.sets[index]),
    )
  );
}

function isSameWorkoutSetSnapshot(
  left: WorkoutSet,
  right: WorkoutSet | undefined,
): boolean {
  return (
    right !== undefined &&
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
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
