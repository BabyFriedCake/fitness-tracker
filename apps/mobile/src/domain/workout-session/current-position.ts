import type { WorkoutSession } from './types';

export class WorkoutSessionCurrentPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkoutSessionCurrentPositionError';
  }
}

export function assertWorkoutSessionCurrentPosition(
  session: WorkoutSession,
): void {
  const hasExerciseId = session.currentSessionExerciseId !== undefined;
  const hasSetNumber = session.currentSetNumber !== undefined;

  if (hasExerciseId !== hasSetNumber) {
    throw new WorkoutSessionCurrentPositionError(
      'WorkoutSession current exercise and set number must both be present or absent.',
    );
  }

  if (!hasExerciseId || !hasSetNumber) {
    return;
  }

  if (
    !Number.isSafeInteger(session.currentSetNumber) ||
    session.currentSetNumber < 1
  ) {
    throw new WorkoutSessionCurrentPositionError(
      'WorkoutSession current set number must be a positive integer.',
    );
  }

  const belongsToSession = session.sessionExercises.some(
    (exercise) =>
      exercise.id === session.currentSessionExerciseId &&
      exercise.sessionId === session.id,
  );

  if (!belongsToSession) {
    throw new WorkoutSessionCurrentPositionError(
      'WorkoutSession current exercise must belong to the session.',
    );
  }
}
