/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import {
  REST_TIMER_STATUSES,
  RestTimerTransitionError,
  RestTimerTimeError,
  WorkoutSessionCurrentPositionError,
  WorkoutSessionTransitionError,
  assertRestTimerStatusTransition,
  assertWorkoutSessionCurrentPosition,
  assertWorkoutSessionStatusTransition,
  cancelWorkoutSession,
  canTransitionWorkoutSessionStatus,
  completeWorkoutSession,
  isTerminalWorkoutSession,
  canTransitionRestTimerStatus,
  getRestTimerRemainingSeconds,
  startWorkoutSession,
  type DraftWorkoutSession,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSet,
  type WorkoutSetId,
  type RestTimer,
  type RestTimerId,
} from '@/domain/workout-session';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const STARTED_AT = '2026-07-17T01:00:00.000Z';
const ENDED_AT = '2026-07-17T02:00:00.000Z';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench-press' as SessionExerciseId;

const WORKOUT_SET: WorkoutSet = {
  id: 'set-bench-press-1' as WorkoutSetId,
  sessionExerciseId: SESSION_EXERCISE_ID,
  setNumber: 1,
  setType: 'normal',
  actualReps: 9,
  weight: 80,
  isCompleted: true,
  isExtraSet: false,
  completedAt: ENDED_AT,
};

const SESSION_EXERCISE: SessionExercise = {
  id: SESSION_EXERCISE_ID,
  sessionId: SESSION_ID,
  sourceExerciseId: 'exercise-bench-press' as ExerciseId,
  exerciseNameSnapshot: '杠铃卧推',
  position: 1,
  isEnabled: true,
  isSkipped: false,
  isCompleted: false,
  targetSets: 4,
  targetRepsMin: 8,
  targetRepsMax: 10,
  currentRestSeconds: 90,
  sets: [WORKOUT_SET],
};

const RUNNING_TIMER: RestTimer = {
  id: 'rest-timer-1' as RestTimerId,
  sessionId: SESSION_ID,
  sessionExerciseId: SESSION_EXERCISE_ID,
  previousSetNumber: 1,
  nextSetNumber: 2,
  originalDurationSeconds: 90,
  startedAt: '2026-07-17T01:10:00.000Z',
  targetEndAt: '2026-07-17T01:11:30.000Z',
  status: 'running',
  createdAt: '2026-07-17T01:10:00.000Z',
  updatedAt: '2026-07-17T01:10:00.000Z',
};

const DRAFT_SESSION: DraftWorkoutSession = {
  id: SESSION_ID,
  sourceTemplateId: 'template-push' as WorkoutTemplateId,
  workoutNameSnapshot: 'Push',
  status: 'draft',
  sessionExercises: [SESSION_EXERCISE],
  dailyStatus: 'normal',
  notes: '状态良好',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

describe('WorkoutSession domain', () => {
  it('represents template and non-template sessions with independent snapshots', () => {
    const nonTemplateSession: DraftWorkoutSession = {
      ...DRAFT_SESSION,
      sourceTemplateId: undefined,
      workoutNameSnapshot: '临时训练',
    };

    expect(DRAFT_SESSION.sourceTemplateId).toBe('template-push');
    expect(DRAFT_SESSION.workoutNameSnapshot).toBe('Push');
    expect(DRAFT_SESSION.sessionExercises[0]).toEqual(
      expect.objectContaining({
        sourceExerciseId: 'exercise-bench-press',
        exerciseNameSnapshot: '杠铃卧推',
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        currentRestSeconds: 90,
        sets: [WORKOUT_SET],
      }),
    );
    expect(nonTemplateSession.sourceTemplateId).toBeUndefined();
    expect(nonTemplateSession.workoutNameSnapshot).toBe('临时训练');
  });

  it('aggregates completed WorkoutSet facts under their SessionExercise', () => {
    const excludesTargetReps: Not<HasKey<WorkoutSet, 'targetReps'>> = true;

    expect(SESSION_EXERCISE.sets).toEqual([WORKOUT_SET]);
    expect(SESSION_EXERCISE.sets[0]?.sessionExerciseId).toBe(
      SESSION_EXERCISE.id,
    );
    expect(excludesTargetReps).toBe(true);
    expect(WORKOUT_SET).not.toHaveProperty('targetReps');
    expect(WORKOUT_SET.actualReps).toBe(9);
    expect(WORKOUT_SET.weight).toBe(80);
  });

  it('allows every approved WorkoutSession status transition', () => {
    expect(canTransitionWorkoutSessionStatus('draft', 'in_progress')).toBe(
      true,
    );
    expect(canTransitionWorkoutSessionStatus('draft', 'cancelled')).toBe(true);
    expect(canTransitionWorkoutSessionStatus('in_progress', 'completed')).toBe(
      true,
    );
    expect(canTransitionWorkoutSessionStatus('in_progress', 'cancelled')).toBe(
      true,
    );
  });

  it('starts and completes a session without mutating its snapshots', () => {
    const inProgressSession = startWorkoutSession(DRAFT_SESSION, STARTED_AT);
    const completedSession = completeWorkoutSession(
      inProgressSession,
      ENDED_AT,
    );

    expect(DRAFT_SESSION.status).toBe('draft');
    expect(DRAFT_SESSION.startedAt).toBeUndefined();
    expect(inProgressSession).toEqual(
      expect.objectContaining({
        status: 'in_progress',
        startedAt: STARTED_AT,
        updatedAt: STARTED_AT,
        workoutNameSnapshot: 'Push',
        sessionExercises: DRAFT_SESSION.sessionExercises,
      }),
    );
    expect(completedSession).toEqual(
      expect.objectContaining({
        status: 'completed',
        startedAt: STARTED_AT,
        endedAt: ENDED_AT,
        updatedAt: ENDED_AT,
      }),
    );
    expect(isTerminalWorkoutSession(completedSession)).toBe(true);
  });

  it('cancels draft and in-progress sessions at their current lifecycle stage', () => {
    const cancelledDraft = cancelWorkoutSession(DRAFT_SESSION, ENDED_AT);
    const inProgressSession = startWorkoutSession(DRAFT_SESSION, STARTED_AT);
    const cancelledInProgress = cancelWorkoutSession(
      inProgressSession,
      ENDED_AT,
    );

    expect(cancelledDraft.startedAt).toBeUndefined();
    expect(cancelledDraft.endedAt).toBe(ENDED_AT);
    expect(cancelledInProgress.startedAt).toBe(STARTED_AT);
    expect(cancelledInProgress.endedAt).toBe(ENDED_AT);
    expect(isTerminalWorkoutSession(cancelledDraft)).toBe(true);
  });

  it('rejects terminal, reverse, repeated, and skipped status transitions', () => {
    const invalidTransitions: readonly (readonly [
      WorkoutSession['status'],
      WorkoutSession['status'],
    ])[] = [
      ['draft', 'draft'],
      ['draft', 'completed'],
      ['in_progress', 'draft'],
      ['in_progress', 'in_progress'],
      ['completed', 'draft'],
      ['completed', 'in_progress'],
      ['completed', 'completed'],
      ['completed', 'cancelled'],
      ['cancelled', 'draft'],
      ['cancelled', 'in_progress'],
      ['cancelled', 'completed'],
      ['cancelled', 'cancelled'],
    ];

    for (const [currentStatus, nextStatus] of invalidTransitions) {
      expect(canTransitionWorkoutSessionStatus(currentStatus, nextStatus)).toBe(
        false,
      );
      expect(() =>
        assertWorkoutSessionStatusTransition(currentStatus, nextStatus),
      ).toThrow(WorkoutSessionTransitionError);
    }
  });

  it('validates current position as a complete relationship', () => {
    const positionedSession: DraftWorkoutSession = {
      ...DRAFT_SESSION,
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
    };

    expect(() =>
      assertWorkoutSessionCurrentPosition(positionedSession),
    ).not.toThrow();
    expect(() =>
      assertWorkoutSessionCurrentPosition({
        ...DRAFT_SESSION,
        currentSessionExerciseId: SESSION_EXERCISE_ID,
      }),
    ).toThrow(WorkoutSessionCurrentPositionError);
    expect(() =>
      assertWorkoutSessionCurrentPosition({
        ...positionedSession,
        currentSessionExerciseId: 'session-exercise-other' as SessionExerciseId,
      }),
    ).toThrow(WorkoutSessionCurrentPositionError);
    expect(() =>
      assertWorkoutSessionCurrentPosition({
        ...positionedSession,
        currentSetNumber: 0,
      }),
    ).toThrow(WorkoutSessionCurrentPositionError);
  });
});

describe('RestTimer domain', () => {
  it('uses only the approved persisted statuses', () => {
    expect(REST_TIMER_STATUSES).toEqual([
      'running',
      'paused',
      'completed',
      'skipped',
      'cancelled',
    ]);
    expect(REST_TIMER_STATUSES).not.toContain('idle');
  });

  it('accepts the approved transition matrix and rejects terminal operations', () => {
    expect(canTransitionRestTimerStatus('running', 'paused')).toBe(true);
    expect(canTransitionRestTimerStatus('paused', 'running')).toBe(true);
    expect(canTransitionRestTimerStatus('running', 'completed')).toBe(true);
    expect(canTransitionRestTimerStatus('paused', 'skipped')).toBe(true);
    expect(canTransitionRestTimerStatus('running', 'cancelled')).toBe(true);
    expect(canTransitionRestTimerStatus('completed', 'running')).toBe(true);
    expect(canTransitionRestTimerStatus('skipped', 'running')).toBe(true);
    expect(canTransitionRestTimerStatus('cancelled', 'running')).toBe(true);

    expect(() =>
      assertRestTimerStatusTransition('completed', 'paused'),
    ).toThrow(RestTimerTransitionError);
    expect(() =>
      assertRestTimerStatusTransition('skipped', 'completed'),
    ).toThrow(RestTimerTransitionError);
  });

  it('derives running and paused remaining time without negative values', () => {
    expect(
      getRestTimerRemainingSeconds(RUNNING_TIMER, '2026-07-17T01:10:30.500Z'),
    ).toBe(60);
    expect(
      getRestTimerRemainingSeconds(RUNNING_TIMER, '2026-07-17T01:12:00.000Z'),
    ).toBe(0);
    expect(
      getRestTimerRemainingSeconds(
        {
          ...RUNNING_TIMER,
          status: 'paused',
          pausedRemainingSeconds: 42,
        },
        '2026-07-17T02:00:00.000Z',
      ),
    ).toBe(42);
  });

  it('rejects malformed timestamps and incomplete paused state', () => {
    expect(() =>
      getRestTimerRemainingSeconds(RUNNING_TIMER, '07/17/2026'),
    ).toThrow(RestTimerTimeError);
    expect(() =>
      getRestTimerRemainingSeconds(
        { ...RUNNING_TIMER, status: 'paused' },
        '2026-07-17T01:10:30.000Z',
      ),
    ).toThrow(RestTimerTimeError);
  });
});

type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

type Not<T extends boolean> = T extends true ? false : true;
