import type { WorkoutSessionId } from '@/domain/workout-session';
import type { WorkoutTemplateId } from '@/domain/workout-template';

export type TodayWorkoutPlanId = string & {
  readonly __brand: 'TodayWorkoutPlanId';
};

export const TODAY_WORKOUT_PLAN_STATUSES = [
  'planned',
  'draft',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type TodayWorkoutPlanStatus =
  (typeof TODAY_WORKOUT_PLAN_STATUSES)[number];

export type TodayWorkoutPlan = {
  readonly id: TodayWorkoutPlanId;
  readonly localDate: string;
  readonly sourceTemplateId: WorkoutTemplateId;
  readonly sessionId?: WorkoutSessionId;
  readonly titleSnapshot: string;
  readonly position: number;
  readonly status: TodayWorkoutPlanStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TodayWorkoutPlanInput = {
  readonly id: string;
  readonly localDate: string;
  readonly sourceTemplateId: string;
  readonly sessionId?: string | null;
  readonly titleSnapshot: string;
  readonly position: number;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type AddTodayWorkoutPlanInput = {
  readonly id: string;
  readonly localDate: string;
  readonly sourceTemplateId: string;
  readonly titleSnapshot: string;
  readonly position: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};
