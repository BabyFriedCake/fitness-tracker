/// <reference types="jest" />

import {
  ExerciseValidationError,
  createExercise,
  validateExerciseInput,
  type ExerciseInput,
} from '@/domain/exercise';

const VALID_EXERCISE_INPUT: ExerciseInput = {
  id: 'exercise-barbell-bench-press',
  slug: 'barbell-bench-press',
  nameZh: '杠铃卧推',
  nameEn: 'Barbell Bench Press',
  type: 'strength',
  primaryMuscleGroup: 'chest',
  secondaryMuscleGroups: ['shoulders', 'arms'],
  equipment: 'barbell',
  description: '水平推举动作。',
  instructionSteps: {
    zh: ['收紧肩胛骨。', '将杠铃控制下放后推起。'],
    en: ['Set the shoulder blades.', 'Lower and press the bar.'],
  },
  imageUri: 'exercise://barbell-bench-press',
  sourceName: 'Fitness Tracker Standard Library',
  sourceReference: 'standard-library:v1',
  sourceLicense: 'MIT',
  sourceAttribution: 'Fitness Tracker',
  status: 'active',
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
};

describe('Exercise domain', () => {
  it('constructs a valid standard exercise with searchable names and filters', () => {
    const exercise = createExercise(VALID_EXERCISE_INPUT);

    expect(exercise).toEqual({
      id: 'exercise-barbell-bench-press',
      slug: 'barbell-bench-press',
      nameZh: '杠铃卧推',
      nameEn: 'Barbell Bench Press',
      type: 'strength',
      primaryMuscleGroup: 'chest',
      secondaryMuscleGroups: ['shoulders', 'arms'],
      equipment: 'barbell',
      description: '水平推举动作。',
      instructionSteps: {
        zh: ['收紧肩胛骨。', '将杠铃控制下放后推起。'],
        en: ['Set the shoulder blades.', 'Lower and press the bar.'],
      },
      imageUri: 'exercise://barbell-bench-press',
      source: {
        name: 'Fitness Tracker Standard Library',
        reference: 'standard-library:v1',
        license: 'MIT',
        attribution: 'Fitness Tracker',
      },
      status: 'active',
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
  });

  it('normalizes optional text fields without changing required domain values', () => {
    const exercise = createExercise({
      ...VALID_EXERCISE_INPUT,
      id: ' exercise-dumbbell-shoulder-press ',
      slug: ' dumbbell-shoulder-press ',
      nameZh: ' 哑铃肩推 ',
      nameEn: ' ',
      secondaryMuscleGroups: null,
      description: null,
      instructionSteps: null,
      imageUri: undefined,
      sourceName: ' ',
      sourceReference: null,
      sourceLicense: null,
      sourceAttribution: undefined,
    });

    expect(exercise.id).toBe('exercise-dumbbell-shoulder-press');
    expect(exercise.slug).toBe('dumbbell-shoulder-press');
    expect(exercise.nameZh).toBe('哑铃肩推');
    expect(exercise.nameEn).toBeUndefined();
    expect(exercise.secondaryMuscleGroups).toEqual([]);
    expect(exercise.source).toBeUndefined();
  });

  it('normalizes instruction steps and rejects malformed step data', () => {
    const exercise = createExercise({
      ...VALID_EXERCISE_INPUT,
      instructionSteps: {
        zh: [' 第一步 ', '第二步'],
      },
    });

    expect(exercise.instructionSteps).toEqual({
      zh: ['第一步', '第二步'],
    });

    const result = validateExerciseInput({
      ...VALID_EXERCISE_INPUT,
      instructionSteps: {
        zh: [''],
      },
    });

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: 'exercise_instruction_steps_invalid',
          path: 'instructionSteps',
        }),
      ],
    });
  });

  it('rejects imported exercise data with invalid domain values', () => {
    const result = validateExerciseInput({
      ...VALID_EXERCISE_INPUT,
      id: ' ',
      slug: 'Barbell Bench Press',
      nameZh: '',
      type: 'mobility',
      primaryMuscleGroup: 'pecs',
      secondaryMuscleGroups: ['shoulders', 'triceps'],
      equipment: 'smith',
      status: 'enabled',
      createdAt: 'not-a-date',
      updatedAt: '2026-07-15',
    });

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ code: 'exercise_id_required' }),
        expect.objectContaining({ code: 'exercise_slug_invalid' }),
        expect.objectContaining({ code: 'exercise_name_zh_required' }),
        expect.objectContaining({ code: 'exercise_type_invalid' }),
        expect.objectContaining({
          code: 'exercise_primary_muscle_group_invalid',
        }),
        expect.objectContaining({
          code: 'exercise_secondary_muscle_group_invalid',
        }),
        expect.objectContaining({ code: 'exercise_equipment_invalid' }),
        expect.objectContaining({ code: 'exercise_status_invalid' }),
        expect.objectContaining({ code: 'exercise_created_at_invalid' }),
        expect.objectContaining({ code: 'exercise_updated_at_invalid' }),
      ],
    });
  });

  it('throws an explicit validation error when constructing invalid Exercise data', () => {
    expect(() =>
      createExercise({
        ...VALID_EXERCISE_INPUT,
        nameZh: '',
      }),
    ).toThrow(ExerciseValidationError);
  });
});
