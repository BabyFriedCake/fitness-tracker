export const DEFAULT_TEMPLATE_EXERCISE_CONFIG = {
  targetSets: 3,
  targetRepsMin: 8,
  targetRepsMax: 10,
  restSeconds: 90,
} as const;

export function formatDefaultTemplateExerciseConfig(): string {
  return `${DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetSets} 组 · ${DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMin}–${DEFAULT_TEMPLATE_EXERCISE_CONFIG.targetRepsMax} 次 · ${DEFAULT_TEMPLATE_EXERCISE_CONFIG.restSeconds} 秒`;
}
