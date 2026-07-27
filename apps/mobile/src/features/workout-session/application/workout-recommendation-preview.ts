import {
  createWorkoutRecommendation,
  type WorkoutRecommendation,
  type WorkoutRecommendationContext,
} from './workout-recommendation';

export type WorkoutRecommendationPreview = WorkoutRecommendation & {
  readonly explanation: string;
};

export function createWorkoutRecommendationPreview(
  context: WorkoutRecommendationContext,
): WorkoutRecommendationPreview | undefined {
  const recommendation = createWorkoutRecommendation(context);

  if (!recommendation) {
    return undefined;
  }

  return {
    ...recommendation,
    explanation: recommendation.message,
  };
}
