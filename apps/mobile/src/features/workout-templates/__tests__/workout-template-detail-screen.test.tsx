/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type {
  Exercise,
  ExerciseId,
  ExerciseRepository,
} from '@/domain/exercise';
import {
  createWorkoutTemplate,
  type TemplateExerciseId,
  type WorkoutTemplate,
  type WorkoutTemplateId,
  type WorkoutTemplateRepository,
} from '@/domain/workout-template';
import { loadWorkoutTemplateDetail } from '@/features/workout-templates/application/load-workout-template-detail';
import { WorkoutTemplateDetailContent } from '@/features/workout-templates/screens/workout-template-detail-screen';

const TEMPLATE_ID = 'template-lower-body' as WorkoutTemplateId;
const EXERCISE_ID = 'exercise-squat' as ExerciseId;
const CREATED_AT = '2026-07-23T01:00:00.000Z';

describe('Workout Template detail screen', () => {
  it('renders a read-only template detail and opens edit from the header action', async () => {
    const onEditTemplate = jest.fn();
    const { getByLabelText, getByText } = await render(
      <WorkoutTemplateDetailContent
        state={{
          status: 'ready',
          template: {
            id: TEMPLATE_ID,
            name: '下肢力量训练',
            description: '力量训练',
            status: 'active',
            exerciseCount: 1,
            totalTargetSets: 4,
            estimatedDurationMinutes: null,
            estimatedCalories: null,
            exercises: [
              {
                id: 'template-exercise-squat' as TemplateExerciseId,
                exerciseId: EXERCISE_ID,
                name: '杠铃深蹲',
                position: 1,
                targetSets: 4,
                targetRepsLabel: '8-10',
                restSeconds: 90,
              },
            ],
          },
        }}
        controls={{ reload: jest.fn() }}
        onBack={jest.fn()}
        onEditTemplate={onEditTemplate}
      />,
    );

    expect(getByText('力量训练 · 1 个动作')).toBeTruthy();
    expect(getByText('下肢力量训练')).toBeTruthy();
    expect(getByText('时长待估算 · 4 组 · 预计消耗待估算')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
    expect(getByText('杠铃深蹲')).toBeTruthy();
    expect(getByText('4 组 · 8-10 次 · 90 秒')).toBeTruthy();

    await fireEvent.press(getByLabelText('编辑此次训练'));

    expect(onEditTemplate).toHaveBeenCalledWith(TEMPLATE_ID);
  });

  it('loads template details through repository boundaries', async () => {
    const template = buildTemplate();
    const workoutTemplateRepository = buildWorkoutTemplateRepository({
      getById: jest.fn(async () => template),
    });
    const exerciseRepository = buildExerciseRepository({
      getSelectedByIds: jest.fn(async () => [buildExercise()]),
    });

    await expect(
      loadWorkoutTemplateDetail(
        { workoutTemplateRepository, exerciseRepository },
        TEMPLATE_ID,
      ),
    ).resolves.toEqual({
      status: 'ready',
      template: {
        id: TEMPLATE_ID,
        name: '下肢力量训练',
        description: '力量训练',
        status: 'active',
        exerciseCount: 1,
        totalTargetSets: 4,
        estimatedDurationMinutes: null,
        estimatedCalories: null,
        exercises: [
          {
            id: 'template-exercise-squat',
            exerciseId: EXERCISE_ID,
            name: '杠铃深蹲',
            position: 1,
            targetSets: 4,
            targetRepsLabel: '8-10',
            restSeconds: 90,
          },
        ],
      },
    });
    expect(workoutTemplateRepository.getById).toHaveBeenCalledWith(TEMPLATE_ID);
    expect(exerciseRepository.getSelectedByIds).toHaveBeenCalledWith([
      EXERCISE_ID,
    ]);
  });
});

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
    name: '下肢力量训练',
    description: '力量训练',
    status: overrides.status ?? 'active',
    exercises: [
      {
        id: 'template-exercise-squat',
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
      overrides.status === 'archived' ? '2026-07-23T02:00:00.000Z' : null,
  });
}

function buildExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: EXERCISE_ID,
    slug: 'barbell-squat',
    nameZh: '杠铃深蹲',
    nameEn: 'Barbell Squat',
    type: 'strength',
    primaryMuscleGroup: 'legs',
    secondaryMuscleGroups: ['core'],
    equipment: 'barbell',
    instructionSteps: { setup: ['保持核心收紧。'] },
    imageUri: 'file://squat.png',
    status: 'active',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}
