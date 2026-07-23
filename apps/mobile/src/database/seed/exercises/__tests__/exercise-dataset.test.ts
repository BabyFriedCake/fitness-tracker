/// <reference types="jest" />

import {
  BUNDLED_EXERCISES,
  BUNDLED_EXERCISE_DATASET_VERSION,
  validateExerciseSeedRows,
} from '@/database/seed/exercises';

// The build adapter is CommonJS so the same file can run directly with Node.
const {
  DATASET_SOURCE_LICENSE,
  DATASET_SOURCE_NAME,
  DATASET_SOURCE_REFERENCE,
  mapExerciseDataset,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('../../../../../scripts/build-exercise-dataset.cjs') as {
  readonly DATASET_SOURCE_LICENSE: string;
  readonly DATASET_SOURCE_NAME: string;
  readonly DATASET_SOURCE_REFERENCE: string;
  readonly mapExerciseDataset: (
    rows: readonly Record<string, unknown>[],
  ) => readonly Record<string, unknown>[];
};

describe('bundled exercise dataset', () => {
  it('contains the pinned offline dataset and passes domain validation', () => {
    expect(BUNDLED_EXERCISE_DATASET_VERSION).toBe(
      'hasaneyldrm-exercises-dataset-7455efae',
    );
    expect(BUNDLED_EXERCISES).toHaveLength(1324);
    expect(() => validateExerciseSeedRows(BUNDLED_EXERCISES)).not.toThrow();
    expect(
      BUNDLED_EXERCISES.every((exercise) => exercise.imageUri === null),
    ).toBe(true);
  });

  it('maps source rows to stable local records without restricted media', () => {
    const [exercise] = mapExerciseDataset([
      {
        id: '0001',
        name: '3/4 sit-up',
        category: 'waist',
        equipment: 'body weight',
        instructions: { zh: '动作说明', en: 'Instructions' },
        instruction_steps: {
          zh: ['第一步', '第二步'],
          en: ['Step one', 'Step two'],
        },
        secondary_muscles: ['hip flexors', 'lower back'],
        created_at: '2026-03-18T12:31:32.854798+00:00',
      },
    ]);

    expect(exercise).toEqual(
      expect.objectContaining({
        id: 'exercise-hased-0001',
        slug: '3-4-sit-up-0001',
        primaryMuscleGroup: 'core',
        equipment: 'bodyweight',
        imageUri: null,
        sourceName: DATASET_SOURCE_NAME,
        sourceReference: DATASET_SOURCE_REFERENCE,
        license: DATASET_SOURCE_LICENSE,
      }),
    );
  });

  it('rejects unsupported categories instead of silently corrupting data', () => {
    expect(() =>
      mapExerciseDataset([
        {
          id: 'invalid',
          name: 'Invalid',
          category: 'unknown',
          equipment: 'body weight',
          created_at: '2026-03-18T12:31:32.854798+00:00',
        },
      ]),
    ).toThrow('Unsupported exercise category');
  });
});
