/// <reference types="jest" />

import { createWorkoutRecommendationEntry } from '@/features/workout-session/application/workout-recommendation-entry';

describe('workout recommendation entry', () => {
  it('exposes a stable training recommendation entry label', () => {
    expect(
      createWorkoutRecommendationEntry({ dailyStatus: 'menstrual' }),
    ).toEqual({
      kind: 'recover',
      reasonCode: 'daily_status_menstrual',
      title: '保留余量',
      message: '你记录了经期状态。可按体感调整，系统不会限制训练。',
      explanation: '你记录了经期状态。可按体感调整，系统不会限制训练。',
      entryLabel: '训练建议',
      entryState: 'available',
    });
  });

  it('returns undefined without a recommendation', () => {
    expect(createWorkoutRecommendationEntry({})).toBeUndefined();
  });
});
