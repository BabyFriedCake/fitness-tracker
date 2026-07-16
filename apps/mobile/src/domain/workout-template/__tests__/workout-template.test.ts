/// <reference types="jest" />

import {
  WorkoutTemplateValidationError,
  assertWorkoutTemplateCanStart,
  canStartWorkoutFromTemplate,
  createTemplateExercise,
  createWorkoutTemplate,
  validateTemplateExerciseInput,
  validateWorkoutTemplateInput,
  type CreateWorkoutTemplateInput,
  type TemplateExerciseInput,
  type UpdateWorkoutTemplateInput,
  type WorkoutTemplateInput,
} from '@/domain/workout-template';

const VALID_TEMPLATE_EXERCISE_INPUT: TemplateExerciseInput = {
  id: 'template-exercise-bench-press',
  templateId: 'template-push',
  exerciseId: 'exercise-barbell-bench-press',
  position: 1,
  targetSets: 4,
  targetRepsMin: 8,
  targetRepsMax: 10,
  restSeconds: 90,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

const VALID_TEMPLATE_INPUT: WorkoutTemplateInput = {
  id: 'template-push',
  name: 'Push',
  description: '胸肩三头',
  status: 'active',
  exercises: [VALID_TEMPLATE_EXERCISE_INPUT],
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
};

describe('WorkoutTemplate domain', () => {
  it('keeps create and update contracts separate from full record reconstruction', () => {
    const createIncludesCreatedAt: HasKey<
      CreateWorkoutTemplateInput,
      'createdAt'
    > = true;
    const updateIncludesUpdatedAt: HasKey<
      UpdateWorkoutTemplateInput,
      'updatedAt'
    > = true;
    const createExcludesStatus: Not<
      HasKey<CreateWorkoutTemplateInput, 'status'>
    > = true;
    const createExcludesArchivedAt: Not<
      HasKey<CreateWorkoutTemplateInput, 'archivedAt'>
    > = true;
    const updateExcludesCreatedAt: Not<
      HasKey<UpdateWorkoutTemplateInput, 'createdAt'>
    > = true;
    const updateExcludesStatus: Not<
      HasKey<UpdateWorkoutTemplateInput, 'status'>
    > = true;
    const updateExcludesArchivedAt: Not<
      HasKey<UpdateWorkoutTemplateInput, 'archivedAt'>
    > = true;

    expect(createIncludesCreatedAt).toBe(true);
    expect(updateIncludesUpdatedAt).toBe(true);
    expect(createExcludesStatus).toBe(true);
    expect(createExcludesArchivedAt).toBe(true);
    expect(updateExcludesCreatedAt).toBe(true);
    expect(updateExcludesStatus).toBe(true);
    expect(updateExcludesArchivedAt).toBe(true);
  });

  it('constructs an immutable active template with ordered exercise targets', () => {
    const template = createWorkoutTemplate({
      ...VALID_TEMPLATE_INPUT,
      exercises: [
        {
          ...VALID_TEMPLATE_EXERCISE_INPUT,
          id: 'template-exercise-lat-raise',
          exerciseId: 'exercise-dumbbell-lateral-raise',
          position: 2,
        },
        VALID_TEMPLATE_EXERCISE_INPUT,
      ],
    });

    expect(template).toEqual({
      id: 'template-push',
      name: 'Push',
      description: '胸肩三头',
      status: 'active',
      exercises: [
        {
          id: 'template-exercise-bench-press',
          templateId: 'template-push',
          exerciseId: 'exercise-barbell-bench-press',
          position: 1,
          targetSets: 4,
          targetReps: {
            min: 8,
            max: 10,
          },
          restSeconds: 90,
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
        expect.objectContaining({
          id: 'template-exercise-lat-raise',
          position: 2,
        }),
      ],
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z',
    });
  });

  it('normalizes optional template text without changing stable ids', () => {
    const template = createWorkoutTemplate({
      ...VALID_TEMPLATE_INPUT,
      id: ' template-pull ',
      name: ' Pull ',
      description: ' ',
      exercises: null,
    });

    expect(template.id).toBe('template-pull');
    expect(template.name).toBe('Pull');
    expect(template.description).toBeUndefined();
    expect(template.exercises).toEqual([]);
  });

  it('constructs an archived template for historical session references', () => {
    const template = createWorkoutTemplate({
      ...VALID_TEMPLATE_INPUT,
      status: 'archived',
      archivedAt: '2026-07-17T00:00:00.000Z',
    });

    expect(template.status).toBe('archived');
    expect(template.archivedAt).toBe('2026-07-17T00:00:00.000Z');
  });

  it('enforces archivedAt invariants for active and archived templates', () => {
    expect(
      validateWorkoutTemplateInput({
        ...VALID_TEMPLATE_INPUT,
        archivedAt: '2026-07-17T00:00:00.000Z',
      }),
    ).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: 'workout_template_active_archived_at_invalid',
        }),
      ],
    });

    expect(
      validateWorkoutTemplateInput({
        ...VALID_TEMPLATE_INPUT,
        status: 'archived',
      }),
    ).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: 'workout_template_archived_at_required',
        }),
      ],
    });
  });

  it('rejects template exercises that reference a different parent template', () => {
    const result = validateWorkoutTemplateInput({
      ...VALID_TEMPLATE_INPUT,
      exercises: [
        {
          ...VALID_TEMPLATE_EXERCISE_INPUT,
          templateId: 'template-other',
        },
      ],
    });

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: 'template_exercise_template_id_mismatch',
          path: 'exercises.0.templateId',
        }),
      ],
    });
  });

  it('rejects invalid template metadata with explicit issue codes', () => {
    const result = validateWorkoutTemplateInput({
      ...VALID_TEMPLATE_INPUT,
      id: ' ',
      name: '',
      status: 'deleted',
      createdAt: 'today',
      updatedAt: '2026-07-16',
      archivedAt: 'later',
    });

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ code: 'workout_template_id_required' }),
        expect.objectContaining({ code: 'workout_template_name_required' }),
        expect.objectContaining({ code: 'workout_template_status_invalid' }),
        expect.objectContaining({
          code: 'workout_template_created_at_invalid',
        }),
        expect.objectContaining({
          code: 'workout_template_updated_at_invalid',
        }),
        expect.objectContaining({
          code: 'workout_template_archived_at_invalid',
        }),
      ],
    });
  });

  it('rejects invalid exercise targets before they can be saved to a template', () => {
    const result = validateTemplateExerciseInput({
      ...VALID_TEMPLATE_EXERCISE_INPUT,
      id: '',
      templateId: '',
      exerciseId: '',
      position: 0,
      targetSets: 0,
      targetRepsMin: 12,
      targetRepsMax: 8,
      restSeconds: -1,
      createdAt: 'today',
      updatedAt: '2026-07-16',
    });

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({ code: 'template_exercise_id_required' }),
        expect.objectContaining({
          code: 'template_exercise_template_id_required',
        }),
        expect.objectContaining({
          code: 'template_exercise_exercise_id_required',
        }),
        expect.objectContaining({
          code: 'template_exercise_position_invalid',
        }),
        expect.objectContaining({
          code: 'template_exercise_target_sets_invalid',
        }),
        expect.objectContaining({
          code: 'template_exercise_target_reps_range_invalid',
        }),
        expect.objectContaining({
          code: 'template_exercise_rest_seconds_invalid',
        }),
        expect.objectContaining({
          code: 'template_exercise_created_at_invalid',
        }),
        expect.objectContaining({
          code: 'template_exercise_updated_at_invalid',
        }),
      ],
    });
  });

  it('allows fixed rep targets and zero rest while keeping target weight out of the template', () => {
    const templateExercise = createTemplateExercise({
      ...VALID_TEMPLATE_EXERCISE_INPUT,
      targetRepsMin: 10,
      targetRepsMax: 10,
      restSeconds: 0,
    });

    expect(templateExercise.targetReps).toEqual({
      min: 10,
      max: 10,
    });
    expect(templateExercise.restSeconds).toBe(0);
    expect(templateExercise).not.toHaveProperty('weight');
    expect(templateExercise).not.toHaveProperty('targetWeight');
  });

  it('requires at least one active template exercise before starting a workout', () => {
    const emptyTemplate = createWorkoutTemplate({
      ...VALID_TEMPLATE_INPUT,
      exercises: [],
    });
    const archivedTemplate = createWorkoutTemplate({
      ...VALID_TEMPLATE_INPUT,
      status: 'archived',
      archivedAt: '2026-07-17T00:00:00.000Z',
    });
    const startableTemplate = createWorkoutTemplate(VALID_TEMPLATE_INPUT);

    expect(canStartWorkoutFromTemplate(emptyTemplate)).toBe(false);
    expect(canStartWorkoutFromTemplate(archivedTemplate)).toBe(false);
    expect(canStartWorkoutFromTemplate(startableTemplate)).toBe(true);
    expect(() => assertWorkoutTemplateCanStart(emptyTemplate)).toThrow(
      WorkoutTemplateValidationError,
    );
  });

  it('throws an explicit validation error when constructing invalid template data', () => {
    expect(() =>
      createWorkoutTemplate({
        ...VALID_TEMPLATE_INPUT,
        name: '',
      }),
    ).toThrow(WorkoutTemplateValidationError);
  });
});

type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

type Not<T extends boolean> = T extends true ? false : true;
