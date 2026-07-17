import type { WorkoutSession, WorkoutSessionId } from './types';

export type WorkoutSessionRepository = {
  readonly save: (session: WorkoutSession) => Promise<WorkoutSession>;
  readonly findById: (id: WorkoutSessionId) => Promise<WorkoutSession | null>;
  readonly update: (session: WorkoutSession) => Promise<WorkoutSession>;
};
