import {
  RestTimerTimeError,
  assertRestTimerStatusTransition,
  assertWorkoutSessionCurrentPosition,
  getRestTimerRemainingSeconds,
  type InProgressWorkoutSession,
  type RestTimer,
  type RestTimerId,
  type RestTimerRepository,
  type RestTimerStatus,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  SessionExerciseNotFoundError,
  WorkoutSessionExecutionStatusError,
} from './workout-session-execution';
import { WorkoutSessionApplicationNotFoundError } from './workout-session-flow';

export type WorkoutSessionRestTimerRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly restTimerRepository: RestTimerRepository;
};

export type SetCurrentSessionPositionInput = {
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly currentSetNumber: number;
  readonly updatedAt: string;
};

export type StartRestTimerInput = {
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly durationSeconds: number;
  readonly startedAt: string;
  readonly previousSetNumber?: number;
  readonly nextSetNumber?: number;
};

export type RestTimerOperationInput = {
  readonly sessionId: WorkoutSessionId;
  readonly now: string;
};

export type ExtendRestTimerInput = RestTimerOperationInput & {
  readonly additionalSeconds: number;
};

export type RestTimerQueryResult =
  | { readonly status: 'not_found' }
  | {
      readonly status: RestTimerStatus;
      readonly timer: RestTimer;
      readonly remainingSeconds: number;
    };

export type StartRestTimerOptions = {
  readonly createRestTimerId: () => string;
};

export class InvalidCurrentSetNumberError extends Error {
  constructor(readonly currentSetNumber: number) {
    super('Current set number must be a positive integer.');
    this.name = 'InvalidCurrentSetNumberError';
  }
}

export class InvalidRestTimerDurationError extends Error {
  constructor(readonly durationSeconds: number) {
    super('RestTimer duration must be a non-negative integer.');
    this.name = 'InvalidRestTimerDurationError';
  }
}

export class InvalidRestTimerAdditionalSecondsError extends Error {
  constructor(readonly additionalSeconds: number) {
    super('RestTimer additional seconds must be a positive integer.');
    this.name = 'InvalidRestTimerAdditionalSecondsError';
  }
}

export class InvalidRestTimerTimestampError extends Error {
  constructor(readonly value: string) {
    super(`RestTimer timestamp is invalid: ${value}.`);
    this.name = 'InvalidRestTimerTimestampError';
  }
}

export class InvalidGeneratedRestTimerIdError extends Error {
  constructor(readonly restTimerId: string) {
    super('Generated RestTimer ID must not be empty.');
    this.name = 'InvalidGeneratedRestTimerIdError';
  }
}

export class RestTimerNotFoundError extends Error {
  constructor(readonly sessionId: WorkoutSessionId) {
    super(`RestTimer not found for WorkoutSession: ${sessionId}.`);
    this.name = 'RestTimerNotFoundError';
  }
}

export class ActiveRestTimerExistsError extends Error {
  constructor(readonly activeTimer: RestTimer) {
    super(`An active RestTimer already exists: ${activeTimer.id}.`);
    this.name = 'ActiveRestTimerExistsError';
  }
}

export class RestTimerConcurrentUpdateError extends Error {
  constructor(readonly sessionId: WorkoutSessionId) {
    super(`RestTimer changed while the operation was pending: ${sessionId}.`);
    this.name = 'RestTimerConcurrentUpdateError';
  }
}

export class RestTimerOperationStatusError extends Error {
  constructor(
    readonly operation: string,
    readonly status: RestTimerStatus,
  ) {
    super(`RestTimer cannot ${operation} while ${status}.`);
    this.name = 'RestTimerOperationStatusError';
  }
}

export async function setCurrentSessionPosition(
  repository: WorkoutSessionRepository,
  input: SetCurrentSessionPositionInput,
): Promise<InProgressWorkoutSession> {
  assertPositiveCurrentSetNumber(input.currentSetNumber);
  requireTimestamp(input.updatedAt);
  const { session } = await loadSessionExercise(repository, input);
  const next: InProgressWorkoutSession = {
    ...session,
    currentSessionExerciseId: input.sessionExerciseId,
    currentSetNumber: input.currentSetNumber,
    updatedAt: input.updatedAt,
  };

  assertWorkoutSessionCurrentPosition(next);
  await repository.update(next);

  return next;
}

export async function startRestTimer(
  repositories: WorkoutSessionRestTimerRepositories,
  input: StartRestTimerInput,
  options: StartRestTimerOptions,
): Promise<RestTimer> {
  assertNonNegativeDuration(input.durationSeconds);
  assertOptionalSetNumber(input.previousSetNumber);
  assertOptionalSetNumber(input.nextSetNumber);
  const startedTimestamp = requireTimestamp(input.startedAt);
  const { session } = await loadSessionExercise(
    repositories.workoutSessionRepository,
    input,
  );
  const currentSetNumber =
    input.nextSetNumber ?? (input.previousSetNumber ?? 0) + 1;
  assertPositiveCurrentSetNumber(currentSetNumber);
  const restTimerId = options.createRestTimerId();

  if (!restTimerId.trim()) {
    throw new InvalidGeneratedRestTimerIdError(restTimerId);
  }

  const timer: RestTimer = {
    id: restTimerId as RestTimerId,
    sessionId: input.sessionId,
    sessionExerciseId: input.sessionExerciseId,
    previousSetNumber: input.previousSetNumber,
    nextSetNumber: input.nextSetNumber,
    originalDurationSeconds: input.durationSeconds,
    startedAt: input.startedAt,
    targetEndAt: addSeconds(
      startedTimestamp,
      input.durationSeconds,
      input.startedAt,
    ),
    status: 'running',
    createdAt: input.startedAt,
    updatedAt: input.startedAt,
  };
  const result = await repositories.restTimerRepository.startIfNoActiveTimer({
    timer,
    currentSessionExerciseId: input.sessionExerciseId,
    currentSetNumber,
    expectedSessionUpdatedAt: session.updatedAt,
    sessionUpdatedAt: input.startedAt,
  });

  if (result.status === 'active_timer_exists') {
    throw new ActiveRestTimerExistsError(result.activeTimer);
  }

  if (result.status === 'session_conflict') {
    throw new RestTimerConcurrentUpdateError(input.sessionId);
  }

  return result.timer;
}

export async function pauseRestTimer(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimer> {
  requireTimestamp(input.now);
  const timer = await requireRestTimerAfterExpirySync(repository, input);
  assertRestTimerStatusTransition(timer.status, 'paused');
  const next: RestTimer = {
    ...timer,
    status: 'paused',
    pausedRemainingSeconds: getRestTimerRemainingSeconds(timer, input.now),
    updatedAt: input.now,
  };

  return persistRestTimerUpdate(repository, timer, next);
}

export async function resumeRestTimer(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimer> {
  const resumedTimestamp = requireTimestamp(input.now);
  const timer = await requireRestTimer(repository, input.sessionId);

  if (timer.status !== 'paused') {
    throw new RestTimerOperationStatusError('resume', timer.status);
  }

  assertRestTimerStatusTransition(timer.status, 'running');
  const remainingSeconds = timer.pausedRemainingSeconds;

  if (remainingSeconds === undefined) {
    throw new RestTimerTimeError('');
  }

  const next: RestTimer = {
    ...timer,
    status: 'running',
    targetEndAt: addSeconds(resumedTimestamp, remainingSeconds, input.now),
    pausedRemainingSeconds: undefined,
    updatedAt: input.now,
  };

  return persistRestTimerUpdate(repository, timer, next);
}

export async function extendRestTimer(
  repository: RestTimerRepository,
  input: ExtendRestTimerInput,
): Promise<RestTimer> {
  if (
    !Number.isSafeInteger(input.additionalSeconds) ||
    input.additionalSeconds < 1
  ) {
    throw new InvalidRestTimerAdditionalSecondsError(input.additionalSeconds);
  }

  requireTimestamp(input.now);
  const timer = await requireRestTimerAfterExpirySync(repository, input);

  if (timer.status !== 'running' && timer.status !== 'paused') {
    throw new RestTimerOperationStatusError('extend', timer.status);
  }

  const next: RestTimer =
    timer.status === 'running'
      ? {
          ...timer,
          targetEndAt: addSeconds(
            requireTimestamp(timer.targetEndAt ?? ''),
            input.additionalSeconds,
            timer.targetEndAt ?? '',
          ),
          updatedAt: input.now,
        }
      : {
          ...timer,
          pausedRemainingSeconds:
            (timer.pausedRemainingSeconds ?? 0) + input.additionalSeconds,
          updatedAt: input.now,
        };

  return persistRestTimerUpdate(repository, timer, next);
}

export function completeRestTimer(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimer> {
  return transitionRestTimerToTerminal(repository, input, 'completed');
}

export function skipRestTimer(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimer> {
  return transitionRestTimerToTerminal(repository, input, 'skipped');
}

export function cancelRestTimer(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimer> {
  return transitionRestTimerToTerminal(repository, input, 'cancelled');
}

export async function getRestTimerState(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimerQueryResult> {
  requireTimestamp(input.now);
  let timer = await repository.findBySessionId(input.sessionId);

  if (!timer) {
    return { status: 'not_found' };
  }

  if (
    timer.status === 'running' &&
    requireTimestamp(timer.targetEndAt ?? '') <= requireTimestamp(input.now)
  ) {
    const completed = await repository.completeIfExpired(
      input.sessionId,
      input.now,
    );
    timer = completed ?? (await repository.findBySessionId(input.sessionId));

    if (!timer) {
      return { status: 'not_found' };
    }
  }

  return {
    status: timer.status,
    timer,
    remainingSeconds: getRestTimerRemainingSeconds(timer, input.now),
  };
}

async function transitionRestTimerToTerminal(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
  nextStatus: 'completed' | 'skipped' | 'cancelled',
): Promise<RestTimer> {
  requireTimestamp(input.now);
  const timer = await requireRestTimer(repository, input.sessionId);
  assertRestTimerStatusTransition(timer.status, nextStatus);
  const next: RestTimer = {
    ...timer,
    status: nextStatus,
    updatedAt: input.now,
  };

  return persistRestTimerUpdate(repository, timer, next);
}

async function persistRestTimerUpdate(
  repository: RestTimerRepository,
  current: RestTimer,
  next: RestTimer,
): Promise<RestTimer> {
  const updated = await repository.update(
    next,
    current.status,
    current.updatedAt,
  );

  if (!updated) {
    throw new RestTimerConcurrentUpdateError(current.sessionId);
  }

  return updated;
}

async function requireRestTimer(
  repository: RestTimerRepository,
  sessionId: WorkoutSessionId,
): Promise<RestTimer> {
  const timer = await repository.findBySessionId(sessionId);

  if (!timer) {
    throw new RestTimerNotFoundError(sessionId);
  }

  return timer;
}

async function requireRestTimerAfterExpirySync(
  repository: RestTimerRepository,
  input: RestTimerOperationInput,
): Promise<RestTimer> {
  const completed = await repository.completeIfExpired(
    input.sessionId,
    input.now,
  );

  return completed ?? requireRestTimer(repository, input.sessionId);
}

async function loadSessionExercise(
  repository: WorkoutSessionRepository,
  input: {
    readonly sessionId: WorkoutSessionId;
    readonly sessionExerciseId: SessionExerciseId;
  },
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
    (candidate) =>
      candidate.id === input.sessionExerciseId &&
      candidate.sessionId === session.id,
  );

  if (!exercise) {
    throw new SessionExerciseNotFoundError(session.id, input.sessionExerciseId);
  }

  return { session, exercise };
}

function assertPositiveCurrentSetNumber(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new InvalidCurrentSetNumberError(value);
  }
}

function assertOptionalSetNumber(value: number | undefined): void {
  if (value !== undefined) {
    assertPositiveCurrentSetNumber(value);
  }
}

function assertNonNegativeDuration(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new InvalidRestTimerDurationError(value);
  }
}

function requireTimestamp(value: string): number {
  try {
    const timestamp = Date.parse(value);

    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString() !== value
    ) {
      throw new RestTimerTimeError(value);
    }

    return timestamp;
  } catch {
    throw new InvalidRestTimerTimestampError(value);
  }
}

function addSeconds(
  timestamp: number,
  seconds: number,
  sourceTimestamp: string,
): string {
  const result = timestamp + seconds * 1000;

  try {
    if (!Number.isSafeInteger(result)) {
      throw new Error('Timestamp is outside the safe integer range.');
    }

    return new Date(result).toISOString();
  } catch {
    throw new InvalidRestTimerTimestampError(sourceTimestamp);
  }
}
