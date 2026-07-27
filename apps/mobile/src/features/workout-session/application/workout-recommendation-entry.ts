import type { WorkoutRecommendationContext } from './workout-recommendation';
import {
  createWorkoutRecommendationPreview,
  type WorkoutRecommendationPreview,
} from './workout-recommendation-preview';

export type WorkoutRecommendationEntry = WorkoutRecommendationPreview & {
  readonly entryLabel: string;
  readonly entryState: 'available';
};

export function createWorkoutRecommendationEntry(
  context: WorkoutRecommendationContext,
): WorkoutRecommendationEntry | undefined {
  const preview = createWorkoutRecommendationPreview(context);

  if (!preview) {
    return undefined;
  }

  return {
    ...preview,
    entryLabel: '训练建议',
    entryState: 'available',
  };
}
