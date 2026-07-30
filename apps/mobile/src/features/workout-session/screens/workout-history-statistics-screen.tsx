import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  Fonts,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import {
  useWorkoutHistoryStatistics,
  type WorkoutHistoryStatisticsScreenState,
} from '@/features/workout-session/application/use-workout-history-statistics';
import {
  WORKOUT_HISTORY_STATISTICS_PERIODS,
  type WorkoutHistoryStatistics,
  type WorkoutHistoryStatisticsPeriod,
} from '@/features/workout-session/application/workout-history-statistics';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutHistoryStatisticsScreen({
  onBack,
}: {
  readonly onBack: () => void;
}) {
  const [period, setPeriod] = useState<WorkoutHistoryStatisticsPeriod>('week');
  const model = useWorkoutHistoryStatistics(period);

  return (
    <WorkoutHistoryStatisticsScreenContent
      state={model.state}
      period={period}
      onBack={onBack}
      onPeriodChange={setPeriod}
      onReload={model.reload}
    />
  );
}

export function WorkoutHistoryStatisticsScreenContent({
  state,
  period,
  onBack,
  onPeriodChange,
  onReload,
}: {
  readonly state: WorkoutHistoryStatisticsScreenState;
  readonly period: WorkoutHistoryStatisticsPeriod;
  readonly onBack: () => void;
  readonly onPeriodChange: (period: WorkoutHistoryStatisticsPeriod) => void;
  readonly onReload: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="返回历史训练"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="default" style={styles.backIcon}>
                ←
              </ThemedText>
            </Pressable>
            <SymbolView
              name="chart.bar.xaxis"
              size={22}
              weight="semibold"
              tintColor="#211735"
            />
          </View>

          <View style={styles.titleSection}>
            <ThemedText type="small" themeColor="textSecondary">
              训练记录
            </ThemedText>
            <ThemedText type="title">训练统计</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              仅根据已完成训练和已保存组数计算，不会生成训练建议。
            </ThemedText>
          </View>

          <PeriodSelector value={period} onChange={onPeriodChange} />

          {state.status === 'loading' && <LoadingState />}
          {state.status === 'error' && (
            <ErrorState message={state.message} onReload={onReload} />
          )}
          {state.status === 'ready' && (
            <StatisticsContent statistics={state.statistics} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  readonly value: WorkoutHistoryStatisticsPeriod;
  readonly onChange: (period: WorkoutHistoryStatisticsPeriod) => void;
}) {
  return (
    <View style={styles.periodSelector} accessibilityLabel="统计时间范围">
      {WORKOUT_HISTORY_STATISTICS_PERIODS.map((period) => {
        const selected = value === period;

        return (
          <Pressable
            key={period}
            onPress={() => onChange(period)}
            accessibilityRole="button"
            accessibilityLabel={`查看${formatPeriod(period)}训练统计`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.periodButton,
              selected && styles.periodButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={selected ? styles.periodTextSelected : undefined}
            >
              {formatPeriod(period)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatisticsContent({
  statistics,
}: {
  readonly statistics: WorkoutHistoryStatistics;
}) {
  const maxVolume = Math.max(
    1,
    ...statistics.activity.map((item) => item.totalVolume),
  );
  const largestMuscleCount = Math.max(
    1,
    ...statistics.muscleDistribution.map((item) => item.completedWorkoutCount),
  );

  return (
    <View style={styles.statisticsContent}>
      <View style={styles.sectionHeading}>
        <ThemedText type="subtitle">训练概况</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {statistics.rangeLabel}
        </ThemedText>
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.primaryMetricRow}>
          <Metric
            value={String(statistics.current.completedWorkoutCount)}
            label="完成训练"
          />
          <Comparison
            comparison={statistics.volumeComparison}
            baselineLabel={statistics.comparisonRangeLabel}
            unit="kg"
          />
        </View>
        <View style={styles.metricGrid}>
          <Metric
            value={`${statistics.current.completedSetCount}`}
            label="完成组数"
          />
          <Metric
            value={formatVolume(statistics.current.totalVolume)}
            label="总训练量 kg"
          />
          <Metric
            value={formatDuration(statistics.current.totalDurationSeconds)}
            label="训练时长"
          />
          <Metric
            value={`${statistics.current.activeDayCount}`}
            label="训练天数"
          />
        </View>
        <View style={styles.durationComparison}>
          <ThemedText type="small" themeColor="textSecondary">
            训练时长对比
          </ThemedText>
          <Comparison
            comparison={statistics.durationComparison}
            baselineLabel={statistics.comparisonRangeLabel}
            unit="duration"
          />
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <ThemedText type="subtitle">训练量趋势</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          每个柱形代表该区间内的已完成训练量
        </ThemedText>
      </View>
      <View style={styles.chartCard} accessibilityLabel="训练量趋势图">
        <View style={styles.chartBars}>
          {statistics.activity.map((bucket) => {
            const height = Math.max(
              4,
              Math.round((bucket.totalVolume / maxVolume) * 132),
            );

            return (
              <View key={bucket.label} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { height }]} />
                </View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.chartLabel}
                >
                  {bucket.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendColor} />
          <ThemedText type="small" themeColor="textSecondary">
            训练量 kg
          </ThemedText>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <ThemedText type="subtitle">部位概览</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          基于已完成训练中的动作快照归类
        </ThemedText>
      </View>
      <View style={styles.distributionCard}>
        {statistics.muscleDistribution.length > 0 ? (
          statistics.muscleDistribution.map((item) => (
            <View key={item.label} style={styles.distributionRow}>
              <View style={styles.distributionLabelRow}>
                <ThemedText type="default">{item.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.completedWorkoutCount} 次训练
                </ThemedText>
              </View>
              <View style={styles.distributionTrack}>
                <View
                  style={[
                    styles.distributionBar,
                    {
                      width: `${(item.completedWorkoutCount / largestMuscleCount) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            这个时间范围还没有完成训练。完成训练后会显示部位分布。
          </ThemedText>
        )}
      </View>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.aiBoundary}
      >
        此页只提供历史事实与区间对比，为未来 AI 推荐提供可追溯输入；AI
        不会在此页自动修改训练计划或历史记录。
      </ThemedText>
    </View>
  );
}

function Metric({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}) {
  return (
    <View style={styles.metric}>
      <ThemedText type="subtitle" style={styles.metricValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Comparison({
  comparison,
  baselineLabel,
  unit,
}: {
  readonly comparison: WorkoutHistoryStatistics['volumeComparison'];
  readonly baselineLabel: string;
  readonly unit: 'kg' | 'duration';
}) {
  const color = comparison.difference >= 0 ? '#159B61' : '#B25C4C';
  const sign = comparison.difference > 0 ? '+' : '';
  const percent =
    comparison.percentChange === undefined
      ? '对比数据不足'
      : `${comparison.percentChange > 0 ? '+' : ''}${comparison.percentChange.toFixed(0)}%`;
  const formattedDifference =
    unit === 'duration'
      ? formatDuration(Math.abs(comparison.difference))
      : `${formatVolume(comparison.difference)} ${unit}`;

  return (
    <View style={styles.comparison}>
      <ThemedText type="default" style={{ color }}>
        {comparison.percentChange === undefined
          ? percent
          : `${sign}${formattedDifference} (${percent})`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        对比 {baselineLabel}
      </ThemedText>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="small" themeColor="textSecondary">
        正在计算训练统计
      </ThemedText>
    </View>
  );
}

function ErrorState({
  message,
  onReload,
}: {
  readonly message: string;
  readonly onReload: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">训练统计加载失败</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      <Pressable
        onPress={onReload}
        accessibilityRole="button"
        accessibilityLabel="重新加载训练统计"
        style={({ pressed }) => [
          styles.reloadButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">重新加载</ThemedText>
      </Pressable>
    </View>
  );
}

function formatPeriod(period: WorkoutHistoryStatisticsPeriod): string {
  return period === 'week' ? '周' : period === 'month' ? '月' : '年';
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatDuration(value: number): string {
  const totalMinutes = Math.round(value / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0
    ? `${hours}小时${minutes > 0 ? `${minutes}分` : ''}`
    : `${minutes}分`;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  backIcon: { color: '#6D3DF5', fontSize: 32, lineHeight: 36 },
  titleSection: { gap: Spacing.one },
  periodSelector: {
    minHeight: 48,
    flexDirection: 'row',
    borderRadius: 24,
    backgroundColor: '#EEE9F8',
    padding: Spacing.one,
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  periodButtonSelected: { backgroundColor: '#FFFFFF' },
  periodTextSelected: { color: '#6D3DF5' },
  statisticsContent: { gap: Spacing.four },
  sectionHeading: { gap: Spacing.one },
  overviewCard: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4DDF1',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
  },
  primaryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  durationComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4DDF1',
    paddingTop: Spacing.three,
  },
  metric: { minWidth: '42%', flex: 1, gap: Spacing.half },
  metricValue: { fontFamily: Fonts.sans, fontSize: 34, lineHeight: 40 },
  comparison: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  chartCard: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4DDF1',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
  },
  chartBars: {
    height: 176,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: Spacing.one },
  chartTrack: {
    width: '100%',
    height: 136,
    justifyContent: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4DDF1',
  },
  chartBar: { borderRadius: 8, backgroundColor: '#6D3DF5' },
  chartLabel: { fontSize: 10, lineHeight: 12, textAlign: 'center' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6D3DF5',
  },
  distributionCard: {
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4DDF1',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
  },
  distributionRow: { gap: Spacing.one },
  distributionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  distributionTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: '#EEE9F8',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  aiBoundary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4DDF1',
    paddingTop: Spacing.three,
  },
  feedbackState: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centerText: { textAlign: 'center' },
  reloadButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.72 },
});
