import type {
  CompletedWorkoutSession,
  RestTimer,
  RestTimerRepository,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import {
  loadWorkoutSessionScreen,
  type WorkoutSessionScreenData,
  type WorkoutSessionScreenRepositories,
} from './load-workout-session-screen';
import { startSession } from './workout-session-flow';
import {
  cancelRestTimer,
  getRestTimerState,
} from './workout-session-rest-timer';

export type WorkoutSessionSummary = {
  readonly sessionId: WorkoutSessionId;
  readonly workoutName: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationSeconds: number;
  readonly completedExerciseCount: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
};

export type LoadWorkoutSessionSummaryResult =
  | { readonly status: 'ready'; readonly summary: WorkoutSessionSummary }
  | { readonly status: 'not_found' }
  | { readonly status: 'not_completed' };

export type LoadWorkoutSessionRecoveryResult =
  | { readonly status: 'ready'; readonly data: WorkoutSessionScreenData }
  | { readonly status: 'not_found' }
  | { readonly status: 'not_recoverable' };

export async function loadWorkoutSessionSummary(
  repository: WorkoutSessionRepository,
  sessionId: WorkoutSessionId,
): Promise<LoadWorkoutSessionSummaryResult> {
  const session = await repository.findById(sessionId);

  if (!session) {
    return { status: 'not_found' };
  }

  if (session.status !== 'completed') {
    return { status: 'not_completed' };
  }

  return { status: 'ready', summary: createWorkoutSessionSummary(session) };
}

export function createWorkoutSessionSummary(
  session: CompletedWorkoutSession,
): WorkoutSessionSummary {
  const startedAt = requireTimestamp(session.startedAt);
  const endedAt = requireTimestamp(session.endedAt);
  const completedSets = session.sessionExercises.flatMap((exercise) =>
    exercise.sets.filter((workoutSet) => workoutSet.isCompleted),
  );

  return {
    sessionId: session.id,
    workoutName: session.workoutNameSnapshot,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSeconds: Math.max(0, Math.floor((endedAt - startedAt) / 1000)),
    completedExerciseCount: session.sessionExercises.filter(
      (exercise) => exercise.isCompleted,
    ).length,
    completedSetCount: completedSets.length,
    totalVolume: completedSets.reduce(
      (total, workoutSet) => total + workoutSet.weight * workoutSet.actualReps,
      0,
    ),
  };
}

export async function loadWorkoutSessionRecovery(
  repositories: WorkoutSessionScreenRepositories,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<LoadWorkoutSessionRecoveryResult> {
  const result = await loadWorkoutSessionScreen(repositories, sessionId, now);

  if (result.status === 'not_found') {
    return result;
  }

  if (
    result.data.session.status !== 'draft' &&
    result.data.session.status !== 'in_progress'
  ) {
    return { status: 'not_recoverable' };
  }

  return result;
}

export async function loadRecoverableWorkoutSessionRecovery(
  repositories: WorkoutSessionScreenRepositories,
  now: string,
): Promise<LoadWorkoutSessionRecoveryResult> {
  const recoverableSession =
    await repositories.workoutSessionRepository.findRecoverableSession();

  if (!recoverableSession) {
    return { status: 'not_found' };
  }

  return loadWorkoutSessionRecovery(repositories, recoverableSession.id, now);
}

export async function continueWorkoutSessionRecovery(
  repositories: WorkoutSessionScreenRepositories,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<LoadWorkoutSessionRecoveryResult> {
  const session =
    await repositories.workoutSessionRepository.findById(sessionId);

  if (!session) {
    return { status: 'not_found' };
  }

  if (session.status === 'draft') {
    await startSession(repositories.workoutSessionRepository, session.id, now);
  } else if (session.status !== 'in_progress') {
    return { status: 'not_recoverable' };
  }

  return loadWorkoutSessionRecovery(repositories, session.id, now);
}

export async function closeActiveRestTimer(
  repository: RestTimerRepository,
  sessionId: WorkoutSessionId,
  closedAt: string,
): Promise<RestTimer | null> {
  const timerState = await getRestTimerState(repository, {
    sessionId,
    now: closedAt,
  });

  if (timerState.status !== 'running' && timerState.status !== 'paused') {
    return null;
  }

  return cancelRestTimer(repository, { sessionId, now: closedAt });
}

function requireTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`WorkoutSession summary timestamp is invalid: ${value}.`);
  }

  return timestamp;
}
