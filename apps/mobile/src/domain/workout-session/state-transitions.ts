import type {
  CancelledWorkoutSession,
  CompletedWorkoutSession,
  DraftWorkoutSession,
  InProgressWorkoutSession,
  WorkoutSession,
  WorkoutSessionStatus,
} from './types';

const ALLOWED_WORKOUT_SESSION_TRANSITIONS: Readonly<
  Record<WorkoutSessionStatus, readonly WorkoutSessionStatus[]>
> = {
  draft: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export class WorkoutSessionTransitionError extends Error {
  constructor(
    readonly currentStatus: WorkoutSessionStatus,
    readonly nextStatus: WorkoutSessionStatus,
  ) {
    super(
      `WorkoutSession cannot transition from ${currentStatus} to ${nextStatus}.`,
    );
    this.name = 'WorkoutSessionTransitionError';
  }
}

export function canTransitionWorkoutSessionStatus(
  currentStatus: WorkoutSessionStatus,
  nextStatus: WorkoutSessionStatus,
): boolean {
  return ALLOWED_WORKOUT_SESSION_TRANSITIONS[currentStatus].includes(
    nextStatus,
  );
}

export function startWorkoutSession(
  session: DraftWorkoutSession,
  startedAt: string,
): InProgressWorkoutSession {
  assertWorkoutSessionStatusTransition(session.status, 'in_progress');

  return {
    ...session,
    status: 'in_progress',
    startedAt,
    updatedAt: startedAt,
  };
}

export function completeWorkoutSession(
  session: InProgressWorkoutSession,
  endedAt: string,
): CompletedWorkoutSession {
  assertWorkoutSessionStatusTransition(session.status, 'completed');

  return {
    ...session,
    status: 'completed',
    endedAt,
    updatedAt: endedAt,
  };
}

export function cancelWorkoutSession(
  session: DraftWorkoutSession | InProgressWorkoutSession,
  endedAt: string,
): CancelledWorkoutSession {
  assertWorkoutSessionStatusTransition(session.status, 'cancelled');

  return {
    ...session,
    status: 'cancelled',
    endedAt,
    updatedAt: endedAt,
  };
}

export function assertWorkoutSessionStatusTransition(
  currentStatus: WorkoutSessionStatus,
  nextStatus: WorkoutSessionStatus,
): void {
  if (!canTransitionWorkoutSessionStatus(currentStatus, nextStatus)) {
    throw new WorkoutSessionTransitionError(currentStatus, nextStatus);
  }
}

export function isTerminalWorkoutSession(
  session: WorkoutSession,
): session is CompletedWorkoutSession | CancelledWorkoutSession {
  return session.status === 'completed' || session.status === 'cancelled';
}
