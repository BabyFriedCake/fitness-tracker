/// <reference types="jest" />

import { createWorkoutCoachDecision } from '@/features/workout-session/application/workout-coach-decision';

describe('workout coach decision', () => {
  it('returns a recommendation decision with explanation', () => {
    const decision = createWorkoutCoachDecision({ dailyStatus: 'unwell' });

    expect(decision).toMatchObject({
      kind: 'recommend',
      reasonCode: 'daily_status_unwell',
      explanation:
        '你记录了身体不适。可以休息或降低训练强度，由你决定是否训练。',
      recommendation: {
        kind: 'protect',
        reasonCode: 'daily_status_unwell',
        title: '根据今日状态调整',
      },
    });
  });

  it('returns an observe decision when no context is available', () => {
    expect(createWorkoutCoachDecision({})).toEqual({
      kind: 'observe',
      reasonCode: 'no_context',
      explanation: '当前没有足够的训练上下文，暂不生成建议。',
    });
  });
});
