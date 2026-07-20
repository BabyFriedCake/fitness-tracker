import type {
  RestTimerRepository,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { getRestTimerState } from './workout-session-rest-timer';
import {
  createWorkoutRuntimeSnapshot,
  type WorkoutRuntimeSnapshot,
} from './workout-runtime-engine';

export type WorkoutSessionTimerDisplayStatus =
  'running' | 'paused' | 'completed';

export type WorkoutSessionScreenData = {
  readonly session: WorkoutSession;
  readonly restTimerStatus?: WorkoutSessionTimerDisplayStatus;
};

export type WorkoutSessionScreenRepositories = {
  readonly workoutSessionRepository: WorkoutSessionRepository;
  readonly restTimerRepository: RestTimerRepository;
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

  return {
    status: 'ready',
    data: createWorkoutSessionScreenData(session, restTimerStatus),
    runtime: createWorkoutRuntimeSnapshot(session, restTimerStatus),
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
