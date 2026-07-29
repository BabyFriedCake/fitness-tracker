import * as Speech from 'expo-speech';

import type { WorkoutVoiceFeedbackAdapter } from '@/features/workout-session/application/workout-voice-feedback';

type ExpoSpeechOptions = Parameters<typeof Speech.speak>[1];

export type ExpoSpeechModule = Readonly<{
  speak: (message: string, options?: ExpoSpeechOptions) => void;
  stop: () => Promise<void>;
}>;

export type ForegroundWorkoutVoiceFeedbackAdapter =
  WorkoutVoiceFeedbackAdapter & {
    readonly stop: () => Promise<void>;
  };

export type CreateExpoSpeechWorkoutVoiceFeedbackAdapterOptions = Readonly<{
  speech?: ExpoSpeechModule;
  language?: string;
  rate?: number;
}>;

/**
 * Keeps fast runtime feedback current instead of allowing stale rep messages to queue.
 */
export function createExpoSpeechWorkoutVoiceFeedbackAdapter({
  speech = Speech,
  language = 'zh-CN',
  rate = 0.52,
}: CreateExpoSpeechWorkoutVoiceFeedbackAdapterOptions = {}): ForegroundWorkoutVoiceFeedbackAdapter {
  let requestId = 0;

  return Object.freeze({
    speak: async (message: string): Promise<void> => {
      const currentRequestId = ++requestId;

      await speech.stop();

      if (currentRequestId !== requestId) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        speech.speak(message, {
          language,
          rate,
          onDone: resolve,
          onStopped: resolve,
          onError: reject,
        });
      });
    },
    stop: async (): Promise<void> => {
      requestId += 1;
      await speech.stop();
    },
  });
}

export const foregroundWorkoutVoiceFeedbackAdapter =
  createExpoSpeechWorkoutVoiceFeedbackAdapter();
