/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type {
  Exercise,
  ExerciseId,
  ExerciseRepository,
} from '@/domain/exercise';
import type { DailyStatusRepository } from '@/domain/daily-status';
import type {
  TodayWorkoutPlan,
  TodayWorkoutPlanId,
  TodayWorkoutPlanRepository,
} from '@/domain/today-workout-plan';
import {
  createWorkoutTemplate,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import {
  type SessionExercise,
  type SessionExerciseId,
  type WorkoutSession,
  type WorkoutSessionId,
  type WorkoutSessionRepository,
} from '@/domain/workout-session';
import {
  createWorkoutSessionFromTemplate,
  addTodayPlanFromTemplate,
  createTodayDashboardRecommendation,
  createTodayDashboardWeeklySummary,
  loadTodayDashboard,
  startTodayPlan,
  type TodayDashboardData,
} from '@/features/workout-session/application/today-dashboard';
import type {
  TodayDashboardScreenControls,
  TodayDashboardScreenState,
} from '@/features/workout-session/application/use-today-dashboard';
import { TodayDashboardScreenContent } from '@/features/workout-session/screens/today-dashboard-screen';

const TEMPLATE_ID = 'template-push' as WorkoutTemplateId;
const TODAY_PLAN_ID = 'today-plan-push' as TodayWorkoutPlanId;
const SESSION_ID = 'session-push' as WorkoutSessionId;
const SESSION_EXERCISE_ID = 'session-exercise-bench' as SessionExerciseId;
const EXERCISE_ID = 'exercise-bench' as ExerciseId;
const CREATED_AT = '2026-07-20T01:00:00.000Z';

describe('Today Dashboard', () => {
  it('loads templates and an empty session entry for starting a workout', async () => {
    const result = await loadTodayDashboard({
      workoutSessionRepository: buildWorkoutSessionRepository(),
      workoutTemplateRepository: buildWorkoutTemplateRepository({
        list: jest.fn(async () => [buildTemplate()]),
      }),
      todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
      exerciseRepository: buildExerciseRepository(),
      dailyStatusRepository: buildDailyStatusRepository(),
    });

    expect(result).toEqual({
      status: 'ready',
      data: {
        sessionEntry: { status: 'none' },
        todayPlans: [],
        templates: [
          {
            id: TEMPLATE_ID,
            name: 'Push',
            exerciseCount: 1,
            totalTargetSets: 4,
          },
        ],
        dailyStatus: undefined,
        recentWorkout: undefined,
        weeklySummary: {
          completedWorkoutCount: 0,
          completedSetCount: 0,
          totalVolume: 0,
        },
        recommendation: undefined,
      },
    });
  });

  it.each(['draft', 'in_progress'] as const)(
    'prioritizes a recoverable %s session entry',
    async (status) => {
      const session = buildSession(status);
      const result = await loadTodayDashboard({
        workoutSessionRepository: buildWorkoutSessionRepository({
          findRecoverableSession: jest.fn(async () => session),
          findLatestSession: jest.fn(async () => buildSession('completed')),
        }),
        workoutTemplateRepository: buildWorkoutTemplateRepository({
          list: jest.fn(async () => [buildTemplate()]),
        }),
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
        exerciseRepository: buildExerciseRepository(),
        dailyStatusRepository: buildDailyStatusRepository(),
      });

      expect(result.status).toBe('ready');
      if (result.status !== 'ready') {
        throw new Error('Expected Today dashboard data.');
      }
      expect(result.data.sessionEntry).toMatchObject({
        status,
        sessionId: SESSION_ID,
        workoutName: 'Push',
      });
    },
  );

  it.each(['completed', 'cancelled'] as const)(
    'shows a latest %s session as an ended disabled entry',
    async (status) => {
      const result = await loadTodayDashboard({
        workoutSessionRepository: buildWorkoutSessionRepository({
          findLatestSession: jest.fn(async () => buildSession(status)),
        }),
        workoutTemplateRepository: buildWorkoutTemplateRepository(),
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
        exerciseRepository: buildExerciseRepository(),
        dailyStatusRepository: buildDailyStatusRepository(),
      });

      expect(result.status).toBe('ready');
      if (result.status !== 'ready') {
        throw new Error('Expected Today dashboard data.');
      }
      expect(result.data.sessionEntry).toMatchObject({
        status,
        sessionId: SESSION_ID,
      });
    },
  );

  it('creates a draft WorkoutSession snapshot from a template', async () => {
    const save = jest.fn(async (session: WorkoutSession) => session);
    const result = await createWorkoutSessionFromTemplate(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({ save }),
        workoutTemplateRepository: buildWorkoutTemplateRepository({
          getById: jest.fn(async () => buildTemplate()),
        }),
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
        exerciseRepository: buildExerciseRepository(),
      },
      TEMPLATE_ID,
      {
        now: () => CREATED_AT,
        createId: createIds([SESSION_ID, SESSION_EXERCISE_ID]),
      },
    );

    expect(result.status).toBe('created');
    if (result.status !== 'created') {
      throw new Error('Expected draft session creation.');
    }
    expect(result.session).toMatchObject({
      id: SESSION_ID,
      sourceTemplateId: TEMPLATE_ID,
      workoutNameSnapshot: 'Push',
      status: 'draft',
    });
    expect(result.session.startedAt).toBeUndefined();
    expect(result.session.endedAt).toBeUndefined();
    expect(result.session.sessionExercises[0]).toMatchObject({
      id: SESSION_EXERCISE_ID,
      sessionId: SESSION_ID,
      sourceExerciseId: EXERCISE_ID,
      exerciseNameSnapshot: '杠铃卧推',
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 10,
      currentRestSeconds: 90,
      sets: [],
    });
    expect(save).toHaveBeenCalledWith(result.session);
  });

  it('derives weekly facts and deterministic non-blocking recommendations', () => {
    const completed = buildSession('completed');
    if (completed.status !== 'completed') {
      throw new Error('Expected completed session.');
    }

    expect(
      createTodayDashboardWeeklySummary([completed], new Date(2026, 6, 23, 12)),
    ).toEqual({
      completedWorkoutCount: 1,
      completedSetCount: 0,
      totalVolume: 0,
    });
    expect(createTodayDashboardRecommendation('fatigued', undefined)).toEqual({
      title: '保留余量',
      message: '你记录了疲劳。可以减少组数或重量，不会自动修改训练计划。',
    });
  });

  it('keeps workout entry available when supplemental Today queries fail', async () => {
    const result = await loadTodayDashboard({
      workoutSessionRepository: buildWorkoutSessionRepository({
        listByStatuses: async () => {
          throw new Error('statistics unavailable');
        },
      }),
      workoutTemplateRepository: buildWorkoutTemplateRepository({
        list: async () => [buildTemplate()],
      }),
      todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
      exerciseRepository: buildExerciseRepository(),
      dailyStatusRepository: buildDailyStatusRepository(),
    });

    expect(result).toMatchObject({
      status: 'ready',
      data: {
        sessionEntry: { status: 'none' },
        templates: [{ id: TEMPLATE_ID }],
        weeklySummary: {
          completedWorkoutCount: 0,
          completedSetCount: 0,
          totalVolume: 0,
        },
      },
    });
  });

  it('does not create another session when a draft already exists', async () => {
    const save = jest.fn(async (session: WorkoutSession) => session);
    const result = await createWorkoutSessionFromTemplate(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({
          findRecoverableSession: jest.fn(async () => buildSession('draft')),
          save,
        }),
        workoutTemplateRepository: buildWorkoutTemplateRepository(),
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository(),
        exerciseRepository: buildExerciseRepository(),
      },
      TEMPLATE_ID,
      {
        now: () => CREATED_AT,
        createId: createIds([SESSION_ID, SESSION_EXERCISE_ID]),
      },
    );

    expect(result).toEqual({
      status: 'existing_session',
      sessionId: SESSION_ID,
      sessionStatus: 'draft',
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('adds an active template to today plan', async () => {
    const addFromTemplate = jest.fn(async (input) => buildTodayPlan(input));
    const result = await addTodayPlanFromTemplate(
      {
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository({
          addFromTemplate,
        }),
        workoutTemplateRepository: buildWorkoutTemplateRepository({
          getById: jest.fn(async () => buildTemplate()),
        }),
      },
      TEMPLATE_ID,
      {
        localDate: '2026-07-23',
        now: () => CREATED_AT,
        createId: () => TODAY_PLAN_ID,
        position: 1,
      },
    );

    expect(result.status).toBe('added');
    expect(addFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TODAY_PLAN_ID,
        sourceTemplateId: TEMPLATE_ID,
        titleSnapshot: 'Push',
      }),
    );
  });

  it('starts a today plan by creating and attaching a draft session', async () => {
    const save = jest.fn(async (session: WorkoutSession) => session);
    const attachSession = jest.fn(async () =>
      buildTodayPlan({ sessionId: SESSION_ID, status: 'draft' }),
    );
    const result = await startTodayPlan(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({ save }),
        workoutTemplateRepository: buildWorkoutTemplateRepository({
          getById: jest.fn(async () => buildTemplate()),
        }),
        todayWorkoutPlanRepository: buildTodayWorkoutPlanRepository({
          findById: jest.fn(async () => buildTodayPlan()),
          attachSession,
        }),
        exerciseRepository: buildExerciseRepository(),
      },
      TODAY_PLAN_ID,
      {
        now: () => CREATED_AT,
        createId: createIds([SESSION_ID, SESSION_EXERCISE_ID]),
      },
    );

    expect(result).toEqual({ status: 'ready', sessionId: SESSION_ID });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: SESSION_ID, status: 'draft' }),
    );
    expect(attachSession).toHaveBeenCalledWith(
      TODAY_PLAN_ID,
      SESSION_ID,
      CREATED_AT,
    );
  });

  it('renders the start entry and creates a draft from a template card', async () => {
    const startPlan = jest.fn(async () => SESSION_ID);
    const onOpenWorkoutSession = jest.fn();
    const { getByLabelText, getByText } = await render(
      <TodayDashboardScreenContent
        state={buildReadyState({
          sessionEntry: { status: 'none' },
          todayPlans: [
            {
              id: TODAY_PLAN_ID,
              templateId: TEMPLATE_ID,
              name: 'Push',
              status: 'planned',
              exerciseCount: 1,
              totalTargetSets: 4,
            },
          ],
          templates: [
            {
              id: TEMPLATE_ID,
              name: 'Push',
              exerciseCount: 1,
              totalTargetSets: 4,
            },
          ],
        })}
        controls={buildControls({ startTodayPlan: startPlan })}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
        onOpenTodayPlan={jest.fn()}
        onOpenWorkoutSession={onOpenWorkoutSession}
        onOpenHistory={jest.fn()}
      />,
    );

    expect(getByText('当前没有进行中的训练')).toBeTruthy();
    await fireEvent.press(getByLabelText('开始训练Push'));
    expect(startPlan).toHaveBeenCalledWith(TODAY_PLAN_ID);
    expect(onOpenWorkoutSession).toHaveBeenCalledWith(SESSION_ID);
  });

  it('opens a today plan from the card body without starting a session', async () => {
    const createSessionFromTemplate = jest.fn(async () => {});
    const onOpenTodayPlan = jest.fn();
    const { getByLabelText } = await render(
      <TodayDashboardScreenContent
        state={buildReadyState({
          sessionEntry: { status: 'none' },
          todayPlans: [
            {
              id: TODAY_PLAN_ID,
              templateId: TEMPLATE_ID,
              name: 'Push',
              status: 'planned',
              exerciseCount: 1,
              totalTargetSets: 4,
            },
          ],
          templates: [
            {
              id: TEMPLATE_ID,
              name: 'Push',
              exerciseCount: 1,
              totalTargetSets: 4,
            },
          ],
        })}
        controls={buildControls({ createSessionFromTemplate })}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
        onOpenTodayPlan={onOpenTodayPlan}
        onOpenWorkoutSession={jest.fn()}
        onOpenHistory={jest.fn()}
      />,
    );

    await fireEvent.press(
      getByLabelText('查看今日训练计划Push，1 个动作 · 4 组'),
    );

    expect(onOpenTodayPlan).toHaveBeenCalledWith(TODAY_PLAN_ID);
    expect(createSessionFromTemplate).not.toHaveBeenCalled();
  });

  it.each(['draft', 'in_progress'] as const)(
    'continues a %s session from the resume entry',
    async (status) => {
      const continueSession = jest.fn(async () => true);
      const onOpenWorkoutSession = jest.fn();
      const { getByLabelText, getByText } = await render(
        <TodayDashboardScreenContent
          state={buildReadyState({
            sessionEntry: {
              status,
              sessionId: SESSION_ID,
              workoutName: 'Push',
              completedSetCount: 1,
              totalTargetSetCount: 4,
            },
            todayPlans: [],
            templates: [],
          })}
          controls={buildControls({ continueSession })}
          onCreateTemplate={jest.fn()}
          onOpenTemplate={jest.fn()}
          onOpenTodayPlan={jest.fn()}
          onOpenWorkoutSession={onOpenWorkoutSession}
          onOpenHistory={jest.fn()}
        />,
      );

      expect(
        getByText(status === 'draft' ? '可恢复的训练草稿' : '进行中的训练'),
      ).toBeTruthy();
      await fireEvent.press(getByLabelText('继续训练Push'));

      expect(continueSession).toHaveBeenCalledWith(SESSION_ID);
      expect(onOpenWorkoutSession).toHaveBeenCalledWith(SESSION_ID);
    },
  );

  it.each(['completed', 'cancelled'] as const)(
    'disables the ended %s session entry',
    async (status) => {
      const continueSession = jest.fn(async () => true);
      const { getByLabelText } = await render(
        <TodayDashboardScreenContent
          state={buildReadyState({
            sessionEntry: {
              status,
              sessionId: SESSION_ID,
              workoutName: 'Push',
              completedSetCount: 2,
              totalTargetSetCount: 4,
            },
            todayPlans: [],
            templates: [],
          })}
          controls={buildControls({ continueSession })}
          onCreateTemplate={jest.fn()}
          onOpenTemplate={jest.fn()}
          onOpenTodayPlan={jest.fn()}
          onOpenWorkoutSession={jest.fn()}
          onOpenHistory={jest.fn()}
        />,
      );
      const label = status === 'completed' ? '已完成Push' : '已取消Push';

      expect(getByLabelText(label).props.accessibilityState).toEqual({
        disabled: true,
      });
      await fireEvent.press(getByLabelText(label));
      expect(continueSession).not.toHaveBeenCalled();
    },
  );

  it('opens history from Today', async () => {
    const onOpenHistory = jest.fn();
    const { getByLabelText } = await render(
      <TodayDashboardScreenContent
        state={buildReadyState({
          sessionEntry: { status: 'none' },
          todayPlans: [],
          templates: [],
        })}
        controls={buildControls()}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
        onOpenTodayPlan={jest.fn()}
        onOpenWorkoutSession={jest.fn()}
        onOpenHistory={onOpenHistory}
      />,
    );

    await fireEvent.press(getByLabelText('查看历史训练'));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('renders and updates DailyStatus with weekly and recent facts', async () => {
    const updateDailyStatus = jest.fn(async () => {});
    const onOpenHistory = jest.fn();
    const { getByLabelText, getByText } = await render(
      <TodayDashboardScreenContent
        state={buildReadyState({
          sessionEntry: { status: 'none' },
          todayPlans: [],
          templates: [],
          dailyStatus: 'fatigued',
          recentWorkout: {
            sessionId: SESSION_ID,
            workoutName: 'Push',
            endedAt: '2026-07-20T02:00:00.000Z',
            completedSetCount: 4,
            totalVolume: 3200,
          },
          weeklySummary: {
            completedWorkoutCount: 1,
            completedSetCount: 4,
            totalVolume: 3200,
          },
          recommendation: {
            title: '保留余量',
            message: '你记录了疲劳。可以减少组数或重量，不会自动修改训练计划。',
          },
        })}
        controls={buildControls({ updateDailyStatus })}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
        onOpenTodayPlan={jest.fn()}
        onOpenWorkoutSession={jest.fn()}
        onOpenHistory={onOpenHistory}
      />,
    );

    expect(getByLabelText('今日状态：疲劳').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByText('本周概览')).toBeTruthy();
    expect(getByText('3,200 kg')).toBeTruthy();
    expect(getByText('保留余量')).toBeTruthy();

    await fireEvent.press(getByLabelText('今日状态：正常'));
    expect(updateDailyStatus).toHaveBeenCalledWith('normal');
    await fireEvent.press(getByLabelText('查看最近训练Push'));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});

function buildReadyState(
  data: Partial<TodayDashboardData>,
): Extract<TodayDashboardScreenState, { status: 'ready' }> {
  return {
    status: 'ready',
    data: {
      sessionEntry: { status: 'none' },
      todayPlans: [],
      templates: [],
      dailyStatus: undefined,
      recentWorkout: undefined,
      weeklySummary: undefined,
      recommendation: undefined,
      ...data,
    },
    isCreatingSession: false,
    isContinuingSession: false,
  };
}

function buildControls(
  overrides: Partial<TodayDashboardScreenControls> = {},
): TodayDashboardScreenControls {
  return {
    reload: jest.fn(),
    addTodayPlanFromTemplate: jest.fn(async () => false),
    startTodayPlan: jest.fn(async () => null),
    createSessionFromTemplate: jest.fn(async () => {}),
    continueSession: jest.fn(async () => false),
    updateDailyStatus: jest.fn(async () => {}),
    ...overrides,
  };
}

function buildTodayWorkoutPlanRepository(
  overrides: Partial<TodayWorkoutPlanRepository> = {},
): TodayWorkoutPlanRepository {
  return {
    listByDate: async () => [],
    findById: async () => null,
    findByDateAndTemplate: async () => null,
    addFromTemplate: async (input) =>
      buildTodayPlan({
        ...input,
        id: input.id as TodayWorkoutPlanId,
        sourceTemplateId: input.sourceTemplateId as WorkoutTemplateId,
      }),
    attachSession: async (_planId, sessionId) =>
      buildTodayPlan({ sessionId, status: 'draft' }),
    syncStatusFromSession: async (_planId, sessionStatus) =>
      buildTodayPlan({ status: sessionStatus }),
    ...overrides,
  };
}

function buildDailyStatusRepository(): DailyStatusRepository {
  return {
    findByLocalDate: async () => null,
    save: async (input) => ({
      id: `daily-status-${input.localDate}`,
      localDate: input.localDate,
      status: input.status,
      createdAt: input.updatedAt,
      updatedAt: input.updatedAt,
    }),
  };
}

function buildWorkoutSessionRepository(
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

function buildWorkoutTemplateRepository(
  overrides: Partial<WorkoutTemplateRepository> = {},
): WorkoutTemplateRepository {
  return {
    list: async () => [],
    getById: async () => buildTemplate(),
    create: async () => buildTemplate(),
    update: async () => buildTemplate(),
    archive: async () => buildTemplate({ status: 'archived' }),
    ...overrides,
  };
}

function buildExerciseRepository(
  overrides: Partial<ExerciseRepository> = {},
): ExerciseRepository {
  const exercise = buildExercise();

  return {
    list: async () => [exercise],
    getById: async () => exercise,
    search: async () => [exercise],
    listByFilters: async () => [exercise],
    getSelectedByIds: async () => [exercise],
    ...overrides,
  };
}

function buildTemplate(
  overrides: Partial<WorkoutTemplate> = {},
): WorkoutTemplate {
  return createWorkoutTemplate({
    id: TEMPLATE_ID,
    name: 'Push',
    description: '胸肩训练',
    status: overrides.status ?? 'active',
    exercises: [
      {
        id: 'template-exercise-bench',
        templateId: TEMPLATE_ID,
        exerciseId: EXERCISE_ID,
        position: 1,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        restSeconds: 90,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      },
    ],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    archivedAt:
      overrides.status === 'archived' ? '2026-07-20T02:00:00.000Z' : null,
  });
}

function buildExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: EXERCISE_ID,
    slug: 'barbell-bench-press',
    nameZh: '杠铃卧推',
    nameEn: 'Barbell Bench Press',
    type: 'strength',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: ['arms'],
    equipment: 'barbell',
    status: 'active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildSession(status: WorkoutSession['status']): WorkoutSession {
  const base = {
    id: SESSION_ID,
    workoutNameSnapshot: 'Push',
    sessionExercises: [buildSessionExercise()],
    currentSessionExerciseId: SESSION_EXERCISE_ID,
    currentSetNumber: 2,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };

  switch (status) {
    case 'draft':
      return { ...base, status };
    case 'in_progress':
      return { ...base, status, startedAt: CREATED_AT };
    case 'completed':
      return {
        ...base,
        status,
        startedAt: CREATED_AT,
        endedAt: '2026-07-20T02:00:00.000Z',
      };
    case 'cancelled':
      return {
        ...base,
        status,
        startedAt: CREATED_AT,
        endedAt: '2026-07-20T02:00:00.000Z',
      };
  }
}

function buildTodayPlan(
  overrides: Partial<TodayWorkoutPlan> = {},
): TodayWorkoutPlan {
  return {
    id: TODAY_PLAN_ID,
    localDate: '2026-07-23',
    sourceTemplateId: TEMPLATE_ID,
    titleSnapshot: 'Push',
    status: 'planned',
    position: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function buildSessionExercise(): SessionExercise {
  return {
    id: SESSION_EXERCISE_ID,
    sessionId: SESSION_ID,
    sourceExerciseId: EXERCISE_ID,
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
  };
}

function createIds(ids: readonly string[]): () => string {
  let index = 0;

  return () => ids[index++] ?? '';
}
