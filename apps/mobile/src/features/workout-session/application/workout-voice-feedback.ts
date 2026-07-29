import type { WorkoutFeedbackEvent } from './workout-feedback-events';

export type RestTimerStartedVoiceFeedbackEvent = {
  readonly type: 'RestTimerStarted';
  readonly durationSeconds: number;
};

/** Voice-only feedback. This never represents persisted training progress. */
export type ExerciseStartCountdownVoiceFeedbackEvent = {
  readonly type: 'ExerciseStartCountdown';
  readonly exerciseNameSnapshot: string;
};

export type WorkoutVoiceFeedbackEvent =
  | WorkoutFeedbackEvent
  | RestTimerStartedVoiceFeedbackEvent
  | ExerciseStartCountdownVoiceFeedbackEvent;

export type WorkoutVoiceFeedbackAdapter = {
  readonly speak: (message: string) => Promise<void> | void;
};

export type WorkoutVoiceFeedbackOptions = {
  readonly isEnabled: boolean;
  readonly voiceAdapter: WorkoutVoiceFeedbackAdapter;
};

export type WorkoutVoiceFeedbackResult =
  | { readonly status: 'disabled' }
  | { readonly status: 'spoken'; readonly message: string }
  | {
      readonly status: 'failed';
      readonly message: string;
      readonly error: unknown;
    };

export class InvalidRestTimerVoiceFeedbackInputError extends Error {
  constructor(readonly durationSeconds: number) {
    super('Rest timer voice feedback duration must be a positive integer.');
    this.name = 'InvalidRestTimerVoiceFeedbackInputError';
  }
}

export class InvalidExerciseStartCountdownVoiceFeedbackInputError extends Error {
  constructor() {
    super('Exercise start countdown requires a non-empty exercise name.');
    this.name = 'InvalidExerciseStartCountdownVoiceFeedbackInputError';
  }
}

export function createRestTimerStartedVoiceFeedbackEvent(
  durationSeconds: number,
): RestTimerStartedVoiceFeedbackEvent {
  if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 1) {
    throw new InvalidRestTimerVoiceFeedbackInputError(durationSeconds);
  }

  return Object.freeze({
    type: 'RestTimerStarted',
    durationSeconds,
  });
}

export function createExerciseStartCountdownVoiceFeedbackEvent(
  exerciseNameSnapshot: string,
): ExerciseStartCountdownVoiceFeedbackEvent {
  if (!exerciseNameSnapshot.trim()) {
    throw new InvalidExerciseStartCountdownVoiceFeedbackInputError();
  }

  return Object.freeze({
    type: 'ExerciseStartCountdown',
    exerciseNameSnapshot: exerciseNameSnapshot.trim(),
  });
}

export function createWorkoutVoiceFeedbackMessage(
  event: WorkoutVoiceFeedbackEvent,
): string {
  switch (event.type) {
    case 'RepCompleted':
      return String(event.repNumber);
    case 'SetCompleted':
      return `第 ${event.setNumber} 组完成`;
    case 'ExerciseCompleted':
      return `${event.exerciseNameSnapshot} 完成`;
    case 'RestTimerStarted':
      return `休息 ${event.durationSeconds} 秒`;
    case 'ExerciseStartCountdown':
      return `${event.exerciseNameSnapshot}，3，2，1，开始`;
  }
}

export async function speakWorkoutVoiceFeedbackEvent(
  event: WorkoutVoiceFeedbackEvent,
  options: WorkoutVoiceFeedbackOptions,
): Promise<WorkoutVoiceFeedbackResult> {
  if (!options.isEnabled) {
    return { status: 'disabled' };
  }

  const message = createWorkoutVoiceFeedbackMessage(event);

  try {
    await options.voiceAdapter.speak(message);
    return { status: 'spoken', message };
  } catch (error) {
    return { status: 'failed', message, error };
  }
}
