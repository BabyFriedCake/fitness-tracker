/// <reference types="jest" />

import type {
  SessionExercise,
  SessionExerciseId,
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSet,
  WorkoutSetId,
} from '@/domain/workout-session';
import type { ExerciseId } from '@/domain/exercise';
import {
  createWorkoutHistoryOverviewMetric,
  createWorkoutHistoryProgressBaseline,
  createWorkoutHistorySessionMetric,
} from '@/features/workout-session/application/workout-history-metrics';

const SESSION_ID = 'session-history' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const STARTED_AT = '2026-07-20T01:00:00.000Z';
const ENDED_AT = '2026-07-20T02:00:00.000Z';

describe('workout history metrics', () => {
  it('derives completed session metrics from completed WorkoutSet facts', () => {
    const metric = createWorkoutHistorySessionMetric(
      buildSession('completed', {
        sets: [
          buildSet('set-1', { actualReps: 10, weight: 80 }),
          buildSet('set-2', { actualReps: 8, weight: 85 }),
          buildSet('set-draft', { isCompleted: false }),
        ],
      }),
    );

    expect(metric).toMatchObject({
      sessionId: SESSION_ID,
      status: 'completed',
      includedInFormalStatistics: true,
      durationSeconds: 3600,
      completedExerciseCount: 1,
      completedSetCount: 2,
      totalVolume: 1480,
    });
    expect(metric?.exercises[0]).toMatchObject({
      exerciseName: '杠铃卧推',
      completedSetCount: 2,
      totalVolume: 1480,
    });
    expect(metric?.exercises[0]?.sets).toEqual([
      {
        setNumber: 1,
        actualReps: 10,
        weight: 80,
        volume: 800,
        completedAt: ENDED_AT,
      },
      {
        setNumber: 1,
        actualReps: 8,
        weight: 85,
        volume: 680,
        completedAt: ENDED_AT,
      },
    ]);
  });

  it('keeps cancelled sessions visible but excludes them from formal overview', () => {
    const completed = createWorkoutHistorySessionMetric(
      buildSession('completed', {
        sets: [buildSet('set-completed', { actualReps: 10, weight: 100 })],
      }),
    );
    const cancelled = createWorkoutHistorySessionMetric(
      buildSession('cancelled', {
        sets: [buildSet('set-cancelled', { actualReps: 12, weight: 100 })],
      }),
    );

    if (!completed || !cancelled) {
      throw new Error('Expected terminal metrics.');
    }

    expect(cancelled).toMatchObject({
      status: 'cancelled',
      includedInFormalStatistics: false,
      completedSetCount: 1,
      totalVolume: 1200,
    });
    expect(createWorkoutHistoryOverviewMetric([completed, cancelled])).toEqual({
      completedSessionCount: 1,
      completedSetCount: 1,
      totalDurationSeconds: 3600,
      totalVolume: 1000,
      volumeTrend: { status: 'insufficient' },
    });
  });

  it('returns null for draft and in-progress sessions', () => {
    expect(createWorkoutHistorySessionMetric(buildSession('draft'))).toBeNull();
    expect(
      createWorkoutHistorySessionMetric(buildSession('in_progress')),
    ).toBeNull();
  });

  it('derives volume trend only from completed sessions', () => {
    const latest = createWorkoutHistorySessionMetric(
      buildSession('completed', {
        id: 'session-latest' as WorkoutSessionId,
        endedAt: '2026-07-21T02:00:00.000Z',
        sets: [buildSet('set-latest', { actualReps: 10, weight: 120 })],
      }),
    );
    const previous = createWorkoutHistorySessionMetric(
      buildSession('completed', {
        id: 'session-previous' as WorkoutSessionId,
        endedAt: '2026-07-20T02:00:00.000Z',
        sets: [buildSet('set-previous', { actualReps: 10, weight: 100 })],
      }),
    );

    if (!latest || !previous) {
      throw new Error('Expected completed metrics.');
    }

    expect(
      createWorkoutHistoryOverviewMetric([previous, latest]),
    ).toMatchObject({
      completedSessionCount: 2,
      completedSetCount: 2,
      totalVolume: 2200,
      volumeTrend: {
        status: 'available',
        direction: 'up',
        difference: 200,
      },
    });
  });

  it('derives personal record baselines from completed set facts only', () => {
    const completed = createWorkoutHistorySessionMetric(
      buildSession('completed', {
        id: 'session-pr' as WorkoutSessionId,
        sets: [
          buildSet('set-heavy', { actualReps: 5, weight: 120 }),
          buildSet('set-volume', { actualReps: 12, weight: 100 }),
        ],
      }),
    );
    const cancelled = createWorkoutHistorySessionMetric(
      buildSession('cancelled', {
        id: 'session-cancelled' as WorkoutSessionId,
        sets: [buildSet('set-cancelled', { actualReps: 20, weight: 200 })],
      }),
    );

    if (!completed || !cancelled) {
      throw new Error('Expected terminal metrics.');
    }

    expect(
      createWorkoutHistoryProgressBaseline([cancelled, completed])
        .personalRecords,
    ).toEqual([
      {
        type: 'session_volume',
        sessionId: 'session-pr',
        workoutName: 'Push',
        volume: 1800,
        achievedAt: ENDED_AT,
      },
      {
        type: 'exercise_weight',
        sessionId: 'session-pr',
        exerciseName: '杠铃卧推',
        weight: 120,
        actualReps: 5,
        achievedAt: ENDED_AT,
      },
      {
        type: 'exercise_set_volume',
        sessionId: 'session-pr',
        exerciseName: '杠铃卧推',
        volume: 1200,
        weight: 100,
        actualReps: 12,
        achievedAt: ENDED_AT,
      },
    ]);
  });

  it('does not report personal records without valid completed volume', () => {
    const completed = createWorkoutHistorySessionMetric(
      buildSession('completed', {
        sets: [buildSet('set-zero', { actualReps: 0, weight: 100 })],
      }),
    );

    if (!completed) {
      throw new Error('Expected completed metrics.');
    }

    expect(createWorkoutHistoryProgressBaseline([completed])).toEqual({
      overview: {
        completedSessionCount: 1,
        completedSetCount: 1,
        totalDurationSeconds: 3600,
        totalVolume: 0,
        volumeTrend: { status: 'insufficient' },
      },
      personalRecords: [],
    });
  });
});

function buildSession(
  status: WorkoutSession['status'],
  overrides: {
    readonly id?: WorkoutSessionId;
    readonly endedAt?: string;
    readonly sets?: readonly WorkoutSet[];
  } = {},
): WorkoutSession {
  const sessionExercises = [
    buildExercise(overrides.id ?? SESSION_ID, overrides.sets ?? [buildSet()]),
  ];
  const base = {
    id: overrides.id ?? SESSION_ID,
    workoutNameSnapshot: 'Push',
    sessionExercises,
    createdAt: STARTED_AT,
    updatedAt: overrides.endedAt ?? ENDED_AT,
  };

  switch (status) {
    case 'draft':
      return { ...base, status };
    case 'in_progress':
      return { ...base, status, startedAt: STARTED_AT };
    case 'completed':
      return {
        ...base,
        status,
        startedAt: STARTED_AT,
        endedAt: overrides.endedAt ?? ENDED_AT,
      };
    case 'cancelled':
      return {
        ...base,
        status,
        startedAt: STARTED_AT,
        endedAt: overrides.endedAt ?? ENDED_AT,
      };
  }
}

function buildExercise(
  sessionId: WorkoutSessionId,
  sets: readonly WorkoutSet[],
): SessionExercise {
  return {
    id: SESSION_EXERCISE_ID,
    sessionId,
    sourceExerciseId: 'exercise-bench' as ExerciseId,
    exerciseNameSnapshot: '杠铃卧推',
    position: 1,
    isEnabled: true,
    isSkipped: false,
    isCompleted: true,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 10,
    currentRestSeconds: 90,
    sets,
  };
}

function buildSet(
  id: string = 'set-1',
  overrides: Partial<WorkoutSet> = {},
): WorkoutSet {
  return {
    id: id as WorkoutSetId,
    sessionExerciseId: SESSION_EXERCISE_ID,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: ENDED_AT,
    ...overrides,
  };
}
