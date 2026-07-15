/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import {
  createExercise,
  type Exercise,
  type ExerciseInput,
  type ExerciseRepository,
} from '@/domain/exercise';
import { loadExerciseLibrary } from '@/features/exercise-library/application/load-exercise-library';
import { ExerciseLibraryContent } from '@/features/exercise-library/screens/exercise-library-screen';

describe('Exercise Library screen', () => {
  it('renders the loading state', async () => {
    const { getByText } = await render(
      <ExerciseLibraryContent state={{ status: 'loading' }} />,
    );

    expect(getByText('正在加载动作库')).toBeTruthy();
  });

  it('renders the empty state', async () => {
    const { getByText } = await render(
      <ExerciseLibraryContent state={{ status: 'empty' }} />,
    );

    expect(getByText('还没有可用动作')).toBeTruthy();
    expect(
      getByText('动作库数据尚未导入，请重新打开应用后再试。'),
    ).toBeTruthy();
  });

  it('renders the error state with persistent recovery copy', async () => {
    const { getByText } = await render(
      <ExerciseLibraryContent
        state={{
          status: 'error',
          message: '动作库加载失败。已保存的训练数据不会受影响，请稍后重试。',
        }}
      />,
    );

    expect(getByText('动作库加载失败')).toBeTruthy();
    expect(
      getByText('动作库加载失败。已保存的训练数据不会受影响，请稍后重试。'),
    ).toBeTruthy();
  });

  it('renders persisted exercises with accessible row labels', async () => {
    const exercises = [
      buildExercise({
        id: 'exercise-barbell-bench-press',
        slug: 'barbell-bench-press',
        nameZh: '杠铃卧推',
        primaryMuscleGroup: 'chest',
        equipment: 'barbell',
      }),
      buildExercise({
        id: 'exercise-lat-pulldown',
        slug: 'lat-pulldown',
        nameZh: '高位下拉',
        primaryMuscleGroup: 'back',
        equipment: 'machine',
      }),
    ];

    const { getByText, getByLabelText } = await render(
      <ExerciseLibraryContent
        state={{
          status: 'ready',
          exercises,
        }}
      />,
    );

    expect(getByText('杠铃卧推')).toBeTruthy();
    expect(getByText('高位下拉')).toBeTruthy();
    expect(getByText('胸 · 杠铃')).toBeTruthy();
    expect(getByLabelText('杠铃卧推，胸，杠铃')).toBeTruthy();
  });
});

describe('loadExerciseLibrary', () => {
  it('loads exercises through the repository boundary', async () => {
    const exercises = [buildExercise()];
    const repository = buildRepository({
      list: async () => exercises,
    });

    await expect(loadExerciseLibrary(repository)).resolves.toEqual({
      status: 'ready',
      exercises,
    });
  });

  it('maps repository failures to user-facing copy', async () => {
    const repository = buildRepository({
      list: async () => {
        throw new Error('persistence failed');
      },
    });

    await expect(loadExerciseLibrary(repository)).resolves.toEqual({
      status: 'error',
      message: '动作库加载失败。已保存的训练数据不会受影响，请稍后重试。',
    });
  });
});

function buildExercise(overrides: Partial<ExerciseInput> = {}): Exercise {
  return createExercise({
    id: 'exercise-default',
    slug: 'exercise-default',
    nameZh: '默认动作',
    nameEn: 'Default Exercise',
    type: 'strength',
    primaryMuscleGroup: 'chest',
    secondaryMuscleGroups: [],
    equipment: 'barbell',
    description: null,
    imageUri: null,
    sourceName: 'Exercise Library Test',
    sourceReference: 'test',
    status: 'active',
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides,
  });
}

function buildRepository(
  overrides: Partial<ExerciseRepository>,
): ExerciseRepository {
  return {
    list: async () => [],
    getById: async () => null,
    search: async () => [],
    listByFilters: async () => [],
    getSelectedByIds: async () => [],
    ...overrides,
  };
}
