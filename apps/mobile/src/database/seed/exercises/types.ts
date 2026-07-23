import type { ExerciseInput } from '@/domain/exercise';

export type ExerciseSeedRow = Omit<
  ExerciseInput,
  'sourceName' | 'sourceReference' | 'sourceLicense' | 'sourceAttribution'
> & {
  readonly sourceName: string;
  readonly sourceReference: string;
  readonly license: string;
  readonly attribution?: string;
};

export type ExerciseSeedImportSummary = {
  readonly seedVersion: string;
  readonly attemptedRows: number;
  readonly importedRows: number;
};

export type ExerciseSeedValidationIssue = {
  readonly rowIndex: number;
  readonly exerciseId?: string;
  readonly message: string;
};
