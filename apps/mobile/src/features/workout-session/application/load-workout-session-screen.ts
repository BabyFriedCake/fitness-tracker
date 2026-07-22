import type {
  RestTimerRepository,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { getRestTimerState } from './workout-session-rest-timer';
import {
  createWorkoutRuntimeSnapshot,
  restoreRuntimeSnapshot,
  type WorkoutRuntimeSnapshot,
} from './workout-runtime-engine';
import type { WorkoutRuntimeSnapshotRepository } from './workout-runtime-snapshot-repository';

export type WorkoutSessionTimerDisplayStatus =
  'running' | 'paused' | 'completed';

export type WorkoutSessionScreenData = {
  readonly session: WorkoutSession;
  readonly restTimerStatus?: WorkoutSessionTimerDisplayStatus;
};

export type WorkoutSessionScreenRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly restTimerRepository: RestTimerRepository;
  readonly workoutRuntimeSnapshotRepository: WorkoutRuntimeSnapshotRepository;
};

export type LoadWorkoutSessionScreenResult =
  | {
      readonly status: 'ready';
      readonly data: WorkoutSessionScreenData;
      readonly runtime: WorkoutRuntimeSnapshot;
    }
  | {
      readonly status: 'not_found';
    };

export async function loadWorkoutSessionScreen(
  repositories: WorkoutSessionScreenRepositories,
  sessionId: WorkoutSessionId,
  now: string,
): Promise<LoadWorkoutSessionScreenResult> {
  const session =
    await repositories.workoutSessionRepository.findById(sessionId);

  if (!session) {
    return { status: 'not_found' };
  }

  const restTimer = await getRestTimerState(repositories.restTimerRepository, {
    sessionId,
    now,
  });
  const restTimerStatus = isDisplayableTimerStatus(restTimer.status)
    ? restTimer.status
    : undefined;
  const runtime = await restoreRuntimeSnapshot(
    repositories.workoutRuntimeSnapshotRepository,
    session,
    restTimerStatus,
  );
  const nextRuntime =
    runtime ?? createWorkoutRuntimeSnapshot(session, restTimerStatus);

  if (session.status !== 'in_progress') {
    await repositories.workoutRuntimeSnapshotRepository.clear(session.id);
  }

  return {
    status: 'ready',
    data: createWorkoutSessionScreenData(session, restTimerStatus),
    runtime: nextRuntime,
  };
}

export function createWorkoutSessionScreenData(
  session: WorkoutSession,
  restTimerStatus?: WorkoutSessionTimerDisplayStatus,
): WorkoutSessionScreenData {
  return {
    session,
    restTimerStatus,
  };
}

function isDisplayableTimerStatus(
  status: string,
): status is WorkoutSessionTimerDisplayStatus {
  return status === 'running' || status === 'paused' || status === 'completed';
}
