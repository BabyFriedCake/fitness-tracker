/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import {
  createExercise,
  type Equipment,
  type Exercise,
  type ExerciseInput,
  type ExerciseRepository,
  type MuscleGroup,
} from '@/domain/exercise';
import {
  EMPTY_EXERCISE_LIBRARY_FILTERS,
  hasActiveExerciseLibraryFilters,
  toggleExerciseLibraryEquipment,
  toggleExerciseLibraryMuscleGroup,
} from '@/features/exercise-library/application/exercise-library-filters';
import { filterExerciseLibrary } from '@/features/exercise-library/application/filter-exercise-library';
import { loadExerciseLibrary } from '@/features/exercise-library/application/load-exercise-library';
import type { ExerciseLibraryScreenControls } from '@/features/exercise-library/application/use-exercise-library';
import { ExerciseLibraryContent } from '@/features/exercise-library/screens/exercise-library-screen';

describe('Exercise Library screen', () => {
  it('renders the loading state', async () => {
    const { getByText } = await render(
      <ExerciseLibraryContent
        state={{ status: 'loading' }}
        controls={buildControls()}
        onOpenExercise={jest.fn()}
      />,
    );

    expect(getByText('正在加载动作库')).toBeTruthy();
  });

  it('renders the empty state', async () => {
    const { getByText } = await render(
      <ExerciseLibraryContent
        state={{ status: 'empty' }}
        controls={buildControls()}
        onOpenExercise={jest.fn()}
      />,
    );

    expect(getByText('还没有可用动作')).toBeTruthy();
    expect(
      getByText('动作库数据尚未导入，请重新打开应用后再试。'),
    ).toBeTruthy();
  });

  it('renders the error state with persistent recovery copy', async () => {
    const { getByText } = await render(
      <ExerciseLibraryContent
        controls={buildControls()}
        onOpenExercise={jest.fn()}
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
        controls={buildControls()}
        onOpenExercise={jest.fn()}
        state={{
          status: 'ready',
          exercises,
        }}
      />,
    );

    expect(getByText('杠铃卧推')).toBeTruthy();
    expect(getByText('高位下拉')).toBeTruthy();
    expect(getByText('胸 · 杠铃')).toBeTruthy();
    expect(getByLabelText('查看杠铃卧推详情，胸，杠铃')).toBeTruthy();
  });

  it('opens the selected exercise detail from the list row', async () => {
    const onOpenExercise = jest.fn();
    const exercise = buildExercise({
      id: 'exercise-barbell-bench-press',
      nameZh: '杠铃卧推',
      primaryMuscleGroup: 'chest',
      equipment: 'barbell',
    });
    const { getByLabelText } = await render(
      <ExerciseLibraryContent
        controls={buildControls()}
        onOpenExercise={onOpenExercise}
        state={{
          status: 'ready',
          exercises: [exercise],
        }}
      />,
    );

    fireEvent.press(getByLabelText('查看杠铃卧推详情，胸，杠铃'));

    expect(onOpenExercise).toHaveBeenCalledWith(exercise);
  });

  it('renders actionable no-results copy and clear action', async () => {
    const clearFilters = jest.fn();
    const { getByText, getAllByLabelText } = await render(
      <ExerciseLibraryContent
        controls={buildControls({
          filters: {
            ...EMPTY_EXERCISE_LIBRARY_FILTERS,
            queryText: 'unknown',
          },
          hasActiveFilters: true,
          clearFilters,
        })}
        onOpenExercise={jest.fn()}
        state={{
          status: 'ready',
          exercises: [],
        }}
      />,
    );

    expect(getByText('没有找到匹配动作')).toBeTruthy();
    expect(getByText('换个关键词，或清除筛选后再试。')).toBeTruthy();

    fireEvent.press(getAllByLabelText('清除搜索和筛选条件')[0]);

    expect(clearFilters).toHaveBeenCalled();
  });

  it('submits controlled Chinese search text changes', async () => {
    const updateQuery = jest.fn();
    const { getByLabelText } = await render(
      <ExerciseLibraryContent
        controls={buildControls({ updateQuery })}
        onOpenExercise={jest.fn()}
        state={{
          status: 'ready',
          exercises: [buildExercise()],
        }}
      />,
    );

    fireEvent.changeText(getByLabelText('搜索动作'), '卧推');

    expect(updateQuery).toHaveBeenCalledWith('卧推');
  });

  it('toggles muscle-group and equipment filter chips', async () => {
    const toggleMuscleGroup = jest.fn();
    const toggleEquipment = jest.fn();
    const { getByLabelText } = await render(
      <ExerciseLibraryContent
        controls={buildControls({
          filters: {
            ...EMPTY_EXERCISE_LIBRARY_FILTERS,
            muscleGroups: ['chest'],
            equipment: ['barbell'],
          },
          toggleMuscleGroup,
          toggleEquipment,
        })}
        onOpenExercise={jest.fn()}
        state={{
          status: 'ready',
          exercises: [buildExercise()],
        }}
      />,
    );

    const chestChip = getByLabelText('按肌群筛选：胸');
    const barbellChip = getByLabelText('按器械筛选：杠铃');

    expect(chestChip.props.accessibilityState).toEqual({ selected: true });
    expect(barbellChip.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(chestChip);
    fireEvent.press(barbellChip);

    expect(toggleMuscleGroup).toHaveBeenCalledWith('chest');
    expect(toggleEquipment).toHaveBeenCalledWith('barbell');
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

describe('filterExerciseLibrary', () => {
  it('trims English search text and combines repository filters', async () => {
    const exercises = [buildExercise()];
    const search = jest.fn(async () => exercises);
    const repository = buildRepository({
      search,
    });

    await expect(
      filterExerciseLibrary(repository, {
        queryText: '  bench PRESS  ',
        muscleGroups: ['chest'],
        equipment: ['barbell'],
      }),
    ).resolves.toEqual({
      status: 'ready',
      exercises,
    });

    expect(search).toHaveBeenCalledWith(
      { text: 'bench PRESS' },
      {
        muscleGroups: ['chest'],
        equipment: ['barbell'],
      },
    );
  });

  it('uses filtered browse results when the search text is empty', async () => {
    const exercises = [buildExercise()];
    const listByFilters = jest.fn(async () => exercises);
    const repository = buildRepository({
      listByFilters,
    });

    await filterExerciseLibrary(repository, {
      queryText: '   ',
      muscleGroups: ['back'],
      equipment: [],
    });

    expect(listByFilters).toHaveBeenCalledWith({
      muscleGroups: ['back'],
      equipment: undefined,
    });
  });

  it('uses the full browse list when there are no active filters', async () => {
    const exercises = [buildExercise()];
    const list = jest.fn(async () => exercises);
    const repository = buildRepository({
      list,
    });

    await filterExerciseLibrary(repository, EMPTY_EXERCISE_LIBRARY_FILTERS);

    expect(list).toHaveBeenCalled();
  });
});

describe('exercise library filter state', () => {
  it('tracks active filters and clearable state', () => {
    const selectedMuscleGroup = toggleExerciseLibraryMuscleGroup(
      EMPTY_EXERCISE_LIBRARY_FILTERS,
      'chest',
    );
    const selectedEquipment = toggleExerciseLibraryEquipment(
      selectedMuscleGroup,
      'barbell',
    );

    expect(hasActiveExerciseLibraryFilters(selectedEquipment)).toBe(true);
    expect(EMPTY_EXERCISE_LIBRARY_FILTERS).toEqual({
      queryText: '',
      muscleGroups: [],
      equipment: [],
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

function buildControls(
  overrides: Partial<ExerciseLibraryScreenControls> = {},
): ExerciseLibraryScreenControls {
  const filters = overrides.filters ?? EMPTY_EXERCISE_LIBRARY_FILTERS;

  return {
    filters,
    hasActiveFilters:
      overrides.hasActiveFilters ?? hasActiveExerciseLibraryFilters(filters),
    updateQuery: jest.fn(),
    toggleMuscleGroup: jest.fn<void, [MuscleGroup]>(),
    toggleEquipment: jest.fn<void, [Equipment]>(),
    clearFilters: jest.fn(),
    ...overrides,
  };
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
