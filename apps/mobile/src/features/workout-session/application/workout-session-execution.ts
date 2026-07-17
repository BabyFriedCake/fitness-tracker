import {
  type InProgressWorkoutSession,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
  type WorkoutSet,
  type WorkoutSetId,
} from '@/domain/workout-session';

import { WorkoutSessionApplicationNotFoundError } from './workout-session-flow';

export type RecordWorkoutSetInput = {
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly actualReps: number;
  readonly weight: number;
  readonly completedAt: string;
};

export type RecordWorkoutSetOptions = {
  readonly createWorkoutSetId: () => string;
};

export type SessionExerciseExecutionInput = {
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
};

export type SessionExerciseExecutionOptions = {
  readonly now: () => string;
};

export class WorkoutSessionExecutionStatusError extends Error {
  constructor(
    readonly sessionId: WorkoutSessionId,
    readonly status: WorkoutSession['status'],
  ) {
    super(
      `WorkoutSession must be in_progress for execution: ${sessionId} (${status}).`,
    );
    this.name = 'WorkoutSessionExecutionStatusError';
  }
}

export class SessionExerciseNotFoundError extends Error {
  constructor(
    readonly sessionId: WorkoutSessionId,
    readonly sessionExerciseId: SessionExerciseId,
  ) {
    super(
      `SessionExercise ${sessionExerciseId} does not belong to WorkoutSession ${sessionId}.`,
    );
    this.name = 'SessionExerciseNotFoundError';
  }
}

export class InvalidWorkoutSetInputError extends Error {
  constructor(
    readonly field: 'actualReps' | 'weight' | 'completedAt',
    message: string,
  ) {
    super(message);
    this.name = 'InvalidWorkoutSetInputError';
  }
}

export class InvalidGeneratedWorkoutSetIdError extends Error {
  constructor(readonly workoutSetId: string) {
    super('Generated WorkoutSet ID must be non-empty and unique.');
    this.name = 'InvalidGeneratedWorkoutSetIdError';
  }
}

export async function recordWorkoutSet(
  repository: WorkoutSessionRepository,
  input: RecordWorkoutSetInput,
  options: RecordWorkoutSetOptions,
): Promise<InProgressWorkoutSession> {
  assertValidWorkoutSetValues(input);

  const { session, exercise } = await loadExecutionTarget(repository, input);
  assertValidCompletedAt(input.completedAt, session.startedAt);

  const workoutSetId = options.createWorkoutSetId();
  assertValidWorkoutSetId(workoutSetId, session);

  const setNumber = getNextSetNumber(exercise.sets);
  const workoutSet: WorkoutSet = {
    id: workoutSetId as WorkoutSetId,
    sessionExerciseId: exercise.id,
    setNumber,
    setType: 'normal',
    actualReps: input.actualReps,
    weight: input.weight,
    isCompleted: true,
    isExtraSet: setNumber > exercise.targetSets,
    completedAt: input.completedAt,
  };
  const nextExercise: SessionExercise = {
    ...exercise,
    sets: [...exercise.sets, workoutSet],
  };
  const nextSession = replaceSessionExercise(
    session,
    nextExercise,
    input.completedAt,
  );

  await repository.update(nextSession);

  return nextSession;
}

export async function skipSessionExercise(
  repository: WorkoutSessionRepository,
  input: SessionExerciseExecutionInput,
  options: SessionExerciseExecutionOptions,
): Promise<InProgressWorkoutSession> {
  return updateSessionExerciseState(repository, input, options, (exercise) => ({
    ...exercise,
    isSkipped: true,
    isCompleted: false,
  }));
}

export async function resumeSessionExercise(
  repository: WorkoutSessionRepository,
  input: SessionExerciseExecutionInput,
  options: SessionExerciseExecutionOptions,
): Promise<InProgressWorkoutSession> {
  return updateSessionExerciseState(repository, input, options, (exercise) => ({
    ...exercise,
    isSkipped: false,
  }));
}

export async function completeSessionExercise(
  repository: WorkoutSessionRepository,
  input: SessionExerciseExecutionInput,
  options: SessionExerciseExecutionOptions,
): Promise<InProgressWorkoutSession> {
  return updateSessionExerciseState(repository, input, options, (exercise) => ({
    ...exercise,
    isSkipped: false,
    isCompleted: true,
  }));
}

async function updateSessionExerciseState(
  repository: WorkoutSessionRepository,
  input: SessionExerciseExecutionInput,
  options: SessionExerciseExecutionOptions,
  updateExercise: (exercise: SessionExercise) => SessionExercise,
): Promise<InProgressWorkoutSession> {
  const { session, exercise } = await loadExecutionTarget(repository, input);
  const nextSession = replaceSessionExercise(
    session,
    updateExercise(exercise),
    options.now(),
  );

  await repository.update(nextSession);

  return nextSession;
}

async function loadExecutionTarget(
  repository: WorkoutSessionRepository,
  input: SessionExerciseExecutionInput,
): Promise<{
  readonly session: InProgressWorkoutSession;
  readonly exercise: SessionExercise;
}> {
  const session = await repository.findById(input.sessionId);

  if (!session) {
    throw new WorkoutSessionApplicationNotFoundError(input.sessionId);
  }

  if (session.status !== 'in_progress') {
    throw new WorkoutSessionExecutionStatusError(session.id, session.status);
  }

  const exercise = session.sessionExercises.find(
    (candidate) => candidate.id === input.sessionExerciseId,
  );

  if (!exercise || exercise.sessionId !== session.id) {
    throw new SessionExerciseNotFoundError(session.id, input.sessionExerciseId);
  }

  return { session, exercise };
}

function replaceSessionExercise(
  session: InProgressWorkoutSession,
  nextExercise: SessionExercise,
  updatedAt: string,
): InProgressWorkoutSession {
  return {
    ...session,
    sessionExercises: session.sessionExercises.map((exercise) =>
      exercise.id === nextExercise.id ? nextExercise : exercise,
    ),
    updatedAt,
  };
}

function assertValidWorkoutSetValues(input: RecordWorkoutSetInput): void {
  if (!Number.isInteger(input.actualReps) || input.actualReps < 0) {
    throw new InvalidWorkoutSetInputError(
      'actualReps',
      'WorkoutSet actualReps must be a non-negative integer.',
    );
  }

  if (!Number.isFinite(input.weight) || input.weight < 0) {
    throw new InvalidWorkoutSetInputError(
      'weight',
      'WorkoutSet weight must be a non-negative finite number.',
    );
  }
}

function assertValidCompletedAt(completedAt: string, startedAt: string): void {
  const completedTimestamp = Date.parse(completedAt);
  const startedTimestamp = Date.parse(startedAt);

  if (
    !Number.isFinite(completedTimestamp) ||
    !Number.isFinite(startedTimestamp) ||
    completedTimestamp < startedTimestamp
  ) {
    throw new InvalidWorkoutSetInputError(
      'completedAt',
      'WorkoutSet completedAt must be valid and not earlier than session start.',
    );
  }
}

function assertValidWorkoutSetId(
  value: string,
  session: InProgressWorkoutSession,
): void {
  const isDuplicate = session.sessionExercises.some((exercise) =>
    exercise.sets.some((workoutSet) => workoutSet.id === value),
  );

  if (!value.trim() || isDuplicate) {
    throw new InvalidGeneratedWorkoutSetIdError(value);
  }
}

function getNextSetNumber(sets: readonly WorkoutSet[]): number {
  return Math.max(0, ...sets.map((workoutSet) => workoutSet.setNumber)) + 1;
}
