import type { ExerciseId } from '@/domain/exercise';
import type { WorkoutTemplateId } from '@/domain/workout-template';

export type WorkoutSessionId = string & {
  readonly __brand: 'WorkoutSessionId';
};

export type SessionExerciseId = string & {
  readonly __brand: 'SessionExerciseId';
};

export type WorkoutSetId = string & {
  readonly __brand: 'WorkoutSetId';
};

export const WORKOUT_SESSION_STATUSES = [
  'draft',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type WorkoutSessionStatus = (typeof WORKOUT_SESSION_STATUSES)[number];

export const WORKOUT_SESSION_DAILY_STATUSES = [
  'normal',
  'fatigued',
  'menstrual',
  'unwell',
] as const;

export type WorkoutSessionDailyStatus =
  (typeof WORKOUT_SESSION_DAILY_STATUSES)[number];

export const WORKOUT_SET_TYPES = ['normal'] as const;

export type WorkoutSetType = (typeof WORKOUT_SET_TYPES)[number];

export type SessionExercise = {
  readonly id: SessionExerciseId;
  readonly sessionId: WorkoutSessionId;
  readonly sourceExerciseId: ExerciseId;
  readonly exerciseNameSnapshot: string;
  readonly position: number;
  readonly isEnabled: boolean;
  readonly isSkipped: boolean;
  readonly isCompleted: boolean;
  readonly targetSets: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly currentRestSeconds: number;
  readonly sets: readonly WorkoutSet[];
};

type WorkoutSessionBase = {
  readonly id: WorkoutSessionId;
  readonly sourceTemplateId?: WorkoutTemplateId;
  readonly workoutNameSnapshot: string;
  readonly sessionExercises: readonly SessionExercise[];
  readonly currentSessionExerciseId?: SessionExerciseId;
  readonly currentSetNumber?: number;
  readonly dailyStatus?: WorkoutSessionDailyStatus;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DraftWorkoutSession = WorkoutSessionBase & {
  readonly status: 'draft';
  readonly startedAt?: undefined;
  readonly endedAt?: undefined;
};

export type InProgressWorkoutSession = WorkoutSessionBase & {
  readonly status: 'in_progress';
  readonly startedAt: string;
  readonly endedAt?: undefined;
};

export type CompletedWorkoutSession = WorkoutSessionBase & {
  readonly status: 'completed';
  readonly startedAt: string;
  readonly endedAt: string;
};

export type CancelledWorkoutSession = WorkoutSessionBase & {
  readonly status: 'cancelled';
  readonly startedAt?: string;
  readonly endedAt: string;
};

export type WorkoutSession =
  | DraftWorkoutSession
  | InProgressWorkoutSession
  | CompletedWorkoutSession
  | CancelledWorkoutSession;

export type WorkoutSet = {
  readonly id: WorkoutSetId;
  readonly sessionExerciseId: SessionExerciseId;
  readonly setNumber: number;
  readonly setType: WorkoutSetType;
  readonly actualReps: number;
  readonly weight: number;
  readonly isCompleted: boolean;
  readonly isExtraSet: boolean;
  readonly completedAt: string;
};
