import type { DailyStatusValue } from '@/domain/daily-status';

export type WorkoutRecommendationKind = 'recover' | 'protect' | 'continue';

export type WorkoutRecommendationReasonCode =
  | 'daily_status_unwell'
  | 'daily_status_fatigued'
  | 'daily_status_menstrual'
  | 'recent_workout_follow_up';

export type WorkoutRecommendationContext = {
  readonly dailyStatus?: DailyStatusValue;
  readonly recentWorkout?: {
    readonly workoutName: string;
  };
};

export type WorkoutRecommendation = {
  readonly kind: WorkoutRecommendationKind;
  readonly reasonCode: WorkoutRecommendationReasonCode;
  readonly title: string;
  readonly message: string;
};

export function createWorkoutRecommendation(
  context: WorkoutRecommendationContext,
): WorkoutRecommendation | undefined {
  const { dailyStatus, recentWorkout } = context;

  if (dailyStatus === 'unwell') {
    return {
      kind: 'protect',
      reasonCode: 'daily_status_unwell',
      title: '根据今日状态调整',
      message: '你记录了身体不适。可以休息或降低训练强度，由你决定是否训练。',
    };
  }

  if (dailyStatus === 'fatigued' || dailyStatus === 'menstrual') {
    return {
      kind: 'recover',
      reasonCode:
        dailyStatus === 'fatigued'
          ? 'daily_status_fatigued'
          : 'daily_status_menstrual',
      title: '保留余量',
      message:
        dailyStatus === 'fatigued'
          ? '你记录了疲劳。可以减少组数或重量，不会自动修改训练计划。'
          : '你记录了经期状态。可按体感调整，系统不会限制训练。',
    };
  }

  if (recentWorkout) {
    return {
      kind: 'continue',
      reasonCode: 'recent_workout_follow_up',
      title: '延续训练节奏',
      message: `最近完成了“${recentWorkout.workoutName}”，今天可从已有模板中自主选择。`,
    };
  }

  return undefined;
}
