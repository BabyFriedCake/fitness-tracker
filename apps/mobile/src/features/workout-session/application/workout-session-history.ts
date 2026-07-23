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
  readonly localDate: string;
  readonly durationSeconds?: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
};

export type WorkoutSessionHistorySection = {
  readonly localDate: string;
  readonly title: string;
  readonly items: readonly WorkoutSessionHistoryItem[];
};

export type LoadWorkoutSessionHistoryResult =
  | {
      readonly status: 'ready';
      readonly items: readonly WorkoutSessionHistoryItem[];
      readonly sections: readonly WorkoutSessionHistorySection[];
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
      ...createWorkoutSessionHistoryList(sessions),
    };
  } catch {
    return { status: 'error', message: HISTORY_LOAD_ERROR_MESSAGE };
  }
}

function createWorkoutSessionHistoryList(sessions: readonly WorkoutSession[]): {
  readonly items: readonly WorkoutSessionHistoryItem[];
  readonly sections: readonly WorkoutSessionHistorySection[];
} {
  const items = [...sessions.flatMap(toWorkoutSessionHistoryItem)].sort(
    compareHistoryItems,
  );
  const sectionMap = new Map<string, WorkoutSessionHistoryItem[]>();

  for (const item of items) {
    const sectionItems = sectionMap.get(item.localDate) ?? [];
    sectionItems.push(item);
    sectionMap.set(item.localDate, sectionItems);
  }

  return {
    items,
    sections: Array.from(sectionMap.entries()).map(([localDate, entries]) => ({
      localDate,
      title: formatHistorySectionTitle(localDate),
      items: entries,
    })),
  };
}

function toWorkoutSessionHistoryItem(
  session: WorkoutSession,
): readonly WorkoutSessionHistoryItem[] {
  if (session.status === 'completed') {
    const summary = createWorkoutSessionSummary(session);
    const localDate = toLocalDateKey(summary.endedAt);

    return [
      {
        sessionId: session.id,
        workoutName: summary.workoutName,
        status: 'completed',
        startedAt: summary.startedAt,
        endedAt: summary.endedAt,
        localDate,
        durationSeconds: summary.durationSeconds,
        completedSetCount: summary.completedSetCount,
        totalVolume: summary.totalVolume,
      },
    ];
  }

  if (session.status === 'cancelled') {
    const localDate = toLocalDateKey(session.endedAt);
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
        localDate,
        durationSeconds: calculateDurationSeconds(session),
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

function compareHistoryItems(
  first: WorkoutSessionHistoryItem,
  second: WorkoutSessionHistoryItem,
): number {
  const endedAtDifference =
    Date.parse(second.endedAt) - Date.parse(first.endedAt);

  if (endedAtDifference !== 0) {
    return endedAtDifference;
  }

  return first.sessionId.localeCompare(second.sessionId);
}

function calculateDurationSeconds(
  session: Extract<WorkoutSession, { readonly status: 'cancelled' }>,
): number | undefined {
  if (!session.startedAt) {
    return undefined;
  }

  const startedAt = Date.parse(session.startedAt);
  const endedAt = Date.parse(session.endedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    return undefined;
  }

  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

function toLocalDateKey(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`WorkoutSession history timestamp is invalid: ${value}.`);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatHistorySectionTitle(localDate: string): string {
  const [, month, day] = localDate.split('-');

  return `${Number(month)}月${Number(day)}日`;
}
