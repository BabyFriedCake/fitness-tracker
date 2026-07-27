import type {
  WorkoutSessionId,
  WorkoutSessionStatus,
} from '@/domain/workout-session';
import type { WorkoutTemplateId } from '@/domain/workout-template';

import type {
  AddTodayWorkoutPlanInput,
  TodayWorkoutPlan,
  TodayWorkoutPlanId,
} from './types';

export class TodayWorkoutPlanDuplicateTemplateError extends Error {
  constructor(
    readonly localDate: string,
    readonly sourceTemplateId: WorkoutTemplateId,
  ) {
    super(
      `WorkoutTemplate is already added to TodayWorkoutPlan for ${localDate}: ${sourceTemplateId}.`,
    );
    this.name = 'TodayWorkoutPlanDuplicateTemplateError';
  }
}

export type TodayWorkoutPlanRepository = {
  readonly listByDate: (
    localDate: string,
  ) => Promise<readonly TodayWorkoutPlan[]>;
  readonly findById: (
    id: TodayWorkoutPlanId,
  ) => Promise<TodayWorkoutPlan | null>;
  readonly findByDateAndTemplate: (
    localDate: string,
    templateId: WorkoutTemplateId,
  ) => Promise<TodayWorkoutPlan | null>;
  readonly addFromTemplate: (
    input: AddTodayWorkoutPlanInput,
  ) => Promise<TodayWorkoutPlan>;
  readonly attachSession: (
    planId: TodayWorkoutPlanId,
    sessionId: WorkoutSessionId,
    updatedAt: string,
  ) => Promise<TodayWorkoutPlan>;
  readonly syncStatusFromSession: (
    planId: TodayWorkoutPlanId,
    sessionStatus: WorkoutSessionStatus,
    updatedAt: string,
  ) => Promise<TodayWorkoutPlan>;
};
