/// <reference types="jest" />

import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';

import type { DatabaseStartupResult } from '@/database/bootstrap';
import type { DatabaseConnection } from '@/database/types';
import {
  createWorkoutTemplate,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import { loadWorkoutTemplateList } from '@/features/workout-templates/application/load-workout-template-list';
import {
  useWorkoutTemplateList,
  type WorkoutTemplateListScreenControls,
} from '@/features/workout-templates/application/use-workout-template-list';
import { WorkoutTemplateListContent } from '@/features/workout-templates/screens/workout-template-list-screen';

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

describe('Workout Template list screen', () => {
  beforeEach(() => {
    mockFocusCallback = null;
  });

  it('renders the loading state', async () => {
    const { getByText } = await render(
      <WorkoutTemplateListContent
        state={{ status: 'loading' }}
        controls={buildControls()}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
      />,
    );

    expect(getByText('正在加载训练模板')).toBeTruthy();
  });

  it('renders the empty state and create entry', async () => {
    const onCreateTemplate = jest.fn();
    const { getByText, getByLabelText } = await render(
      <WorkoutTemplateListContent
        state={{ status: 'empty' }}
        controls={buildControls()}
        onCreateTemplate={onCreateTemplate}
        onOpenTemplate={jest.fn()}
      />,
    );

    expect(getByText('还没有训练模板')).toBeTruthy();
    expect(getByText('创建第一个模板，开始规划你的训练。')).toBeTruthy();

    await fireEvent.press(getByLabelText('创建第一个训练模板'));

    expect(onCreateTemplate).toHaveBeenCalled();
  });

  it('renders the error state with retry action', async () => {
    const reload = jest.fn();
    const { getByText, getByLabelText } = await render(
      <WorkoutTemplateListContent
        controls={buildControls({ reload })}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
        state={{
          status: 'error',
          message: '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。',
        }}
      />,
    );

    expect(getByText('训练模板加载失败')).toBeTruthy();
    expect(
      getByText('训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。'),
    ).toBeTruthy();

    await fireEvent.press(getByLabelText('重新加载训练模板'));

    expect(reload).toHaveBeenCalled();
  });

  it('renders active templates with required summary information', async () => {
    const template = {
      id: 'template-push' as WorkoutTemplateId,
      name: 'Push',
      status: 'active' as const,
      exerciseCount: 2,
      totalTargetSets: 7,
    };
    const { getByText, getByLabelText } = await render(
      <WorkoutTemplateListContent
        controls={buildControls()}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={jest.fn()}
        state={{
          status: 'ready',
          templates: [template],
        }}
      />,
    );

    expect(getByText('Push')).toBeTruthy();
    expect(getByText('2 个动作 · 7 组')).toBeTruthy();
    expect(getByText('可使用')).toBeTruthy();
    expect(
      getByLabelText('查看训练模板Push，2 个动作，7 组，可使用'),
    ).toBeTruthy();
  });

  it('uses distinct accessibility labels for create actions', async () => {
    const onCreateTemplate = jest.fn();
    const { getByLabelText, rerender } = await render(
      <WorkoutTemplateListContent
        state={{ status: 'empty' }}
        controls={buildControls()}
        onCreateTemplate={onCreateTemplate}
        onOpenTemplate={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('新增训练模板'));
    await fireEvent.press(getByLabelText('创建第一个训练模板'));

    expect(onCreateTemplate).toHaveBeenCalledTimes(2);

    await rerender(
      <WorkoutTemplateListContent
        state={{
          status: 'ready',
          templates: [],
        }}
        controls={buildControls()}
        onCreateTemplate={onCreateTemplate}
        onOpenTemplate={jest.fn()}
      />,
    );
    expect(getByLabelText('新增训练模板')).toBeTruthy();
  });

  it('opens the selected template detail entry', async () => {
    const onOpenTemplate = jest.fn();
    const template = {
      id: 'template-push' as WorkoutTemplateId,
      name: 'Push',
      status: 'active' as const,
      exerciseCount: 1,
      totalTargetSets: 3,
    };
    const { getByLabelText } = await render(
      <WorkoutTemplateListContent
        controls={buildControls()}
        onCreateTemplate={jest.fn()}
        onOpenTemplate={onOpenTemplate}
        state={{
          status: 'ready',
          templates: [template],
        }}
      />,
    );

    await fireEvent.press(
      getByLabelText('查看训练模板Push，1 个动作，3 组，可使用'),
    );

    expect(onOpenTemplate).toHaveBeenCalledWith('template-push');
  });
});

describe('loadWorkoutTemplateList', () => {
  it('loads active templates through the repository boundary', async () => {
    const template = buildTemplate();
    const list = jest.fn(async () => [template]);
    const repository = buildRepository({ list });

    await expect(loadWorkoutTemplateList(repository)).resolves.toEqual({
      status: 'ready',
      templates: [
        {
          id: template.id,
          name: 'Push',
          status: 'active',
          exerciseCount: 2,
          totalTargetSets: 7,
        },
      ],
    });
    expect(list).toHaveBeenCalledWith({
      filters: {
        statuses: ['active'],
      },
    });
  });

  it('maps repository failures to user-facing copy', async () => {
    const repository = buildRepository({
      list: async () => {
        throw new Error('database failed');
      },
    });

    await expect(loadWorkoutTemplateList(repository)).resolves.toEqual({
      status: 'error',
      message: '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。',
    });
  });
});

describe('useWorkoutTemplateList', () => {
  beforeEach(() => {
    mockFocusCallback = null;
  });

  it('retries database initialization after an initialization failure', async () => {
    const repository = buildRepository({
      list: jest.fn(async () => [buildTemplate()]),
    });
    const initializeDatabase = jest
      .fn<Promise<DatabaseStartupResult>, []>()
      .mockResolvedValueOnce({
        status: 'error',
        error: {
          code: 'database_open_failed',
          message: 'internal sqlite error',
        },
      })
      .mockResolvedValueOnce(buildStartupResult());
    const createRepository = jest.fn(() => repository);

    const { result } = await renderHook(() =>
      useWorkoutTemplateList({
        initializeDatabase,
        createRepository,
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'error',
        message: '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。',
      });
    });

    await act(async () => {
      result.current.controls.reload();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
    expect(createRepository).toHaveBeenCalledTimes(1);
  });

  it('retries list loading without reinitializing an existing repository', async () => {
    const repository = buildRepository();
    const initializeDatabase = jest.fn(async () => buildStartupResult());
    const createRepository = jest.fn(() => repository);
    const loadTemplates = jest
      .fn()
      .mockResolvedValueOnce({
        status: 'error',
        message: '训练模板加载失败。已保存的训练数据不会受影响，请稍后重试。',
      })
      .mockResolvedValueOnce({
        status: 'ready',
        templates: [
          {
            id: 'template-push' as WorkoutTemplateId,
            name: 'Push',
            status: 'active',
            exerciseCount: 1,
            totalTargetSets: 3,
          },
        ],
      });

    const { result } = await renderHook(() =>
      useWorkoutTemplateList({
        initializeDatabase,
        createRepository,
        loadTemplates,
      }),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    await act(async () => {
      result.current.controls.reload();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
    expect(loadTemplates).toHaveBeenCalledTimes(2);
  });

  it('refreshes active templates when the screen regains focus', async () => {
    const repository = buildRepository();
    const initializeDatabase = jest.fn(async () => buildStartupResult());
    const loadTemplates = jest
      .fn()
      .mockResolvedValueOnce({
        status: 'ready',
        templates: [],
      })
      .mockResolvedValueOnce({
        status: 'ready',
        templates: [
          {
            id: 'template-push' as WorkoutTemplateId,
            name: 'Push',
            status: 'active',
            exerciseCount: 1,
            totalTargetSets: 3,
          },
        ],
      });

    const { result } = await renderHook(() =>
      useWorkoutTemplateList({
        initializeDatabase,
        createRepository: () => repository,
        loadTemplates,
      }),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('empty');
    });
    expect(loadTemplates).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockFocusCallback?.();
    });
    expect(loadTemplates).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });
    expect(loadTemplates).toHaveBeenCalledTimes(2);
  });

  it('ignores stale requests so older results cannot overwrite newer state', async () => {
    const repository = buildRepository();
    const firstLoad =
      createDeferred<Awaited<ReturnType<typeof loadWorkoutTemplateList>>>();
    const secondLoad =
      createDeferred<Awaited<ReturnType<typeof loadWorkoutTemplateList>>>();
    const loadTemplates = jest
      .fn()
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);
    const { result } = await renderHook(() =>
      useWorkoutTemplateList({
        initializeDatabase: async () => buildStartupResult(),
        createRepository: () => repository,
        loadTemplates,
      }),
    );

    await waitFor(() => {
      expect(loadTemplates).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.controls.reload();
    });

    await act(async () => {
      secondLoad.resolve({
        status: 'ready',
        templates: [
          {
            id: 'template-new' as WorkoutTemplateId,
            name: 'New',
            status: 'active',
            exerciseCount: 1,
            totalTargetSets: 3,
          },
        ],
      });
      await secondLoad.promise;
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'ready',
        templates: [
          {
            id: 'template-new',
            name: 'New',
            status: 'active',
            exerciseCount: 1,
            totalTargetSets: 3,
          },
        ],
      });
    });

    await act(async () => {
      firstLoad.resolve({
        status: 'ready',
        templates: [
          {
            id: 'template-old' as WorkoutTemplateId,
            name: 'Old',
            status: 'active',
            exerciseCount: 1,
            totalTargetSets: 3,
          },
        ],
      });
      await firstLoad.promise;
    });

    expect(result.current.state).toEqual({
      status: 'ready',
      templates: [
        {
          id: 'template-new',
          name: 'New',
          status: 'active',
          exerciseCount: 1,
          totalTargetSets: 3,
        },
      ],
    });
  });

  it('does not update state after unmount', async () => {
    const load =
      createDeferred<Awaited<ReturnType<typeof loadWorkoutTemplateList>>>();
    const { unmount } = await renderHook(() =>
      useWorkoutTemplateList({
        initializeDatabase: async () => buildStartupResult(),
        createRepository: () => buildRepository(),
        loadTemplates: () => load.promise,
      }),
    );

    await unmount();

    load.resolve({
      status: 'ready',
      templates: [],
    });

    await expect(load.promise).resolves.toEqual({
      status: 'ready',
      templates: [],
    });
  });
});

function buildControls(
  overrides: Partial<WorkoutTemplateListScreenControls> = {},
): WorkoutTemplateListScreenControls {
  return {
    reload: jest.fn(),
    ...overrides,
  };
}

function buildStartupResult(): Extract<
  DatabaseStartupResult,
  { readonly status: 'ready' }
> {
  return {
    status: 'ready',
    database: buildDatabaseConnection(),
    schemaVersion: 2,
  };
}

function buildDatabaseConnection(): DatabaseConnection {
  return {
    execAsync: async () => undefined,
    runAsync: async () => ({}),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  };
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

function buildTemplate(): WorkoutTemplate {
  return createWorkoutTemplate({
    id: 'template-push',
    name: 'Push',
    description: 'Chest day',
    status: 'active',
    exercises: [
      {
        id: 'template-exercise-bench',
        templateId: 'template-push',
        exerciseId: 'exercise-bench-press',
        position: 1,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        restSeconds: 90,
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z',
      },
      {
        id: 'template-exercise-row',
        templateId: 'template-push',
        exerciseId: 'exercise-row',
        position: 2,
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 12,
        restSeconds: 90,
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z',
      },
    ],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  });
}

function buildRepository(
  overrides: Partial<WorkoutTemplateRepository> = {},
): WorkoutTemplateRepository {
  return {
    list: async () => [],
    getById: async () => null,
    create: async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
      }),
    update: async (input) =>
      createWorkoutTemplate({
        ...input,
        status: 'active',
        createdAt: '2026-07-16T00:00:00.000Z',
      }),
    archive: async (id, archivedAt) =>
      createWorkoutTemplate({
        id,
        name: 'Archived',
        status: 'archived',
        exercises: [],
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: archivedAt,
        archivedAt,
      }),
    ...overrides,
  };
}
