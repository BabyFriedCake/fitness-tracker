/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import {
  type RestTimer,
  type RestTimerId,
  type RestTimerRepository,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
  type WorkoutSet,
  type WorkoutSetId,
} from '@/domain/workout-session';
import {
  WorkoutRuntimeTransitionError,
  assertWorkoutRuntimeStatusTransition,
  canTransitionWorkoutRuntimeStatus,
  createWorkoutRuntimeSnapshot,
  createWorkoutRuntimeState,
  getWorkoutRuntimeState,
  loadWorkoutRuntimeState,
  pauseWorkoutRuntime,
  restoreRuntimeSnapshot,
  resumeWorkoutRuntime,
  saveRuntimeSnapshot,
  type WorkoutRuntimeSnapshot,
} from '@/features/workout-session/application/workout-runtime-engine';
import type { WorkoutRuntimeSnapshotRepository } from '@/features/workout-session/application/workout-runtime-snapshot-repository';
import { isValidWorkoutRuntimeSnapshot } from '@/features/workout-session/application/workout-runtime-snapshot-repository';

const CREATED_AT = '2026-07-20T01:00:00.000Z';
const STARTED_AT = '2026-07-20T01:10:00.000Z';
const ENDED_AT = '2026-07-20T02:00:00.000Z';
const NOW = '2026-07-20T01:20:00.000Z';
const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const SECOND_SESSION_EXERCISE_ID =
  'session-exercise-press' as SessionExerciseId;

describe('Workout Runtime Engine', () => {
  it('derives a running runtime from an in-progress session', () => {
    const session = buildInProgressSession({
      currentSessionExerciseId: SECOND_SESSION_EXERCISE_ID,
      currentSetNumber: 1,
      sessionExercises: [
        buildExercise(),
        buildExercise({
          id: SECOND_SESSION_EXERCISE_ID,
          exerciseNameSnapshot: '哑铃肩推',
          position: 2,
          sets: [buildWorkoutSet(SECOND_SESSION_EXERCISE_ID)],
        }),
      ],
    });

    const runtime = createWorkoutRuntimeState(session);

    expect(runtime).toMatchObject({
      sessionId: SESSION_ID,
      status: 'running',
      currentSessionExerciseId: SECOND_SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      currentExerciseIndex: 1,
      completedSetCount: 1,
      totalTargetSetCount: 6,
    });
    expect(runtime.currentExercise?.exerciseNameSnapshot).toBe('哑铃肩推');
  });

  it('derives paused and completed runtime states', () => {
    expect(
      createWorkoutRuntimeState(buildInProgressSession(), 'paused'),
    ).toEqual(
      expect.objectContaining({ status: 'paused', restTimerStatus: 'paused' }),
    );
    expect(
      createWorkoutRuntimeState(buildCompletedSession(), 'running'),
    ).toEqual(
      expect.objectContaining({
        status: 'completed',
        restTimerStatus: 'running',
      }),
    );
  });

  it('creates an idle runtime snapshot for draft sessions', () => {
    const runtime = createWorkoutRuntimeSnapshot(buildDraftSession());

    expect(runtime).toMatchObject({
      sessionId: SESSION_ID,
      status: 'idle',
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 1,
      completedSetCount: 0,
      totalTargetSetCount: 3,
    });
  });

  it('loads the UI runtime snapshot from repositories', async () => {
    const result = await getWorkoutRuntimeState(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({
          findById: async () => buildInProgressSession(),
        }),
        restTimerRepository: buildRestTimerRepository({
          findBySessionId: async () => buildRestTimer({ status: 'paused' }),
        }),
      },
      SESSION_ID,
      NOW,
    );

    expect(result).toEqual({
      status: 'ready',
      runtime: expect.objectContaining({
        sessionId: SESSION_ID,
        status: 'paused',
        restTimerStatus: 'paused',
      }),
    });
  });

  it('loads runtime state from repositories for recovery', async () => {
    const session = buildInProgressSession({
      currentSessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 3,
    });
    const restTimer = buildRestTimer({ status: 'paused' });
    const result = await loadWorkoutRuntimeState(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({
          findById: async () => session,
        }),
        restTimerRepository: buildRestTimerRepository({
          findBySessionId: async () => restTimer,
        }),
      },
      SESSION_ID,
      NOW,
    );

    expect(result).toEqual({
      status: 'ready',
      runtime: expect.objectContaining({
        sessionId: SESSION_ID,
        status: 'paused',
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 3,
        restTimerStatus: 'paused',
      }),
    });
  });

  it('does not create runtime state for missing, draft, or cancelled sessions', async () => {
    await expect(
      loadWorkoutRuntimeState(
        {
          workoutSessionRepository: buildWorkoutSessionRepository({
            findById: async () => null,
          }),
          restTimerRepository: buildRestTimerRepository(),
        },
        SESSION_ID,
        NOW,
      ),
    ).resolves.toEqual({ status: 'not_found' });

    await expect(
      loadWorkoutRuntimeState(
        {
          workoutSessionRepository: buildWorkoutSessionRepository({
            findById: async () => buildDraftSession(),
          }),
          restTimerRepository: buildRestTimerRepository(),
        },
        SESSION_ID,
        NOW,
      ),
    ).resolves.toEqual({
      status: 'not_runtime_session',
      sessionStatus: 'draft',
    });

    await expect(
      loadWorkoutRuntimeState(
        {
          workoutSessionRepository: buildWorkoutSessionRepository({
            findById: async () => buildCancelledSession(),
          }),
          restTimerRepository: buildRestTimerRepository(),
        },
        SESSION_ID,
        NOW,
      ),
    ).resolves.toEqual({
      status: 'not_runtime_session',
      sessionStatus: 'cancelled',
    });
  });

  it('validates runtime status transitions', () => {
    expect(canTransitionWorkoutRuntimeStatus('running', 'paused')).toBe(true);
    expect(canTransitionWorkoutRuntimeStatus('paused', 'running')).toBe(true);
    expect(canTransitionWorkoutRuntimeStatus('running', 'completed')).toBe(
      true,
    );
    expect(canTransitionWorkoutRuntimeStatus('paused', 'completed')).toBe(true);
    expect(canTransitionWorkoutRuntimeStatus('completed', 'running')).toBe(
      false,
    );
    expect(() =>
      assertWorkoutRuntimeStatusTransition('completed', 'paused'),
    ).toThrow(WorkoutRuntimeTransitionError);
  });

  it('pauses and resumes through the runtime engine without changing position', () => {
    const runtime = createWorkoutRuntimeSnapshot(
      buildInProgressSession({
        currentSessionExerciseId: SECOND_SESSION_EXERCISE_ID,
        currentSetNumber: 2,
        sessionExercises: [
          buildExercise(),
          buildExercise({
            id: SECOND_SESSION_EXERCISE_ID,
            position: 2,
          }),
        ],
      }),
    );

    const paused = pauseWorkoutRuntime(runtime);
    const resumed = resumeWorkoutRuntime(paused);

    expect(paused).toEqual({
      ...runtime,
      status: 'paused',
    });
    expect(resumed).toEqual(runtime);
  });

  it.each(['running', 'paused'] as const)(
    'saves a %s runtime snapshot through the repository boundary',
    async (status) => {
      const repository = buildWorkoutRuntimeSnapshotRepository();
      const snapshot = {
        ...createWorkoutRuntimeSnapshot(buildInProgressSession()),
        status,
        updatedAt: NOW,
      };

      await saveRuntimeSnapshot(repository, snapshot);

      expect(repository.save).toHaveBeenCalledWith(snapshot);
      expect(repository.clear).not.toHaveBeenCalled();
    },
  );

  it('restores status while regenerating exercise, set and timer state', async () => {
    const session = buildInProgressSession({
      currentSessionExerciseId: SECOND_SESSION_EXERCISE_ID,
      currentSetNumber: 3,
      sessionExercises: [
        buildExercise(),
        buildExercise({
          id: SECOND_SESSION_EXERCISE_ID,
          position: 2,
          sets: [buildWorkoutSet(SECOND_SESSION_EXERCISE_ID)],
        }),
      ],
    });
    const storedSnapshot: WorkoutRuntimeSnapshot = {
      ...createWorkoutRuntimeSnapshot(session, 'running'),
      status: 'paused',
      updatedAt: NOW,
    };
    const repository = buildWorkoutRuntimeSnapshotRepository(storedSnapshot);

    const restored = await restoreRuntimeSnapshot(
      repository,
      session,
      'paused',
    );

    expect(restored).toMatchObject({
      status: 'paused',
      currentSessionExerciseId: SECOND_SESSION_EXERCISE_ID,
      currentSetNumber: 3,
      currentSet: 3,
      restTimerStatus: 'paused',
      updatedAt: NOW,
    });
  });

  it.each([
    buildDraftSession(),
    buildCancelledSession(),
    buildCompletedSession(),
  ])('does not restore a snapshot for a $status session', async (session) => {
    const snapshot: WorkoutRuntimeSnapshot = {
      ...createWorkoutRuntimeSnapshot(buildInProgressSession()),
      updatedAt: NOW,
    };
    const repository = buildWorkoutRuntimeSnapshotRepository(snapshot);

    await expect(
      restoreRuntimeSnapshot(repository, session),
    ).resolves.toBeNull();
    expect(repository.load).not.toHaveBeenCalled();
  });

  it('rejects a stale or mismatched persisted snapshot', async () => {
    const session = buildInProgressSession();
    const staleSnapshot: WorkoutRuntimeSnapshot = {
      ...createWorkoutRuntimeSnapshot(session),
      updatedAt: CREATED_AT,
    };
    const mismatchedSnapshot: WorkoutRuntimeSnapshot = {
      ...staleSnapshot,
      sessionId: 'session-other' as WorkoutSessionId,
      updatedAt: NOW,
    };

    await expect(
      restoreRuntimeSnapshot(
        buildWorkoutRuntimeSnapshotRepository(staleSnapshot),
        session,
      ),
    ).resolves.toBeNull();
    await expect(
      restoreRuntimeSnapshot(
        buildWorkoutRuntimeSnapshotRepository(mismatchedSnapshot),
        session,
      ),
    ).resolves.toBeNull();
  });

  it('rejects an invalid snapshot before restoring runtime state', async () => {
    const validSnapshot = createWorkoutRuntimeSnapshot(
      buildInProgressSession(),
    );
    const invalidSnapshot = {
      ...validSnapshot,
      currentExercise: { invalid: true },
    } as unknown as WorkoutRuntimeSnapshot;
    const repository = buildWorkoutRuntimeSnapshotRepository(invalidSnapshot);

    expect(isValidWorkoutRuntimeSnapshot(validSnapshot)).toBe(true);
    expect(isValidWorkoutRuntimeSnapshot(invalidSnapshot)).toBe(false);
    await expect(
      restoreRuntimeSnapshot(repository, buildInProgressSession()),
    ).resolves.toBeNull();
  });

  it('rejects inconsistent snapshot counters and current exercise indexes', () => {
    const snapshot = createWorkoutRuntimeSnapshot(buildInProgressSession());

    expect(
      isValidWorkoutRuntimeSnapshot({
        ...snapshot,
        completedSetCount: snapshot.completedSets + 1,
      }),
    ).toBe(false);
    expect(
      isValidWorkoutRuntimeSnapshot({
        ...snapshot,
        currentExerciseIndex: 10,
      }),
    ).toBe(false);
  });
});

function buildWorkoutRuntimeSnapshotRepository(
  initialSnapshot: WorkoutRuntimeSnapshot | null = null,
): WorkoutRuntimeSnapshotRepository & {
  readonly save: jest.Mock;
  readonly load: jest.Mock;
  readonly clear: jest.Mock;
} {
  let snapshot = initialSnapshot;

  return {
    save: jest.fn(async (next) => {
      snapshot = next;
      return { success: true as const };
    }),
    load: jest.fn(async () => snapshot),
    clear: jest.fn(async () => {
      snapshot = null;
    }),
  };
}

function buildWorkoutSessionRepository(
  overrides: Partial<WorkoutSessionRepository> = {},
): WorkoutSessionRepository {
  return {
    save: async (session) => session,
    findById: async () => buildInProgressSession(),
    findActiveSession: async () => null,
    findLatestSession: async () => null,
    listByStatuses: async () => [],
    findRecoverableSession: async () => null,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    update: async (session) => session,
    ...overrides,
  };
}

function buildRestTimerRepository(
  overrides: Partial<RestTimerRepository> = {},
): RestTimerRepository {
  return {
    findBySessionId: async () => null,
    startIfNoActiveTimer: async (input) => ({
      status: 'started',
      timer: input.timer,
    }),
    update: async (timer) => timer,
    completeIfExpired: async () => null,
    ...overrides,
  };
}

function buildDraftSession(): WorkoutSession {
  return {
    id: SESSION_ID,
    workoutNameSnapshot: 'Push',
    sessionExercises: [buildExercise()],
    status: 'draft',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function buildInProgressSession(
  overrides: Partial<Extract<WorkoutSession, { status: 'in_progress' }>> = {},
): Extract<WorkoutSession, { status: 'in_progress' }> {
  return {
    id: SESSION_ID,
    workoutNameSnapshot: 'Push',
    sessionExercises: [buildExercise()],
    status: 'in_progress',
    startedAt: STARTED_AT,
    createdAt: CREATED_AT,
    updatedAt: STARTED_AT,
    ...overrides,
  };
}

function buildCompletedSession(): Extract<
  WorkoutSession,
  { status: 'completed' }
> {
  return {
    ...buildInProgressSession(),
    status: 'completed',
    endedAt: ENDED_AT,
  };
}

function buildCancelledSession(): WorkoutSession {
  return {
    ...buildInProgressSession(),
    status: 'cancelled',
    endedAt: ENDED_AT,
  };
}

function buildExercise(
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

function buildWorkoutSet(sessionExerciseId: SessionExerciseId): WorkoutSet {
  return {
    id: 'set-1' as WorkoutSetId,
    sessionExerciseId,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: NOW,
  };
}

function buildRestTimer(overrides: Partial<RestTimer> = {}): RestTimer {
  return {
    id: 'rest-timer-1' as RestTimerId,
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    previousSetNumber: 2,
    nextSetNumber: 3,
    originalDurationSeconds: 90,
    startedAt: '2026-07-20T01:18:00.000Z',
    targetEndAt: '2026-07-20T01:19:30.000Z',
    pausedRemainingSeconds: 60,
    status: 'paused',
    createdAt: '2026-07-20T01:18:00.000Z',
    updatedAt: '2026-07-20T01:18:30.000Z',
    ...overrides,
  };
}
