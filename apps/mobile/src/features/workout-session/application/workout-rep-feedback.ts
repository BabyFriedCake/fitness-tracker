import type {
  SessionExercise,
  WorkoutSessionId,
  WorkoutSet,
} from '@/domain/workout-session';

export type WorkoutFeedbackEvent =
  | RepCompletedFeedbackEvent
  | SetCompletedFeedbackEvent
  | ExerciseCompletedFeedbackEvent;

export type RepCompletedFeedbackEvent = {
  readonly type: 'RepCompleted';
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExercise['id'];
  readonly exerciseNameSnapshot: string;
  readonly repNumber: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
};

export type SetCompletedFeedbackEvent = {
  readonly type: 'SetCompleted';
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExercise['id'];
  readonly exerciseNameSnapshot: string;
  readonly setNumber: number;
  readonly actualReps: number;
  readonly weight: number;
  readonly isExtraSet: boolean;
};

export type ExerciseCompletedFeedbackEvent = {
  readonly type: 'ExerciseCompleted';
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExercise['id'];
  readonly exerciseNameSnapshot: string;
  readonly completedSetCount: number;
  readonly targetSetCount: number;
};

export class InvalidRepFeedbackInputError extends Error {
  constructor(readonly repNumber: number) {
    super('Rep feedback number must be a positive integer.');
    this.name = 'InvalidRepFeedbackInputError';
  }
}

export class InvalidSetFeedbackInputError extends Error {
  constructor(readonly workoutSetId: WorkoutSet['id']) {
    super('Set feedback requires a completed WorkoutSet.');
    this.name = 'InvalidSetFeedbackInputError';
  }
}

export function createRepCompletedFeedbackEvent({
  sessionId,
  exercise,
  repNumber,
}: {
  readonly sessionId: WorkoutSessionId;
  readonly exercise: SessionExercise;
  readonly repNumber: number;
}): RepCompletedFeedbackEvent {
  if (!Number.isSafeInteger(repNumber) || repNumber < 1) {
    throw new InvalidRepFeedbackInputError(repNumber);
  }

  return {
    type: 'RepCompleted',
    sessionId,
    sessionExerciseId: exercise.id,
    exerciseNameSnapshot: exercise.exerciseNameSnapshot,
    repNumber,
    targetRepsMin: exercise.targetRepsMin,
    targetRepsMax: exercise.targetRepsMax,
  };
}

export function createRepCompletedFeedbackEvents({
  sessionId,
  exercise,
  actualReps,
}: {
  readonly sessionId: WorkoutSessionId;
  readonly exercise: SessionExercise;
  readonly actualReps: number;
}): readonly RepCompletedFeedbackEvent[] {
  if (!Number.isSafeInteger(actualReps) || actualReps < 0) {
    throw new InvalidRepFeedbackInputError(actualReps);
  }

  return Array.from({ length: actualReps }, (_value, index) =>
    createRepCompletedFeedbackEvent({
      sessionId,
      exercise,
      repNumber: index + 1,
    }),
  );
}

export function createSetCompletedFeedbackEvent({
  sessionId,
  exercise,
  workoutSet,
}: {
  readonly sessionId: WorkoutSessionId;
  readonly exercise: SessionExercise;
  readonly workoutSet: WorkoutSet;
}): SetCompletedFeedbackEvent {
  if (!workoutSet.isCompleted) {
    throw new InvalidSetFeedbackInputError(workoutSet.id);
  }

  return {
    type: 'SetCompleted',
    sessionId,
    sessionExerciseId: exercise.id,
    exerciseNameSnapshot: exercise.exerciseNameSnapshot,
    setNumber: workoutSet.setNumber,
    actualReps: workoutSet.actualReps,
    weight: workoutSet.weight,
    isExtraSet: workoutSet.isExtraSet,
  };
}

export function createExerciseCompletedFeedbackEvent({
  sessionId,
  exercise,
}: {
  readonly sessionId: WorkoutSessionId;
  readonly exercise: SessionExercise;
}): ExerciseCompletedFeedbackEvent {
  const completedSetCount = exercise.sets.filter(
    (workoutSet) => workoutSet.isCompleted,
  ).length;

  return {
    type: 'ExerciseCompleted',
    sessionId,
    sessionExerciseId: exercise.id,
    exerciseNameSnapshot: exercise.exerciseNameSnapshot,
    completedSetCount,
    targetSetCount: exercise.targetSets,
  };
}
