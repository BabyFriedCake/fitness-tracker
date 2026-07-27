/// <reference types="jest" />

import { createWorkoutRecommendationPreview } from '@/features/workout-session/application/workout-recommendation-preview';

describe('workout recommendation preview', () => {
  it('exposes the recommendation explanation for preview surfaces', () => {
    expect(
      createWorkoutRecommendationPreview({ dailyStatus: 'fatigued' }),
    ).toEqual({
      kind: 'recover',
      reasonCode: 'daily_status_fatigued',
      title: '保留余量',
      message: '你记录了疲劳。可以减少组数或重量，不会自动修改训练计划。',
      explanation: '你记录了疲劳。可以减少组数或重量，不会自动修改训练计划。',
    });
  });

  it('returns undefined when no recommendation exists', () => {
    expect(createWorkoutRecommendationPreview({})).toBeUndefined();
  });
});
