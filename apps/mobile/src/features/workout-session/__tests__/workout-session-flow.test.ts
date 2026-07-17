/// <reference types="jest" />

import type { ExerciseId } from '@/domain/exercise';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import {
  WorkoutSessionTransitionError,
  type CompletedWorkoutSession,
  type DraftWorkoutSession,
  type InProgressWorkoutSession,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
  type WorkoutSetId,
} from '@/domain/workout-session';
import {
  ActiveWorkoutSessionExistsError,
  InvalidWorkoutSessionCreationError,
  WorkoutSessionApplicationNotFoundError,
  cancelSession,
  completeSession,
  createSession,
  startSession,
  type CreateWorkoutSessionInput,
  type CreateWorkoutSessionOptions,
} from '@/features/workout-session/application/workout-session-flow';

const CREATED_AT = '2026-07-17T00:00:00.000Z';
const STARTED_AT = '2026-07-17T01:00:00.000Z';
const ENDED_AT = '2026-07-17T02:00:00.000Z';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const OTHER_SESSION_ID = 'session-pull' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;

describe('WorkoutSession application flow', () => {
  it('creates and saves a draft aggregate with snapshots and empty actual sets', async () => {
    const save = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({ save });
    const input = buildCreateInput();
    const options = buildCreateOptions([
      SESSION_ID,
      SESSION_EXERCISE_ID,
      'session-exercise-row',
    ]);

    const session = await createSession(repository, input, options);

    expect(session).toEqual({
      id: SESSION_ID,
      sourceTemplateId: 'template-push',
      workoutNameSnapshot: 'Push',
      status: 'draft',
      sessionExercises: [
        expect.objectContaining({
          id: SESSION_EXERCISE_ID,
          sessionId: SESSION_ID,
          sourceExerciseId: 'exercise-bench',
          exerciseNameSnapshot: '杠铃卧推',
          position: 1,
          isEnabled: true,
          isSkipped: false,
          isCompleted: false,
          targetSets: 4,
          targetRepsMin: 8,
          targetRepsMax: 10,
          currentRestSeconds: 90,
          sets: [],
        }),
        expect.objectContaining({
          id: 'session-exercise-row',
          sessionId: SESSION_ID,
          sourceExerciseId: 'exercise-row',
          exerciseNameSnapshot: '坐姿划船',
          position: 2,
          sets: [],
        }),
      ],
      dailyStatus: 'normal',
      notes: '今天状态良好',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(session);
  });

  it('creates a draft without a source template', async () => {
    const repository = buildRepository();
    const input = buildCreateInput({ sourceTemplateId: undefined });

    const session = await createSession(
      repository,
      input,
      buildCreateOptions([SESSION_ID, SESSION_EXERCISE_ID, 'exercise-row-id']),
    );

    expect(session.sourceTemplateId).toBeUndefined();
  });

  it('rejects an invalid draft before calling the repository', async () => {
    const save = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({ save });

    await expect(
      createSession(
        repository,
        buildCreateInput({ exercises: [] }),
        buildCreateOptions([SESSION_ID]),
      ),
    ).rejects.toBeInstanceOf(InvalidWorkoutSessionCreationError);
    expect(save).not.toHaveBeenCalled();
  });

  it('starts a draft through the Domain transition and persists it', async () => {
    const draft = buildDraftSession();
    const findById = jest.fn(async () => draft);
    const startIfNoActiveSession = jest.fn(async () => ({
      status: 'started' as const,
    }));
    const repository = buildRepository({
      findById,
      startIfNoActiveSession,
    });

    const started = await startSession(repository, SESSION_ID, STARTED_AT);

    expect(started).toEqual({
      ...draft,
      status: 'in_progress',
      startedAt: STARTED_AT,
      updatedAt: STARTED_AT,
    });
    expect(draft.status).toBe('draft');
    expect(findById).toHaveBeenCalledWith(SESSION_ID);
    expect(startIfNoActiveSession).toHaveBeenCalledWith(
      started,
      draft.updatedAt,
    );
  });

  it('prevents starting a draft when another session is active', async () => {
    const startIfNoActiveSession = jest.fn(async () => ({
      status: 'active_session_exists' as const,
      activeSessionId: OTHER_SESSION_ID,
    }));
    const repository = buildRepository({
      findById: async () => buildDraftSession(),
      startIfNoActiveSession,
    });

    await expect(
      startSession(repository, SESSION_ID, STARTED_AT),
    ).rejects.toMatchObject({
      name: ActiveWorkoutSessionExistsError.name,
      activeSessionId: OTHER_SESSION_ID,
    });
    expect(startIfNoActiveSession).toHaveBeenCalledTimes(1);
  });

  it('completes an in-progress session without changing WorkoutSet facts', async () => {
    const active = buildInProgressSession();
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({
      findById: async () => active,
      update,
    });

    const completed = await completeSession(repository, SESSION_ID, ENDED_AT);

    expect(completed).toEqual({
      ...active,
      status: 'completed',
      endedAt: ENDED_AT,
      updatedAt: ENDED_AT,
    });
    expect(completed.sessionExercises[0]?.sets).toBe(
      active.sessionExercises[0]?.sets,
    );
    expect(update).toHaveBeenCalledWith(completed);
  });

  it('cancels a draft through the Domain transition', async () => {
    const draft = buildDraftSession();
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({
      findById: async () => draft,
      update,
    });

    const cancelled = await cancelSession(repository, SESSION_ID, ENDED_AT);

    expect(cancelled).toEqual({
      ...draft,
      status: 'cancelled',
      endedAt: ENDED_AT,
      updatedAt: ENDED_AT,
    });
    expect(cancelled.startedAt).toBeUndefined();
    expect(update).toHaveBeenCalledWith(cancelled);
  });

  it('cancels an in-progress session without losing its start time', async () => {
    const active = buildInProgressSession();
    const repository = buildRepository({ findById: async () => active });

    const cancelled = await cancelSession(repository, SESSION_ID, ENDED_AT);

    expect(cancelled.startedAt).toBe(STARTED_AT);
    expect(cancelled.endedAt).toBe(ENDED_AT);
  });

  it('uses Domain rules to reject illegal lifecycle transitions', async () => {
    const update = jest.fn(async (session: WorkoutSession) => session);
    const startIfNoActiveSession = jest.fn(async () => ({
      status: 'started' as const,
    }));
    const completed = buildCompletedSession();
    const completedRepository = buildRepository({
      findById: async () => completed,
      startIfNoActiveSession,
      update,
    });
    const draftRepository = buildRepository({
      findById: async () => buildDraftSession(),
      update,
    });

    await expect(
      startSession(completedRepository, SESSION_ID, STARTED_AT),
    ).rejects.toBeInstanceOf(WorkoutSessionTransitionError);
    await expect(
      completeSession(draftRepository, SESSION_ID, ENDED_AT),
    ).rejects.toBeInstanceOf(WorkoutSessionTransitionError);
    await expect(
      cancelSession(completedRepository, SESSION_ID, ENDED_AT),
    ).rejects.toBeInstanceOf(WorkoutSessionTransitionError);
    expect(startIfNoActiveSession).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('maps a missing aggregate to an application error without writing', async () => {
    const update = jest.fn(async (session: WorkoutSession) => session);
    const repository = buildRepository({ update });

    await expect(
      startSession(repository, SESSION_ID, STARTED_AT),
    ).rejects.toBeInstanceOf(WorkoutSessionApplicationNotFoundError);
    expect(update).not.toHaveBeenCalled();
  });
});

function buildCreateInput(
  overrides: Partial<CreateWorkoutSessionInput> = {},
): CreateWorkoutSessionInput {
  return {
    sourceTemplateId: 'template-push' as WorkoutTemplateId,
    workoutNameSnapshot: 'Push',
    exercises: [
      {
        sourceExerciseId: 'exercise-bench' as ExerciseId,
        exerciseNameSnapshot: '杠铃卧推',
        position: 1,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        currentRestSeconds: 90,
      },
      {
        sourceExerciseId: 'exercise-row' as ExerciseId,
        exerciseNameSnapshot: '坐姿划船',
        position: 2,
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 12,
        currentRestSeconds: 60,
      },
    ],
    dailyStatus: 'normal',
    notes: '今天状态良好',
    ...overrides,
  };
}

function buildDraftSession(
  overrides: Partial<DraftWorkoutSession> = {},
): DraftWorkoutSession {
  return {
    id: SESSION_ID,
    sourceTemplateId: 'template-push' as WorkoutTemplateId,
    workoutNameSnapshot: 'Push',
    status: 'draft',
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
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        currentRestSeconds: 90,
        sets: [],
      },
    ],
    dailyStatus: 'normal',
    notes: '今天状态良好',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildInProgressSession(
  overrides: Partial<InProgressWorkoutSession> = {},
): InProgressWorkoutSession {
  const draft = buildDraftSession();
  const sessionExercise = draft.sessionExercises[0];

  if (!sessionExercise) {
    throw new Error('Expected the draft fixture to contain an exercise.');
  }

  return {
    ...draft,
    status: 'in_progress',
    startedAt: STARTED_AT,
    updatedAt: STARTED_AT,
    sessionExercises: [
      {
        ...sessionExercise,
        sets: [
          {
            id: 'set-bench-1' as WorkoutSetId,
            sessionExerciseId: SESSION_EXERCISE_ID,
            setNumber: 1,
            setType: 'normal',
            actualReps: 9,
            weight: 80,
            isCompleted: true,
            isExtraSet: false,
            completedAt: '2026-07-17T01:30:00.000Z',
          },
        ],
      },
    ],
    ...overrides,
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

function buildCreateOptions(
  ids: readonly string[],
): CreateWorkoutSessionOptions {
  let index = 0;

  return {
    now: () => CREATED_AT,
    createId: () => ids[index++] ?? '',
  };
}

function buildRepository(
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
