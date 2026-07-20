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
  InvalidRepFeedbackInputError,
  InvalidSetFeedbackInputError,
  createExerciseCompletedFeedbackEvent,
  createRepCompletedFeedbackEvent,
  createRepCompletedFeedbackEvents,
  createSetCompletedFeedbackEvent,
} from '@/features/workout-session/application/workout-rep-feedback';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const WORKOUT_SET_ID = 'set-bench-1' as WorkoutSetId;
const COMPLETED_AT = '2026-07-20T01:20:00.000Z';

describe('Workout Rep Feedback', () => {
  it('creates a RepCompleted event without changing exercise facts', () => {
    const exercise = buildSessionExercise();
    const originalExercise = structuredClone(exercise);

    const event = createRepCompletedFeedbackEvent({
      sessionId: SESSION_ID,
      exercise,
      repNumber: 3,
    });

    expect(event).toEqual({
      type: 'RepCompleted',
      sessionId: SESSION_ID,
      sessionExerciseId: SESSION_EXERCISE_ID,
      exerciseNameSnapshot: '杠铃卧推',
      repNumber: 3,
      targetRepsMin: 8,
      targetRepsMax: 10,
    });
    expect(exercise).toEqual(originalExercise);
  });

  it('creates one RepCompleted event per actual rep in order', () => {
    const events = createRepCompletedFeedbackEvents({
      sessionId: SESSION_ID,
      exercise: buildSessionExercise(),
      actualReps: 4,
    });

    expect(events).toHaveLength(4);
    expect(events.map((event) => event.repNumber)).toEqual([1, 2, 3, 4]);
    expect(events.every((event) => event.type === 'RepCompleted')).toBe(true);
  });

  it('allows zero actual reps to produce no RepCompleted events', () => {
    expect(
      createRepCompletedFeedbackEvents({
        sessionId: SESSION_ID,
        exercise: buildSessionExercise(),
        actualReps: 0,
      }),
    ).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid single rep number %p',
    (repNumber) => {
      expect(() =>
        createRepCompletedFeedbackEvent({
          sessionId: SESSION_ID,
          exercise: buildSessionExercise(),
          repNumber,
        }),
      ).toThrow(InvalidRepFeedbackInputError);
    },
  );

  it.each([-1, 1.5, Number.NaN])(
    'rejects invalid actual reps %p',
    (actualReps) => {
      expect(() =>
        createRepCompletedFeedbackEvents({
          sessionId: SESSION_ID,
          exercise: buildSessionExercise(),
          actualReps,
        }),
      ).toThrow(InvalidRepFeedbackInputError);
    },
  );

  it('creates a SetCompleted event from a completed WorkoutSet without mutation', () => {
    const exercise = buildSessionExercise();
    const workoutSet = buildWorkoutSet({ setNumber: 2, actualReps: 9 });
    const originalWorkoutSet = structuredClone(workoutSet);

    const event = createSetCompletedFeedbackEvent({
      sessionId: SESSION_ID,
      exercise,
      workoutSet,
    });

    expect(event).toEqual({
      type: 'SetCompleted',
      sessionId: SESSION_ID,
      sessionExerciseId: SESSION_EXERCISE_ID,
      exerciseNameSnapshot: '杠铃卧推',
      setNumber: 2,
      actualReps: 9,
      weight: 80,
      isExtraSet: false,
    });
    expect(workoutSet).toEqual(originalWorkoutSet);
  });

  it('rejects a SetCompleted event for an incomplete WorkoutSet', () => {
    expect(() =>
      createSetCompletedFeedbackEvent({
        sessionId: SESSION_ID,
        exercise: buildSessionExercise(),
        workoutSet: buildWorkoutSet({ isCompleted: false }),
      }),
    ).toThrow(InvalidSetFeedbackInputError);
  });

  it('creates an ExerciseCompleted event from completed set facts', () => {
    const event = createExerciseCompletedFeedbackEvent({
      sessionId: SESSION_ID,
      exercise: buildSessionExercise({
        sets: [
          buildWorkoutSet({ id: 'set-bench-1' as WorkoutSetId }),
          buildWorkoutSet({
            id: 'set-bench-2' as WorkoutSetId,
            setNumber: 2,
            isCompleted: false,
          }),
          buildWorkoutSet({
            id: 'set-bench-3' as WorkoutSetId,
            setNumber: 3,
          }),
        ],
      }),
    });

    expect(event).toEqual({
      type: 'ExerciseCompleted',
      sessionId: SESSION_ID,
      sessionExerciseId: SESSION_EXERCISE_ID,
      exerciseNameSnapshot: '杠铃卧推',
      completedSetCount: 2,
      targetSetCount: 3,
    });
  });
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
