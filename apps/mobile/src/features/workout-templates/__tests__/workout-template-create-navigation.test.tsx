/// <reference types="jest" />

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { ExerciseId } from '@/domain/exercise';
import { createWorkoutTemplate } from '@/domain/workout-template';
import { WorkoutTemplateCreateScreen } from '@/features/workout-templates/screens/workout-template-create-screen';
import type { WorkoutTemplateCreateScreenModel } from '@/features/workout-templates/application/use-workout-template-create';

const mockRouter = {
  push: jest.fn(),
  dismissTo: jest.fn(),
  back: jest.fn(),
};
const mockNavigation = {
  dispatch: jest.fn(),
};
let mockPreventRemove:
  | {
      readonly preventRemove: boolean;
      readonly callback: (options: { data: { action: unknown } }) => void;
    }
  | undefined;
let mockCreateModel: WorkoutTemplateCreateScreenModel;

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');

  return {
    ...actual,
    useRouter: () => mockRouter,
    useNavigation: () => mockNavigation,
  };
});

jest.mock('expo-router/react-navigation', () => {
  const actual = jest.requireActual('expo-router/react-navigation');

  return {
    ...actual,
    usePreventRemove: jest.fn(
      (
        preventRemove: boolean,
        callback: (options: { data: { action: unknown } }) => void,
      ) => {
        mockPreventRemove = {
          preventRemove,
          callback,
        };
      },
    ),
  };
});

jest.mock(
  '@/features/workout-templates/application/use-workout-template-create',
  () => {
    const actual = jest.requireActual(
      '@/features/workout-templates/application/use-workout-template-create',
    );

    return {
      ...actual,
      useWorkoutTemplateCreate: () => mockCreateModel,
    };
  },
);

describe('WorkoutTemplateCreateScreen navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreventRemove = undefined;
    mockCreateModel = buildCreateModel();
  });

  it('allows custom cancel to leave an empty draft directly', async () => {
    mockCreateModel = buildCreateModel({
      controls: {
        requestExit: jest.fn(() => true),
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    const { getByLabelText } = await render(
      <WorkoutTemplateCreateScreen routeParams={{}} />,
    );

    await fireEvent.press(getByLabelText('退出创建训练模板'));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('runs custom cancel navigation once after discard authorization is rendered', async () => {
    const requestExit = jest.fn(() => false);
    const confirmExit = jest.fn();
    mockCreateModel = buildCreateModel({
      state: {
        draft: buildDirtyDraft(),
      },
      controls: {
        requestExit,
        confirmExit,
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText, rerender } = await render(
      <WorkoutTemplateCreateScreen routeParams={{}} />,
    );

    await fireEvent.press(getByLabelText('退出创建训练模板'));

    expect(requestExit).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();

    mockCreateModel = buildCreateModel({
      state: {
        draft: buildDirtyDraft(),
        isExitAuthorized: true,
      },
      controls: {
        requestExit,
        confirmExit,
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    rerender(<WorkoutTemplateCreateScreen routeParams={{}} />);
    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
    expect(mockPreventRemove?.preventRemove).toBe(false);

    rerender(<WorkoutTemplateCreateScreen routeParams={{}} />);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('dispatches the prevented system navigation action once after exit authorization is rendered', async () => {
    const preventedAction = { type: 'GO_BACK' };
    const confirmExit = jest.fn();
    mockCreateModel = buildCreateModel({
      state: {
        draft: buildDirtyDraft(),
        isConfirmingDiscard: true,
      },
      controls: {
        requestExit: jest.fn(() => false),
        confirmExit,
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText, rerender } = await render(
      <WorkoutTemplateCreateScreen routeParams={{}} />,
    );

    expect(mockPreventRemove?.preventRemove).toBe(true);
    mockPreventRemove?.callback({
      data: {
        action: preventedAction,
      },
    });

    await fireEvent.press(getByLabelText('放弃创建训练模板'));

    expect(confirmExit).toHaveBeenCalledTimes(1);
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();

    mockCreateModel = buildCreateModel({
      state: {
        draft: buildDirtyDraft(),
        isExitAuthorized: true,
      },
      controls: {
        requestExit: jest.fn(() => false),
        confirmExit,
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    rerender(<WorkoutTemplateCreateScreen routeParams={{}} />);
    await waitFor(() => {
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(preventedAction);

    rerender(<WorkoutTemplateCreateScreen routeParams={{}} />);
    expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
  });

  it('uses dismissTo only after the saved state is rendered', async () => {
    const save = jest.fn(async () => ({
      status: 'saved' as const,
      template: createWorkoutTemplate({
        id: 'template-push',
        name: 'Push',
        status: 'active',
        exercises: [],
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z',
      }),
    }));
    mockCreateModel = buildCreateModel({
      state: {
        draft: buildDirtyDraft({
          selectedExerciseIds: ['exercise-bench' as ExerciseId],
          selectedExercises: [],
        }),
      },
      controls: {
        save,
        requestExit: jest.fn(() => false),
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText, queryByText, rerender } = await render(
      <WorkoutTemplateCreateScreen routeParams={{}} />,
    );

    await fireEvent.press(getByLabelText('保存训练模板'));

    expect(save).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(queryByText('放弃创建模板？')).toBeNull();

    mockCreateModel = buildCreateModel({
      state: {
        draft: buildDirtyDraft({
          selectedExerciseIds: ['exercise-bench' as ExerciseId],
          selectedExercises: [],
        }),
        isSaved: true,
      },
      controls: {
        save,
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    rerender(<WorkoutTemplateCreateScreen routeParams={{}} />);

    await waitFor(() => {
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/templates');
    });
    expect(mockCreateModel.controls.requestExit).not.toHaveBeenCalled();
    expect(mockPreventRemove?.preventRemove).toBe(false);
  });

  it('requires confirmation before leaving an initialization error with route draft values', async () => {
    mockCreateModel = buildCreateModel({
      state: {
        status: 'error',
        draft: buildDirtyDraft(),
        message: '训练模板保存失败。当前输入仍保留，请重新保存。',
      },
      controls: {
        requestExit: jest.fn(() => false),
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText } = await render(
      <WorkoutTemplateCreateScreen routeParams={{ draftName: 'Push' }} />,
    );

    await fireEvent.press(getByLabelText('退出创建训练模板'));

    expect(mockCreateModel.controls.requestExit).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();

    expect(mockPreventRemove?.preventRemove).toBe(true);
  });
});

function buildDirtyDraft(
  overrides: Partial<WorkoutTemplateCreateScreenModel['state']['draft']> = {},
): WorkoutTemplateCreateScreenModel['state']['draft'] {
  return {
    name: 'Push',
    description: '',
    selectedExerciseIds: [],
    selectedExercises: [],
    selectedExerciseLoadStatus: 'ready',
    ...overrides,
  };
}

function buildCreateModel(
  overrides: {
    readonly state?: Partial<WorkoutTemplateCreateScreenModel['state']>;
    readonly controls?: Partial<WorkoutTemplateCreateScreenModel['controls']>;
  } = {},
): WorkoutTemplateCreateScreenModel {
  return {
    state: {
      status: 'ready',
      draft: {
        name: '',
        description: '',
        selectedExerciseIds: [],
        selectedExercises: [],
        selectedExerciseLoadStatus: 'ready',
      },
      fieldErrors: {},
      isSaving: false,
      isConfirmingDiscard: false,
      isExitAuthorized: false,
      isSaved: false,
      ...overrides.state,
    } as WorkoutTemplateCreateScreenModel['state'],
    controls: {
      updateName: jest.fn(),
      updateDescription: jest.fn(),
      createExerciseSelectionHref: jest.fn(
        () =>
          ({
            pathname: '/exercises',
            params: {
              mode: 'select',
              context: 'template',
              returnTo: '/templates/new',
            },
          }) as const,
      ),
      save: jest.fn(async () => ({
        status: 'invalid' as const,
        fieldErrors: {},
      })),
      reload: jest.fn(),
      shouldConfirmExit: jest.fn(() => false),
      requestExit: jest.fn(() => true),
      cancelExit: jest.fn(),
      confirmExit: jest.fn(),
      ...overrides.controls,
    },
  };
}
