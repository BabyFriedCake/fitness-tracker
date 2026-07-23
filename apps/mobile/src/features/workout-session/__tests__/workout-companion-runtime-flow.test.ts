/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import {
  type InProgressWorkoutSession,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSessionRepository,
  type WorkoutSessionId,
} from '@/domain/workout-session';
import {
  completeWorkoutCompanionExercise,
  onWorkoutCompanionRep,
} from '@/features/workout-session/application/workout-companion-runtime-flow';
import {
  createWorkoutCompanionRuntimeState,
  onWorkoutCompanionRepCompleted,
  pauseWorkoutCompanionRuntime,
  resumeWorkoutCompanionAfterRest,
  resumeWorkoutCompanionRuntime,
} from '@/features/workout-session/application/workout-runtime-engine';

const SESSION_ID = 'session-companion' as WorkoutSessionId;
const FIRST_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const SECOND_EXERCISE_ID = 'session-exercise-row' as SessionExerciseId;
const STARTED_AT = '2026-07-22T01:00:00.000Z';
const FIRST_SET_AT = '2026-07-22T01:05:00.000Z';
const SECOND_SET_AT = '2026-07-22T01:10:00.000Z';

describe('Workout Companion Runtime Flow', () => {
  it('emits only rep progress and a persistence request at the target', () => {
    const initial = createWorkoutCompanionRuntimeState(buildSession());
    const firstRep = onWorkoutCompanionRepCompleted(initial);
    const targetRep = onWorkoutCompanionRepCompleted(firstRep.runtime);

    expect(targetRep.event).toEqual(
      expect.objectContaining({ type: 'RepCompleted', repNumber: 2 }),
    );
    expect(targetRep.setCompletionRequest).toEqual({
      sessionId: SESSION_ID,
      sessionExerciseId: FIRST_EXERCISE_ID,
      actualReps: 2,
    });
    expect(targetRep).not.toHaveProperty('workoutSet');
    expect(targetRep).not.toHaveProperty('setCompletedEvent');
    expect(targetRep).not.toHaveProperty('exerciseCompletedEvent');
    expect(targetRep.runtime.phase).toBe('set_completion_pending');
  });

  it('tracks rep progress and does not persist before the target', async () => {
    const repository = createStatefulRepository(buildSession());
    const runtime = createWorkoutCompanionRuntimeState(repository.current());

    const result = await onWorkoutCompanionRep(repository, runtime, {
      weight: 82.5,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'set-1',
    });

    expect(result).toEqual({
      status: 'rep_completed',
      runtime: expect.objectContaining({
        phase: 'running',
        progress: expect.objectContaining({ completedReps: 1 }),
      }),
      events: [expect.objectContaining({ type: 'RepCompleted', repNumber: 1 })],
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('persists the real WorkoutSet before creating SetCompleted feedback', async () => {
    const repository = createStatefulRepository(buildSession());
    const initial = createWorkoutCompanionRuntimeState(repository.current());
    const firstRep = await onWorkoutCompanionRep(repository, initial, {
      weight: 82.5,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'unused',
    });

    const result = await onWorkoutCompanionRep(repository, firstRep.runtime, {
      weight: 82.5,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'set-1',
    });

    expect(result.status).toBe('set_completed');

    if (result.status !== 'set_completed') {
      throw new Error('Expected a persisted set result.');
    }

    expect(result.workoutSet).toEqual(
      expect.objectContaining({
        id: 'set-1',
        actualReps: 2,
        weight: 82.5,
        isCompleted: true,
      }),
    );
    expect(result.events).toEqual([
      expect.objectContaining({ type: 'RepCompleted', repNumber: 2 }),
      expect.objectContaining({
        type: 'SetCompleted',
        actualReps: result.workoutSet.actualReps,
        weight: result.workoutSet.weight,
      }),
    ]);
    expect(repository.current().sessionExercises[0].sets).toContainEqual(
      result.workoutSet,
    );
    expect(result.exerciseCompletionRequired).toBe(false);
    expect(result.runtime).toEqual(
      expect.objectContaining({
        phase: 'resting',
        progress: expect.objectContaining({
          currentSetIndex: 1,
          completedReps: 0,
        }),
      }),
    );
  });

  it('does not advance runtime or emit SetCompleted when persistence fails', async () => {
    const repository = createStatefulRepository(buildSession(), {
      update: jest.fn(async () => {
        throw new Error('write failed');
      }),
    });
    const initial = createWorkoutCompanionRuntimeState(repository.current());
    const firstRep = await onWorkoutCompanionRep(repository, initial, {
      weight: 70,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'unused',
    });

    await expect(
      onWorkoutCompanionRep(repository, firstRep.runtime, {
        weight: 70,
        completedAt: FIRST_SET_AT,
        createWorkoutSetId: () => 'set-failed',
      }),
    ).rejects.toThrow('write failed');
    expect(repository.current().sessionExercises[0].sets).toHaveLength(0);
    expect(firstRep.runtime.progress).toEqual(
      expect.objectContaining({ currentSetIndex: 0, completedReps: 1 }),
    );

    const retryRepository = createStatefulRepository(repository.current());
    const retry = await onWorkoutCompanionRep(
      retryRepository,
      firstRep.runtime,
      {
        weight: 70,
        completedAt: FIRST_SET_AT,
        createWorkoutSetId: () => 'set-retry',
      },
    );

    expect(retry.status).toBe('set_completed');
  });

  it('persists and emits SetCompleted only once for concurrent target reps', async () => {
    const repository = createStatefulRepository(buildSession());
    const initial = createWorkoutCompanionRuntimeState(repository.current());
    const firstRep = await onWorkoutCompanionRep(repository, initial, {
      weight: 80,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'unused',
    });

    const results = await Promise.all([
      onWorkoutCompanionRep(repository, firstRep.runtime, {
        weight: 80,
        completedAt: FIRST_SET_AT,
        createWorkoutSetId: () => 'set-concurrent-1',
      }),
      onWorkoutCompanionRep(repository, firstRep.runtime, {
        weight: 80,
        completedAt: FIRST_SET_AT,
        createWorkoutSetId: () => 'set-concurrent-2',
      }),
    ]);

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.status).sort()).toEqual([
      'ignored',
      'set_completed',
    ]);
    expect(
      results
        .flatMap((result) => result.events)
        .filter((event) => event.type === 'SetCompleted'),
    ).toHaveLength(1);
    expect(repository.current().sessionExercises[0].sets).toHaveLength(1);
  });

  it('ignores different per-call guards and uses the Runtime instance guard', async () => {
    const repository = createStatefulRepository(buildSession());
    const initial = createWorkoutCompanionRuntimeState(repository.current());
    const firstRep = await onWorkoutCompanionRep(repository, initial, {
      weight: 80,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'unused',
    });
    const injectedGuardA = {
      tryBegin: jest.fn(() => true),
      finish: jest.fn(),
    };
    const injectedGuardB = {
      tryBegin: jest.fn(() => true),
      finish: jest.fn(),
    };
    const optionsA = {
      weight: 80,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'set-injected-1',
      setCompletionGuard: injectedGuardA,
    };
    const optionsB = {
      weight: 80,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'set-injected-2',
      setCompletionGuard: injectedGuardB,
    };

    const results = await Promise.all([
      onWorkoutCompanionRep(repository, firstRep.runtime, optionsA),
      onWorkoutCompanionRep(repository, firstRep.runtime, optionsB),
    ]);

    expect(injectedGuardA.tryBegin).not.toHaveBeenCalled();
    expect(injectedGuardB.tryBegin).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(
      results
        .flatMap((result) => result.events)
        .filter((event) => event.type === 'SetCompleted'),
    ).toHaveLength(1);
  });

  it('pauses and resumes without changing companion progress', async () => {
    const repository = createStatefulRepository(buildSession());
    const runtime = createWorkoutCompanionRuntimeState(repository.current());
    const rep = await onWorkoutCompanionRep(repository, runtime, {
      weight: 80,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'unused',
    });
    const paused = pauseWorkoutCompanionRuntime(rep.runtime);

    const ignored = await onWorkoutCompanionRep(repository, paused, {
      weight: 80,
      completedAt: FIRST_SET_AT,
      createWorkoutSetId: () => 'unused',
    });
    const resumed = resumeWorkoutCompanionRuntime(paused);

    expect(ignored.status).toBe('ignored');
    expect(ignored.runtime.progress).toEqual(rep.runtime.progress);
    expect(resumed.progress).toEqual(rep.runtime.progress);
    expect(resumed.phase).toBe('running');
    expect(resumed.progress.sessionId).toBe(SESSION_ID);
  });

  it('advances only after persisted sets and persisted exercise completion', async () => {
    const repository = createStatefulRepository(buildSession());
    let runtime = createWorkoutCompanionRuntimeState(repository.current());

    runtime = await completeSet(repository, runtime, 'set-1', FIRST_SET_AT);
    runtime = resumeWorkoutCompanionAfterRest(runtime);
    runtime = await completeSet(repository, runtime, 'set-2', SECOND_SET_AT);

    expect(runtime.progress.currentExerciseIndex).toBe(0);
    expect(runtime.phase).toBe('exercise_completion_pending');
    expect(resumeWorkoutCompanionAfterRest(runtime)).toBe(runtime);
    expect(repository.current().sessionExercises[0].isCompleted).toBe(false);

    const ignoredRep = await onWorkoutCompanionRep(repository, runtime, {
      weight: 80,
      completedAt: SECOND_SET_AT,
      createWorkoutSetId: () => 'set-extra',
    });

    expect(ignoredRep.status).toBe('ignored');
    expect(repository.current().sessionExercises[0].sets).toHaveLength(2);

    const completed = await completeWorkoutCompanionExercise(
      repository,
      runtime,
      SECOND_SET_AT,
    );

    expect(completed.event).toEqual(
      expect.objectContaining({
        type: 'ExerciseCompleted',
        completedSetCount: 2,
      }),
    );
    expect(completed.session.sessionExercises[0].isCompleted).toBe(true);
    expect(completed.runtime).toEqual(
      expect.objectContaining({
        phase: 'running',
        progress: {
          sessionId: SESSION_ID,
          currentExerciseIndex: 1,
          currentSetIndex: 0,
          completedReps: 0,
        },
      }),
    );
  });
});

async function completeSet(
  repository: ReturnType<typeof createStatefulRepository>,
  initialRuntime: ReturnType<typeof createWorkoutCompanionRuntimeState>,
  workoutSetId: string,
  completedAt: string,
): Promise<ReturnType<typeof createWorkoutCompanionRuntimeState>> {
  const firstRep = await onWorkoutCompanionRep(repository, initialRuntime, {
    weight: 80,
    completedAt,
    createWorkoutSetId: () => 'unused',
  });
  const completed = await onWorkoutCompanionRep(repository, firstRep.runtime, {
    weight: 80,
    completedAt,
    createWorkoutSetId: () => workoutSetId,
  });

  if (completed.status !== 'set_completed') {
    throw new Error('Expected set completion.');
  }

  return completed.runtime;
}

function buildSession(): InProgressWorkoutSession {
  return {
    id: SESSION_ID,
    workoutNameSnapshot: 'Push',
    status: 'in_progress',
    currentSessionExerciseId: FIRST_EXERCISE_ID,
    currentSetNumber: 1,
    sessionExercises: [
      buildExercise(),
      buildExercise({
        id: SECOND_EXERCISE_ID,
        sourceExerciseId: 'exercise-row' as ExerciseId,
        exerciseNameSnapshot: '杠铃划船',
        position: 2,
      }),
    ],
    startedAt: STARTED_AT,
    createdAt: STARTED_AT,
    updatedAt: STARTED_AT,
  };
}

function buildExercise(
  overrides: Partial<SessionExercise> = {},
): SessionExercise {
  return {
    id: FIRST_EXERCISE_ID,
    sessionId: SESSION_ID,
    sourceExerciseId: 'exercise-bench' as ExerciseId,
    exerciseNameSnapshot: '杠铃卧推',
    position: 1,
    isEnabled: true,
    isSkipped: false,
    isCompleted: false,
    targetSets: 2,
    targetRepsMin: 2,
    targetRepsMax: 4,
    currentRestSeconds: 90,
    sets: [],
    ...overrides,
  };
}

function createStatefulRepository(
  initialSession: InProgressWorkoutSession,
  overrides: Partial<WorkoutSessionRepository> = {},
): WorkoutSessionRepository & {
  readonly current: () => InProgressWorkoutSession;
} {
  let session = initialSession;
  const update = jest.fn(async (nextSession) => {
    session = nextSession as InProgressWorkoutSession;
    return nextSession;
  });

  return {
    save: async (nextSession) => nextSession,
    findById: async () => session,
    findActiveSession: async () => session,
    findLatestSession: async () => session,
    listByStatuses: async () => [session],
    findRecoverableSession: async () => session,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    update,
    current: () => session,
    ...overrides,
  };
}
