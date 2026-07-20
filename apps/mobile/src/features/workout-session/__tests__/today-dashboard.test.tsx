/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type {
  Exercise,
  ExerciseId,
  ExerciseRepository,
} from '@/domain/exercise';
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
  loadTodayDashboard,
  type TodayDashboardData,
} from '@/features/workout-session/application/today-dashboard';
import type {
  TodayDashboardScreenControls,
  TodayDashboardScreenState,
} from '@/features/workout-session/application/use-today-dashboard';
import { TodayDashboardScreenContent } from '@/features/workout-session/screens/today-dashboard-screen';

const TEMPLATE_ID = 'template-push' as WorkoutTemplateId;
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
      exerciseRepository: buildExerciseRepository(),
    });

    expect(result).toEqual({
      status: 'ready',
      data: {
        sessionEntry: { status: 'none' },
        templates: [
          {
            id: TEMPLATE_ID,
            name: 'Push',
            exerciseCount: 1,
            totalTargetSets: 4,
          },
        ],
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
        exerciseRepository: buildExerciseRepository(),
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
        exerciseRepository: buildExerciseRepository(),
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

  it('does not create another session when a draft already exists', async () => {
    const save = jest.fn(async (session: WorkoutSession) => session);
    const result = await createWorkoutSessionFromTemplate(
      {
        workoutSessionRepository: buildWorkoutSessionRepository({
          findRecoverableSession: jest.fn(async () => buildSession('draft')),
          save,
        }),
        workoutTemplateRepository: buildWorkoutTemplateRepository(),
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

  it('renders the start entry and creates a draft from a template card', async () => {
    const createSessionFromTemplate = jest.fn(async () => {});
    const { getByLabelText, getByText } = await render(
      <TodayDashboardScreenContent
        state={buildReadyState({
          sessionEntry: { status: 'none' },
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
        onOpenWorkoutSession={jest.fn()}
      />,
    );

    expect(getByText('当前没有进行中的训练')).toBeTruthy();
    await fireEvent.press(getByLabelText('开始训练Push，1 个动作 · 4 组'));
    expect(createSessionFromTemplate).toHaveBeenCalledWith(TEMPLATE_ID);
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
            templates: [],
          })}
          controls={buildControls({ continueSession })}
          onCreateTemplate={jest.fn()}
          onOpenWorkoutSession={onOpenWorkoutSession}
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
            templates: [],
          })}
          controls={buildControls({ continueSession })}
          onCreateTemplate={jest.fn()}
          onOpenWorkoutSession={jest.fn()}
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
});

function buildReadyState(
  data: TodayDashboardData,
): Extract<TodayDashboardScreenState, { status: 'ready' }> {
  return {
    status: 'ready',
    data,
    isCreatingSession: false,
    isContinuingSession: false,
  };
}

function buildControls(
  overrides: Partial<TodayDashboardScreenControls> = {},
): TodayDashboardScreenControls {
  return {
    reload: jest.fn(),
    createSessionFromTemplate: jest.fn(async () => {}),
    continueSession: jest.fn(async () => false),
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
    findLatestSession: async () => null,
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
