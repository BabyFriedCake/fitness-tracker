/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import type {
  SessionExercise,
  SessionExerciseId,
  WorkoutSessionId,
  WorkoutSet,
  WorkoutSetId,
} from '@/domain/workout-session';
import {
  createExerciseCompletedFeedbackEvent,
  createRepCompletedFeedbackEvent,
  createSetCompletedFeedbackEvent,
} from '@/features/workout-session/application/workout-feedback-events';
import {
  InvalidRestTimerVoiceFeedbackInputError,
  createRestTimerStartedVoiceFeedbackEvent,
  createWorkoutVoiceFeedbackMessage,
  speakWorkoutVoiceFeedbackEvent,
  type WorkoutVoiceFeedbackAdapter,
} from '@/features/workout-session/application/workout-voice-feedback';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const WORKOUT_SET_ID = 'set-bench-1' as WorkoutSetId;
const COMPLETED_AT = '2026-07-20T01:20:00.000Z';

describe('Workout Voice Feedback', () => {
  it('maps runtime feedback events to voice messages', () => {
    const exercise = buildSessionExercise({
      isCompleted: true,
      sets: [
        buildWorkoutSet({ id: 'set-bench-1' as WorkoutSetId }),
        buildWorkoutSet({ id: 'set-bench-2' as WorkoutSetId, setNumber: 2 }),
        buildWorkoutSet({ id: 'set-bench-3' as WorkoutSetId, setNumber: 3 }),
      ],
    });

    expect(
      createWorkoutVoiceFeedbackMessage(
        createRepCompletedFeedbackEvent({
          sessionId: SESSION_ID,
          exercise,
          repNumber: 10,
        }),
      ),
    ).toBe('第 10 次');
    expect(
      createWorkoutVoiceFeedbackMessage(
        createSetCompletedFeedbackEvent({
          sessionId: SESSION_ID,
          exercise,
          workoutSet: buildWorkoutSet({ setNumber: 1 }),
        }),
      ),
    ).toBe('第 1 组完成');
    expect(
      createWorkoutVoiceFeedbackMessage(
        createExerciseCompletedFeedbackEvent({
          sessionId: SESSION_ID,
          exercise,
        }),
      ),
    ).toBe('杠铃卧推 完成');
    expect(
      createWorkoutVoiceFeedbackMessage(
        createRestTimerStartedVoiceFeedbackEvent(90),
      ),
    ).toBe('休息 90 秒');
  });

  it('does not call the voice adapter when voice feedback is disabled', async () => {
    const speak = jest.fn();

    await expect(
      speakWorkoutVoiceFeedbackEvent(
        createRestTimerStartedVoiceFeedbackEvent(90),
        {
          isEnabled: false,
          voiceAdapter: { speak },
        },
      ),
    ).resolves.toEqual({ status: 'disabled' });
    expect(speak).not.toHaveBeenCalled();
  });

  it('speaks mapped messages through the injected voice adapter', async () => {
    const speak = jest.fn();
    const event = createRestTimerStartedVoiceFeedbackEvent(90);

    await expect(
      speakWorkoutVoiceFeedbackEvent(event, {
        isEnabled: true,
        voiceAdapter: { speak },
      }),
    ).resolves.toEqual({ status: 'spoken', message: '休息 90 秒' });
    expect(speak).toHaveBeenCalledWith('休息 90 秒');
  });

  it('does not throw when the voice adapter fails', async () => {
    const error = new Error('speech unavailable');
    const voiceAdapter: WorkoutVoiceFeedbackAdapter = {
      speak: async () => {
        throw error;
      },
    };

    await expect(
      speakWorkoutVoiceFeedbackEvent(
        createRestTimerStartedVoiceFeedbackEvent(90),
        {
          isEnabled: true,
          voiceAdapter,
        },
      ),
    ).resolves.toEqual({
      status: 'failed',
      message: '休息 90 秒',
      error,
    });
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid rest timer duration %p',
    (durationSeconds) => {
      expect(() =>
        createRestTimerStartedVoiceFeedbackEvent(durationSeconds),
      ).toThrow(InvalidRestTimerVoiceFeedbackInputError);
    },
  );
});

function buildSessionExercise(
  overrides: Partial<SessionExercise> = {},
): SessionExercise {
  return {
    id: SESSION_EXERCISE_ID,
    sessionId: SESSION_ID,
    sourceExerciseId: 'exercise-bench' as ExerciseId,
    exerciseNameSnapshot: '杠铃卧推',
    position: 1,
    isEnabled: true,
    isSkipped: false,
    isCompleted: false,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 10,
    currentRestSeconds: 90,
    sets: [],
    ...overrides,
  };
}

function buildWorkoutSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: WORKOUT_SET_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: COMPLETED_AT,
    ...overrides,
  };
}
