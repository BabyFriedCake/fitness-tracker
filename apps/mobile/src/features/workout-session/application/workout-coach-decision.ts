import {
  createWorkoutRecommendation,
  type WorkoutRecommendation,
  type WorkoutRecommendationContext,
} from './workout-recommendation';

export type WorkoutCoachDecision =
  | {
      readonly kind: 'recommend';
      readonly reasonCode: WorkoutRecommendation['reasonCode'];
      readonly explanation: string;
      readonly recommendation: WorkoutRecommendation;
    }
  | {
      readonly kind: 'observe';
      readonly reasonCode: 'no_context';
      readonly explanation: string;
      readonly recommendation?: undefined;
    };

export function createWorkoutCoachDecision(
  context: WorkoutRecommendationContext,
): WorkoutCoachDecision {
  const recommendation = createWorkoutRecommendation(context);

  if (recommendation) {
    return {
      kind: 'recommend',
      reasonCode: recommendation.reasonCode,
      explanation: recommendation.message,
      recommendation,
    };
  }

  return {
    kind: 'observe',
    reasonCode: 'no_context',
    explanation: '当前没有足够的训练上下文，暂不生成建议。',
  };
}
