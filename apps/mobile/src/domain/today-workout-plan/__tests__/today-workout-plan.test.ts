/// <reference types="jest" />

import {
  TodayWorkoutPlanValidationError,
  createTodayWorkoutPlan,
  toTodayWorkoutPlanStatusFromSession,
} from '@/domain/today-workout-plan';

const CREATED_AT = '2026-07-23T01:00:00.000Z';

describe('TodayWorkoutPlan domain', () => {
  it('creates a valid planned TodayWorkoutPlan', () => {
    expect(
      createTodayWorkoutPlan({
        id: 'today-plan-legs',
        localDate: '2026-07-23',
        sourceTemplateId: 'template-legs',
        sessionId: null,
        titleSnapshot: '下肢力量训练',
        position: 1,
        status: 'planned',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      }),
    ).toEqual({
      id: 'today-plan-legs',
      localDate: '2026-07-23',
      sourceTemplateId: 'template-legs',
      sessionId: undefined,
      titleSnapshot: '下肢力量训练',
      position: 1,
      status: 'planned',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
  });

  it('rejects invalid input', () => {
    expect(() =>
      createTodayWorkoutPlan({
        id: '',
        localDate: '2026/07/23',
        sourceTemplateId: '',
        sessionId: '',
        titleSnapshot: ' ',
        position: 0,
        status: 'ready',
        createdAt: 'invalid',
        updatedAt: 'invalid',
      }),
    ).toThrow(TodayWorkoutPlanValidationError);
  });

  it('maps WorkoutSession status to TodayWorkoutPlan status', () => {
    expect(toTodayWorkoutPlanStatusFromSession('draft')).toBe('draft');
    expect(toTodayWorkoutPlanStatusFromSession('in_progress')).toBe(
      'in_progress',
    );
    expect(toTodayWorkoutPlanStatusFromSession('completed')).toBe('completed');
    expect(toTodayWorkoutPlanStatusFromSession('cancelled')).toBe('cancelled');
  });
});
