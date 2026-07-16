import type { Equipment, MuscleGroup } from '@/domain/exercise';

export type ExerciseLibraryFilters = {
  readonly queryText: string;
  readonly muscleGroups: readonly MuscleGroup[];
  readonly equipment: readonly Equipment[];
};

export const EMPTY_EXERCISE_LIBRARY_FILTERS: ExerciseLibraryFilters = {
  queryText: '',
  muscleGroups: [],
  equipment: [],
};

export function hasActiveExerciseLibraryFilters(
  filters: ExerciseLibraryFilters,
): boolean {
  return (
    filters.queryText.trim().length > 0 ||
    filters.muscleGroups.length > 0 ||
    filters.equipment.length > 0
  );
}

export function toggleExerciseLibraryMuscleGroup(
  filters: ExerciseLibraryFilters,
  muscleGroup: MuscleGroup,
): ExerciseLibraryFilters {
  return {
    ...filters,
    muscleGroups: toggleValue(filters.muscleGroups, muscleGroup),
  };
}

export function toggleExerciseLibraryEquipment(
  filters: ExerciseLibraryFilters,
  equipment: Equipment,
): ExerciseLibraryFilters {
  return {
    ...filters,
    equipment: toggleValue(filters.equipment, equipment),
  };
}

function toggleValue<T>(values: readonly T[], value: T): readonly T[] {
  return values.includes(value)
    ? values.filter((existingValue) => existingValue !== value)
    : [...values, value];
}
