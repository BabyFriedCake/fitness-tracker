import type { WorkoutSessionRepository } from '@/domain/workout-session';

import {
  loadWorkoutSessionHistory,
  type WorkoutSessionHistoryItem,
} from './workout-session-history';

export const WORKOUT_HISTORY_STATISTICS_PERIODS = [
  'week',
  'month',
  'year',
] as const;

export type WorkoutHistoryStatisticsPeriod =
  (typeof WORKOUT_HISTORY_STATISTICS_PERIODS)[number];

export type WorkoutHistoryStatisticsSummary = {
  readonly completedWorkoutCount: number;
  readonly completedSetCount: number;
  readonly totalVolume: number;
  readonly totalDurationSeconds: number;
  readonly activeDayCount: number;
};

export type WorkoutHistoryStatisticsComparison = {
  readonly difference: number;
  readonly percentChange?: number;
};

export type WorkoutHistoryStatisticsBucket = {
  readonly label: string;
  readonly completedWorkoutCount: number;
  readonly totalVolume: number;
};

export type WorkoutHistoryMuscleDistribution = {
  readonly label: string;
  readonly completedWorkoutCount: number;
};

export type WorkoutHistoryStatistics = {
  readonly period: WorkoutHistoryStatisticsPeriod;
  readonly rangeLabel: string;
  readonly comparisonRangeLabel: string;
  readonly current: WorkoutHistoryStatisticsSummary;
  readonly previous: WorkoutHistoryStatisticsSummary;
  readonly volumeComparison: WorkoutHistoryStatisticsComparison;
  readonly durationComparison: WorkoutHistoryStatisticsComparison;
  readonly activity: readonly WorkoutHistoryStatisticsBucket[];
  readonly muscleDistribution: readonly WorkoutHistoryMuscleDistribution[];
};

export type LoadWorkoutHistoryStatisticsResult =
  | { readonly status: 'ready'; readonly statistics: WorkoutHistoryStatistics }
  | { readonly status: 'error'; readonly message: string };

const STATISTICS_LOAD_ERROR_MESSAGE =
  '训练统计加载失败。已保存的训练数据不会受影响，请重试。';

export async function loadWorkoutHistoryStatistics(
  repository: WorkoutSessionRepository,
  period: WorkoutHistoryStatisticsPeriod,
  now: Date = new Date(),
): Promise<LoadWorkoutHistoryStatisticsResult> {
  const result = await loadWorkoutSessionHistory(repository);

  if (result.status === 'error') {
    return { status: 'error', message: STATISTICS_LOAD_ERROR_MESSAGE };
  }

  return {
    status: 'ready',
    statistics: createWorkoutHistoryStatistics(result.items, period, now),
  };
}

export function createWorkoutHistoryStatistics(
  items: readonly WorkoutSessionHistoryItem[],
  period: WorkoutHistoryStatisticsPeriod,
  now: Date,
): WorkoutHistoryStatistics {
  const currentRange = createStatisticsRange(period, now);
  const previousRange = createPreviousRange(currentRange);
  const completedItems = items.filter((item) => item.status === 'completed');
  const currentItems = filterItemsInRange(completedItems, currentRange);
  const previousItems = filterItemsInRange(completedItems, previousRange);
  const current = createSummary(currentItems);
  const previous = createSummary(previousItems);

  return {
    period,
    rangeLabel: formatRange(currentRange),
    comparisonRangeLabel: formatRange(previousRange),
    current,
    previous,
    volumeComparison: createComparison(
      current.totalVolume,
      previous.totalVolume,
    ),
    durationComparison: createComparison(
      current.totalDurationSeconds,
      previous.totalDurationSeconds,
    ),
    activity: createActivityBuckets(currentItems, currentRange, period),
    muscleDistribution: createMuscleDistribution(currentItems),
  };
}

type StatisticsRange = { readonly start: Date; readonly end: Date };

function createStatisticsRange(
  period: WorkoutHistoryStatisticsPeriod,
  now: Date,
): StatisticsRange {
  const end = endOfLocalDay(now);
  const start = startOfLocalDay(now);

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'month') {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }

  return { start, end };
}

function createPreviousRange(range: StatisticsRange): StatisticsRange {
  const duration = range.end.getTime() - range.start.getTime() + 1;
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - duration + 1);

  return { start, end };
}

function filterItemsInRange(
  items: readonly WorkoutSessionHistoryItem[],
  range: StatisticsRange,
): readonly WorkoutSessionHistoryItem[] {
  return items.filter((item) => {
    const endedAt = Date.parse(item.endedAt);

    return endedAt >= range.start.getTime() && endedAt <= range.end.getTime();
  });
}

function createSummary(
  items: readonly WorkoutSessionHistoryItem[],
): WorkoutHistoryStatisticsSummary {
  return {
    completedWorkoutCount: items.length,
    completedSetCount: items.reduce(
      (total, item) => total + item.completedSetCount,
      0,
    ),
    totalVolume: items.reduce((total, item) => total + item.totalVolume, 0),
    totalDurationSeconds: items.reduce(
      (total, item) => total + (item.durationSeconds ?? 0),
      0,
    ),
    activeDayCount: new Set(items.map((item) => item.localDate)).size,
  };
}

function createComparison(
  current: number,
  previous: number,
): WorkoutHistoryStatisticsComparison {
  const difference = current - previous;

  return previous === 0
    ? { difference }
    : { difference, percentChange: (difference / previous) * 100 };
}

function createActivityBuckets(
  items: readonly WorkoutSessionHistoryItem[],
  range: StatisticsRange,
  period: WorkoutHistoryStatisticsPeriod,
): readonly WorkoutHistoryStatisticsBucket[] {
  const buckets =
    period === 'week'
      ? createDailyBuckets(range)
      : period === 'month'
        ? createWeeklyBuckets(range)
        : createMonthlyBuckets(range);

  return buckets.map(({ label, start, end }) => {
    const bucketItems = filterItemsInRange(items, { start, end });

    return {
      label,
      completedWorkoutCount: bucketItems.length,
      totalVolume: bucketItems.reduce(
        (total, item) => total + item.totalVolume,
        0,
      ),
    };
  });
}

type StatisticsBucketRange = StatisticsRange & { readonly label: string };

function createDailyBuckets(
  range: StatisticsRange,
): readonly StatisticsBucketRange[] {
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(range.start);
    start.setDate(start.getDate() + index);

    return {
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      start,
      end: endOfLocalDay(start),
    };
  });
}

function createWeeklyBuckets(
  range: StatisticsRange,
): readonly StatisticsBucketRange[] {
  return Array.from({ length: 4 }, (_, index) => {
    const start = new Date(range.start);
    start.setDate(start.getDate() + index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return {
      label: `第${index + 1}周`,
      start,
      end: end.getTime() > range.end.getTime() ? range.end : endOfLocalDay(end),
    };
  });
}

function createMonthlyBuckets(
  range: StatisticsRange,
): readonly StatisticsBucketRange[] {
  return Array.from({ length: 12 }, (_, month) => {
    const start = new Date(range.start.getFullYear(), month, 1);
    const end = endOfLocalDay(
      new Date(range.start.getFullYear(), month + 1, 0),
    );

    return {
      label: `${month + 1}月`,
      start,
      end: end.getTime() > range.end.getTime() ? range.end : end,
    };
  });
}

function createMuscleDistribution(
  items: readonly WorkoutSessionHistoryItem[],
): readonly WorkoutHistoryMuscleDistribution[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const label of item.muscleLabels) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([label, completedWorkoutCount]) => ({
    label,
    completedWorkoutCount,
  })).sort(
    (first, second) =>
      second.completedWorkoutCount - first.completedWorkoutCount,
  );
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfLocalDay(value: Date): Date {
  const result = startOfLocalDay(value);
  result.setHours(23, 59, 59, 999);
  return result;
}

function formatRange(range: StatisticsRange): string {
  const start = range.start;
  const end = range.end;

  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日–${end.getMonth() + 1}月${end.getDate()}日`;
  }

  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日–${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
}
