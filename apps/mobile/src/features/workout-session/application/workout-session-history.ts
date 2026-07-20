import type {
  WorkoutSession,
  WorkoutSessionId,
  WorkoutSessionRepository,
} from '@/domain/workout-session';

import { createWorkoutSessionSummary } from './workout-session-completion-recovery';

export type WorkoutSessionHistoryItem = {
  readonly sessionId: WorkoutSessionId;
  readonly workoutName: string;
  readonly status: 'completed' | 'cancelled';
  readonly startedAt?: string;
  readonly endedAt: string;
  readonly durationSeconds?: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
};

export type LoadWorkoutSessionHistoryResult =
  | {
      readonly status: 'ready';
      readonly items: readonly WorkoutSessionHistoryItem[];
    }
  | {
      readonly status: 'error';
      readonly message: string;
    };

const HISTORY_LOAD_ERROR_MESSAGE =
  '历史训练加载失败。已保存的训练数据不会受影响，请重试。';

export async function loadWorkoutSessionHistory(
  repository: WorkoutSessionRepository,
): Promise<LoadWorkoutSessionHistoryResult> {
  try {
    const sessions = await repository.listByStatuses([
      'completed',
      'cancelled',
    ]);

    return {
      status: 'ready',
      items: sessions.flatMap(toWorkoutSessionHistoryItem),
    };
  } catch {
    return { status: 'error', message: HISTORY_LOAD_ERROR_MESSAGE };
  }
}

function toWorkoutSessionHistoryItem(
  session: WorkoutSession,
): readonly WorkoutSessionHistoryItem[] {
  if (session.status === 'completed') {
    const summary = createWorkoutSessionSummary(session);

    return [
      {
        sessionId: session.id,
        workoutName: summary.workoutName,
        status: 'completed',
        startedAt: summary.startedAt,
        endedAt: summary.endedAt,
        durationSeconds: summary.durationSeconds,
        completedSetCount: summary.completedSetCount,
        totalVolume: summary.totalVolume,
      },
    ];
  }

  if (session.status === 'cancelled') {
    const completedSets = session.sessionExercises.flatMap((exercise) =>
      exercise.sets.filter((workoutSet) => workoutSet.isCompleted),
    );

    return [
      {
        sessionId: session.id,
        workoutName: session.workoutNameSnapshot,
        status: 'cancelled',
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        completedSetCount: completedSets.length,
        totalVolume: completedSets.reduce(
          (total, workoutSet) =>
            total + workoutSet.weight * workoutSet.actualReps,
          0,
        ),
      },
    ];
  }

  return [];
}
