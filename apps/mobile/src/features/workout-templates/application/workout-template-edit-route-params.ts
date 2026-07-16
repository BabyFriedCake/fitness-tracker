import type { ExerciseId } from '@/domain/exercise';
import type { TemplateExerciseId } from '@/domain/workout-template';

import { DEFAULT_TEMPLATE_EXERCISE_CONFIG } from './workout-template-create-defaults';

export type WorkoutTemplateEditRouteParams = {
  readonly id?: string | readonly string[];
  readonly draftName?: string | readonly string[];
  readonly draftDescription?: string | readonly string[];
  readonly draftExercises?: string | readonly string[];
  readonly selectedExerciseId?: string | readonly string[];
  readonly selectionContext?: string | readonly string[];
};

export type WorkoutTemplateEditRouteExerciseDraft = {
  readonly id?: TemplateExerciseId;
  readonly exerciseId: ExerciseId;
  readonly targetSets: string;
  readonly targetRepsMin: string;
  readonly targetRepsMax: string;
  readonly restSeconds: string;
  readonly createdAt?: string;
};

export type WorkoutTemplateEditRouteExerciseDraftState =
  | {
      readonly status: 'missing';
    }
  | {
      readonly status: 'valid';
      readonly exercises: readonly WorkoutTemplateEditRouteExerciseDraft[];
    }
  | {
      readonly status: 'invalid';
    };

export type WorkoutTemplateEditRouteDraft = {
  readonly templateId?: string;
  readonly name?: string;
  readonly description?: string;
  readonly exerciseDraftState: WorkoutTemplateEditRouteExerciseDraftState;
  readonly selectedExerciseId?: ExerciseId;
  readonly duplicateSelectionIgnored: boolean;
};

export function parseWorkoutTemplateEditRouteDraft(
  params: WorkoutTemplateEditRouteParams,
): WorkoutTemplateEditRouteDraft {
  const exerciseDraftState = parseDraftExercises(
    firstParamValue(params.draftExercises),
  );
  const exercises =
    exerciseDraftState.status === 'valid' ? exerciseDraftState.exercises : [];
  const selectedExerciseId = firstParamValue(params.selectedExerciseId);
  const selectionContext = firstParamValue(params.selectionContext);
  const templateSelectedExerciseId =
    selectionContext === 'template' && selectedExerciseId
      ? (selectedExerciseId as ExerciseId)
      : undefined;
  const duplicateSelectionIgnored =
    !!templateSelectedExerciseId &&
    exercises.some(
      (exercise) => exercise.exerciseId === templateSelectedExerciseId,
    );

  return {
    templateId: firstParamValue(params.id),
    name: firstParamValue(params.draftName),
    description: firstParamValue(params.draftDescription),
    exerciseDraftState:
      exerciseDraftState.status === 'valid'
        ? {
            status: 'valid',
            exercises: mergeSelectedExercise(
              exercises,
              templateSelectedExerciseId,
            ),
          }
        : exerciseDraftState,
    selectedExerciseId: templateSelectedExerciseId,
    duplicateSelectionIgnored,
  };
}

export function serializeWorkoutTemplateEditDraftRouteParams(input: {
  readonly templateId: string;
  readonly name: string;
  readonly description: string;
  readonly exercises: readonly WorkoutTemplateEditRouteExerciseDraft[];
}): Record<string, string> {
  return {
    id: input.templateId,
    draftName: input.name,
    draftDescription: input.description,
    draftExercises: JSON.stringify(
      input.exercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        targetSets: exercise.targetSets,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        restSeconds: exercise.restSeconds,
        createdAt: exercise.createdAt,
      })),
    ),
  };
}

function mergeSelectedExercise(
  exercises: readonly WorkoutTemplateEditRouteExerciseDraft[],
  selectedExerciseId: ExerciseId | undefined,
): readonly WorkoutTemplateEditRouteExerciseDraft[] {
  if (
    !selectedExerciseId ||
    exercises.some((exercise) => exercise.exerciseId === selectedExerciseId)
  ) {
    return exercises;
  }

  return [
    ...exercises,
    {
      exerciseId: selectedExerciseId,
      targetSets: String(DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetSets),
      targetRepsMin: String(DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMin),
      targetRepsMax: String(DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMax),
      restSeconds: String(DEFAULT_TEMPLATE_EXERCISE_CONFIG.restSeconds),
    },
  ];
}

function parseDraftExercises(
  rawValue: string | undefined,
): WorkoutTemplateEditRouteExerciseDraftState {
  if (typeof rawValue !== 'string') {
    return {
      status: 'missing',
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return {
        status: 'invalid',
      };
    }

    const exercises: WorkoutTemplateEditRouteExerciseDraft[] = [];

    for (const item of parsedValue) {
      const exercise = parseDraftExercise(item);

      if (!exercise) {
        return {
          status: 'invalid',
        };
      }

      exercises.push(exercise);
    }

    return {
      status: 'valid',
      exercises,
    };
  } catch {
    return {
      status: 'invalid',
    };
  }
}

function parseDraftExercise(
  value: unknown,
): WorkoutTemplateEditRouteExerciseDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const templateExerciseId =
    typeof record.id === 'string' ? record.id.trim() : '';
  const exerciseId =
    typeof record.exerciseId === 'string' ? record.exerciseId.trim() : '';
  const createdAt =
    typeof record.createdAt === 'string' ? record.createdAt.trim() : '';

  if (!exerciseId) {
    return null;
  }

  if (templateExerciseId && !createdAt) {
    return null;
  }

  const targetSets = readConfigValue(record.targetSets);
  const targetRepsMin = readConfigValue(record.targetRepsMin);
  const targetRepsMax = readConfigValue(record.targetRepsMax);
  const restSeconds = readConfigValue(record.restSeconds);

  if (
    targetSets === null ||
    targetRepsMin === null ||
    targetRepsMax === null ||
    restSeconds === null
  ) {
    return null;
  }

  return {
    ...(templateExerciseId
      ? { id: templateExerciseId as TemplateExerciseId }
      : {}),
    exerciseId: exerciseId as ExerciseId,
    targetSets,
    targetRepsMin,
    targetRepsMax,
    restSeconds,
    ...(createdAt ? { createdAt } : {}),
  };
}

function readConfigValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function firstParamValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return value?.[0];
}
