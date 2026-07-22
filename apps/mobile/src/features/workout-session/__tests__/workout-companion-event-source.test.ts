/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import type {
  InProgressWorkoutSession,
  SessionExerciseId,
  WorkoutSessionId,
} from '@/domain/workout-session';
import { validateWorkoutCompanionRepCompletedEvent } from '@/features/workout-session/application/workout-companion-event-source';
import {
  createWorkoutCompanionRuntimeState,
  onWorkoutCompanionRepCompleted,
  pauseWorkoutCompanionRuntime,
} from '@/features/workout-session/application/workout-runtime-engine';

const SESSION_ID = 'session-companion' as WorkoutSessionId;
const EXERCISE_ID = 'session-exercise-companion' as SessionExerciseId;

describe('WorkoutCompanionEventSource validation', () => {
  it('accepts only the next rep for the current session and exercise', () => {
    const runtime = createRuntime();
    const event = buildEvent();

    expect(validateWorkoutCompanionRepCompletedEvent(event, runtime)).toEqual({
      status: 'valid',
      event,
    });

    const advanced = onWorkoutCompanionRepCompleted(runtime).runtime;
    expect(
      validateWorkoutCompanionRepCompletedEvent(
        { ...event, repNumber: 2 },
        advanced,
      ).status,
    ).toBe('valid');
  });

  it.each([
    [{ ...buildEvent(), sessionId: 'other' }, 'session_mismatch'],
    [{ ...buildEvent(), sessionExerciseId: 'other' }, 'exercise_mismatch'],
    [{ ...buildEvent(), repNumber: 2 }, 'rep_sequence_mismatch'],
    [{ ...buildEvent(), timestamp: Number.NaN }, 'invalid_timestamp'],
    [{ ...buildEvent(), source: 'camera' }, 'invalid_source'],
  ] as const)('rejects invalid external event %#', (event, reason) => {
    expect(
      validateWorkoutCompanionRepCompletedEvent(event, createRuntime()),
    ).toEqual({
      status: 'invalid',
      reason,
    });
  });

  it('rejects events while the runtime is paused', () => {
    expect(
      validateWorkoutCompanionRepCompletedEvent(
        buildEvent(),
        pauseWorkoutCompanionRuntime(createRuntime()),
      ),
    ).toEqual({ status: 'invalid', reason: 'runtime_not_running' });
  });
});

function buildEvent() {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: EXERCISE_ID,
    repNumber: 1,
    timestamp: Date.parse('2026-07-22T01:00:00.000Z'),
    source: 'companion_event_source' as const,
  };
}

function createRuntime() {
  return createWorkoutCompanionRuntimeState(buildSession());
}

function buildSession(): InProgressWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: 'Push',
    status: 'in_progress',
    startedAt: '2026-07-22T00:00:00.000Z',
    endedAt: undefined,
    currentSessionExerciseId: EXERCISE_ID,
    currentSetNumber: 1,
    notes: '',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
    sessionExercises: [
      {
        id: EXERCISE_ID,
        sessionId: SESSION_ID,
        sourceExerciseId: 'exercise-bench' as ExerciseId,
        exerciseNameSnapshot: '杠铃卧推',
        position: 1,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 8,
        currentRestSeconds: 90,
        isEnabled: true,
        isSkipped: false,
        isCompleted: false,
        sets: [],
      },
    ],
  };
}
