/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import {
  type InProgressWorkoutSession,
  type RestTimer,
  type RestTimerId,
  type RestTimerRepository,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
} from '@/domain/workout-session';
import {
  ActiveRestTimerExistsError,
  InvalidCurrentSetNumberError,
  InvalidGeneratedRestTimerIdError,
  InvalidRestTimerAdditionalSecondsError,
  InvalidRestTimerDurationError,
  InvalidRestTimerTimestampError,
  RestTimerOperationStatusError,
  cancelRestTimer,
  completeRestTimer,
  extendRestTimer,
  getRestTimerState,
  pauseRestTimer,
  resumeRestTimer,
  setCurrentSessionPosition,
  skipRestTimer,
  startRestTimer,
} from '@/features/workout-session/application/workout-session-rest-timer';
import {
  SessionExerciseNotFoundError,
  WorkoutSessionExecutionStatusError,
} from '@/features/workout-session/application/workout-session-execution';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const SESSION_STARTED_AT = '2026-07-17T01:00:00.000Z';
const TIMER_STARTED_AT = '2026-07-17T01:10:00.000Z';
const PAUSED_AT = '2026-07-17T01:10:30.000Z';
const RESUMED_AT = '2026-07-17T01:11:00.000Z';
const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;

describe('WorkoutSession current position flow', () => {
  it('persists position without creating or changing WorkoutSet facts', async () => {
    const session = buildSession();
    const existingSet = session.sessionExercises[0]!.sets[0]!;
    const update = jest.fn(async (next: WorkoutSession) => next);
    const repository = buildWorkoutSessionRepository({
      findById: async () => session,
      update,
    });

    const next = await setCurrentSessionPosition(repository, {
      sessionId: SESSION_ID,
      sessionExerciseId: SESSION_EXERCISE_ID,
      currentSetNumber: 2,
      updatedAt: TIMER_STARTED_AT,
    });

    expect(next).toEqual(
      expect.objectContaining({
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 2,
        updatedAt: TIMER_STARTED_AT,
      }),
    );
    expect(next.sessionExercises[0]?.sets[0]).toBe(existingSet);
    expect(update).toHaveBeenCalledWith(next);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid current set number %p',
    async (currentSetNumber) => {
      await expect(
        setCurrentSessionPosition(buildWorkoutSessionRepository(), {
          sessionId: SESSION_ID,
          sessionExerciseId: SESSION_EXERCISE_ID,
          currentSetNumber,
          updatedAt: TIMER_STARTED_AT,
        }),
      ).rejects.toBeInstanceOf(InvalidCurrentSetNumberError);
    },
  );

  it('rejects non-active sessions and unrelated exercises', async () => {
    await expect(
      setCurrentSessionPosition(
        buildWorkoutSessionRepository({
          findById: async () => ({
            ...buildSession(),
            status: 'completed',
            endedAt: TIMER_STARTED_AT,
          }),
        }),
        buildPositionInput(),
      ),
    ).rejects.toBeInstanceOf(WorkoutSessionExecutionStatusError);
    await expect(
      setCurrentSessionPosition(
        buildWorkoutSessionRepository({ findById: async () => buildSession() }),
        {
          ...buildPositionInput(),
          sessionExerciseId: 'session-exercise-other' as SessionExerciseId,
        },
      ),
    ).rejects.toBeInstanceOf(SessionExerciseNotFoundError);
  });
});

describe('RestTimer application flow', () => {
  it('starts a running timer and supplies the next session position atomically', async () => {
    const startIfNoActiveTimer = jest.fn(async (input) => ({
      status: 'started' as const,
      timer: input.timer,
    }));
    const restTimerRepository = buildRestTimerRepository({
      startIfNoActiveTimer,
    });

    const timer = await startRestTimer(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({
          findById: async () => buildSession(),
        }),
        restTimerRepository,
      },
      buildStartInput(),
      { createRestTimerId: () => 'rest-timer-1' },
    );

    expect(timer).toEqual(
      expect.objectContaining({
        id: 'rest-timer-1',
        status: 'running',
        originalDurationSeconds: 90,
        targetEndAt: '2026-07-17T01:11:30.000Z',
      }),
    );
    expect(startIfNoActiveTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        currentSessionExerciseId: SESSION_EXERCISE_ID,
        currentSetNumber: 2,
        expectedSessionUpdatedAt: SESSION_STARTED_AT,
        sessionUpdatedAt: TIMER_STARTED_AT,
      }),
    );
  });

  it('maps an active timer persistence result to a clear error', async () => {
    const activeTimer = buildTimer();
    const repositories = {
      workoutSessionRepository: buildWorkoutSessionRepository({
        findById: async () => buildSession(),
      }),
      restTimerRepository: buildRestTimerRepository({
        startIfNoActiveTimer: async () => ({
          status: 'active_timer_exists',
          activeTimer,
        }),
      }),
    };

    await expect(
      startRestTimer(repositories, buildStartInput(), {
        createRestTimerId: () => 'rest-timer-2',
      }),
    ).rejects.toMatchObject({
      name: ActiveRestTimerExistsError.name,
      activeTimer,
    });
  });

  it.each([-1, 1.5, Number.NaN])(
    'rejects invalid duration %p before persistence',
    async (durationSeconds) => {
      await expect(
        startRestTimer(
          {
            workoutSessionRepository: buildWorkoutSessionRepository(),
            restTimerRepository: buildRestTimerRepository(),
          },
          buildStartInput({ durationSeconds }),
          { createRestTimerId: () => 'rest-timer-1' },
        ),
      ).rejects.toBeInstanceOf(InvalidRestTimerDurationError);
    },
  );

  it('rejects invalid timestamps and generated IDs', async () => {
    const repositories = {
      workoutSessionRepository: buildWorkoutSessionRepository({
        findById: async () => buildSession(),
      }),
      restTimerRepository: buildRestTimerRepository(),
    };

    await expect(
      startRestTimer(repositories, buildStartInput({ startedAt: 'invalid' }), {
        createRestTimerId: () => 'rest-timer-1',
      }),
    ).rejects.toBeInstanceOf(InvalidRestTimerTimestampError);
    await expect(
      startRestTimer(
        repositories,
        buildStartInput({ startedAt: '2026-07-17 01:10:00' }),
        { createRestTimerId: () => 'rest-timer-1' },
      ),
    ).rejects.toBeInstanceOf(InvalidRestTimerTimestampError);
    await expect(
      startRestTimer(
        repositories,
        buildStartInput({ durationSeconds: Number.MAX_SAFE_INTEGER }),
        { createRestTimerId: () => 'rest-timer-1' },
      ),
    ).rejects.toBeInstanceOf(InvalidRestTimerTimestampError);
    await expect(
      startRestTimer(repositories, buildStartInput(), {
        createRestTimerId: () => '',
      }),
    ).rejects.toBeInstanceOf(InvalidGeneratedRestTimerIdError);
  });

  it('pauses, resumes, and extends running and paused timers', async () => {
    const runningRepository = createStatefulRestTimerRepository(buildTimer());
    const paused = await pauseRestTimer(runningRepository, {
      sessionId: SESSION_ID,
      now: PAUSED_AT,
    });
    expect(paused).toEqual(
      expect.objectContaining({
        status: 'paused',
        pausedRemainingSeconds: 60,
      }),
    );

    const extendedPaused = await extendRestTimer(runningRepository, {
      sessionId: SESSION_ID,
      additionalSeconds: 30,
      now: '2026-07-17T01:10:40.000Z',
    });
    expect(extendedPaused.pausedRemainingSeconds).toBe(90);

    const resumed = await resumeRestTimer(runningRepository, {
      sessionId: SESSION_ID,
      now: RESUMED_AT,
    });
    expect(resumed).toEqual(
      expect.objectContaining({
        status: 'running',
        targetEndAt: '2026-07-17T01:12:30.000Z',
      }),
    );
    expect(resumed.pausedRemainingSeconds).toBeUndefined();

    const extendedRunning = await extendRestTimer(runningRepository, {
      sessionId: SESSION_ID,
      additionalSeconds: 15,
      now: '2026-07-17T01:11:10.000Z',
    });
    expect(extendedRunning.targetEndAt).toBe('2026-07-17T01:12:45.000Z');
    expect(extendedRunning.originalDurationSeconds).toBe(90);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid extension %p',
    async (additionalSeconds) => {
      await expect(
        extendRestTimer(createStatefulRestTimerRepository(buildTimer()), {
          sessionId: SESSION_ID,
          additionalSeconds,
          now: PAUSED_AT,
        }),
      ).rejects.toBeInstanceOf(InvalidRestTimerAdditionalSecondsError);
    },
  );

  it('persists completed, skipped, and cancelled terminal states', async () => {
    await expect(
      completeRestTimer(createStatefulRestTimerRepository(buildTimer()), {
        sessionId: SESSION_ID,
        now: PAUSED_AT,
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'completed' }));
    await expect(
      skipRestTimer(createStatefulRestTimerRepository(buildTimer()), {
        sessionId: SESSION_ID,
        now: PAUSED_AT,
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'skipped' }));
    await expect(
      cancelRestTimer(
        createStatefulRestTimerRepository({
          ...buildTimer(),
          status: 'paused',
          pausedRemainingSeconds: 60,
        }),
        { sessionId: SESSION_ID, now: PAUSED_AT },
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'cancelled' }));
  });

  it('rejects terminal resume and extension operations', async () => {
    const terminal = { ...buildTimer(), status: 'completed' as const };

    await expect(
      resumeRestTimer(createStatefulRestTimerRepository(terminal), {
        sessionId: SESSION_ID,
        now: RESUMED_AT,
      }),
    ).rejects.toBeInstanceOf(RestTimerOperationStatusError);
    await expect(
      extendRestTimer(createStatefulRestTimerRepository(terminal), {
        sessionId: SESSION_ID,
        additionalSeconds: 30,
        now: RESUMED_AT,
      }),
    ).rejects.toBeInstanceOf(RestTimerOperationStatusError);
  });

  it('recovers running, paused, expired, terminal, and missing states', async () => {
    await expect(
      getRestTimerState(createStatefulRestTimerRepository(buildTimer()), {
        sessionId: SESSION_ID,
        now: PAUSED_AT,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'running', remainingSeconds: 60 }),
    );
    await expect(
      getRestTimerState(
        createStatefulRestTimerRepository({
          ...buildTimer(),
          status: 'paused',
          pausedRemainingSeconds: 42,
        }),
        { sessionId: SESSION_ID, now: RESUMED_AT },
      ),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'paused', remainingSeconds: 42 }),
    );
    await expect(
      getRestTimerState(createStatefulRestTimerRepository(buildTimer()), {
        sessionId: SESSION_ID,
        now: '2026-07-17T01:12:00.000Z',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'completed', remainingSeconds: 0 }),
    );
    await expect(
      getRestTimerState(buildRestTimerRepository(), {
        sessionId: SESSION_ID,
        now: RESUMED_AT,
      }),
    ).resolves.toEqual({ status: 'not_found' });
  });
});

function buildPositionInput(): Parameters<typeof setCurrentSessionPosition>[1] {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    currentSetNumber: 2,
    updatedAt: TIMER_STARTED_AT,
  };
}

function buildStartInput(
  overrides: Partial<Parameters<typeof startRestTimer>[1]> = {},
): Parameters<typeof startRestTimer>[1] {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    durationSeconds: 90,
    startedAt: TIMER_STARTED_AT,
    previousSetNumber: 1,
    nextSetNumber: 2,
    ...overrides,
  };
}

function buildSession(): InProgressWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: 'Push',
    status: 'in_progress',
    sessionExercises: [
      {
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
        sets: [
          {
            id: 'set-1' as never,
            sessionExerciseId: SESSION_EXERCISE_ID,
            setNumber: 1,
            setType: 'normal',
            actualReps: 10,
            weight: 80,
            isCompleted: true,
            isExtraSet: false,
            completedAt: TIMER_STARTED_AT,
          },
        ],
      },
    ],
    startedAt: SESSION_STARTED_AT,
    createdAt: CREATED_AT,
    updatedAt: SESSION_STARTED_AT,
  };
}

function buildTimer(overrides: Partial<RestTimer> = {}): RestTimer {
  return {
    id: 'rest-timer-1' as RestTimerId,
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    previousSetNumber: 1,
    nextSetNumber: 2,
    originalDurationSeconds: 90,
    startedAt: TIMER_STARTED_AT,
    targetEndAt: '2026-07-17T01:11:30.000Z',
    status: 'running',
    createdAt: TIMER_STARTED_AT,
    updatedAt: TIMER_STARTED_AT,
    ...overrides,
  };
}

function buildWorkoutSessionRepository(
  overrides: Partial<WorkoutSessionRepository> = {},
): WorkoutSessionRepository {
  return {
    save: async (session) => session,
    findById: async () => null,
    findActiveSession: async () => null,
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

function createStatefulRestTimerRepository(
  initialTimer: RestTimer,
): RestTimerRepository {
  let current: RestTimer | null = initialTimer;

  return {
    findBySessionId: async () => current,
    startIfNoActiveTimer: async (input) => {
      if (current?.status === 'running' || current?.status === 'paused') {
        return { status: 'active_timer_exists', activeTimer: current };
      }

      current = input.timer;
      return { status: 'started', timer: input.timer };
    },
    update: async (timer, expectedStatus, expectedUpdatedAt) => {
      if (
        !current ||
        current.status !== expectedStatus ||
        current.updatedAt !== expectedUpdatedAt
      ) {
        return null;
      }

      current = timer;
      return timer;
    },
    completeIfExpired: async (_sessionId, now) => {
      if (
        !current ||
        current.status !== 'running' ||
        !current.targetEndAt ||
        current.targetEndAt > now
      ) {
        return null;
      }

      current = { ...current, status: 'completed', updatedAt: now };
      return current;
    },
  };
}
