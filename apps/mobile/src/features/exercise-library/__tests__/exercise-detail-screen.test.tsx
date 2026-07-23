/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import {
  createExercise,
  type Exercise,
  type ExerciseInput,
  type ExerciseRepository,
} from '@/domain/exercise';
import { loadExerciseDetail } from '@/features/exercise-library/application/load-exercise-detail';
import { ExerciseDetailContent } from '@/features/exercise-library/screens/exercise-detail-screen';

describe('Exercise Detail screen', () => {
  it('renders the loading state', async () => {
    const { getByText } = await render(
      <ExerciseDetailContent state={{ status: 'loading' }} />,
    );

    expect(getByText('正在加载动作详情')).toBeTruthy();
  });

  it('renders a distinct not-found state', async () => {
    const { getByText } = await render(
      <ExerciseDetailContent state={{ status: 'not-found' }} />,
    );

    expect(getByText('没有找到这个动作')).toBeTruthy();
    expect(getByText('这个动作可能尚未导入，或链接已失效。')).toBeTruthy();
  });

  it('renders a distinct persistence error state with reload', async () => {
    const onReload = jest.fn();
    const { getByText, getByLabelText } = await render(
      <ExerciseDetailContent
        onReload={onReload}
        state={{
          status: 'error',
          message: '动作详情加载失败。已保存的训练数据不会受影响，请稍后重试。',
        }}
      />,
    );

    expect(getByText('动作详情加载失败')).toBeTruthy();
    expect(
      getByText('动作详情加载失败。已保存的训练数据不会受影响，请稍后重试。'),
    ).toBeTruthy();
    fireEvent.press(getByLabelText('重新加载动作详情'));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('renders exercise details and visible source license attribution', async () => {
    const { getByText, getByLabelText } = await render(
      <ExerciseDetailContent
        state={{
          status: 'ready',
          exercise: buildExercise({
            id: 'exercise-barbell-bench-press',
            nameZh: '杠铃卧推',
            nameEn: 'Barbell Bench Press',
            primaryMuscleGroup: 'chest',
            secondaryMuscleGroups: ['shoulders', 'arms'],
            equipment: 'barbell',
            description: '平板卧推，主要训练胸部推举力量。',
            instructionSteps: {
              zh: ['肩胛骨后收并平躺。', '控制杠铃下放后推起。'],
            },
            sourceName: 'Fitness Tracker Starter Exercise Set',
            sourceReference: 'starter-v1',
            sourceLicense: 'CC0-1.0',
            sourceAttribution: 'Fitness Tracker',
          }),
        }}
      />,
    );

    expect(getByText('杠铃卧推')).toBeTruthy();
    expect(getByText('Barbell Bench Press')).toBeTruthy();
    expect(getByText('胸 · 杠铃')).toBeTruthy();
    expect(getByText('平板卧推，主要训练胸部推举力量。')).toBeTruthy();
    expect(getByText('肩胛骨后收并平躺。')).toBeTruthy();
    expect(getByText('控制杠铃下放后推起。')).toBeTruthy();
    expect(getByText('肩、手臂')).toBeTruthy();
    expect(getByText('Fitness Tracker Starter Exercise Set')).toBeTruthy();
    expect(getByText('starter-v1')).toBeTruthy();
    expect(getByText('CC0-1.0')).toBeTruthy();
    expect(getByText('Fitness Tracker')).toBeTruthy();
    expect(getByLabelText('动作图片占位：杠铃卧推')).toBeTruthy();
  });

  it('handles missing optional fields without breaking layout', async () => {
    const { getByText, getAllByText } = await render(
      <ExerciseDetailContent
        state={{
          status: 'ready',
          exercise: buildExercise({
            nameZh: '未补充动作',
            nameEn: null,
            description: null,
            secondaryMuscleGroups: [],
            sourceName: null,
            sourceReference: null,
          }),
        }}
      />,
    );

    expect(getByText('未补充动作')).toBeTruthy();
    expect(getByText('暂无动作说明。')).toBeTruthy();
    expect(getAllByText('未记录').length).toBeGreaterThanOrEqual(3);
  });

  it('renders inactive historical exercises when explicitly opened', async () => {
    const { getByText } = await render(
      <ExerciseDetailContent
        state={{
          status: 'ready',
          exercise: buildExercise({
            nameZh: '停用飞鸟',
            status: 'inactive',
          }),
        }}
      />,
    );

    expect(getByText('停用飞鸟')).toBeTruthy();
    expect(getByText('状态：停用，仅用于历史记录兼容。')).toBeTruthy();
  });

  it('exposes a large tap target for returning to the library', async () => {
    const onBack = jest.fn();
    const { getByLabelText } = await render(
      <ExerciseDetailContent
        onBack={onBack}
        state={{
          status: 'ready',
          exercise: buildExercise(),
        }}
      />,
    );

    fireEvent.press(getByLabelText('返回动作库'));

    expect(onBack).toHaveBeenCalled();
  });
});

describe('loadExerciseDetail', () => {
  it('loads an explicitly opened inactive exercise through the repository', async () => {
    const exercise = buildExercise({
      id: 'exercise-archived-chest-fly',
      status: 'inactive',
    });
    const getById = jest.fn(async () => exercise);
    const repository = buildRepository({ getById });

    await expect(
      loadExerciseDetail(repository, 'exercise-archived-chest-fly'),
    ).resolves.toEqual({
      status: 'ready',
      exercise,
    });

    expect(getById).toHaveBeenCalledWith('exercise-archived-chest-fly');
  });

  it('returns not-found for missing IDs and absent repository rows', async () => {
    const repository = buildRepository({
      getById: async () => null,
    });

    await expect(loadExerciseDetail(repository, '   ')).resolves.toEqual({
      status: 'not-found',
    });
    await expect(loadExerciseDetail(repository, 'missing-id')).resolves.toEqual(
      {
        status: 'not-found',
      },
    );
  });

  it('maps persistence failures to error state', async () => {
    const repository = buildRepository({
      getById: async () => {
        throw new Error('database unavailable');
      },
    });

    await expect(
      loadExerciseDetail(repository, 'exercise-default'),
    ).resolves.toEqual({
      status: 'error',
      message: '动作详情加载失败。已保存的训练数据不会受影响，请稍后重试。',
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
    description: '默认动作说明。',
    imageUri: null,
    sourceName: 'Exercise Detail Test',
    sourceReference: 'detail-test',
    sourceLicense: 'CC0-1.0',
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
