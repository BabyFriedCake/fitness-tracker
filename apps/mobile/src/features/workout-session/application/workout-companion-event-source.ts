import type {
  SessionExerciseId,
  WorkoutSessionId,
} from '@/domain/workout-session';

import type { WorkoutCompanionRuntimeState } from './workout-runtime-engine';

export type WorkoutCompanionRepCompletedEvent = {
  readonly sessionId: WorkoutSessionId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly repNumber: number;
  readonly timestamp: number;
  readonly source: 'companion_event_source';
};

export type WorkoutCompanionEventSource = {
  subscribe(callback: (event: unknown) => void): void;
  unsubscribe(): void;
};

export type WorkoutCompanionEventValidationResult =
  | {
      readonly status: 'valid';
      readonly event: WorkoutCompanionRepCompletedEvent;
    }
  | {
      readonly status: 'invalid';
      readonly reason:
        | 'invalid_shape'
        | 'invalid_source'
        | 'invalid_timestamp'
        | 'runtime_not_running'
        | 'session_mismatch'
        | 'exercise_mismatch'
        | 'rep_sequence_mismatch';
    };

export const NOOP_WORKOUT_COMPANION_EVENT_SOURCE: WorkoutCompanionEventSource =
  {
    subscribe: () => undefined,
    unsubscribe: () => undefined,
  };

export function validateWorkoutCompanionRepCompletedEvent(
  value: unknown,
  runtime: WorkoutCompanionRuntimeState,
): WorkoutCompanionEventValidationResult {
  if (!isRecord(value)) {
    return { status: 'invalid', reason: 'invalid_shape' };
  }

  if (value.source !== 'companion_event_source') {
    return { status: 'invalid', reason: 'invalid_source' };
  }

  if (
    typeof value.timestamp !== 'number' ||
    !Number.isFinite(value.timestamp)
  ) {
    return { status: 'invalid', reason: 'invalid_timestamp' };
  }

  if (runtime.phase !== 'running') {
    return { status: 'invalid', reason: 'runtime_not_running' };
  }

  if (value.sessionId !== runtime.progress.sessionId) {
    return { status: 'invalid', reason: 'session_mismatch' };
  }

  const exercise =
    runtime.orderedExercises[runtime.progress.currentExerciseIndex];

  if (!exercise || value.sessionExerciseId !== exercise.id) {
    return { status: 'invalid', reason: 'exercise_mismatch' };
  }

  if (
    typeof value.repNumber !== 'number' ||
    !Number.isSafeInteger(value.repNumber) ||
    value.repNumber !== runtime.progress.completedReps + 1
  ) {
    return { status: 'invalid', reason: 'rep_sequence_mismatch' };
  }

  return {
    status: 'valid',
    event: value as WorkoutCompanionRepCompletedEvent,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
