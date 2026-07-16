import type { Exercise } from '@/domain/exercise';
import type {
  CreateWorkoutTemplateInput,
  WorkoutTemplate,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';

import { DEFAULT_TEMPLATE_EXERCISE_CONFIG } from './workout-template-create-defaults';

export type WorkoutTemplateCreateDraft = {
  readonly name: string;
  readonly description: string;
  readonly exercises: readonly Exercise[];
};

export type WorkoutTemplateCreateFieldErrors = {
  readonly name?: string;
  readonly exercises?: string;
};

export type WorkoutTemplateCreateSaveResult =
  | {
      readonly status: 'saved';
      readonly template: WorkoutTemplate;
    }
  | {
      readonly status: 'invalid';
      readonly fieldErrors: WorkoutTemplateCreateFieldErrors;
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export type WorkoutTemplateCreateIdKind = 'template' | 'templateExercise';

export type WorkoutTemplateCreateIdFactory = (
  kind: WorkoutTemplateCreateIdKind,
) => string;

export type SaveWorkoutTemplateCreateDraftOptions = {
  readonly now: () => string;
  readonly createId: WorkoutTemplateCreateIdFactory;
};

export async function saveWorkoutTemplateCreateDraft(
  repository: WorkoutTemplateRepository,
  draft: WorkoutTemplateCreateDraft,
  options: SaveWorkoutTemplateCreateDraftOptions,
): Promise<WorkoutTemplateCreateSaveResult> {
  const fieldErrors = validateWorkoutTemplateCreateDraft(draft);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'invalid',
      fieldErrors,
    };
  }

  try {
    const input = buildCreateWorkoutTemplateInput(draft, options);
    const template = await repository.create(input);

    return {
      status: 'saved',
      template,
    };
  } catch {
    return {
      status: 'error',
      message: '训练模板保存失败。当前输入仍保留，请重新保存。',
    };
  }
}

export function validateWorkoutTemplateCreateDraft(
  draft: WorkoutTemplateCreateDraft,
): WorkoutTemplateCreateFieldErrors {
  const errors: {
    name?: string;
    exercises?: string;
  } = {};
  const trimmedName = draft.name.trim();

  if (!trimmedName) {
    errors.name = '请输入模板名称。';
  }

  if (draft.exercises.length === 0) {
    errors.exercises = '至少添加一个动作后才能保存模板。';
  } else if (hasDuplicateExercises(draft.exercises)) {
    errors.exercises = '同一动作不能重复添加。';
  }

  return errors;
}

function buildCreateWorkoutTemplateInput(
  draft: WorkoutTemplateCreateDraft,
  options: SaveWorkoutTemplateCreateDraftOptions,
): CreateWorkoutTemplateInput {
  const templateId = options.createId('template');
  const timestamp = options.now();

  return {
    id: templateId,
    name: draft.name.trim(),
    description: normalizeOptionalDescription(draft.description),
    createdAt: timestamp,
    updatedAt: timestamp,
    exercises: draft.exercises.map((exercise, index) => ({
      id: options.createId('templateExercise'),
      templateId,
      exerciseId: exercise.id,
      position: index + 1,
      targetSets: DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetSets,
      targetRepsMin: DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMin,
      targetRepsMax: DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMax,
      restSeconds: DEFAULT_TEMPLATE_EXERCISE_CONFIG.restSeconds,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  };
}

function normalizeOptionalDescription(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function hasDuplicateExercises(exercises: readonly Exercise[]): boolean {
  const ids = new Set<string>();

  for (const exercise of exercises) {
    if (ids.has(exercise.id)) {
      return true;
    }

    ids.add(exercise.id);
  }

  return false;
}
