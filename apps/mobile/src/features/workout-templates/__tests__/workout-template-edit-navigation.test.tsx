/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { createWorkoutTemplate } from '@/domain/workout-template';
import { WorkoutTemplateEditScreen } from '@/features/workout-templates/screens/workout-template-edit-screen';
import type { WorkoutTemplateEditScreenModel } from '@/features/workout-templates/application/use-workout-template-edit';

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
let mockEditModel: WorkoutTemplateEditScreenModel;

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
  '@/features/workout-templates/application/use-workout-template-edit',
  () => {
    const actual = jest.requireActual(
      '@/features/workout-templates/application/use-workout-template-edit',
    );

    return {
      ...actual,
      useWorkoutTemplateEdit: () => mockEditModel,
    };
  },
);

describe('WorkoutTemplateEditScreen navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreventRemove = undefined;
    mockEditModel = buildEditModel();
  });

  it('clears a pending system action when the user continues editing', async () => {
    const preventedAction = { type: 'GO_BACK' };
    const cancelExit = jest.fn();
    mockEditModel = buildEditModel({
      state: {
        isConfirmingDiscard: true,
      },
      controls: {
        cancelExit,
        requestExit: jest.fn(() => false),
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText, rerender } = await render(
      <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
    );

    await act(async () => {
      mockPreventRemove?.callback({
        data: {
          action: preventedAction,
        },
      });
    });
    await act(async () => {
      fireEvent.press(getByLabelText('继续编辑训练模板'));
    });

    expect(cancelExit).toHaveBeenCalledTimes(1);

    mockEditModel = buildEditModel({
      controls: {
        requestExit: jest.fn(() => true),
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    await act(async () => {
      rerender(
        <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
      );
    });

    await act(async () => {
      fireEvent.press(getByLabelText('退出编辑训练模板'));
    });

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  });

  it('dispatches a prevented system action once after discard authorization', async () => {
    const preventedAction = { type: 'GO_BACK' };
    const confirmExit = jest.fn();
    mockEditModel = buildEditModel({
      state: {
        isConfirmingDiscard: true,
      },
      controls: {
        confirmExit,
        requestExit: jest.fn(() => false),
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText, rerender } = await render(
      <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
    );

    await waitFor(() => {
      expect(mockPreventRemove?.preventRemove).toBe(true);
    });
    await act(async () => {
      mockPreventRemove?.callback({
        data: {
          action: preventedAction,
        },
      });
    });
    await act(async () => {
      fireEvent.press(getByLabelText('放弃编辑训练模板'));
    });

    expect(confirmExit).toHaveBeenCalledTimes(1);
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();

    mockEditModel = buildEditModel({
      state: {
        isExitAuthorized: true,
      },
      controls: {
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    await act(async () => {
      rerender(
        <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
      );
    });

    await waitFor(() => {
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(preventedAction);

    await act(async () => {
      rerender(
        <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
      );
    });
    expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
  });

  it('navigates to templates only after the saved state is rendered', async () => {
    const save = jest.fn(async () => ({
      status: 'saved' as const,
      template: createWorkoutTemplate({
        id: 'template-push',
        name: 'Push',
        status: 'active',
        exercises: [],
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T01:00:00.000Z',
      }),
    }));
    mockEditModel = buildEditModel({
      controls: {
        save,
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { getByLabelText, queryByText, rerender } = await render(
      <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
    );

    await waitFor(() => {
      expect(getByLabelText('保存训练模板')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByLabelText('保存训练模板'));
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(queryByText('放弃编辑模板？')).toBeNull();

    mockEditModel = buildEditModel({
      state: {
        isSaved: true,
      },
      controls: {
        save,
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    await act(async () => {
      rerender(
        <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
      );
    });

    await waitFor(() => {
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/templates');
    });
    expect(mockEditModel.controls.requestExit).not.toHaveBeenCalled();
  });

  it('blocks system back while saving without showing discard confirmation or saving the action', async () => {
    const requestExit = jest.fn(() => false);
    const preventedAction = { type: 'GO_BACK' };
    mockEditModel = buildEditModel({
      state: {
        isSaving: true,
      },
      controls: {
        requestExit,
        shouldConfirmExit: jest.fn(() => true),
      },
    });
    const { queryByText, rerender } = await render(
      <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
    );

    await waitFor(() => {
      expect(mockPreventRemove?.preventRemove).toBe(true);
    });
    await act(async () => {
      mockPreventRemove?.callback({
        data: {
          action: preventedAction,
        },
      });
    });

    expect(requestExit).not.toHaveBeenCalled();
    expect(queryByText('放弃编辑模板？')).toBeNull();
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();

    mockEditModel = buildEditModel({
      state: {
        isExitAuthorized: true,
      },
      controls: {
        shouldConfirmExit: jest.fn(() => false),
      },
    });
    await act(async () => {
      rerender(
        <WorkoutTemplateEditScreen routeParams={{ id: 'template-push' }} />,
      );
    });

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  });
});

function buildEditModel(
  overrides: {
    readonly state?: Partial<
      Extract<WorkoutTemplateEditScreenModel['state'], { status: 'ready' }>
    >;
    readonly controls?: Partial<WorkoutTemplateEditScreenModel['controls']>;
  } = {},
): WorkoutTemplateEditScreenModel {
  return {
    state: {
      status: 'ready',
      templateStatus: 'active',
      draft: {
        templateId: 'template-push' as never,
        name: 'Push',
        description: 'Chest',
        exerciseLoadStatus: 'ready',
        exercises: [
          {
            id: 'template-exercise-bench' as never,
            exerciseId: 'exercise-bench' as never,
            targetSets: '3',
            targetRepsMin: '8',
            targetRepsMax: '10',
            restSeconds: '90',
            createdAt: '2026-07-16T00:10:00.000Z',
          },
        ],
      },
      fieldErrors: {},
      isSaving: false,
      isConfirmingDiscard: false,
      isExitAuthorized: false,
      isSaved: false,
      ...overrides.state,
    },
    controls: {
      updateName: jest.fn(),
      updateDescription: jest.fn(),
      updateExerciseConfig: jest.fn(),
      moveExerciseUp: jest.fn(),
      moveExerciseDown: jest.fn(),
      requestRemoveExercise: jest.fn(),
      cancelRemoveExercise: jest.fn(),
      confirmRemoveExercise: jest.fn(),
      createExerciseSelectionHref: jest.fn(() => '/exercises' as never),
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
