import type {
  CancelledWorkoutSession,
  CompletedWorkoutSession,
  RestTimer,
  RestTimerRepository,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { createWorkoutHistorySessionMetric } from './workout-history-metrics';

import {
  loadWorkoutSessionScreen,
  type WorkoutSessionScreenData,
  type WorkoutSessionScreenRepositories,
} from './load-workout-session-screen';
import type { WorkoutRuntimeSnapshot } from './workout-runtime-engine';
import { startSession } from './workout-session-flow';
import {
  cancelRestTimer,
  getRestTimerState,
} from './workout-session-rest-timer';

export type WorkoutSessionSummary = {
  readonly sessionId: WorkoutSessionId;
  readonly workoutName: string;
  readonly status: 'completed' | 'cancelled';
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationSeconds: number;
  readonly completedExerciseCount: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
  readonly notes?: string;
  readonly exercises: readonly WorkoutSessionSummaryExercise[];
};

export type WorkoutSessionSummaryExercise = {
  readonly exerciseName: string;
  readonly completed: boolean;
  readonly skipped: boolean;
  readonly totalVolume: number;
  readonly sets: readonly {
    readonly setNumber: number;
    readonly actualReps: number;
    readonly weight: number;
    readonly completedAt: string;
  }[];
};

export type LoadWorkoutSessionSummaryResult =
  | { readonly status: 'ready'; readonly summary: WorkoutSessionSummary }
  | { readonly status: 'not_found' }
  | { readonly status: 'not_terminal' };

export type LoadWorkoutSessionRecoveryResult =
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
      readonly runtime: WorkoutRuntimeSnapshot;
    }
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

  if (session.status !== 'completed' && session.status !== 'cancelled') {
    return { status: 'not_terminal' };
  }

  return { status: 'ready', summary: createWorkoutSessionSummary(session) };
}

export function createWorkoutSessionSummary(
  session: CompletedWorkoutSession | CancelledWorkoutSession,
): WorkoutSessionSummary {
  const metric = createWorkoutHistorySessionMetric(session);

  if (!metric) {
    throw new Error(`WorkoutSession summary requires a terminal session.`);
  }
  const startedAt = requireStartedAt(session);

  return {
    sessionId: metric.sessionId,
    workoutName: metric.workoutName,
    status: metric.status,
    startedAt,
    endedAt: metric.endedAt,
    durationSeconds: metric.durationSeconds ?? 0,
    completedExerciseCount: metric.completedExerciseCount,
    completedSetCount: metric.completedSetCount,
    totalVolume: metric.totalVolume,
    notes: session.notes,
    exercises: metric.exercises.map((exercise) => ({
      exerciseName: exercise.exerciseName,
      completed: exercise.completed,
      skipped: exercise.skipped,
      totalVolume: exercise.totalVolume,
      sets: exercise.sets.map((workoutSet) => ({
        setNumber: workoutSet.setNumber,
        actualReps: workoutSet.actualReps,
        weight: workoutSet.weight,
        completedAt: workoutSet.completedAt,
      })),
    })),
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

function requireStartedAt(
  session: Extract<
    WorkoutSession,
    { readonly status: 'completed' | 'cancelled' }
  >,
): string {
  if (!session.startedAt) {
    return session.endedAt;
  }

  const startedAt = Date.parse(session.startedAt);
  const endedAt = Date.parse(session.endedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    throw new Error(
      `WorkoutSession summary timestamp is invalid: ${session.id}.`,
    );
  }

  return session.startedAt;
}
