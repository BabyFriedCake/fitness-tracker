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

export const WORKOUT_SESSION_HISTORY_PERIODS = [
  'week',
  'month',
  'three_months',
  'all',
] as const;

export type WorkoutSessionHistoryPeriod =
  (typeof WORKOUT_SESSION_HISTORY_PERIODS)[number];

export type WorkoutSessionHistoryOverview = {
  readonly completedSessionCount: number;
  readonly completedSetCount: number;
  readonly totalDurationSeconds: number;
  readonly totalVolume: number;
  readonly volumeTrend:
    | { readonly status: 'insufficient' }
    | {
        readonly status: 'available';
        readonly direction: 'up' | 'down' | 'stable';
        readonly difference: number;
      };
};

export type WorkoutSessionHistoryCalendarDay = {
  readonly localDate: string;
  readonly dayOfMonth: number;
  readonly hasCompletedWorkout: boolean;
};

export type WorkoutSessionHistoryCalendar = {
  readonly title: string;
  readonly leadingEmptyDays: number;
  readonly days: readonly WorkoutSessionHistoryCalendarDay[];
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

  return {
    items,
    sections: createWorkoutSessionHistorySections(items),
  };
}

export function filterWorkoutSessionHistoryItems(
  items: readonly WorkoutSessionHistoryItem[],
  period: WorkoutSessionHistoryPeriod,
  now: Date,
): readonly WorkoutSessionHistoryItem[] {
  if (period === 'all') {
    return items;
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'month') {
    start.setDate(1);
  } else {
    start.setMonth(start.getMonth() - 2, 1);
  }

  return items.filter((item) => Date.parse(item.endedAt) >= start.getTime());
}

export function createWorkoutSessionHistorySections(
  items: readonly WorkoutSessionHistoryItem[],
): readonly WorkoutSessionHistorySection[] {
  const sectionMap = new Map<string, WorkoutSessionHistoryItem[]>();

  for (const item of items) {
    const sectionItems = sectionMap.get(item.localDate) ?? [];
    sectionItems.push(item);
    sectionMap.set(item.localDate, sectionItems);
  }

  return Array.from(sectionMap.entries()).map(([localDate, entries]) => ({
    localDate,
    title: formatHistorySectionTitle(localDate),
    items: entries,
  }));
}

export function createWorkoutSessionHistoryOverview(
  items: readonly WorkoutSessionHistoryItem[],
): WorkoutSessionHistoryOverview {
  const completedItems = items.filter((item) => item.status === 'completed');

  const totals = completedItems.reduce<
    Omit<WorkoutSessionHistoryOverview, 'volumeTrend'>
  >(
    (overview, item) => ({
      completedSessionCount: overview.completedSessionCount + 1,
      completedSetCount: overview.completedSetCount + item.completedSetCount,
      totalDurationSeconds:
        overview.totalDurationSeconds + (item.durationSeconds ?? 0),
      totalVolume: overview.totalVolume + item.totalVolume,
    }),
    {
      completedSessionCount: 0,
      completedSetCount: 0,
      totalDurationSeconds: 0,
      totalVolume: 0,
    },
  );
  const [latest, previous] = [...completedItems].sort(compareHistoryItems);
  const difference =
    latest && previous ? latest.totalVolume - previous.totalVolume : undefined;

  return {
    ...totals,
    volumeTrend:
      difference === undefined
        ? { status: 'insufficient' }
        : {
            status: 'available',
            direction:
              difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
            difference,
          },
  };
}

export function createWorkoutSessionHistoryCalendar(
  items: readonly WorkoutSessionHistoryItem[],
  referenceDate: Date,
): WorkoutSessionHistoryCalendar {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const completedDates = new Set(
    items
      .filter((item) => item.status === 'completed')
      .map((item) => item.localDate),
  );

  return {
    title: `${year}年${month + 1}月`,
    leadingEmptyDays: new Date(year, month, 1).getDay(),
    days: Array.from({ length: dayCount }, (_, index) => {
      const dayOfMonth = index + 1;
      const localDate = [
        year,
        String(month + 1).padStart(2, '0'),
        String(dayOfMonth).padStart(2, '0'),
      ].join('-');

      return {
        localDate,
        dayOfMonth,
        hasCompletedWorkout: completedDates.has(localDate),
      };
    }),
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
