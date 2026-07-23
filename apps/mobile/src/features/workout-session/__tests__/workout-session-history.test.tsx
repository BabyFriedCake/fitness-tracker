/// <reference types="jest" />

import {
  act,
  fireEvent,
  render,
  renderHook,
} from '@testing-library/react-native';

import type { DatabaseStartupResult } from '@/database/bootstrap';
import type { DatabaseConnection } from '@/database/types';
import type { ExerciseId } from '@/domain/exercise';
import {
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
  type WorkoutSet,
  type WorkoutSetId,
} from '@/domain/workout-session';
import { useWorkoutSessionHistory } from '@/features/workout-session/application/use-workout-session-history';
import {
  createWorkoutSessionHistoryCalendar,
  createWorkoutSessionHistoryOverview,
  filterWorkoutSessionHistoryItems,
  loadWorkoutSessionHistory,
} from '@/features/workout-session/application/workout-session-history';
import { WorkoutSessionHistoryScreenContent } from '@/features/workout-session/screens/workout-session-history-screen';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let mockFocusCallback: (() => void) | null = null;

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');

  return {
    ...actual,
    useFocusEffect: jest.fn((callback: () => void) => {
      mockFocusCallback = callback;
    }),
  };
});

const SESSION_ID = 'session-push' as WorkoutSessionId;
const CANCELLED_SESSION_ID = 'session-cancelled' as WorkoutSessionId;
const DRAFT_SESSION_ID = 'session-draft' as WorkoutSessionId;
const ACTIVE_SESSION_ID = 'session-active' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const STARTED_AT = '2026-07-20T01:00:00.000Z';
const ENDED_AT = '2026-07-20T02:00:00.000Z';
const OLDER_STARTED_AT = '2026-07-19T01:30:00.000Z';
const OLDER_ENDED_AT = '2026-07-19T02:00:00.000Z';

describe('WorkoutSession history entry', () => {
  afterEach(() => {
    mockFocusCallback = null;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('loads only completed and cancelled sessions for history', async () => {
    const listByStatuses = jest.fn(async () => [
      buildOlderCancelledSession(),
      buildSession('completed'),
    ]);

    const result = await loadWorkoutSessionHistory(
      buildRepository({ listByStatuses }),
    );

    expect(listByStatuses).toHaveBeenCalledWith(['completed', 'cancelled']);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      throw new Error('Expected history items.');
    }
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      sessionId: SESSION_ID,
      status: 'completed',
      workoutName: 'Push',
      localDate: '2026-07-20',
      completedSetCount: 2,
      totalVolume: 1200,
      durationSeconds: 3600,
    });
    expect(result.items[1]).toMatchObject({
      sessionId: CANCELLED_SESSION_ID,
      status: 'cancelled',
      localDate: '2026-07-19',
      completedSetCount: 2,
      totalVolume: 1200,
      durationSeconds: 1800,
    });
    expect(result.sections).toEqual([
      {
        localDate: '2026-07-20',
        title: '7月20日',
        items: [result.items[0]],
      },
      {
        localDate: '2026-07-19',
        title: '7月19日',
        items: [result.items[1]],
      },
    ]);
  });

  it('does not expose draft or in-progress sessions if the repository returns them', async () => {
    const result = await loadWorkoutSessionHistory(
      buildRepository({
        listByStatuses: async () => [
          buildSession('draft', DRAFT_SESSION_ID),
          buildSession('in_progress', ACTIVE_SESSION_ID),
        ],
      }),
    );

    expect(result).toEqual({ status: 'ready', items: [], sections: [] });
  });

  it('derives calendar markers and excludes cancelled sessions from formal statistics', async () => {
    const result = await loadWorkoutSessionHistory(
      buildRepository({
        listByStatuses: async () => [
          buildSession('completed'),
          buildOlderCancelledSession(),
        ],
      }),
    );

    if (result.status !== 'ready') {
      throw new Error('Expected history items.');
    }

    expect(createWorkoutSessionHistoryOverview(result.items)).toEqual({
      completedSessionCount: 1,
      completedSetCount: 2,
      totalDurationSeconds: 3600,
      totalVolume: 1200,
      volumeTrend: { status: 'insufficient' },
    });
    const calendar = createWorkoutSessionHistoryCalendar(
      result.items,
      new Date(2026, 6, 23),
    );
    expect(calendar.days.find((day) => day.localDate === '2026-07-20')).toEqual(
      {
        localDate: '2026-07-20',
        dayOfMonth: 20,
        hasCompletedWorkout: true,
      },
    );
    expect(calendar.days.find((day) => day.localDate === '2026-07-19')).toEqual(
      {
        localDate: '2026-07-19',
        dayOfMonth: 19,
        hasCompletedWorkout: false,
      },
    );
  });

  it('filters history with deterministic local period boundaries', () => {
    const items = [
      {
        sessionId: SESSION_ID,
        workoutName: '本周训练',
        status: 'completed' as const,
        startedAt: STARTED_AT,
        endedAt: ENDED_AT,
        localDate: '2026-07-20',
        durationSeconds: 3600,
        completedSetCount: 2,
        totalVolume: 1200,
      },
      {
        sessionId: CANCELLED_SESSION_ID,
        workoutName: '较早训练',
        status: 'cancelled' as const,
        endedAt: '2026-06-01T02:00:00.000Z',
        localDate: '2026-06-01',
        completedSetCount: 0,
        totalVolume: 0,
      },
    ];

    expect(
      filterWorkoutSessionHistoryItems(
        items,
        'week',
        new Date(2026, 6, 23, 12),
      ),
    ).toEqual([items[0]]);
    expect(
      filterWorkoutSessionHistoryItems(
        items,
        'three_months',
        new Date(2026, 6, 23, 12),
      ),
    ).toEqual(items);
  });

  it('derives a simple volume trend from completed sessions only', () => {
    const latest = {
      sessionId: SESSION_ID,
      workoutName: '本次训练',
      status: 'completed' as const,
      endedAt: '2026-07-20T02:00:00.000Z',
      localDate: '2026-07-20',
      completedSetCount: 2,
      totalVolume: 1400,
    };
    const previous = {
      ...latest,
      sessionId: CANCELLED_SESSION_ID,
      workoutName: '上次训练',
      endedAt: '2026-07-18T02:00:00.000Z',
      localDate: '2026-07-18',
      totalVolume: 1000,
    };

    expect(
      createWorkoutSessionHistoryOverview([latest, previous]).volumeTrend,
    ).toEqual({
      status: 'available',
      direction: 'up',
      difference: 400,
    });
  });

  it('renders grouped history rows with duration and volume', async () => {
    const onOpenSummary = jest.fn();
    const { getAllByText, getByLabelText, getByText } = await render(
      <WorkoutSessionHistoryScreenContent
        state={{
          status: 'ready',
          sections: [
            {
              localDate: '2026-07-20',
              title: '7月20日',
              items: [
                {
                  sessionId: SESSION_ID,
                  workoutName: 'Push',
                  status: 'completed',
                  startedAt: STARTED_AT,
                  endedAt: ENDED_AT,
                  localDate: '2026-07-20',
                  durationSeconds: 3600,
                  completedSetCount: 2,
                  totalVolume: 1200,
                },
              ],
            },
            {
              localDate: '2026-07-19',
              title: '7月19日',
              items: [
                {
                  sessionId: CANCELLED_SESSION_ID,
                  workoutName: 'Pull',
                  status: 'cancelled',
                  startedAt: OLDER_STARTED_AT,
                  endedAt: OLDER_ENDED_AT,
                  localDate: '2026-07-19',
                  durationSeconds: 1800,
                  completedSetCount: 1,
                  totalVolume: 400,
                },
              ],
            },
          ],
        }}
        onReload={jest.fn()}
        onOpenSummary={onOpenSummary}
        onGoToday={jest.fn()}
      />,
    );

    expect(getByText('7月20日')).toBeTruthy();
    expect(getByText('7月19日')).toBeTruthy();
    expect(getByText('Push')).toBeTruthy();
    expect(getByText('Pull')).toBeTruthy();
    expect(getAllByText('1 小时')).toHaveLength(2);
    expect(getByText('30 分钟')).toBeTruthy();
    expect(getByText('2 组 · 1,200 kg')).toBeTruthy();
    expect(getByText('1 组 · 400 kg')).toBeTruthy();
    expect(getByText('完成训练')).toBeTruthy();
    expect(getByText('1 次')).toBeTruthy();
    expect(
      getByText('正式统计仅包含已完成训练，已取消记录不计入汇总。'),
    ).toBeTruthy();
    await fireEvent.press(getByLabelText('已完成Push，1 小时，1,200 kg'));
    await fireEvent.press(getByLabelText('已取消Pull，30 分钟，400 kg'));

    expect(onOpenSummary).toHaveBeenCalledTimes(1);
    expect(onOpenSummary).toHaveBeenCalledWith(SESSION_ID);
    expect(
      getByLabelText('已取消Pull，30 分钟，400 kg').props.accessibilityState,
    ).toEqual({
      disabled: true,
    });
  });

  it('shows empty and retryable error states', async () => {
    const onGoToday = jest.fn();
    const onReload = jest.fn();
    const { getByLabelText, getByText, rerender } = await render(
      <WorkoutSessionHistoryScreenContent
        state={{ status: 'empty' }}
        onReload={onReload}
        onOpenSummary={jest.fn()}
        onGoToday={onGoToday}
      />,
    );

    expect(getByText('还没有历史训练')).toBeTruthy();
    await fireEvent.press(getByLabelText('返回今天开始训练'));
    expect(onGoToday).toHaveBeenCalledTimes(1);

    await rerender(
      <WorkoutSessionHistoryScreenContent
        state={{ status: 'error', message: '历史训练加载失败。' }}
        onReload={onReload}
        onOpenSummary={jest.fn()}
        onGoToday={onGoToday}
      />,
    );
    await fireEvent.press(getByLabelText('重新加载历史训练'));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('loads history through the application hook', async () => {
    jest.useFakeTimers();
    const repository = buildRepository({
      listByStatuses: jest.fn(async () => [buildSession('completed')]),
    });
    const { result } = await renderHook(() =>
      useWorkoutSessionHistory(buildHistoryHookDependencies(repository)),
    );

    await flushHistoryHookInitialLoad();
    expect(result.current.state).toMatchObject({
      status: 'ready',
      sections: [{ items: [{ sessionId: SESSION_ID, status: 'completed' }] }],
    });
    jest.useRealTimers();
  });

  it('retries database initialization', async () => {
    jest.useFakeTimers();
    const repository = buildRepository({
      listByStatuses: jest.fn().mockResolvedValueOnce([]),
    });
    const initializeDatabase = jest
      .fn()
      .mockResolvedValueOnce(buildDatabaseStartupError())
      .mockResolvedValue(buildDatabaseStartupReady());
    const { result } = await renderHook(() =>
      useWorkoutSessionHistory(
        buildHistoryHookDependencies(repository, { initializeDatabase }),
      ),
    );

    await flushHistoryHookInitialLoad();
    expect(result.current.state.status).toBe('error');

    await act(async () => {
      result.current.reload();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state.status).toBe('empty');
    jest.useRealTimers();
  });

  it('refreshes history when focused again', async () => {
    jest.useFakeTimers();
    const repository = buildRepository({
      listByStatuses: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([buildSession('completed')]),
    });
    const { result } = await renderHook(() =>
      useWorkoutSessionHistory(buildHistoryHookDependencies(repository)),
    );

    await flushHistoryHookInitialLoad();
    expect(result.current.state.status).toBe('empty');

    await act(async () => {
      mockFocusCallback?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(repository.listByStatuses).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockFocusCallback?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state.status).toBe('ready');
    expect(repository.listByStatuses).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

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

function buildHistoryHookDependencies(
  repository: WorkoutSessionRepository,
  overrides: {
    readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
  } = {},
): Parameters<typeof useWorkoutSessionHistory>[0] {
  return {
    initializeDatabase:
      overrides.initializeDatabase ??
      jest.fn(async () => buildDatabaseStartupReady()),
    createWorkoutSessionRepository: jest.fn(() => repository),
  };
}

async function flushHistoryHookInitialLoad(): Promise<void> {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function buildDatabaseStartupReady(): DatabaseStartupResult {
  return {
    status: 'ready',
    database: {} as DatabaseConnection,
    schemaVersion: 3,
  };
}

function buildDatabaseStartupError(): DatabaseStartupResult {
  return {
    status: 'error',
    error: { code: 'database_migration_failed' },
  } as DatabaseStartupResult;
}

function buildSession(
  status: WorkoutSession['status'],
  id: WorkoutSessionId = SESSION_ID,
): WorkoutSession {
  const base = {
    id,
    workoutNameSnapshot: status === 'cancelled' ? 'Pull' : 'Push',
    sessionExercises: [buildExercise(id)],
    createdAt: STARTED_AT,
    updatedAt: ENDED_AT,
  };

  switch (status) {
    case 'draft':
      return { ...base, status };
    case 'in_progress':
      return { ...base, status, startedAt: STARTED_AT };
    case 'completed':
      return { ...base, status, startedAt: STARTED_AT, endedAt: ENDED_AT };
    case 'cancelled':
      return { ...base, status, startedAt: STARTED_AT, endedAt: ENDED_AT };
  }
}

function buildOlderCancelledSession(): WorkoutSession {
  return {
    id: CANCELLED_SESSION_ID,
    workoutNameSnapshot: 'Pull',
    sessionExercises: [buildExercise(CANCELLED_SESSION_ID)],
    status: 'cancelled',
    startedAt: OLDER_STARTED_AT,
    endedAt: OLDER_ENDED_AT,
    createdAt: STARTED_AT,
    updatedAt: OLDER_ENDED_AT,
  };
}

function buildExercise(sessionId: WorkoutSessionId): SessionExercise {
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
    sets: [
      buildWorkoutSet({ id: 'set-1' as WorkoutSetId, weight: 80 }),
      buildWorkoutSet({ id: 'set-2' as WorkoutSetId, weight: 40 }),
      buildWorkoutSet({
        id: 'set-incomplete' as WorkoutSetId,
        weight: 100,
        isCompleted: false,
      }),
    ],
  };
}

function buildWorkoutSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set-default' as WorkoutSetId,
    sessionExerciseId: SESSION_EXERCISE_ID,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: '2026-07-20T01:20:00.000Z',
    ...overrides,
  };
}
