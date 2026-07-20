import type { SessionExerciseId, WorkoutSessionId } from './types';

export type RestTimerId = string & {
  readonly __brand: 'RestTimerId';
};

export const REST_TIMER_STATUSES = [
  'running',
  'paused',
  'completed',
  'skipped',
  'cancelled',
] as const;

export type RestTimerStatus = (typeof REST_TIMER_STATUSES)[number];

export type RestTimer = {
  readonly id: RestTimerId;
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly previousSetNumber?: number;
  readonly nextSetNumber?: number;
  readonly originalDurationSeconds: number;
  readonly startedAt?: string;
  readonly targetEndAt?: string;
  readonly pausedRemainingSeconds?: number;
  readonly status: RestTimerStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

const ALLOWED_REST_TIMER_TRANSITIONS: Readonly<
  Record<RestTimerStatus, readonly RestTimerStatus[]>
> = {
  running: ['paused', 'completed', 'skipped', 'cancelled'],
  paused: ['running', 'completed', 'skipped', 'cancelled'],
  completed: ['running'],
  skipped: ['running'],
  cancelled: ['running'],
};

export class RestTimerTransitionError extends Error {
  constructor(
    readonly currentStatus: RestTimerStatus,
    readonly nextStatus: RestTimerStatus,
  ) {
    super(
      `RestTimer cannot transition from ${currentStatus} to ${nextStatus}.`,
    );
    this.name = 'RestTimerTransitionError';
  }
}

export class RestTimerTimeError extends Error {
  constructor(readonly value: string) {
    super(`RestTimer timestamp is invalid: ${value}.`);
    this.name = 'RestTimerTimeError';
  }
}

export function canTransitionRestTimerStatus(
  currentStatus: RestTimerStatus,
  nextStatus: RestTimerStatus,
): boolean {
  return ALLOWED_REST_TIMER_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function assertRestTimerStatusTransition(
  currentStatus: RestTimerStatus,
  nextStatus: RestTimerStatus,
): void {
  if (!canTransitionRestTimerStatus(currentStatus, nextStatus)) {
    throw new RestTimerTransitionError(currentStatus, nextStatus);
  }
}

export function getRestTimerRemainingSeconds(
  timer: RestTimer,
  now: string,
): number {
  const nowTimestamp = requireTimestamp(now);

  if (timer.status === 'running') {
    if (!timer.targetEndAt) {
      throw new RestTimerTimeError('');
    }

    const targetTimestamp = requireTimestamp(timer.targetEndAt);
    return Math.max(0, Math.ceil((targetTimestamp - nowTimestamp) / 1000));
  }

  if (timer.status === 'paused') {
    if (timer.pausedRemainingSeconds === undefined) {
      throw new RestTimerTimeError('');
    }

    return Math.max(0, timer.pausedRemainingSeconds);
  }

  return 0;
}

export function isTerminalRestTimerStatus(status: RestTimerStatus): boolean {
  return (
    status === 'completed' || status === 'skipped' || status === 'cancelled'
  );
}

function requireTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== value
  ) {
    throw new RestTimerTimeError(value);
  }

  return timestamp;
}
