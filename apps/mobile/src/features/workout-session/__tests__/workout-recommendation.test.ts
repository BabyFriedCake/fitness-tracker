/// <reference types="jest" />

import { createWorkoutRecommendation } from '@/features/workout-session/application/workout-recommendation';

describe('workout recommendation', () => {
  it('creates a deterministic recommendation from today state', () => {
    expect(
      createWorkoutRecommendation({ dailyStatus: 'unwell' }),
    ).toMatchObject({
      kind: 'protect',
      reasonCode: 'daily_status_unwell',
      title: '根据今日状态调整',
    });
    expect(
      createWorkoutRecommendation({
        dailyStatus: 'fatigued',
      }),
    ).toMatchObject({
      kind: 'recover',
      reasonCode: 'daily_status_fatigued',
      title: '保留余量',
    });
    expect(
      createWorkoutRecommendation({
        recentWorkout: { workoutName: 'Push' },
      }),
    ).toMatchObject({
      kind: 'continue',
      reasonCode: 'recent_workout_follow_up',
      title: '延续训练节奏',
    });
  });

  it('returns undefined without usable context', () => {
    expect(createWorkoutRecommendation({})).toBeUndefined();
  });
});
