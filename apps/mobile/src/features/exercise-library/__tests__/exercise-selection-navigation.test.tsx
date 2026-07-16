/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { ExerciseLibraryScreen } from '@/features/exercise-library/screens/exercise-library-screen';

const mockRouter = {
  push: jest.fn(),
  dismissTo: jest.fn(),
  replace: jest.fn(),
};
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');

  return {
    ...actual,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
  };
});

jest.mock(
  '@/features/exercise-library/application/use-exercise-library',
  () => {
    const { createExercise } = jest.requireActual('@/domain/exercise');
    const { EMPTY_EXERCISE_LIBRARY_FILTERS } = jest.requireActual(
      '@/features/exercise-library/application/exercise-library-filters',
    );

    return {
      useExerciseLibrary: () => ({
        state: {
          status: 'ready',
          exercises: [
            createExercise({
              id: 'exercise-row',
              slug: 'exercise-row',
              nameZh: '划船',
              nameEn: 'Row',
              type: 'strength',
              primaryMuscleGroup: 'back',
              secondaryMuscleGroups: [],
              equipment: 'barbell',
              description: null,
              imageUri: null,
              sourceName: 'Exercise Library Test',
              sourceReference: 'test',
              status: 'active',
              createdAt: '2026-07-15T00:00:00.000Z',
              updatedAt: '2026-07-15T00:00:00.000Z',
            }),
          ],
        },
        controls: {
          filters: EMPTY_EXERCISE_LIBRARY_FILTERS,
          hasActiveFilters: false,
          updateQuery: jest.fn(),
          toggleMuscleGroup: jest.fn(),
          toggleEquipment: jest.fn(),
          clearFilters: jest.fn(),
        },
      }),
    };
  },
);

describe('ExerciseLibraryScreen selection navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
      mode: 'select',
      context: 'template',
      returnTo: '/templates/new',
      returnParams: 'draftName=Push&selectedIds=exercise-bench',
      selectedIds: 'exercise-bench',
    };
  });

  it('returns to the existing create screen with dismissTo after selecting an exercise', async () => {
    const { getByLabelText } = await render(<ExerciseLibraryScreen />);

    await fireEvent.press(getByLabelText('添加划船'));

    expect(mockRouter.dismissTo).toHaveBeenCalledWith({
      pathname: '/templates/new',
      params: {
        draftName: 'Push',
        selectedIds: 'exercise-bench',
        selectedExerciseId: 'exercise-row',
        selectionContext: 'template',
      },
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('returns to the existing create screen with dismissTo after canceling selection', async () => {
    const { getByLabelText } = await render(<ExerciseLibraryScreen />);

    await fireEvent.press(getByLabelText('取消动作选择'));

    expect(mockRouter.dismissTo).toHaveBeenCalledWith({
      pathname: '/templates/new',
      params: {
        draftName: 'Push',
        selectedIds: 'exercise-bench',
      },
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
