import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { WorkoutSessionId } from '@/domain/workout-session';
import {
  useWorkoutSessionHistory,
  type WorkoutSessionHistoryScreenState,
} from '@/features/workout-session/application/use-workout-session-history';
import type {
  WorkoutSessionHistoryItem,
  WorkoutSessionHistoryPeriod,
  WorkoutSessionHistorySection,
} from '@/features/workout-session/application/workout-session-history';
import {
  createWorkoutSessionHistoryCalendar,
  createWorkoutSessionHistoryOverview,
  createWorkoutSessionHistorySections,
  filterWorkoutSessionHistoryItems,
} from '@/features/workout-session/application/workout-session-history';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutSessionHistoryScreen() {
  const router = useRouter();
  const model = useWorkoutSessionHistory();

  return (
    <WorkoutSessionHistoryScreenContent
      state={model.state}
      onReload={model.reload}
      onOpenSummary={(sessionId) => {
        router.push(`/workout-sessions/${sessionId}/summary`);
      }}
      onGoToday={() => {
        router.dismissTo('/');
      }}
    />
  );
}

export function WorkoutSessionHistoryScreenContent({
  state,
  onReload,
  onOpenSummary,
  onGoToday,
}: {
  readonly state: WorkoutSessionHistoryScreenState;
  readonly onReload: () => void;
  readonly onOpenSummary: (sessionId: WorkoutSessionId) => void;
  readonly onGoToday: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">历史</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              最近完成和取消的训练。
            </ThemedText>
          </View>

          {state.status === 'loading' && <LoadingState />}
          {state.status === 'empty' && <EmptyState onGoToday={onGoToday} />}
          {state.status === 'error' && (
            <ErrorState message={state.message} onReload={onReload} />
          )}
          {state.status === 'ready' && (
            <HistoryList
              sections={state.sections}
              onOpenSummary={onOpenSummary}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="small" themeColor="textSecondary">
        正在加载历史训练
      </ThemedText>
    </ThemedView>
  );
}

function EmptyState({ onGoToday }: { readonly onGoToday: () => void }) {
  return (
    <ThemedView style={styles.feedbackState}>
      <ThemedText type="default">还没有历史训练</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        完成或取消训练后，会在这里看到记录。
      </ThemedText>
      <HistoryButton
        label="返回今天"
        accessibilityLabel="返回今天开始训练"
        primary
        onPress={onGoToday}
      />
    </ThemedView>
  );
}

function ErrorState({
  message,
  onReload,
}: {
  readonly message: string;
  readonly onReload: () => void;
}) {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">历史训练加载失败</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      <HistoryButton
        label="重新加载"
        accessibilityLabel="重新加载历史训练"
        primary
        onPress={onReload}
      />
    </ThemedView>
  );
}

function HistoryList({
  sections,
  onOpenSummary,
}: {
  readonly sections: readonly WorkoutSessionHistorySection[];
  readonly onOpenSummary: (sessionId: WorkoutSessionId) => void;
}) {
  const [period, setPeriod] = useState<WorkoutSessionHistoryPeriod>('all');
  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const filteredItems = useMemo(
    () => filterWorkoutSessionHistoryItems(items, period, new Date()),
    [items, period],
  );
  const filteredSections = useMemo(
    () => createWorkoutSessionHistorySections(filteredItems),
    [filteredItems],
  );
  const overview = useMemo(
    () => createWorkoutSessionHistoryOverview(filteredItems),
    [filteredItems],
  );
  const calendar = useMemo(
    () => createWorkoutSessionHistoryCalendar(items, new Date()),
    [items],
  );

  return (
    <SectionList
      sections={filteredSections.map((section) => ({
        ...section,
        data: section.items,
      }))}
      keyExtractor={(item) => item.sessionId}
      renderItem={({ item }) => (
        <HistoryRow item={item} onOpenSummary={onOpenSummary} />
      )}
      renderSectionHeader={({ section }) => (
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {section.title}
        </ThemedText>
      )}
      ItemSeparatorComponent={ItemSeparator}
      SectionSeparatorComponent={SectionSeparator}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <HistoryOverview
          period={period}
          overview={overview}
          calendar={calendar}
          onChangePeriod={setPeriod}
        />
      }
      ListEmptyComponent={
        <ThemedView style={styles.noPeriodResults}>
          <ThemedText type="small" themeColor="textSecondary">
            这个时间范围内没有已记录的训练。
          </ThemedText>
        </ThemedView>
      }
      accessibilityLabel="历史训练列表"
    />
  );
}

function HistoryOverview({
  period,
  overview,
  calendar,
  onChangePeriod,
}: {
  readonly period: WorkoutSessionHistoryPeriod;
  readonly overview: ReturnType<typeof createWorkoutSessionHistoryOverview>;
  readonly calendar: ReturnType<typeof createWorkoutSessionHistoryCalendar>;
  readonly onChangePeriod: (period: WorkoutSessionHistoryPeriod) => void;
}) {
  return (
    <View style={styles.overview}>
      <View style={styles.periodFilters} accessibilityLabel="历史时间范围">
        {(
          [
            ['week', '本周'],
            ['month', '本月'],
            ['three_months', '3个月'],
            ['all', '全部'],
          ] as const
        ).map(([value, label]) => (
          <PeriodButton
            key={value}
            label={label}
            selected={period === value}
            onPress={() => onChangePeriod(value)}
          />
        ))}
      </View>
      <View style={styles.summaryBand}>
        <HistoryMetric
          label="完成训练"
          value={`${overview.completedSessionCount} 次`}
        />
        <HistoryMetric
          label="完成组数"
          value={`${overview.completedSetCount} 组`}
        />
        <HistoryMetric
          label="总训练量"
          value={`${formatVolume(overview.totalVolume)} kg`}
        />
        <HistoryMetric
          label="总时长"
          value={formatDuration(overview.totalDurationSeconds)}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {formatVolumeTrend(overview.volumeTrend)}
      </ThemedText>
      <HistoryCalendar calendar={calendar} />
      <ThemedText type="small" themeColor="textSecondary">
        正式统计仅包含已完成训练，已取消记录不计入汇总。
      </ThemedText>
    </View>
  );
}

function PeriodButton({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`查看${label}历史`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.periodButton,
        {
          backgroundColor: selected
            ? theme.backgroundSelected
            : theme.background,
          borderColor: theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function HistoryMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View
      style={styles.historyMetric}
      accessibilityLabel={`${label}：${value}`}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function HistoryCalendar({
  calendar,
}: {
  readonly calendar: ReturnType<typeof createWorkoutSessionHistoryCalendar>;
}) {
  const theme = useTheme();

  return (
    <View
      style={styles.calendar}
      accessibilityLabel={`${calendar.title}训练日历`}
    >
      <ThemedText type="smallBold">{calendar.title}</ThemedText>
      <View style={styles.calendarGrid} importantForAccessibility="no">
        {['日', '一', '二', '三', '四', '五', '六'].map((weekday) => (
          <View key={weekday} style={styles.calendarDay}>
            <ThemedText type="small" themeColor="textSecondary">
              {weekday}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {Array.from({ length: calendar.leadingEmptyDays }, (_, emptyIndex) => (
          <View
            key={`empty-${emptyIndex}`}
            style={styles.calendarDay}
            importantForAccessibility="no"
          />
        ))}
        {calendar.days.map((day) => (
          <View
            key={day.localDate}
            style={styles.calendarDay}
            accessibilityLabel={`${day.localDate}${day.hasCompletedWorkout ? '有已完成训练' : '无训练'}`}
          >
            <ThemedText
              type={day.hasCompletedWorkout ? 'smallBold' : 'small'}
              themeColor={day.hasCompletedWorkout ? 'text' : 'textSecondary'}
            >
              {day.dayOfMonth}
            </ThemedText>
            {day.hasCompletedWorkout && (
              <View
                style={[
                  styles.calendarMarker,
                  { backgroundColor: theme.statusSuccess },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function HistoryRow({
  item,
  onOpenSummary,
}: {
  readonly item: WorkoutSessionHistoryItem;
  readonly onOpenSummary: (sessionId: WorkoutSessionId) => void;
}) {
  const theme = useTheme();
  const canOpenSummary = item.status === 'completed';

  return (
    <Pressable
      onPress={() => onOpenSummary(item.sessionId)}
      disabled={!canOpenSummary}
      accessibilityRole="button"
      accessibilityLabel={`${formatHistoryStatus(item.status)}${item.workoutName}，${formatDuration(item.durationSeconds)}，${formatVolume(item.totalVolume)} kg`}
      accessibilityState={{ disabled: !canOpenSummary }}
      style={({ pressed }) => [
        styles.historyRow,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        pressed && styles.pressed,
        !canOpenSummary && styles.disabled,
      ]}
    >
      <View style={styles.rowMain}>
        <ThemedText type="default">{item.workoutName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTime(item.endedAt)} · {formatHistoryStatus(item.status)}
        </ThemedText>
      </View>
      <View style={styles.rowMetrics}>
        <ThemedText type="smallBold">
          {formatDuration(item.durationSeconds)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.completedSetCount} 组 · {formatVolume(item.totalVolume)} kg
        </ThemedText>
      </View>
    </Pressable>
  );
}

function HistoryButton({
  label,
  accessibilityLabel,
  primary = false,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly primary?: boolean;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: theme.text }
          : { borderColor: theme.backgroundSelected, borderWidth: 1 },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={primary ? { color: theme.background } : undefined}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SectionSeparator() {
  return <View style={styles.sectionSeparator} />;
}

function ItemSeparator() {
  return <View style={styles.itemSeparator} />;
}

function formatHistoryStatus(
  status: WorkoutSessionHistoryItem['status'],
): string {
  return status === 'completed' ? '已完成' : '已取消';
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(value: number | undefined): string {
  if (value === undefined) {
    return '时长未记录';
  }

  const totalMinutes = Math.max(0, Math.round(value / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} 分钟`;
  }

  if (minutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatVolumeTrend(
  trend: ReturnType<typeof createWorkoutSessionHistoryOverview>['volumeTrend'],
): string {
  if (trend.status === 'insufficient') {
    return '训练量趋势：至少完成两次训练后显示。';
  }

  if (trend.direction === 'stable') {
    return '训练量趋势：与上一次完成训练持平。';
  }

  return `训练量趋势：较上一次${trend.direction === 'up' ? '增加' : '减少'} ${formatVolume(Math.abs(trend.difference))} kg。`;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  header: { gap: Spacing.one },
  listContent: { paddingBottom: Spacing.four },
  overview: { gap: Spacing.three, paddingBottom: Spacing.four },
  periodFilters: { flexDirection: 'row', gap: Spacing.one },
  periodButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  summaryBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyMetric: {
    minWidth: 96,
    flex: 1,
    gap: Spacing.one,
    paddingVertical: Spacing.three,
  },
  calendar: { gap: Spacing.two },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: {
    width: '14.2857%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  calendarMarker: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  noPeriodResults: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  sectionTitle: { paddingBottom: Spacing.two },
  historyRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  rowMain: { flex: 1, gap: Spacing.one },
  rowMetrics: { alignItems: 'flex-end', gap: Spacing.one },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  centerText: { textAlign: 'center' },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  sectionSeparator: { height: Spacing.three },
  itemSeparator: { height: Spacing.two },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.56 },
});
