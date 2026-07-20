/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

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
  continueWorkoutSessionRecovery,
  createWorkoutSessionSummary,
  loadRecoverableWorkoutSessionRecovery,
  loadWorkoutSessionRecovery,
  loadWorkoutSessionSummary,
} from '@/features/workout-session/application/workout-session-completion-recovery';
import { recordWorkoutSet } from '@/features/workout-session/application/workout-session-execution';
import { WorkoutSessionSummaryScreenContent } from '@/features/workout-session/screens/workout-session-summary-screen';
import { TodayWorkoutRecoveryScreenContent } from '@/features/workout-session/screens/today-workout-recovery-screen';

const SESSION_ID = 'session-push' as WorkoutSessionId;
const EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const STARTED_AT = '2026-07-20T01:00:00.000Z';
const ENDED_AT = '2026-07-20T02:01:30.000Z';

describe('WorkoutSession completion and recovery', () => {
  it('derives completed-only summary facts without changing the aggregate', () => {
    const completed = buildCompletedSession();

    const summary = createWorkoutSessionSummary(completed);

    expect(summary).toEqual({
      sessionId: SESSION_ID,
      workoutName: 'Push',
      startedAt: STARTED_AT,
      endedAt: ENDED_AT,
      durationSeconds: 3690,
      completedExerciseCount: 1,
      completedSetCount: 2,
      totalVolume: 1120,
    });
    expect(completed.sessionExercises[0]?.sets).toHaveLength(3);
  });

  it('does not expose cancelled or active sessions as completed summaries', async () => {
    const cancelled = buildCancelledSession();
    const cancelledRepository = buildRepository(cancelled);
    const activeRepository = buildRepository(buildInProgressSession());

    await expect(
      loadWorkoutSessionSummary(cancelledRepository, SESSION_ID),
    ).resolves.toEqual({ status: 'not_completed' });
    await expect(
      loadWorkoutSessionSummary(activeRepository, SESSION_ID),
    ).resolves.toEqual({ status: 'not_completed' });
  });

  it.each(['draft', 'in_progress'] as const)(
    'recovers a %s aggregate with position, sets and timer state',
    async (status) => {
      const session =
        status === 'draft'
          ? buildRecoverableDraftSession()
          : buildRecoverableInProgressSession();
      const repository = buildRepository(session);
      const restTimerRepository = buildRestTimerRepository(buildTimer());

      const result = await loadWorkoutSessionRecovery(
        {
          workoutSessionRepository: repository,
          restTimerRepository,
        },
        SESSION_ID,
        '2026-07-20T01:31:00.000Z',
      );

      expect(result.status).toBe('ready');
      if (result.status !== 'ready') {
        throw new Error('Expected recoverable session data.');
      }
      expect(result.data.session.id).toBe(SESSION_ID);
      expect(result.runtime.currentExercise?.id).toBe(EXERCISE_ID);
      expect(result.runtime.currentSet).toBe(2);
      expect(result.runtime.currentExercise?.sets).toEqual([
        buildWorkoutSet({ id: 'set-1' as WorkoutSetId, setNumber: 1 }),
      ]);
      expect(result.data.restTimerStatus).toBe('running');
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it.each(['draft', 'in_progress'] as const)(
    'loads the persisted %s aggregate for the recovery entry',
    async (status) => {
      const session =
        status === 'draft'
          ? buildRecoverableDraftSession()
          : buildRecoverableInProgressSession();
      const repository = buildRepository(session);

      const result = await loadRecoverableWorkoutSessionRecovery(
        {
          workoutSessionRepository: repository,
          restTimerRepository: buildRestTimerRepository(),
        },
        '2026-07-20T01:31:00.000Z',
      );

      expect(result.status).toBe('ready');
      expect(repository.findRecoverableSession).toHaveBeenCalledTimes(1);
      expect(repository.findActiveSession).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it('starts the same draft when continuing and preserves its recovery facts', async () => {
    const draft = buildRecoverableDraftSession();
    const repository = buildRepository(draft);
    const timer = buildTimer();

    const result = await continueWorkoutSessionRecovery(
      {
        workoutSessionRepository: repository,
        restTimerRepository: buildRestTimerRepository(timer),
      },
      SESSION_ID,
      '2026-07-20T01:31:00.000Z',
    );

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      throw new Error('Expected continued draft data.');
    }
    expect(result.data.session).toMatchObject({
      id: SESSION_ID,
      status: 'in_progress',
      currentSessionExerciseId: EXERCISE_ID,
      currentSetNumber: 2,
      notes: '保留备注',
    });
    expect(result.runtime.currentExercise?.sets).toEqual(
      draft.sessionExercises[0]?.sets,
    );
    expect(result.data.restTimerStatus).toBe('running');
    expect(repository.startIfNoActiveSession).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('can record the next set after continuing a draft', async () => {
    const repository = buildRepository(buildRecoverableDraftSession());

    const continued = await continueWorkoutSessionRecovery(
      {
        workoutSessionRepository: repository,
        restTimerRepository: buildRestTimerRepository(),
      },
      SESSION_ID,
      '2026-07-20T01:31:00.000Z',
    );
    expect(continued.status).toBe('ready');

    const updated = await recordWorkoutSet(
      repository,
      {
        sessionId: SESSION_ID,
        sessionExerciseId: EXERCISE_ID,
        actualReps: 8,
        weight: 82.5,
        completedAt: '2026-07-20T01:32:00.000Z',
      },
      { createWorkoutSetId: () => 'set-2' },
    );

    expect(updated.sessionExercises[0]?.sets).toHaveLength(2);
    expect(updated.currentSessionExerciseId).toBe(EXERCISE_ID);
    expect(updated.currentSetNumber).toBe(3);
  });

  it('continues an in-progress session without starting it again', async () => {
    const repository = buildRepository(buildRecoverableInProgressSession());

    const result = await continueWorkoutSessionRecovery(
      {
        workoutSessionRepository: repository,
        restTimerRepository: buildRestTimerRepository(),
      },
      SESSION_ID,
      '2026-07-20T01:31:00.000Z',
    );

    expect(result.status).toBe('ready');
    expect(repository.startIfNoActiveSession).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('renders the required summary metrics and returns to Today', async () => {
    const onDone = jest.fn();
    const summary = createWorkoutSessionSummary(buildCompletedSession());
    const { getByLabelText, getByText } = await render(
      <WorkoutSessionSummaryScreenContent
        state={{ status: 'ready', summary }}
        onDone={onDone}
        onOpenHistory={jest.fn()}
        onReload={jest.fn()}
      />,
    );

    expect(getByText('Push')).toBeTruthy();
    expect(getByLabelText('总时长：1 小时 1 分钟')).toBeTruthy();
    expect(getByLabelText('完成动作：1 个')).toBeTruthy();
    expect(getByLabelText('完成组数：2 组')).toBeTruthy();
    expect(getByLabelText('总训练量：1,120 kg')).toBeTruthy();

    await fireEvent.press(getByLabelText('完成查看训练总结'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens history from the completed summary', async () => {
    const onOpenHistory = jest.fn();
    const summary = createWorkoutSessionSummary(buildCompletedSession());
    const { getByLabelText } = await render(
      <WorkoutSessionSummaryScreenContent
        state={{ status: 'ready', summary }}
        onDone={jest.fn()}
        onOpenHistory={onOpenHistory}
        onReload={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('从训练总结查看历史训练'));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('opens the persisted session from the Today recovery entry', async () => {
    const onResume = jest.fn();
    const session = buildRecoverableInProgressSession();
    const result = await loadWorkoutSessionRecovery(
      {
        workoutSessionRepository: buildRepository(session),
        restTimerRepository: buildRestTimerRepository(buildTimer()),
      },
      SESSION_ID,
      '2026-07-20T01:31:00.000Z',
    );

    if (result.status !== 'ready') {
      throw new Error('Expected recoverable session data.');
    }

    const { getByLabelText, getByText } = await render(
      <TodayWorkoutRecoveryScreenContent
        state={{ status: 'ready', data: result.data, runtime: result.runtime }}
        onReload={jest.fn()}
        onResume={onResume}
      />,
    );

    expect(getByText('杠铃卧推 · 第 2 组')).toBeTruthy();
    expect(getByText('休息计时：进行中')).toBeTruthy();
    await fireEvent.press(getByLabelText('继续训练Push'));
    expect(onResume).toHaveBeenCalledWith(SESSION_ID);
  });

  it('renders and opens a persisted draft from the recovery entry', async () => {
    const onResume = jest.fn();
    const result = await loadRecoverableWorkoutSessionRecovery(
      {
        workoutSessionRepository: buildRepository(
          buildRecoverableDraftSession(),
        ),
        restTimerRepository: buildRestTimerRepository(),
      },
      '2026-07-20T01:31:00.000Z',
    );

    if (result.status !== 'ready') {
      throw new Error('Expected recoverable draft data.');
    }

    const { getByLabelText, getByText } = await render(
      <TodayWorkoutRecoveryScreenContent
        state={{ status: 'ready', data: result.data, runtime: result.runtime }}
        onReload={jest.fn()}
        onResume={onResume}
      />,
    );

    expect(getByText('可恢复的训练草稿')).toBeTruthy();
    await fireEvent.press(getByLabelText('继续训练Push'));
    expect(onResume).toHaveBeenCalledWith(SESSION_ID);
  });
});

function buildCompletedSession(): Extract<
  WorkoutSession,
  { status: 'completed' }
> {
  const active = buildInProgressSession();

  return {
    ...active,
    status: 'completed',
    endedAt: ENDED_AT,
    updatedAt: ENDED_AT,
  };
}

function buildCancelledSession(): Extract<
  WorkoutSession,
  { status: 'cancelled' }
> {
  const active = buildInProgressSession();

  return {
    ...active,
    status: 'cancelled',
    endedAt: ENDED_AT,
    updatedAt: ENDED_AT,
  };
}

function buildInProgressSession(): Extract<
  WorkoutSession,
  { status: 'in_progress' }
> {
  return {
    ...buildDraftSession(),
    status: 'in_progress',
    startedAt: STARTED_AT,
    updatedAt: STARTED_AT,
  };
}

function buildDraftSession(): Extract<WorkoutSession, { status: 'draft' }> {
  return {
    id: SESSION_ID,
    workoutNameSnapshot: 'Push',
    status: 'draft',
    sessionExercises: [buildExercise()],
    currentSessionExerciseId: EXERCISE_ID,
    currentSetNumber: 2,
    notes: '保留备注',
    createdAt: STARTED_AT,
    updatedAt: STARTED_AT,
  };
}

function buildRecoverableDraftSession(): Extract<
  WorkoutSession,
  { status: 'draft' }
> {
  const draft = buildDraftSession();
  const exercise = draft.sessionExercises[0];

  if (!exercise) {
    throw new Error('Expected a recovery exercise fixture.');
  }

  return {
    ...draft,
    sessionExercises: [
      {
        ...exercise,
        isCompleted: false,
        sets: [buildWorkoutSet({ id: 'set-1' as WorkoutSetId, setNumber: 1 })],
      },
    ],
  };
}

function buildRecoverableInProgressSession(): Extract<
  WorkoutSession,
  { status: 'in_progress' }
> {
  return {
    ...buildRecoverableDraftSession(),
    status: 'in_progress',
    startedAt: STARTED_AT,
  };
}

function buildExercise(): SessionExercise {
  return {
    id: EXERCISE_ID,
    sessionId: SESSION_ID,
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
    sets: [
      buildWorkoutSet({ id: 'set-1' as WorkoutSetId, setNumber: 1 }),
      buildWorkoutSet({
        id: 'set-2' as WorkoutSetId,
        setNumber: 2,
        actualReps: 8,
        weight: 40,
      }),
      buildWorkoutSet({
        id: 'set-incomplete' as WorkoutSetId,
        setNumber: 3,
        actualReps: 100,
        weight: 100,
        isCompleted: false,
      }),
    ],
  };
}

function buildWorkoutSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set-default' as WorkoutSetId,
    sessionExerciseId: EXERCISE_ID,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: '2026-07-20T01:30:00.000Z',
    ...overrides,
  };
}

function buildRepository(
  session: WorkoutSession | null,
): WorkoutSessionRepository & {
  readonly save: jest.Mock;
  readonly findActiveSession: jest.Mock;
  readonly findLatestSession: jest.Mock;
  readonly findRecoverableSession: jest.Mock;
  readonly update: jest.Mock;
} {
  let storedSession = session;
  const startIfNoActiveSession = jest.fn(async (next: WorkoutSession) => {
    storedSession = next;
    return { status: 'started' as const };
  });
  const update = jest.fn(async (next: WorkoutSession) => {
    storedSession = next;
    return next;
  });

  return {
    save: jest.fn(async (next) => next),
    findById: jest.fn(async () => storedSession),
    findActiveSession: jest.fn(async () => storedSession),
    findLatestSession: jest.fn(async () => storedSession),
    listByStatuses: jest.fn(async () => (storedSession ? [storedSession] : [])),
    findRecoverableSession: jest.fn(async () => storedSession),
    startIfNoActiveSession,
    update,
  };
}

function buildRestTimerRepository(timer?: RestTimer): RestTimerRepository {
  return {
    findBySessionId: jest.fn(async () => timer ?? null),
    startIfNoActiveTimer: jest.fn(async (input) => ({
      status: 'started' as const,
      timer: input.timer,
    })),
    update: jest.fn(async (next) => next),
    completeIfExpired: jest.fn(async () => null),
  };
}

function buildTimer(): RestTimer {
  return {
    id: 'timer-1' as RestTimerId,
    sessionId: SESSION_ID,
    sessionExerciseId: EXERCISE_ID,
    previousSetNumber: 1,
    nextSetNumber: 2,
    originalDurationSeconds: 90,
    startedAt: '2026-07-20T01:30:00.000Z',
    targetEndAt: '2026-07-20T01:31:30.000Z',
    status: 'running',
    createdAt: '2026-07-20T01:30:00.000Z',
    updatedAt: '2026-07-20T01:30:00.000Z',
  };
}
