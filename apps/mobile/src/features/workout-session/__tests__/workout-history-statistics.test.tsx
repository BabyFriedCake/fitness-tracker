/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { WorkoutSessionId } from '@/domain/workout-session';
import {
  createWorkoutHistoryStatistics,
  type WorkoutHistoryStatistics,
} from '@/features/workout-session/application/workout-history-statistics';
import { WorkoutHistoryStatisticsScreenContent } from '@/features/workout-session/screens/workout-history-statistics-screen';

const SESSION_ID = 'statistics-session' as WorkoutSessionId;

describe('Workout history statistics', () => {
  it('derives period facts, comparisons, activity, and muscle distribution from completed history only', () => {
    const statistics = createWorkoutHistoryStatistics(
      [
        historyItem({
          sessionId: SESSION_ID,
          endedAt: '2026-07-22T10:00:00.000Z',
          localDate: '2026-07-22',
          totalVolume: 1200,
          completedSetCount: 4,
          durationSeconds: 3600,
          muscleLabels: ['胸', '肩'],
        }),
        historyItem({
          sessionId: 'statistics-previous' as WorkoutSessionId,
          endedAt: '2026-07-16T10:00:00.000Z',
          localDate: '2026-07-16',
          totalVolume: 600,
          completedSetCount: 2,
          durationSeconds: 1800,
          muscleLabels: ['背'],
        }),
        historyItem({
          sessionId: 'statistics-cancelled' as WorkoutSessionId,
          status: 'cancelled',
          endedAt: '2026-07-23T10:00:00.000Z',
          localDate: '2026-07-23',
          totalVolume: 9000,
          muscleLabels: ['腿'],
        }),
      ],
      'week',
      new Date(2026, 6, 23, 12),
    );

    expect(statistics.current).toEqual({
      completedWorkoutCount: 1,
      completedSetCount: 4,
      totalVolume: 1200,
      totalDurationSeconds: 3600,
      activeDayCount: 1,
    });
    expect(statistics.previous.totalVolume).toBe(600);
    expect(statistics.volumeComparison).toEqual({
      difference: 600,
      percentChange: 100,
    });
    expect(statistics.activity).toHaveLength(7);
    expect(statistics.muscleDistribution).toEqual([
      { label: '胸', completedWorkoutCount: 1 },
      { label: '肩', completedWorkoutCount: 1 },
    ]);
  });

  it('renders statistical facts and allows changing the selected interval', async () => {
    const onPeriodChange = jest.fn();
    const { getByText, getByLabelText } = await render(
      <WorkoutHistoryStatisticsScreenContent
        state={{ status: 'ready', statistics: buildStatistics() }}
        period="week"
        onBack={jest.fn()}
        onPeriodChange={onPeriodChange}
        onReload={jest.fn()}
      />,
    );

    expect(getByText('训练统计')).toBeTruthy();
    expect(getByText('训练概况')).toBeTruthy();
    expect(getByText('部位概览')).toBeTruthy();
    expect(getByText('胸')).toBeTruthy();

    await fireEvent.press(getByLabelText('查看月训练统计'));

    expect(onPeriodChange).toHaveBeenCalledWith('month');
  });
});

function historyItem({
  sessionId,
  status = 'completed',
  endedAt,
  localDate,
  totalVolume,
  completedSetCount = 0,
  durationSeconds,
  muscleLabels = [],
}: {
  readonly sessionId: WorkoutSessionId;
  readonly status?: 'completed' | 'cancelled';
  readonly endedAt: string;
  readonly localDate: string;
  readonly totalVolume: number;
  readonly completedSetCount?: number;
  readonly durationSeconds?: number;
  readonly muscleLabels?: readonly string[];
}) {
  return {
    sessionId,
    workoutName: '训练',
    status,
    endedAt,
    localDate,
    completedSetCount,
    totalVolume,
    durationSeconds,
    muscleLabels,
  };
}

function buildStatistics(): WorkoutHistoryStatistics {
  return {
    period: 'week',
    rangeLabel: '2026年7月17日–7月23日',
    comparisonRangeLabel: '2026年7月10日–7月16日',
    current: {
      completedWorkoutCount: 3,
      completedSetCount: 12,
      totalVolume: 4200,
      totalDurationSeconds: 7200,
      activeDayCount: 3,
    },
    previous: {
      completedWorkoutCount: 2,
      completedSetCount: 8,
      totalVolume: 2100,
      totalDurationSeconds: 3600,
      activeDayCount: 2,
    },
    volumeComparison: { difference: 2100, percentChange: 100 },
    durationComparison: { difference: 3600, percentChange: 100 },
    activity: [
      { label: '7/17', completedWorkoutCount: 1, totalVolume: 1200 },
      { label: '7/18', completedWorkoutCount: 0, totalVolume: 0 },
      { label: '7/19', completedWorkoutCount: 1, totalVolume: 1800 },
      { label: '7/20', completedWorkoutCount: 0, totalVolume: 0 },
      { label: '7/21', completedWorkoutCount: 0, totalVolume: 0 },
      { label: '7/22', completedWorkoutCount: 1, totalVolume: 1200 },
      { label: '7/23', completedWorkoutCount: 0, totalVolume: 0 },
    ],
    muscleDistribution: [
      { label: '胸', completedWorkoutCount: 2 },
      { label: '背', completedWorkoutCount: 1 },
    ],
  };
}
