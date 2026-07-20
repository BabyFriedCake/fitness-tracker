/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import {
  type CancelledWorkoutSession,
  type CompletedWorkoutSession,
  type DraftWorkoutSession,
  type InProgressWorkoutSession,
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
  type WorkoutSet,
  type WorkoutSetId,
} from '@/domain/workout-session';
import {
  InvalidGeneratedWorkoutSetIdError,
  InvalidWorkoutSetInputError,
  SessionExerciseNotFoundError,
  WorkoutSessionExecutionStatusError,
  completeSessionExercise,
  recordWorkoutSet,
  resumeSessionExercise,
  skipSessionExercise,
} from '@/features/workout-session/application/workout-session-execution';
import { WorkoutSessionApplicationNotFoundError } from '@/features/workout-session/application/workout-session-flow';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const STARTED_AT = '2026-07-17T01:00:00.000Z';
const FIRST_SET_COMPLETED_AT = '2026-07-17T01:10:00.000Z';
const SECOND_SET_COMPLETED_AT = '2026-07-17T01:20:00.000Z';
const UPDATED_AT = '2026-07-17T01:30:00.000Z';
const ENDED_AT = '2026-07-17T02:00:00.000Z';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const OTHER_SESSION_EXERCISE_ID = 'session-exercise-row' as SessionExerciseId;
const FIRST_SET_ID = 'set-bench-1' as WorkoutSetId;
const SECOND_SET_ID = 'set-bench-2' as WorkoutSetId;

describe('WorkoutSession execution flow', () => {
  it('appends the first completed WorkoutSet and persists the full aggregate', async () => {
    const active = buildInProgressSession();
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({
      findById: async () => active,
      update,
    });

    const next = await recordWorkoutSet(
      repository,
      buildRecordInput(),
      buildRecordOptions(FIRST_SET_ID),
    );

    const workoutSet = next.sessionExercises[0]?.sets[0];
    expect(workoutSet).toEqual({
      id: FIRST_SET_ID,
      sessionExerciseId: SESSION_EXERCISE_ID,
      setNumber: 1,
      setType: 'normal',
      actualReps: 10,
      weight: 80,
      isCompleted: true,
      isExtraSet: false,
      completedAt: FIRST_SET_COMPLETED_AT,
    });
    expect(workoutSet).not.toHaveProperty('targetReps');
    expect(active.sessionExercises[0]?.sets).toEqual([]);
    expect(next.updatedAt).toBe(FIRST_SET_COMPLETED_AT);
    expect(next.currentSessionExerciseId).toBe(SESSION_EXERCISE_ID);
    expect(next.currentSetNumber).toBe(2);
    expect(update).toHaveBeenCalledWith(next);
  });

  it('increments from the maximum set number and preserves existing facts', async () => {
    const existingSets = [
      buildWorkoutSet({ id: FIRST_SET_ID, setNumber: 1 }),
      buildWorkoutSet({ id: SECOND_SET_ID, setNumber: 3 }),
    ];
    const active = buildInProgressSession({
      sessionExercises: [buildSessionExercise({ sets: existingSets })],
    });
    const repository = buildRepository({ findById: async () => active });

    const next = await recordWorkoutSet(
      repository,
      buildRecordInput({ completedAt: SECOND_SET_COMPLETED_AT }),
      buildRecordOptions('set-bench-4'),
    );
    const nextSets = next.sessionExercises[0]?.sets;

    expect(nextSets?.map((workoutSet) => workoutSet.setNumber)).toEqual([
      1, 3, 4,
    ]);
    expect(nextSets?.slice(0, 2)).toEqual(existingSets);
    expect(nextSets?.[0]).toBe(existingSets[0]);
    expect(nextSets?.[1]).toBe(existingSets[1]);
    expect(next.currentSessionExerciseId).toBe(SESSION_EXERCISE_ID);
    expect(next.currentSetNumber).toBe(5);
  });

  it('marks a set beyond targetSets as an extra set', async () => {
    const active = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({
          targetSets: 1,
          sets: [buildWorkoutSet()],
        }),
      ],
    });
    const repository = buildRepository({ findById: async () => active });

    const next = await recordWorkoutSet(
      repository,
      buildRecordInput({ completedAt: SECOND_SET_COMPLETED_AT }),
      buildRecordOptions(SECOND_SET_ID),
    );

    expect(next.sessionExercises[0]?.sets[1]).toEqual(
      expect.objectContaining({ setNumber: 2, isExtraSet: true }),
    );
  });

  it.each([-1, 1.5, Number.NaN])(
    'rejects invalid actualReps %p without updating',
    async (actualReps) => {
      const update = jest.fn(async (session: WorkoutSession) => session);
      const repository = buildRepository({ update });

      await expect(
        recordWorkoutSet(
          repository,
          buildRecordInput({ actualReps }),
          buildRecordOptions(FIRST_SET_ID),
        ),
      ).rejects.toMatchObject({
        name: InvalidWorkoutSetInputError.name,
        field: 'actualReps',
      });
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid weight %p without updating',
    async (weight) => {
      const update = jest.fn(async (session: WorkoutSession) => session);
      const repository = buildRepository({ update });

      await expect(
        recordWorkoutSet(
          repository,
          buildRecordInput({ weight }),
          buildRecordOptions(FIRST_SET_ID),
        ),
      ).rejects.toMatchObject({
        name: InvalidWorkoutSetInputError.name,
        field: 'weight',
      });
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each(['invalid', '2026-07-17T00:59:59.999Z'])(
    'rejects completedAt %s when it is invalid or before start',
    async (completedAt) => {
      const update = jest.fn(async (session: WorkoutSession) => session);
      const repository = buildRepository({
        findById: async () => buildInProgressSession(),
        update,
      });

      await expect(
        recordWorkoutSet(
          repository,
          buildRecordInput({ completedAt }),
          buildRecordOptions(FIRST_SET_ID),
        ),
      ).rejects.toMatchObject({
        name: InvalidWorkoutSetInputError.name,
        field: 'completedAt',
      });
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    buildDraftSession(),
    buildCompletedSession(),
    buildCancelledSession(),
  ])('rejects execution for a $status session', async (session) => {
    const update = jest.fn(async (next: WorkoutSession) => next);
    const repository = buildRepository({
      findById: async () => session,
      update,
    });

    await expect(
      recordWorkoutSet(
        repository,
        buildRecordInput(),
        buildRecordOptions(FIRST_SET_ID),
      ),
    ).rejects.toMatchObject({
      name: WorkoutSessionExecutionStatusError.name,
      status: session.status,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a missing SessionExercise without updating', async () => {
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({
      findById: async () => buildInProgressSession(),
      update,
    });

    await expect(
      recordWorkoutSet(
        repository,
        buildRecordInput({ sessionExerciseId: OTHER_SESSION_EXERCISE_ID }),
        buildRecordOptions(FIRST_SET_ID),
      ),
    ).rejects.toBeInstanceOf(SessionExerciseNotFoundError);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['', FIRST_SET_ID])(
    'rejects an invalid generated WorkoutSet ID %p',
    async (workoutSetId) => {
      const active = buildInProgressSession({
        sessionExercises: [buildSessionExercise({ sets: [buildWorkoutSet()] })],
      });
      const update = jest.fn(async (session: WorkoutSession) => session);
      const repository = buildRepository({
        findById: async () => active,
        update,
      });

      await expect(
        recordWorkoutSet(
          repository,
          buildRecordInput({ completedAt: SECOND_SET_COMPLETED_AT }),
          buildRecordOptions(workoutSetId),
        ),
      ).rejects.toBeInstanceOf(InvalidGeneratedWorkoutSetIdError);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('skips an exercise while preserving its completed sets', async () => {
    const existingSet = buildWorkoutSet();
    const active = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({ isCompleted: true, sets: [existingSet] }),
      ],
    });
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({
      findById: async () => active,
      update,
    });

    const next = await skipSessionExercise(
      repository,
      buildExerciseExecutionInput(),
      buildExecutionOptions(),
    );

    expect(next.sessionExercises[0]).toEqual(
      expect.objectContaining({ isSkipped: true, isCompleted: false }),
    );
    expect(next.sessionExercises[0]?.sets[0]).toBe(existingSet);
    expect(update).toHaveBeenCalledWith(next);
  });

  it('resumes a skipped exercise without changing completion or set facts', async () => {
    const existingSet = buildWorkoutSet();
    const active = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({
          isSkipped: true,
          isCompleted: false,
          sets: [existingSet],
        }),
      ],
    });
    const repository = buildRepository({ findById: async () => active });

    const next = await resumeSessionExercise(
      repository,
      buildExerciseExecutionInput(),
      buildExecutionOptions(),
    );

    expect(next.sessionExercises[0]).toEqual(
      expect.objectContaining({ isSkipped: false, isCompleted: false }),
    );
    expect(next.sessionExercises[0]?.sets[0]).toBe(existingSet);
  });

  it('completes an exercise early without creating or changing WorkoutSets', async () => {
    const existingSet = buildWorkoutSet();
    const active = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({ isSkipped: true, sets: [existingSet] }),
      ],
    });
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({
      findById: async () => active,
      update,
    });

    const next = await completeSessionExercise(
      repository,
      buildExerciseExecutionInput(),
      buildExecutionOptions(),
    );

    expect(next.sessionExercises[0]).toEqual(
      expect.objectContaining({
        isSkipped: false,
        isCompleted: true,
      }),
    );
    expect(next.sessionExercises[0]?.sets).toHaveLength(1);
    expect(next.sessionExercises[0]?.sets[0]).toBe(existingSet);
    expect(update).toHaveBeenCalledWith(next);
  });

  it.each([
    ['skip', skipSessionExercise],
    ['resume', resumeSessionExercise],
    ['complete', completeSessionExercise],
  ] as const)(
    'rejects %s for a non-in-progress session',
    async (_name, operation) => {
      const update = jest.fn(async (session: WorkoutSession) => session);
      const repository = buildRepository({
        findById: async () => buildCompletedSession(),
        update,
      });

      await expect(
        operation(
          repository,
          buildExerciseExecutionInput(),
          buildExecutionOptions(),
        ),
      ).rejects.toBeInstanceOf(WorkoutSessionExecutionStatusError);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('rejects a missing WorkoutSession with an application error', async () => {
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({ update });

    await expect(
      skipSessionExercise(
        repository,
        buildExerciseExecutionInput(),
        buildExecutionOptions(),
      ),
    ).rejects.toBeInstanceOf(WorkoutSessionApplicationNotFoundError);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an exercise whose parent reference does not match the session', async () => {
    const active = buildInProgressSession({
      sessionExercises: [
        buildSessionExercise({
          sessionId: 'different-session' as WorkoutSessionId,
        }),
      ],
    });
    const repository = buildRepository({ findById: async () => active });

    await expect(
      completeSessionExercise(
        repository,
        buildExerciseExecutionInput(),
        buildExecutionOptions(),
      ),
    ).rejects.toBeInstanceOf(SessionExerciseNotFoundError);
  });
});

function buildRecordInput(
  overrides: Partial<Parameters<typeof recordWorkoutSet>[1]> = {},
): Parameters<typeof recordWorkoutSet>[1] {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    actualReps: 10,
    weight: 80,
    completedAt: FIRST_SET_COMPLETED_AT,
    ...overrides,
  };
}

function buildExerciseExecutionInput(): Parameters<
  typeof skipSessionExercise
>[1] {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
  };
}

function buildRecordOptions(
  workoutSetId: string,
): Parameters<typeof recordWorkoutSet>[2] {
  return { createWorkoutSetId: () => workoutSetId };
}

function buildExecutionOptions(): Parameters<typeof skipSessionExercise>[2] {
  return { now: () => UPDATED_AT };
}

function buildInProgressSession(
  overrides: Partial<InProgressWorkoutSession> = {},
): InProgressWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: undefined,
    workoutNameSnapshot: 'Push',
    status: 'in_progress',
    sessionExercises: [buildSessionExercise()],
    dailyStatus: 'normal',
    notes: '训练中',
    startedAt: STARTED_AT,
    createdAt: CREATED_AT,
    updatedAt: STARTED_AT,
    ...overrides,
  };
}

function buildDraftSession(): DraftWorkoutSession {
  const active = buildInProgressSession();

  return {
    ...active,
    status: 'draft',
    startedAt: undefined,
    updatedAt: CREATED_AT,
  };
}

function buildCompletedSession(): CompletedWorkoutSession {
  return {
    ...buildInProgressSession(),
    status: 'completed',
    endedAt: ENDED_AT,
    updatedAt: ENDED_AT,
  };
}

function buildCancelledSession(): CancelledWorkoutSession {
  return {
    ...buildInProgressSession(),
    status: 'cancelled',
    endedAt: ENDED_AT,
    updatedAt: ENDED_AT,
  };
}

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
    id: FIRST_SET_ID,
    sessionExerciseId: SESSION_EXERCISE_ID,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: FIRST_SET_COMPLETED_AT,
    ...overrides,
  };
}

function buildRepository(
  overrides: Partial<WorkoutSessionRepository> = {},
): WorkoutSessionRepository {
  return {
    save: async (session) => session,
    findById: async () => null,
    findActiveSession: async () => null,
    findLatestSession: async () => null,
    listByStatuses: async () => [],
    findRecoverableSession: async () => null,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    update: async (session) => session,
    ...overrides,
  };
}
