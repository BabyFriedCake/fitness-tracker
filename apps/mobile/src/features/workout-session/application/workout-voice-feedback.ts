import type { WorkoutFeedbackEvent } from './workout-feedback-events';

export type RestTimerStartedVoiceFeedbackEvent = {
  readonly type: 'RestTimerStarted';
  readonly durationSeconds: number;
};

export type WorkoutVoiceFeedbackEvent =
  WorkoutFeedbackEvent | RestTimerStartedVoiceFeedbackEvent;

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

export function createWorkoutVoiceFeedbackMessage(
  event: WorkoutVoiceFeedbackEvent,
): string {
  switch (event.type) {
    case 'RepCompleted':
      return `第 ${event.repNumber} 次`;
    case 'SetCompleted':
      return `第 ${event.setNumber} 组完成`;
    case 'ExerciseCompleted':
      return `${event.exerciseNameSnapshot} 完成`;
    case 'RestTimerStarted':
      return `休息 ${event.durationSeconds} 秒`;
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
