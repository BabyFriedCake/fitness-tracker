import type { ExerciseId } from '@/domain/exercise';

export type WorkoutTemplateCreateRouteParams = {
  readonly draftName?: string | readonly string[];
  readonly draftDescription?: string | readonly string[];
  readonly selectedIds?: string | readonly string[];
  readonly selectedExerciseId?: string | readonly string[];
  readonly selectionContext?: string | readonly string[];
};

export type WorkoutTemplateCreateRouteDraft = {
  readonly name: string;
  readonly description: string;
  readonly selectedExerciseIds: readonly ExerciseId[];
  readonly duplicateSelectionIgnored: boolean;
};

export function parseWorkoutTemplateCreateRouteDraft(
  params: WorkoutTemplateCreateRouteParams,
): WorkoutTemplateCreateRouteDraft {
  const selectedExerciseIds = parseSelectedExerciseIds(params.selectedIds);
  const selectedExerciseId = firstParamValue(params.selectedExerciseId);
  const selectionContext = firstParamValue(params.selectionContext);
  const duplicateSelectionIgnored =
    selectionContext === 'template' &&
    !!selectedExerciseId &&
    selectedExerciseIds.includes(selectedExerciseId as ExerciseId);

  return {
    name: firstParamValue(params.draftName) ?? '',
    description: firstParamValue(params.draftDescription) ?? '',
    selectedExerciseIds: mergeSelectedExerciseIds(
      selectedExerciseIds,
      selectionContext === 'template' ? selectedExerciseId : undefined,
    ),
    duplicateSelectionIgnored,
  };
}

export function serializeWorkoutTemplateCreateDraftRouteParams(input: {
  readonly name: string;
  readonly description: string;
  readonly selectedExerciseIds: readonly ExerciseId[];
}): Record<string, string> {
  return {
    ...(input.name ? { draftName: input.name } : {}),
    ...(input.description ? { draftDescription: input.description } : {}),
    ...(input.selectedExerciseIds.length > 0
      ? { selectedIds: input.selectedExerciseIds.join(',') }
      : {}),
  };
}

function parseSelectedExerciseIds(
  value: string | readonly string[] | undefined,
): readonly ExerciseId[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];

  return rawValues
    .flatMap((rawValue) => rawValue.split(','))
    .map((rawValue) => rawValue.trim())
    .filter(Boolean)
    .map((rawValue) => rawValue as ExerciseId);
}

function mergeSelectedExerciseIds(
  currentIds: readonly ExerciseId[],
  selectedExerciseId: string | undefined,
): readonly ExerciseId[] {
  if (!selectedExerciseId) {
    return currentIds;
  }

  const nextExerciseId = selectedExerciseId as ExerciseId;

  if (currentIds.includes(nextExerciseId)) {
    return currentIds;
  }

  return [...currentIds, nextExerciseId];
}

function firstParamValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return value?.[0];
}
