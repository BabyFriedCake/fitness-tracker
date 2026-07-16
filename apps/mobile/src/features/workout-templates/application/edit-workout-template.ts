import type { Exercise, ExerciseId } from '@/domain/exercise';
import type {
  TemplateExerciseId,
  UpdateWorkoutTemplateInput,
  WorkoutTemplate,
  WorkoutTemplateId,
  WorkoutTemplateRepository,
} from '@/domain/workout-template';

export type WorkoutTemplateEditExerciseDraft = {
  readonly id?: TemplateExerciseId;
  readonly exerciseId: ExerciseId;
  readonly exercise?: Exercise;
  readonly targetSets: string;
  readonly targetRepsMin: string;
  readonly targetRepsMax: string;
  readonly restSeconds: string;
  readonly createdAt?: string;
};

export type WorkoutTemplateEditDraft = {
  readonly templateId: WorkoutTemplateId;
  readonly name: string;
  readonly description: string;
  readonly exercises: readonly WorkoutTemplateEditExerciseDraft[];
};

export type WorkoutTemplateEditFieldErrors = {
  readonly name?: string;
  readonly exercises?: string;
  readonly exerciseConfigs?: Readonly<Record<string, string>>;
};

export type WorkoutTemplateEditSaveResult =
  | {
      readonly status: 'saved';
      readonly template: WorkoutTemplate;
    }
  | {
      readonly status: 'invalid';
      readonly fieldErrors: WorkoutTemplateEditFieldErrors;
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

export type WorkoutTemplateEditIdFactory = () => string;

export type SaveWorkoutTemplateEditDraftOptions = {
  readonly now: () => string;
  readonly createTemplateExerciseId: WorkoutTemplateEditIdFactory;
};

export async function saveWorkoutTemplateEditDraft(
  repository: WorkoutTemplateRepository,
  draft: WorkoutTemplateEditDraft,
  options: SaveWorkoutTemplateEditDraftOptions,
): Promise<WorkoutTemplateEditSaveResult> {
  const fieldErrors = validateWorkoutTemplateEditDraft(draft);

  if (hasFieldErrors(fieldErrors)) {
    return {
      status: 'invalid',
      fieldErrors,
    };
  }

  try {
    const template = await repository.update(
      buildUpdateWorkoutTemplateInput(draft, options),
    );

    return {
      status: 'saved',
      template,
    };
  } catch {
    return {
      status: 'error',
      message: '训练模板保存失败。当前修改仍保留，请重新保存。',
    };
  }
}

export function validateWorkoutTemplateEditDraft(
  draft: WorkoutTemplateEditDraft,
): WorkoutTemplateEditFieldErrors {
  const errors: {
    name?: string;
    exercises?: string;
    exerciseConfigs?: Record<string, string>;
  } = {};
  const trimmedName = draft.name.trim();

  if (!trimmedName) {
    errors.name = '请输入模板名称。';
  }

  if (draft.exercises.length === 0) {
    errors.exercises = '至少保留一个动作后才能保存模板。';
  } else if (hasDuplicateExerciseIds(draft.exercises)) {
    errors.exercises = '同一动作不能重复添加。';
  }

  for (const exercise of draft.exercises) {
    const configError = validateExerciseConfig(exercise);

    if (configError) {
      errors.exerciseConfigs = {
        ...errors.exerciseConfigs,
        [exercise.exerciseId]: configError,
      };
    }
  }

  return errors;
}

function buildUpdateWorkoutTemplateInput(
  draft: WorkoutTemplateEditDraft,
  options: SaveWorkoutTemplateEditDraftOptions,
): UpdateWorkoutTemplateInput {
  const timestamp = options.now();

  return {
    id: draft.templateId,
    name: draft.name.trim(),
    description: normalizeOptionalDescription(draft.description),
    updatedAt: timestamp,
    exercises: draft.exercises.map((exercise, index) => ({
      id: exercise.id ?? options.createTemplateExerciseId(),
      templateId: draft.templateId,
      exerciseId: exercise.exerciseId,
      position: index + 1,
      targetSets: requirePositiveInteger(exercise.targetSets),
      targetRepsMin: requirePositiveInteger(exercise.targetRepsMin),
      targetRepsMax: requirePositiveInteger(exercise.targetRepsMax),
      restSeconds: requireNonNegativeInteger(exercise.restSeconds),
      createdAt: exercise.createdAt ?? timestamp,
      updatedAt: timestamp,
    })),
  };
}

function validateExerciseConfig(
  exercise: WorkoutTemplateEditExerciseDraft,
): string | undefined {
  const targetSets = parsePositiveInteger(exercise.targetSets);
  const targetRepsMin = parsePositiveInteger(exercise.targetRepsMin);
  const targetRepsMax = parsePositiveInteger(exercise.targetRepsMax);
  const restSeconds = parseNonNegativeInteger(exercise.restSeconds);

  if (targetSets === null) {
    return '目标组数必须大于 0。';
  }

  if (targetRepsMin === null) {
    return '最小次数必须大于 0。';
  }

  if (targetRepsMax === null) {
    return '最大次数必须大于 0。';
  }

  if (targetRepsMax < targetRepsMin) {
    return '次数范围不能反转。';
  }

  if (restSeconds === null) {
    return '休息时间不能为负数。';
  }

  return undefined;
}

function hasFieldErrors(errors: WorkoutTemplateEditFieldErrors): boolean {
  return (
    !!errors.name ||
    !!errors.exercises ||
    Object.keys(errors.exerciseConfigs ?? {}).length > 0
  );
}

function normalizeOptionalDescription(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function hasDuplicateExerciseIds(
  exercises: readonly WorkoutTemplateEditExerciseDraft[],
): boolean {
  const ids = new Set<string>();

  for (const exercise of exercises) {
    if (ids.has(exercise.exerciseId)) {
      return true;
    }

    ids.add(exercise.exerciseId);
  }

  return false;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value.trim())) {
    return null;
  }

  return Number(value.trim());
}

function parseNonNegativeInteger(value: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(value.trim())) {
    return null;
  }

  return Number(value.trim());
}

function requirePositiveInteger(value: string): number {
  const parsedValue = parsePositiveInteger(value);

  if (parsedValue === null) {
    throw new Error('Expected valid positive integer draft field.');
  }

  return parsedValue;
}

function requireNonNegativeInteger(value: string): number {
  const parsedValue = parseNonNegativeInteger(value);

  if (parsedValue === null) {
    throw new Error('Expected valid non-negative integer draft field.');
  }

  return parsedValue;
}
