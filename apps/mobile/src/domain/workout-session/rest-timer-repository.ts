import type { SessionExerciseId, WorkoutSessionId } from './types';
import type { RestTimer, RestTimerStatus } from './rest-timer';

export type StartRestTimerPersistenceInput = {
  readonly timer: RestTimer;
  readonly currentSessionExerciseId: SessionExerciseId;
  readonly currentSetNumber: number;
  readonly expectedSessionUpdatedAt: string;
  readonly sessionUpdatedAt: string;
};

export type StartRestTimerPersistenceResult =
  | {
      readonly status: 'started';
      readonly timer: RestTimer;
    }
  | {
      readonly status: 'active_timer_exists';
      readonly activeTimer: RestTimer;
    }
  | {
      readonly status: 'session_conflict';
    };

export type RestTimerRepository = {
  readonly findBySessionId: (
    sessionId: WorkoutSessionId,
  ) => Promise<RestTimer | null>;
  readonly startIfNoActiveTimer: (
    input: StartRestTimerPersistenceInput,
  ) => Promise<StartRestTimerPersistenceResult>;
  readonly update: (
    timer: RestTimer,
    expectedStatus: RestTimerStatus,
    expectedUpdatedAt: string,
  ) => Promise<RestTimer | null>;
  readonly completeIfExpired: (
    sessionId: WorkoutSessionId,
    now: string,
  ) => Promise<RestTimer | null>;
};
