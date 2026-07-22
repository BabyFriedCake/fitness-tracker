/// <reference types="jest" />

import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { DatabaseStartupResult } from '@/database/bootstrap';
import type { DatabaseConnection } from '@/database/types';
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
import { createWorkoutSessionScreenData } from '@/features/workout-session/application/load-workout-session-screen';
import {
  createWorkoutCompanionRuntimeState,
  createWorkoutRuntimeSnapshot,
  pauseWorkoutCompanionRuntime,
  type WorkoutRuntimeSnapshot,
} from '@/features/workout-session/application/workout-runtime-engine';
import type { WorkoutRuntimeSnapshotRepository } from '@/features/workout-session/application/workout-runtime-snapshot-repository';
import type { WorkoutCompanionEventSource } from '@/features/workout-session/application/workout-companion-event-source';
import {
  useWorkoutSessionScreen,
  type WorkoutSessionScreenControls,
  type WorkoutSessionScreenState,
} from '@/features/workout-session/application/use-workout-session-screen';
import type { WorkoutVoiceFeedbackAdapter } from '@/features/workout-session/application/workout-voice-feedback';
import { WorkoutSessionScreenContent } from '@/features/workout-session/screens/workout-session-screen';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const CREATED_AT = '2026-07-20T01:00:00.000Z';
const STARTED_AT = '2026-07-20T01:10:00.000Z';
const ACTION_AT = '2026-07-20T01:20:00.000Z';
const SESSION_ID = 'session-push' as WorkoutSessionId;
const EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const SECOND_EXERCISE_ID = 'session-exercise-press' as SessionExerciseId;

let mockFocusCallback: (() => void) | null = null;
let mockAppStateCallback: ((state: AppStateStatus) => void) | null = null;
const mockAppStateRemove = jest.fn();

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');

  return {
    ...actual,
    useFocusEffect: jest.fn((callback: () => void) => {
      mockFocusCallback = callback;
    }),
  };
});

jest
  .spyOn(AppState, 'addEventListener')
  .mockImplementation((_type, listener) => {
    mockAppStateCallback = listener;
    return { remove: mockAppStateRemove };
  });

describe('WorkoutSessionScreenContent', () => {
  it('renders loading and retryable error states', async () => {
    const reload = jest.fn();
    const onBack = jest.fn();
    const { getByText, getByLabelText, rerender } = await render(
      <WorkoutSessionScreenContent
        state={{ status: 'loading' }}
        controls={buildControls({ reload })}
        onBack={onBack}
      />,
    );

    expect(getByText('正在加载训练')).toBeTruthy();

    await rerender(
      <WorkoutSessionScreenContent
        state={{ status: 'error', message: '训练加载失败，请重试。' }}
        controls={buildControls({ reload })}
        onBack={onBack}
      />,
    );
    await fireEvent.press(getByLabelText('重新加载训练'));
    await fireEvent.press(getByLabelText('返回上一页'));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the session, current exercise, completed sets and progress', async () => {
    const session = buildSession({
      sessionExercises: [
        buildExercise({
          sets: [buildWorkoutSet()],
        }),
        buildExercise({
          id: 'session-exercise-press' as SessionExerciseId,
          sourceExerciseId: 'exercise-press' as ExerciseId,
          exerciseNameSnapshot: '哑铃肩推',
          position: 2,
        }),
      ],
    });
    const { getByText, getAllByText, getByLabelText } = await render(
      <WorkoutSessionScreenContent
        state={buildReadyState(session)}
        controls={buildControls()}
        onBack={jest.fn()}
      />,
    );

    expect(getByText('Push')).toBeTruthy();
    expect(getByLabelText('训练状态：进行中')).toBeTruthy();
    expect(getByLabelText('陪练运行状态：训练中')).toBeTruthy();
    expect(getByText('动作 1 / 2')).toBeTruthy();
    expect(getByText('已完成 1 / 6 组')).toBeTruthy();
    expect(getAllByText('杠铃卧推')).toHaveLength(2);
    expect(getByText('哑铃肩推')).toBeTruthy();
    expect(getByText('80 kg × 10 次')).toBeTruthy();
    expect(getByText('已完成 0 / 8 次')).toBeTruthy();
  });

  it.each([
    ['draft', '草稿'],
    ['completed', '已完成'],
    ['cancelled', '已取消'],
  ] as const)('shows %s sessions as read-only', async (status, label) => {
    const session = buildSessionForStatus(status);
    const { getByLabelText, queryByLabelText } = await render(
      <WorkoutSessionScreenContent
        state={buildReadyState(session)}
        controls={buildControls()}
        onBack={jest.fn()}
      />,
    );

    expect(getByLabelText(`训练状态：${label}`)).toBeTruthy();
    expect(queryByLabelText('完成当前组')).toBeNull();
    expect(getByLabelText('重量输入').props.editable).toBe(false);
  });

  it.each([
    ['running', '休息进行中'],
    ['paused', '休息已暂停'],
    ['completed', '休息已结束'],
  ] as const)('shows the existing %s timer status', async (status, label) => {
    const state = buildReadyState(buildSession(), status);
    const { getByLabelText, getByText } = await render(
      <WorkoutSessionScreenContent
        state={state}
        controls={buildControls()}
        onBack={jest.fn()}
      />,
    );

    expect(getByText(label)).toBeTruthy();
    expect(getByLabelText(`休息计时状态：${label}`)).toBeTruthy();
  });

  it('connects exercise controls without exposing manual completion', async () => {
    const requestSkipExercise = jest.fn();
    const selectExercise = jest.fn(async () => undefined);
    const session = buildSession({
      sessionExercises: [
        buildExercise(),
        buildExercise({
          id: SECOND_EXERCISE_ID,
          sourceExerciseId: 'exercise-press' as ExerciseId,
          exerciseNameSnapshot: '哑铃肩推',
          position: 2,
        }),
      ],
    });
    const { getByLabelText, queryByLabelText } = await render(
      <WorkoutSessionScreenContent
        state={buildReadyState(session)}
        controls={buildControls({
          requestSkipExercise,
          selectExercise,
        })}
        onBack={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('跳过动作杠铃卧推'));
    await fireEvent.press(getByLabelText('切换到动作哑铃肩推'));

    expect(queryByLabelText('完成当前组')).toBeNull();
    expect(queryByLabelText('次数输入')).toBeNull();
    expect(queryByLabelText('完成动作杠铃卧推')).toBeNull();
    expect(requestSkipExercise).toHaveBeenCalledTimes(1);
    expect(selectExercise).toHaveBeenCalledWith(SECOND_EXERCISE_ID);
  });

  it('connects runtime start, pause and resume controls', async () => {
    const startWorkout = jest.fn(async () => undefined);
    const pauseWorkout = jest.fn();
    const resumeWorkout = jest.fn();
    const draftState = buildReadyState(buildSessionForStatus('draft'));
    const { getByLabelText, rerender } = await render(
      <WorkoutSessionScreenContent
        state={draftState}
        controls={buildControls({ startWorkout })}
        onBack={jest.fn()}
      />,
    );

    expect(getByLabelText('陪练运行状态：未开始')).toBeTruthy();
    await fireEvent.press(getByLabelText('开始训练'));
    expect(startWorkout).toHaveBeenCalledTimes(1);

    await rerender(
      <WorkoutSessionScreenContent
        state={buildReadyState(buildSession(), undefined, 'running')}
        controls={buildControls({ pauseWorkout })}
        onBack={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('暂停训练'));
    expect(pauseWorkout).toHaveBeenCalledTimes(1);

    await rerender(
      <WorkoutSessionScreenContent
        state={buildReadyState(buildSession(), undefined, 'paused')}
        controls={buildControls({ resumeWorkout })}
        onBack={jest.fn()}
      />,
    );
    expect(getByLabelText('陪练运行状态：训练暂停')).toBeTruthy();
    await fireEvent.press(getByLabelText('继续训练'));
    expect(resumeWorkout).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['running', '训练中'],
    ['paused', '训练暂停'],
    ['set_completion_pending', '正在确认本组完成'],
    ['resting', '休息中'],
    ['exercise_completion_pending', '正在保存训练结果'],
    ['completed', '训练完成'],
  ] as const)(
    'maps companion %s phase to stable UI copy',
    async (phase, copy) => {
      const base = buildReadyState(buildSession());
      const { getByLabelText } = await render(
        <WorkoutSessionScreenContent
          state={{
            ...base,
            companionRuntime: base.companionRuntime
              ? { ...base.companionRuntime, phase }
              : undefined,
          }}
          controls={buildControls()}
          onBack={jest.fn()}
        />,
      );

      expect(getByLabelText(`陪练运行状态：${copy}`)).toBeTruthy();
    },
  );

  it('shows the persisted resting countdown and next set', async () => {
    const base = buildReadyState(buildSession(), 'running');
    const { getByLabelText, getByText } = await render(
      <WorkoutSessionScreenContent
        state={{
          ...base,
          companionRuntime: base.companionRuntime
            ? {
                ...base.companionRuntime,
                phase: 'resting',
                restRemainingSeconds: 85,
              }
            : undefined,
        }}
        controls={buildControls()}
        onBack={jest.fn()}
      />,
    );

    expect(getByLabelText('休息剩余时间')).toHaveTextContent('01:25');
    expect(getByText('下一组：杠铃卧推 · 第 1 组')).toBeTruthy();
  });

  it('confirms skipping with the approved data-retention copy', async () => {
    const cancelSkipExercise = jest.fn();
    const confirmSkipExercise = jest.fn(async () => undefined);
    const { getByLabelText, getByText } = await render(
      <WorkoutSessionScreenContent
        state={{ ...buildReadyState(buildSession()), isConfirmingSkip: true }}
        controls={buildControls({
          cancelSkipExercise,
          confirmSkipExercise,
        })}
        onBack={jest.fn()}
      />,
    );

    expect(getByText('跳过杠铃卧推？')).toBeTruthy();
    expect(getByText('已完成的组会保留。')).toBeTruthy();

    await fireEvent.press(getByLabelText('取消跳过动作'));
    await fireEvent.press(getByLabelText('确认跳过动作杠铃卧推'));

    expect(cancelSkipExercise).toHaveBeenCalledTimes(1);
    expect(confirmSkipExercise).toHaveBeenCalledTimes(1);
  });

  it('requires a second confirmation before cancelling a workout', async () => {
    const requestCancelSession = jest.fn();
    const confirmCancelSession = jest.fn(async () => undefined);
    const { getByLabelText, getByText, rerender } = await render(
      <WorkoutSessionScreenContent
        state={{ ...buildReadyState(buildSession()), endFlow: 'options' }}
        controls={buildControls({
          requestCancelSession,
          confirmCancelSession,
        })}
        onBack={jest.fn()}
      />,
    );

    expect(getByText('结束本次训练？')).toBeTruthy();
    await fireEvent.press(getByLabelText('请求放弃本次训练'));
    expect(requestCancelSession).toHaveBeenCalledTimes(1);

    await rerender(
      <WorkoutSessionScreenContent
        state={{
          ...buildReadyState(buildSession()),
          endFlow: 'confirm_cancel',
        }}
        controls={buildControls({ confirmCancelSession })}
        onBack={jest.fn()}
      />,
    );

    expect(getByText('放弃本次训练？')).toBeTruthy();
    expect(
      getByText('已完成的组会保留为已取消记录，但不会进入正式统计。'),
    ).toBeTruthy();
    await fireEvent.press(getByLabelText('确认放弃本次训练'));

    expect(confirmCancelSession).toHaveBeenCalledTimes(1);
  });

  it('does not expose completion actions when no exercise is executable', async () => {
    const { queryByLabelText } = await render(
      <WorkoutSessionScreenContent
        state={buildReadyState(
          buildSession({
            sessionExercises: [buildExercise({ isCompleted: true })],
          }),
        )}
        controls={buildControls()}
        onBack={jest.fn()}
      />,
    );

    expect(queryByLabelText('完成当前组')).toBeNull();
    expect(queryByLabelText('完成动作杠铃卧推')).toBeNull();
  });
});

describe('useWorkoutSessionScreen', () => {
  beforeEach(() => {
    mockFocusCallback = null;
    mockAppStateCallback = null;
    mockAppStateRemove.mockClear();
  });

  it('loads through the application boundary and retries initialization', async () => {
    const initializeDatabase = jest
      .fn<Promise<DatabaseStartupResult>, []>()
      .mockResolvedValueOnce({
        status: 'error',
        error: {
          code: 'database_unavailable',
          message: '本地数据库暂时不可用，请稍后重试。',
        },
      })
      .mockResolvedValueOnce(buildDatabaseStartupResult());
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { initializeDatabase }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    await act(async () => {
      result.current.controls.reload();
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(initializeDatabase).toHaveBeenCalledTimes(2);
  });

  it('subscribes once and stops external events after unmount', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const { result, unmount } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(createStatefulRepository(buildSession()), {
          workoutCompanionEventSource: source,
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(source.subscribe).toHaveBeenCalledTimes(1);

    await act(async () => unmount());
    expect(source.unsubscribe).toHaveBeenCalledTimes(1);
    source.emit(buildCompanionEvent(1));
  });

  it('serializes rapid reps and persists the target set exactly once', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const repository = createStatefulRepository(
      buildSession({
        sessionExercises: [
          buildExercise({ targetRepsMin: 2, targetRepsMax: 2 }),
        ],
      }),
    );
    const voiceAdapter: WorkoutVoiceFeedbackAdapter = {
      speak: jest.fn(async () => undefined),
    };
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          workoutCompanionEventSource: source,
          voiceAdapter,
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      source.emit(buildCompanionEvent(1));
      source.emit(buildCompanionEvent(2));
      await Promise.resolve();
    });

    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(getReadyState(result.current.state).companionRuntime?.phase).toBe(
        'resting',
      ),
    );
    expect(
      getReadyState(result.current.state).data.session.sessionExercises[0]
        ?.sets,
    ).toEqual([
      expect.objectContaining({ actualReps: 2, weight: 0, isCompleted: true }),
    ]);
    expect(voiceAdapter.speak).toHaveBeenCalledTimes(3);
  });

  it('blocks target persistence for invalid weight and retries the same event', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const repository = createStatefulRepository(
      buildSession({
        sessionExercises: [
          buildExercise({ targetRepsMin: 1, targetRepsMax: 1 }),
        ],
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          workoutCompanionEventSource: source,
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => result.current.controls.updateWeight('invalid'));
    await act(async () => {
      source.emit(buildCompanionEvent(1));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getReadyState(result.current.state).canRetryCompanionEvent).toBe(
        true,
      ),
    );
    expect(repository.update).not.toHaveBeenCalled();

    await act(async () => result.current.controls.updateWeight('82.5'));
    await act(async () => result.current.controls.retryCompanionEvent());
    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    expect(
      getReadyState(result.current.state).data.session.sessionExercises[0]
        ?.sets[0]?.weight,
    ).toBe(82.5);
  });

  it('keeps set completion pending until RestTimer persistence retry succeeds', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const repository = createStatefulRepository(
      buildSession({
        sessionExercises: [
          buildExercise({
            targetSets: 2,
            targetRepsMin: 1,
            targetRepsMax: 1,
          }),
        ],
      }),
    );
    const restTimerRepository = buildRestTimerRepository();
    const startIfNoActiveTimer: jest.MockedFunction<
      RestTimerRepository['startIfNoActiveTimer']
    > = jest
      .fn()
      .mockRejectedValueOnce(new Error('timer write failed'))
      .mockRejectedValueOnce(new Error('timer retry failed'))
      .mockImplementation(async (input) => ({
        status: 'started' as const,
        timer: input.timer,
      }));
    const voiceAdapter: WorkoutVoiceFeedbackAdapter = {
      speak: jest.fn(async () => undefined),
    };
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          restTimerRepository: {
            ...restTimerRepository,
            startIfNoActiveTimer,
          },
          workoutCompanionEventSource: source,
          voiceAdapter,
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      source.emit(buildCompanionEvent(1));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getReadyState(result.current.state).companionRuntime?.phase).toBe(
        'set_completion_pending',
      ),
    );
    expect(repository.update).toHaveBeenCalledTimes(1);

    await act(async () => result.current.controls.retryCompanionEvent());
    await waitFor(() => expect(startIfNoActiveTimer).toHaveBeenCalledTimes(2));
    expect(getReadyState(result.current.state).companionRuntime?.phase).toBe(
      'set_completion_pending',
    );

    await act(async () => result.current.controls.retryCompanionEvent());
    await waitFor(() =>
      expect(getReadyState(result.current.state).companionRuntime?.phase).toBe(
        'resting',
      ),
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(voiceAdapter.speak).toHaveBeenCalledTimes(2);
  });

  it('recovers exercise completion pending without creating another set', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const repository = createRepositoryFailingUpdateCalls(
      buildSession({
        sessionExercises: [
          buildExercise({
            targetSets: 1,
            targetRepsMin: 1,
            targetRepsMax: 1,
          }),
        ],
      }),
      new Set([2]),
    );
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          workoutCompanionEventSource: source,
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      source.emit(buildCompanionEvent(1));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(getReadyState(result.current.state).companionRuntime?.phase).toBe(
        'exercise_completion_pending',
      ),
    );

    await act(async () => {
      source.emit(buildCompanionEvent(2));
      await Promise.resolve();
    });
    expect(repository.update).toHaveBeenCalledTimes(2);

    await act(async () => result.current.controls.retryCompanionEvent());
    await waitFor(() =>
      expect(getReadyState(result.current.state).navigationIntent).toBe(
        'summary',
      ),
    );
    const ready = getReadyState(result.current.state);
    expect(ready.data.session.status).toBe('completed');
    expect(ready.data.session.sessionExercises[0]?.sets).toHaveLength(1);
  });

  it('isolates companion voice failure after persisted set completion', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const repository = createStatefulRepository(
      buildSession({
        sessionExercises: [
          buildExercise({ targetRepsMin: 1, targetRepsMax: 1 }),
        ],
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          workoutCompanionEventSource: source,
          voiceAdapter: {
            speak: jest.fn(async () => {
              throw new Error('voice unavailable');
            }),
          },
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      source.emit(buildCompanionEvent(1));
      await Promise.resolve();
    });
    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    expect(getReadyState(result.current.state).companionRuntime?.phase).toBe(
      'resting',
    );
  });

  it('rebinds the Event Source when Runtime and Session are replaced', async () => {
    const source = new ControlledWorkoutCompanionEventSource();
    const secondSessionId = 'session-pull' as WorkoutSessionId;
    const secondExerciseId = 'session-exercise-row' as SessionExerciseId;
    const first = buildSession({
      sessionExercises: [
        buildExercise(),
        buildExercise({
          id: SECOND_EXERCISE_ID,
          position: 2,
          sourceExerciseId: 'exercise-press' as ExerciseId,
          exerciseNameSnapshot: '哑铃肩推',
        }),
      ],
    });
    const second = buildSession({
      id: secondSessionId,
      currentSessionExerciseId: secondExerciseId,
      sessionExercises: [
        buildExercise({
          id: secondExerciseId,
          sessionId: secondSessionId,
          sourceExerciseId: 'exercise-row' as ExerciseId,
          exerciseNameSnapshot: '杠铃划船',
        }),
      ],
    });
    const repository = createMappedRepository([first, second]);
    const { result, rerender } = await renderHook(
      ({ id }: { readonly id: WorkoutSessionId }) =>
        useWorkoutSessionScreen(
          { id },
          buildDependencies(repository, {
            workoutCompanionEventSource: source,
          }),
        ),
      { initialProps: { id: SESSION_ID } },
    );

    await waitFor(() => expect(source.subscribe).toHaveBeenCalledTimes(1));
    await act(async () =>
      result.current.controls.selectExercise(SECOND_EXERCISE_ID),
    );
    await waitFor(() => expect(source.subscribe).toHaveBeenCalledTimes(2));
    expect(source.unsubscribe).toHaveBeenCalledTimes(1);

    await rerender({ id: secondSessionId });
    await waitFor(() =>
      expect(getReadyState(result.current.state).data.session.id).toBe(
        secondSessionId,
      ),
    );
    expect(source.subscribe).toHaveBeenCalledTimes(3);
    expect(source.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('counts down locally and completes the persisted RestTimer once', async () => {
    const restTimerRepository = createStatefulRestTimerRepository(
      buildTimer({ targetEndAt: '2026-07-20T01:20:02.000Z' }),
    );
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(createStatefulRepository(buildSession()), {
          restTimerRepository,
        }),
      ),
    );

    await waitFor(() =>
      expect(
        getReadyState(result.current.state).companionRuntime
          ?.restRemainingSeconds,
      ).toBe(2),
    );
    await waitFor(
      () =>
        expect(
          getReadyState(result.current.state).companionRuntime?.phase,
        ).toBe('running'),
      { timeout: 4000 },
    );
    expect(restTimerRepository.update).toHaveBeenCalledTimes(1);
    expect(getReadyState(result.current.state).data.restTimerStatus).toBe(
      'completed',
    );
  });

  it('records a completed set once and refreshes durable session data', async () => {
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          createWorkoutSetId: () => 'workout-set-new',
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      result.current.controls.updateWeight('82.5');
      result.current.controls.updateActualReps('8');
    });
    await act(async () => {
      await result.current.controls.recordSet();
    });

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(
      getReadyState(result.current.state).runtime.currentExercise?.sets,
    ).toEqual([
      expect.objectContaining({
        id: 'workout-set-new',
        weight: 82.5,
        actualReps: 8,
        isCompleted: true,
      }),
    ]);
    expect(getReadyState(result.current.state).runtime.completedSets).toBe(1);
    expect(getReadyState(result.current.state).runtime.currentSet).toBe(2);
    expect(getReadyState(result.current.state).runtime.currentSetNumber).toBe(
      2,
    );
    expect(
      getReadyState(result.current.state).data.session.currentSetNumber,
    ).toBe(2);
  });

  it('prevents repeated set writes while persistence is pending', async () => {
    let resolveUpdate: ((session: WorkoutSession) => void) | undefined;
    const repository = createStatefulRepository(buildSession(), {
      update: jest.fn(
        (session: WorkoutSession) =>
          new Promise<WorkoutSession>((resolve) => {
            resolveUpdate = () => resolve(session);
          }),
      ),
    });
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    let firstSave: Promise<void> = Promise.resolve();
    await act(async () => {
      firstSave = result.current.controls.recordSet();
      void result.current.controls.recordSet();
      await Promise.resolve();
    });

    expect(repository.update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.(buildSession());
      await firstSave;
    });
  });

  it('requires skip confirmation and refreshes exercise states', async () => {
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => result.current.controls.confirmSkipExercise());
    expect(repository.update).not.toHaveBeenCalled();

    await act(async () => result.current.controls.requestSkipExercise());
    expect(getReadyState(result.current.state).isConfirmingSkip).toBe(true);
    await act(async () => result.current.controls.cancelSkipExercise());
    await act(async () => result.current.controls.confirmSkipExercise());
    expect(repository.update).not.toHaveBeenCalled();

    await act(async () => result.current.controls.requestSkipExercise());
    await act(async () => result.current.controls.confirmSkipExercise());
    expect(
      getReadyState(result.current.state).runtime.currentExercise?.isSkipped,
    ).toBe(true);

    await act(async () => result.current.controls.resumeExercise());
    expect(
      getReadyState(result.current.state).runtime.currentExercise?.isSkipped,
    ).toBe(false);

    await act(async () => result.current.controls.completeExercise());
    expect(
      getReadyState(result.current.state).runtime.currentExercise?.isCompleted,
    ).toBe(true);
    expect(repository.update).toHaveBeenCalledTimes(3);
  });

  it('persists selecting the next exercise after completing the current one', async () => {
    const repository = createStatefulRepository(
      buildSession({
        sessionExercises: [
          buildExercise(),
          buildExercise({
            id: SECOND_EXERCISE_ID,
            sourceExerciseId: 'exercise-press' as ExerciseId,
            exerciseNameSnapshot: '哑铃肩推',
            position: 2,
          }),
        ],
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => result.current.controls.completeExercise());
    await act(async () =>
      result.current.controls.selectExercise(SECOND_EXERCISE_ID),
    );

    const ready = getReadyState(result.current.state);
    expect(ready.runtime.currentExercise?.id).toBe(SECOND_EXERCISE_ID);
    expect(ready.data.session.currentSessionExerciseId).toBe(
      SECOND_EXERCISE_ID,
    );
    expect(ready.data.session.currentSetNumber).toBe(1);
    expect(repository.update).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid set input without writing', async () => {
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => result.current.controls.updateActualReps('8.5'));
    await act(async () => result.current.controls.recordSet());

    expect(repository.update).not.toHaveBeenCalled();
    expect(getReadyState(result.current.state).actionError).toBe(
      '请输入有效的非负重量和非负整数次数。',
    );
  });

  it('loads an existing timer as display-only session state', async () => {
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { restTimer: buildTimer() }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(getReadyState(result.current.state).data.restTimerStatus).toBe(
      'running',
    );
    expect(getReadyState(result.current.state).runtime.status).toBe('running');
  });

  it('uses the runtime engine state from rest timer recovery', async () => {
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, {
          restTimer: buildTimer({
            status: 'paused',
            targetEndAt: undefined,
            pausedRemainingSeconds: 45,
          }),
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const ready = getReadyState(result.current.state);
    expect(ready.data.session.status).toBe('in_progress');
    expect(ready.data.restTimerStatus).toBe('paused');
    expect(ready.runtime.status).toBe('paused');
    expect(ready.runtime.currentSessionExerciseId).toBe(EXERCISE_ID);
    expect(ready.runtime.currentSetNumber).toBe(1);
  });

  it('restores a persisted paused runtime through the application hook', async () => {
    const session = buildSession();
    const runtimeSnapshotRepository = buildWorkoutRuntimeSnapshotRepository({
      ...createWorkoutRuntimeSnapshot(session),
      status: 'paused',
      updatedAt: ACTION_AT,
    });
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(createStatefulRepository(session), {
          runtimeSnapshotRepository,
        }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(getReadyState(result.current.state).runtime).toMatchObject({
      status: 'paused',
      currentSessionExerciseId: EXERCISE_ID,
      currentSetNumber: 1,
    });
  });

  it.each([
    ['running', 'running', 'running'],
    ['paused', 'paused', 'paused'],
    ['skipped', 'running', undefined],
    ['cancelled', 'running', undefined],
    ['completed', 'running', 'completed'],
  ] as const)(
    'gives persisted %s RestTimer state priority over a paused snapshot',
    async (timerStatus, expectedRuntimeStatus, expectedDisplayStatus) => {
      const session = buildSession();
      const runtimeSnapshotRepository = buildWorkoutRuntimeSnapshotRepository({
        ...createWorkoutRuntimeSnapshot(session),
        status: 'paused',
        updatedAt: ACTION_AT,
      });
      const { result } = await renderHook(() =>
        useWorkoutSessionScreen(
          { id: SESSION_ID },
          buildDependencies(createStatefulRepository(session), {
            restTimer: buildTimer({
              status: timerStatus,
              targetEndAt:
                timerStatus === 'paused'
                  ? undefined
                  : '2026-07-20T01:21:30.000Z',
              pausedRemainingSeconds: timerStatus === 'paused' ? 45 : undefined,
            }),
            runtimeSnapshotRepository,
          }),
        ),
      );

      await waitFor(() => expect(result.current.state.status).toBe('ready'));

      const ready = getReadyState(result.current.state);
      expect(ready.runtime.status).toBe(expectedRuntimeStatus);
      expect(ready.runtime.restTimerStatus).toBe(timerStatus);
      expect(ready.data.restTimerStatus).toBe(expectedDisplayStatus);
    },
  );

  it('starts a draft workout through the application boundary', async () => {
    const repository = createStatefulRepository(buildSessionForStatus('draft'));
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(getReadyState(result.current.state).runtime.status).toBe('idle');

    await act(async () => {
      await result.current.controls.startWorkout();
    });

    const ready = getReadyState(result.current.state);
    expect(ready.runtime.status).toBe('running');
    expect(ready.data.session.status).toBe('in_progress');
  });

  it('pauses and resumes runtime state without writing workout facts', async () => {
    const repository = createStatefulRepository(buildSession());
    const runtimeSnapshotRepository = buildWorkoutRuntimeSnapshotRepository();
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { runtimeSnapshotRepository }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => result.current.controls.pauseWorkout());

    expect(getReadyState(result.current.state).runtime.status).toBe('paused');
    expect(repository.update).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(runtimeSnapshotRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paused', updatedAt: ACTION_AT }),
      ),
    );

    await act(async () => result.current.controls.updateActualReps('12'));
    expect(getReadyState(result.current.state).setDraft.actualReps).toBe('8');

    await act(async () => result.current.controls.resumeWorkout());

    expect(getReadyState(result.current.state).runtime.status).toBe('running');
    expect(repository.update).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(runtimeSnapshotRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running', updatedAt: ACTION_AT }),
      ),
    );
  });

  it('surfaces snapshot persistence failure instead of treating it as saved', async () => {
    const repository = createStatefulRepository(buildSession());
    const runtimeSnapshotRepository = buildWorkoutRuntimeSnapshotRepository();
    runtimeSnapshotRepository.save.mockResolvedValue({
      success: false,
      reason: 'snapshot_persist_failed',
      error: new Error('disk unavailable'),
    });
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { runtimeSnapshotRepository }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await waitFor(() =>
      expect(getReadyState(result.current.state).actionError).toBe(
        '训练运行状态保存失败。当前训练数据不会丢失，请重试。',
      ),
    );
  });

  it('keeps the set write when voice feedback fails', async () => {
    const voiceAdapter: WorkoutVoiceFeedbackAdapter = {
      speak: jest.fn(async () => {
        throw new Error('voice unavailable');
      }),
    };
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { voiceAdapter }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => result.current.controls.recordSet());

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(voiceAdapter.speak).toHaveBeenCalled();
    expect(
      getReadyState(result.current.state).runtime.currentExercise?.sets,
    ).toHaveLength(1);
  });

  it('silently refreshes durable session state when the page regains focus', async () => {
    const initialSession = buildSession();
    const refreshedSession = buildSession({
      currentSessionExerciseId: SECOND_EXERCISE_ID,
      currentSetNumber: 1,
      sessionExercises: [
        buildExercise(),
        buildExercise({
          id: SECOND_EXERCISE_ID,
          sourceExerciseId: 'exercise-press' as ExerciseId,
          exerciseNameSnapshot: '哑铃肩推',
          position: 2,
        }),
      ],
    });
    const findById = jest
      .fn()
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(refreshedSession);
    const repository = createStatefulRepository(initialSession, { findById });
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => mockFocusCallback?.());
    expect(findById).toHaveBeenCalledTimes(1);

    await act(async () => mockFocusCallback?.());
    await waitFor(() =>
      expect(
        getReadyState(result.current.state).runtime.currentExercise?.id,
      ).toBe(SECOND_EXERCISE_ID),
    );

    expect(findById).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe('ready');
  });

  it('refreshes an expired timer when the app becomes active', async () => {
    const findBySessionId = jest
      .fn()
      .mockResolvedValueOnce(buildTimer())
      .mockResolvedValueOnce(buildTimer({ status: 'completed' }));
    const restTimerRepository: RestTimerRepository = {
      ...buildRestTimerRepository(),
      findBySessionId,
    };
    const repository = createStatefulRepository(buildSession());
    const { result, unmount } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { restTimerRepository }),
      ),
    );

    await waitFor(() =>
      expect(getReadyState(result.current.state).data.restTimerStatus).toBe(
        'running',
      ),
    );
    await act(async () => {
      result.current.controls.updateWeight('82.5');
      result.current.controls.updateActualReps('8');
    });
    await act(async () => mockAppStateCallback?.('active'));
    await waitFor(() =>
      expect(getReadyState(result.current.state).data.restTimerStatus).toBe(
        'completed',
      ),
    );
    expect(getReadyState(result.current.state).setDraft).toEqual({
      weight: '82.5',
      actualReps: '8',
    });

    await act(async () => unmount());
    expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
  });

  it('prevents a pending silent refresh from overwriting a completed set', async () => {
    const pendingTimerRead = createDeferred<RestTimer | null>();
    const findBySessionId = jest
      .fn<Promise<RestTimer | null>, [WorkoutSessionId]>()
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce(pendingTimerRead.promise)
      .mockResolvedValue(null);
    const restTimerRepository: RestTimerRepository = {
      ...buildRestTimerRepository(),
      findBySessionId,
    };
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { restTimerRepository }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => mockFocusCallback?.());
    await act(async () => mockFocusCallback?.());
    await waitFor(() => expect(findBySessionId).toHaveBeenCalledTimes(2));

    await act(async () => result.current.controls.recordSet());
    await waitFor(() => expect(findBySessionId).toHaveBeenCalledTimes(3));
    await act(async () => {
      pendingTimerRead.resolve(null);
      await pendingTimerRead.promise;
      await Promise.resolve();
    });

    const ready = getReadyState(result.current.state);
    expect(ready.runtime.currentExercise?.sets).toHaveLength(1);
    expect(ready.data.session.currentSetNumber).toBe(2);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('queues a refresh when a mutation interrupts silent-refresh startup', async () => {
    const findBySessionId = jest.fn(async () => null);
    const restTimerRepository: RestTimerRepository = {
      ...buildRestTimerRepository(),
      findBySessionId,
    };
    const repository = createStatefulRepository(buildSession());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { restTimerRepository }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => mockFocusCallback?.());
    await act(async () => {
      mockFocusCallback?.();
      await result.current.controls.recordSet();
    });

    await waitFor(() => expect(findBySessionId).toHaveBeenCalledTimes(2));
    expect(
      getReadyState(result.current.state).runtime.currentExercise?.sets,
    ).toHaveLength(1);
    expect(
      getReadyState(result.current.state).data.session.currentSetNumber,
    ).toBe(2);
  });

  it('completes once, preserves workout facts and exposes summary navigation', async () => {
    const session = buildSession({
      notes: '保留这次训练备注',
      sessionExercises: [
        buildExercise({ sets: [buildWorkoutSet()], isCompleted: true }),
      ],
    });
    const repository = createStatefulRepository(session);
    const restTimerRepository = createStatefulRestTimerRepository(buildTimer());
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { restTimerRepository }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      result.current.controls.requestEndSession();
      const firstCompletion = result.current.controls.confirmCompleteSession();
      const repeatedCompletion =
        result.current.controls.confirmCompleteSession();
      await Promise.all([firstCompletion, repeatedCompletion]);
    });

    expect(repository.update).toHaveBeenCalledTimes(1);
    const submitted = repository.update.mock.calls[0]?.[0];
    expect(submitted).toMatchObject({
      status: 'completed',
      endedAt: ACTION_AT,
      notes: '保留这次训练备注',
      currentSessionExerciseId: EXERCISE_ID,
      currentSetNumber: 1,
    });
    expect(submitted?.sessionExercises[0]?.sets).toEqual([buildWorkoutSet()]);

    const ready = getReadyState(result.current.state);
    expect(ready.data.session.status).toBe('completed');
    expect(ready.navigationIntent).toBe('summary');
    expect(restTimerRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rest-timer-1',
        status: 'cancelled',
      }),
      'running',
      ACTION_AT,
    );
  });

  it('cancels only after confirmation and preserves completed sets', async () => {
    const session = buildSession({
      sessionExercises: [buildExercise({ sets: [buildWorkoutSet()] })],
    });
    const repository = createStatefulRepository(session);
    const restTimerRepository = createStatefulRestTimerRepository(
      buildTimer({
        status: 'paused',
        targetEndAt: undefined,
        pausedRemainingSeconds: 45,
      }),
    );
    const { result } = await renderHook(() =>
      useWorkoutSessionScreen(
        { id: SESSION_ID },
        buildDependencies(repository, { restTimerRepository }),
      ),
    );

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    await act(async () => {
      await result.current.controls.confirmCancelSession();
    });
    expect(repository.update).not.toHaveBeenCalled();

    await act(async () => {
      result.current.controls.requestEndSession();
      result.current.controls.requestCancelSession();
      await result.current.controls.confirmCancelSession();
    });

    await waitFor(() =>
      expect(getReadyState(result.current.state).data.session.status).toBe(
        'cancelled',
      ),
    );
    const ready = getReadyState(result.current.state);
    expect(ready.data.session.status).toBe('cancelled');
    expect(ready.runtime.currentExercise?.sets).toEqual([buildWorkoutSet()]);
    expect(ready.navigationIntent).toBe('today');
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(restTimerRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rest-timer-1',
        status: 'cancelled',
        pausedRemainingSeconds: 45,
      }),
      'paused',
      ACTION_AT,
    );
  });
});

function buildReadyState(
  session: WorkoutSession,
  restTimerStatus?: 'running' | 'paused' | 'completed',
  runtimeStatus: WorkoutRuntimeSnapshot['status'] = createWorkoutRuntimeSnapshot(
    session,
    restTimerStatus,
  ).status,
): Extract<WorkoutSessionScreenState, { status: 'ready' }> {
  const runtime = {
    ...createWorkoutRuntimeSnapshot(session, restTimerStatus),
    status: runtimeStatus,
  };
  const companionRuntime =
    session.status === 'in_progress' &&
    session.sessionExercises.some(
      (exercise) =>
        exercise.isEnabled && !exercise.isSkipped && !exercise.isCompleted,
    )
      ? createWorkoutCompanionRuntimeState(session)
      : undefined;

  return {
    status: 'ready',
    data: createWorkoutSessionScreenData(session, restTimerStatus),
    runtime,
    companionRuntime:
      runtimeStatus === 'paused' && companionRuntime
        ? pauseWorkoutCompanionRuntime(companionRuntime)
        : companionRuntime,
    setDraft: { weight: '80', actualReps: '10' },
    isMutating: false,
    isConfirmingSkip: false,
    endFlow: 'closed',
  };
}

function buildControls(
  overrides: Partial<WorkoutSessionScreenControls> = {},
): WorkoutSessionScreenControls {
  return {
    reload: jest.fn(),
    startWorkout: jest.fn(async () => undefined),
    pauseWorkout: jest.fn(),
    resumeWorkout: jest.fn(),
    updateWeight: jest.fn(),
    updateActualReps: jest.fn(),
    recordSet: jest.fn(async () => undefined),
    selectExercise: jest.fn(async () => undefined),
    requestSkipExercise: jest.fn(),
    cancelSkipExercise: jest.fn(),
    confirmSkipExercise: jest.fn(async () => undefined),
    resumeExercise: jest.fn(async () => undefined),
    completeExercise: jest.fn(async () => undefined),
    retryCompanionEvent: jest.fn(),
    finishRest: jest.fn(async () => undefined),
    requestEndSession: jest.fn(),
    continueSession: jest.fn(),
    requestCancelSession: jest.fn(),
    confirmCancelSession: jest.fn(async () => undefined),
    confirmCompleteSession: jest.fn(async () => undefined),
    clearNavigationIntent: jest.fn(),
    ...overrides,
  };
}

function buildSession(
  overrides: Partial<Extract<WorkoutSession, { status: 'in_progress' }>> = {},
): Extract<WorkoutSession, { status: 'in_progress' }> {
  return {
    id: SESSION_ID,
    workoutNameSnapshot: 'Push',
    status: 'in_progress',
    sessionExercises: [buildExercise()],
    currentSessionExerciseId: EXERCISE_ID,
    currentSetNumber: 1,
    startedAt: STARTED_AT,
    createdAt: CREATED_AT,
    updatedAt: STARTED_AT,
    ...overrides,
  };
}

function buildSessionForStatus(
  status: 'draft' | 'completed' | 'cancelled',
): WorkoutSession {
  const active = buildSession();

  switch (status) {
    case 'draft':
      return {
        ...active,
        status,
        startedAt: undefined,
      };
    case 'completed':
      return { ...active, status, endedAt: ACTION_AT };
    case 'cancelled':
      return { ...active, status, endedAt: ACTION_AT };
  }
}

function buildExercise(
  overrides: Partial<SessionExercise> = {},
): SessionExercise {
  return {
    id: EXERCISE_ID,
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
    id: 'workout-set-1' as WorkoutSetId,
    sessionExerciseId: EXERCISE_ID,
    setNumber: 1,
    setType: 'normal',
    actualReps: 10,
    weight: 80,
    isCompleted: true,
    isExtraSet: false,
    completedAt: ACTION_AT,
    ...overrides,
  };
}

function createStatefulRepository(
  initialSession: WorkoutSession,
  overrides: Partial<WorkoutSessionRepository> = {},
): WorkoutSessionRepository & {
  readonly update: jest.MockedFunction<WorkoutSessionRepository['update']>;
} {
  let storedSession = initialSession;
  const update = jest.fn(async (session: WorkoutSession) => {
    if (overrides.update) {
      return overrides.update(session);
    }

    storedSession = session;
    return session;
  });

  return {
    save: async (session) => session,
    findById: async () => storedSession,
    findActiveSession: async () => storedSession,
    findLatestSession: async () => storedSession,
    listByStatuses: async () => [storedSession],
    findRecoverableSession: async () => storedSession,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    ...overrides,
    update,
  };
}

function createRepositoryFailingUpdateCalls(
  initialSession: WorkoutSession,
  failingCalls: ReadonlySet<number>,
): WorkoutSessionRepository & {
  readonly update: jest.MockedFunction<WorkoutSessionRepository['update']>;
} {
  let storedSession = initialSession;
  let updateCount = 0;
  const update = jest.fn(async (session: WorkoutSession) => {
    updateCount += 1;

    if (failingCalls.has(updateCount)) {
      throw new Error(`update ${updateCount} failed`);
    }

    storedSession = session;
    return session;
  });

  return {
    save: async (session) => session,
    findById: async () => storedSession,
    findActiveSession: async () => storedSession,
    findLatestSession: async () => storedSession,
    listByStatuses: async () => [storedSession],
    findRecoverableSession: async () => storedSession,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    update,
  };
}

function createMappedRepository(
  sessions: readonly WorkoutSession[],
): WorkoutSessionRepository {
  const stored = new Map(sessions.map((session) => [session.id, session]));

  return {
    save: async (session) => {
      stored.set(session.id, session);
      return session;
    },
    findById: async (id) => stored.get(id) ?? null,
    findActiveSession: async () =>
      [...stored.values()].find(
        (session) => session.status === 'in_progress',
      ) ?? null,
    findLatestSession: async () => [...stored.values()].at(-1) ?? null,
    listByStatuses: async () => [...stored.values()],
    findRecoverableSession: async () => [...stored.values()][0] ?? null,
    startIfNoActiveSession: async () => ({ status: 'started' }),
    update: async (session) => {
      stored.set(session.id, session);
      return session;
    },
  };
}

function buildDependencies(
  workoutSessionRepository: WorkoutSessionRepository,
  overrides: {
    readonly initializeDatabase?: () => Promise<DatabaseStartupResult>;
    readonly createWorkoutSetId?: () => string;
    readonly restTimer?: RestTimer;
    readonly restTimerRepository?: RestTimerRepository;
    readonly runtimeSnapshotRepository?: WorkoutRuntimeSnapshotRepository;
    readonly voiceAdapter?: WorkoutVoiceFeedbackAdapter;
    readonly workoutCompanionEventSource?: WorkoutCompanionEventSource;
  } = {},
) {
  return {
    initializeDatabase:
      overrides.initializeDatabase ??
      (async () => buildDatabaseStartupResult()),
    createWorkoutSessionRepository: () => workoutSessionRepository,
    createRestTimerRepository: () =>
      overrides.restTimerRepository ??
      buildRestTimerRepository(overrides.restTimer),
    createWorkoutRuntimeSnapshotRepository: () =>
      overrides.runtimeSnapshotRepository ??
      buildWorkoutRuntimeSnapshotRepository(),
    now: () => ACTION_AT,
    createWorkoutSetId:
      overrides.createWorkoutSetId ?? (() => 'workout-set-new'),
    voiceAdapter: overrides.voiceAdapter,
    workoutCompanionEventSource: overrides.workoutCompanionEventSource,
  };
}

class ControlledWorkoutCompanionEventSource implements WorkoutCompanionEventSource {
  private callback?: (event: unknown) => void;

  readonly subscribe = jest.fn((callback: (event: unknown) => void) => {
    this.callback = callback;
  });

  readonly unsubscribe = jest.fn(() => {
    this.callback = undefined;
  });

  emit(event: unknown): void {
    this.callback?.(event);
  }
}

function buildCompanionEvent(repNumber: number) {
  return {
    sessionId: SESSION_ID,
    sessionExerciseId: EXERCISE_ID,
    repNumber,
    timestamp: Date.parse(ACTION_AT) + repNumber,
    source: 'companion_event_source' as const,
  };
}

function buildDatabaseStartupResult(): Extract<
  DatabaseStartupResult,
  { readonly status: 'ready' }
> {
  return { status: 'ready', database: buildDatabase(), schemaVersion: 3 };
}

function buildDatabase(): DatabaseConnection {
  return {
    execAsync: async () => undefined,
    runAsync: async () => undefined,
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  };
}

function buildRestTimerRepository(timer?: RestTimer): RestTimerRepository {
  return {
    findBySessionId: async () => timer ?? null,
    startIfNoActiveTimer: async (input) => ({
      status: 'started',
      timer: input.timer,
    }),
    update: async (next) => next,
    completeIfExpired: async () => null,
  };
}

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

function createStatefulRestTimerRepository(
  initialTimer: RestTimer,
): RestTimerRepository & {
  readonly update: jest.MockedFunction<RestTimerRepository['update']>;
} {
  let storedTimer = initialTimer;
  const update: jest.MockedFunction<RestTimerRepository['update']> = jest.fn(
    async (next: RestTimer, _expectedStatus, _expectedUpdatedAt) => {
      storedTimer = next;
      return next;
    },
  );

  return {
    findBySessionId: async () => storedTimer,
    startIfNoActiveTimer: async (input) => ({
      status: 'started',
      timer: input.timer,
    }),
    update,
    completeIfExpired: async () => null,
  };
}

function buildTimer(overrides: Partial<RestTimer> = {}): RestTimer {
  return {
    id: 'rest-timer-1' as RestTimerId,
    sessionId: SESSION_ID,
    sessionExerciseId: EXERCISE_ID,
    originalDurationSeconds: 90,
    startedAt: ACTION_AT,
    targetEndAt: '2026-07-20T01:21:30.000Z',
    status: 'running',
    createdAt: ACTION_AT,
    updatedAt: ACTION_AT,
    ...overrides,
  };
}

function getReadyState(
  state: WorkoutSessionScreenState,
): Extract<WorkoutSessionScreenState, { status: 'ready' }> {
  if (state.status !== 'ready') {
    throw new Error('Expected WorkoutSession screen to be ready.');
  }
  return state;
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value) => resolvePromise?.(value),
  };
}
