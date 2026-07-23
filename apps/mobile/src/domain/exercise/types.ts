export type ExerciseId = string & { readonly __brand: 'ExerciseId' };

export const EXERCISE_TYPES = ['strength', 'cardio'] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'full_body',
  'cardio',
  'neck',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'cardio_machine',
  'band',
  'kettlebell',
  'other',
] as const;

export type Equipment = (typeof EQUIPMENT_TYPES)[number];

export const EXERCISE_STATUSES = ['active', 'inactive'] as const;

export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];

export type ExerciseSource = {
  readonly name?: string;
  readonly reference?: string;
  readonly license?: string;
  readonly attribution?: string;
};

export type ExerciseInstructionSteps = Readonly<
  Record<string, readonly string[]>
>;

export type Exercise = {
  readonly id: ExerciseId;
  readonly slug: string;
  readonly nameZh: string;
  readonly nameEn?: string;
  readonly type: ExerciseType;
  readonly primaryMuscleGroup: MuscleGroup;
  readonly secondaryMuscleGroups: readonly MuscleGroup[];
  readonly equipment: Equipment;
  readonly description?: string;
  readonly instructionSteps?: ExerciseInstructionSteps;
  readonly imageUri?: string;
  readonly source?: ExerciseSource;
  readonly status: ExerciseStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ExerciseInput = {
  readonly id: string;
  readonly slug: string;
  readonly nameZh: string;
  readonly nameEn?: string | null;
  readonly type: string;
  readonly primaryMuscleGroup: string;
  readonly secondaryMuscleGroups?: readonly string[] | null;
  readonly equipment: string;
  readonly description?: string | null;
  readonly instructionSteps?: ExerciseInstructionSteps | null;
  readonly imageUri?: string | null;
  readonly sourceName?: string | null;
  readonly sourceReference?: string | null;
  readonly sourceLicense?: string | null;
  readonly sourceAttribution?: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ExerciseSearchField = 'nameZh' | 'nameEn';

export type ExerciseSearchQuery = {
  readonly text: string;
  readonly fields?: readonly ExerciseSearchField[];
};

export type ExerciseFilters = {
  readonly muscleGroups?: readonly MuscleGroup[];
  readonly equipment?: readonly Equipment[];
  readonly statuses?: readonly ExerciseStatus[];
  readonly types?: readonly ExerciseType[];
};

export type ExerciseListQuery = {
  readonly search?: ExerciseSearchQuery;
  readonly filters?: ExerciseFilters;
  readonly limit?: number;
  readonly offset?: number;
};
