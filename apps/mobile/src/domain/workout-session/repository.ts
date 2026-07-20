import type {
  InProgressWorkoutSession,
  WorkoutSession,
  WorkoutSessionId,
} from './types';

export type StartWorkoutSessionPersistenceResult =
  | {
      readonly status: 'started';
    }
  | {
      readonly status: 'active_session_exists';
      readonly activeSessionId: WorkoutSessionId;
    };

export type WorkoutSessionRepository = {
  readonly save: (session: WorkoutSession) => Promise<WorkoutSession>;
  readonly findById: (id: WorkoutSessionId) => Promise<WorkoutSession | null>;
  readonly findActiveSession: () => Promise<WorkoutSession | null>;
  readonly findLatestSession: () => Promise<WorkoutSession | null>;
  readonly findRecoverableSession: () => Promise<WorkoutSession | null>;
  readonly startIfNoActiveSession: (
    session: InProgressWorkoutSession,
    expectedUpdatedAt: string,
  ) => Promise<StartWorkoutSessionPersistenceResult>;
  readonly update: (session: WorkoutSession) => Promise<WorkoutSession>;
};
