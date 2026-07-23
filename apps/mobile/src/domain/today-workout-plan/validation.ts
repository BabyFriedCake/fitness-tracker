import type {
  WorkoutSessionId,
  WorkoutSessionStatus,
} from '@/domain/workout-session';
import type { WorkoutTemplateId } from '@/domain/workout-template';

import {
  TODAY_WORKOUT_PLAN_STATUSES,
  type TodayWorkoutPlan,
  type TodayWorkoutPlanId,
  type TodayWorkoutPlanInput,
  type TodayWorkoutPlanStatus,
} from './types';

export class TodayWorkoutPlanValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`TodayWorkoutPlan validation failed: ${issues.join(', ')}`);
    this.name = 'TodayWorkoutPlanValidationError';
  }
}

export function createTodayWorkoutPlan(
  input: TodayWorkoutPlanInput,
): TodayWorkoutPlan {
  const issues = validateTodayWorkoutPlanInput(input);

  if (issues.length > 0) {
    throw new TodayWorkoutPlanValidationError(issues);
  }

  return {
    id: input.id as TodayWorkoutPlanId,
    localDate: input.localDate,
    sourceTemplateId: input.sourceTemplateId as WorkoutTemplateId,
    sessionId: input.sessionId
      ? (input.sessionId as WorkoutSessionId)
      : undefined,
    titleSnapshot: input.titleSnapshot.trim(),
    position: input.position,
    status: input.status as TodayWorkoutPlanStatus,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function validateTodayWorkoutPlanInput(
  input: TodayWorkoutPlanInput,
): readonly string[] {
  const issues: string[] = [];

  if (!input.id.trim()) {
    issues.push('id is required');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
    issues.push('localDate must use YYYY-MM-DD');
  }

  if (!input.sourceTemplateId.trim()) {
    issues.push('sourceTemplateId is required');
  }

  if (
    input.sessionId !== undefined &&
    input.sessionId !== null &&
    !input.sessionId.trim()
  ) {
    issues.push('sessionId must be non-empty when provided');
  }

  if (!input.titleSnapshot.trim()) {
    issues.push('titleSnapshot is required');
  }

  if (!Number.isInteger(input.position) || input.position < 1) {
    issues.push('position must be a positive integer');
  }

  if (!isTodayWorkoutPlanStatus(input.status)) {
    issues.push('status is invalid');
  }

  if (!isValidTimestamp(input.createdAt)) {
    issues.push('createdAt must be a valid timestamp');
  }

  if (!isValidTimestamp(input.updatedAt)) {
    issues.push('updatedAt must be a valid timestamp');
  }

  return issues;
}

export function isTodayWorkoutPlanStatus(
  value: string,
): value is TodayWorkoutPlanStatus {
  return TODAY_WORKOUT_PLAN_STATUSES.includes(value as TodayWorkoutPlanStatus);
}

export function toTodayWorkoutPlanStatusFromSession(
  status: WorkoutSessionStatus,
): Exclude<TodayWorkoutPlanStatus, 'planned'> {
  switch (status) {
    case 'draft':
    case 'in_progress':
    case 'completed':
    case 'cancelled':
      return status;
  }
}

function isValidTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
