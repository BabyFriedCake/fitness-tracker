import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
  WorkoutSessionHistorySection,
} from '@/features/workout-session/application/workout-session-history';
import {
  createWorkoutSessionHistoryCalendar,
  createWorkoutSessionHistoryOverview,
  createWorkoutSessionHistorySections,
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
            <ThemedText type="small" themeColor="textSecondary">
              训练记录
            </ThemedText>
            <ThemedText type="title">训练日历</ThemedText>
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
  const items = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getLatestHistoryMonth(items),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    getLatestCompletedLocalDate(items, visibleMonth),
  );
  const monthItems = useMemo(
    () => filterItemsByMonth(items, visibleMonth),
    [items, visibleMonth],
  );
  const selectedItems = useMemo(
    () =>
      monthItems.filter(
        (item) =>
          item.status === 'completed' && item.localDate === selectedDate,
      ),
    [monthItems, selectedDate],
  );
  const overview = useMemo(
    () => createWorkoutSessionHistoryOverview(monthItems),
    [monthItems],
  );
  const calendar = useMemo(
    () => createWorkoutSessionHistoryCalendar(items, visibleMonth),
    [items, visibleMonth],
  );
  const selectedSections = useMemo(
    () => createWorkoutSessionHistorySections(selectedItems),
    [selectedItems],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel="历史训练列表"
    >
      <HistoryOverview
        overview={overview}
        calendar={calendar}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onChangeMonth={(offset) => {
          const nextMonth = new Date(visibleMonth);
          nextMonth.setMonth(nextMonth.getMonth() + offset, 1);
          const nextSelectedDate = getLatestCompletedLocalDate(
            items,
            nextMonth,
          );
          setVisibleMonth(nextMonth);
          setSelectedDate(nextSelectedDate);
        }}
      />
      {selectedSections.length > 0 ? (
        selectedSections.map((section) => (
          <View key={section.localDate} style={styles.selectedSection}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            {section.items.map((item, index) => (
              <View key={item.sessionId}>
                <HistoryRow item={item} onOpenSummary={onOpenSummary} />
                {index < section.items.length - 1 && <ItemSeparator />}
              </View>
            ))}
          </View>
        ))
      ) : (
        <ThemedView style={styles.noPeriodResults}>
          <ThemedText type="small" themeColor="textSecondary">
            这一天没有已完成训练。
          </ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

function HistoryOverview({
  overview,
  calendar,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: {
  readonly overview: ReturnType<typeof createWorkoutSessionHistoryOverview>;
  readonly calendar: ReturnType<typeof createWorkoutSessionHistoryCalendar>;
  readonly selectedDate: string;
  readonly onSelectDate: (localDate: string) => void;
  readonly onChangeMonth: (offset: number) => void;
}) {
  return (
    <View style={styles.overview}>
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
      <HistoryCalendar
        calendar={calendar}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onChangeMonth={onChangeMonth}
      />
      <ThemedText type="small" themeColor="textSecondary">
        正式统计仅包含已完成训练，已取消记录不计入汇总。
      </ThemedText>
    </View>
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
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: {
  readonly calendar: ReturnType<typeof createWorkoutSessionHistoryCalendar>;
  readonly selectedDate: string;
  readonly onSelectDate: (localDate: string) => void;
  readonly onChangeMonth: (offset: number) => void;
}) {
  return (
    <View
      style={styles.calendar}
      accessibilityLabel={`${calendar.title}训练日历`}
    >
      <View style={styles.calendarHeader}>
        <Pressable
          onPress={() => onChangeMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="查看上个月历史"
          style={({ pressed }) => [
            styles.monthButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{calendar.title}</ThemedText>
        <Pressable
          onPress={() => onChangeMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="查看下个月历史"
          style={({ pressed }) => [
            styles.monthButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">›</ThemedText>
        </Pressable>
      </View>
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
          <Pressable
            key={day.localDate}
            onPress={() => onSelectDate(day.localDate)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedDate === day.localDate }}
            accessibilityLabel={`${day.localDate}${day.hasCompletedWorkout ? `训练：${day.muscleLabels.join('、')}` : '无训练'}`}
            style={({ pressed }) => [
              styles.calendarDay,
              selectedDate === day.localDate && styles.calendarDaySelected,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type={day.hasCompletedWorkout ? 'smallBold' : 'small'}
              themeColor={day.hasCompletedWorkout ? 'text' : 'textSecondary'}
            >
              {day.dayOfMonth}
            </ThemedText>
            {day.hasCompletedWorkout && (
              <ThemedText type="small" style={styles.calendarMuscleLabel}>
                {day.muscleLabels.slice(0, 2).join(' ')}
              </ThemedText>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function getLatestHistoryMonth(
  items: readonly WorkoutSessionHistoryItem[],
): Date {
  const latestCompletedDate = getLatestCompletedLocalDate(items, new Date());

  return toMonthDate(latestCompletedDate);
}

function getLatestCompletedLocalDate(
  items: readonly WorkoutSessionHistoryItem[],
  referenceMonth: Date,
): string {
  const monthKey = toMonthKey(referenceMonth);
  const latestItem = items
    .filter(
      (item) =>
        item.status === 'completed' && item.localDate.startsWith(monthKey),
    )
    .sort(
      (first, second) => Date.parse(second.endedAt) - Date.parse(first.endedAt),
    )[0];

  return latestItem?.localDate ?? toLocalDateKey(referenceMonth);
}

function filterItemsByMonth(
  items: readonly WorkoutSessionHistoryItem[],
  visibleMonth: Date,
): readonly WorkoutSessionHistoryItem[] {
  const monthKey = toMonthKey(visibleMonth);

  return items.filter((item) => item.localDate.startsWith(monthKey));
}

function toMonthDate(localDateOrDate: string | Date): Date {
  const date =
    typeof localDateOrDate === 'string'
      ? new Date(`${localDateOrDate}T00:00:00`)
      : localDateOrDate;

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toMonthKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
  ].join('-');
}

function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
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
  calendar: {
    gap: Spacing.three,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DFDDD4',
    backgroundColor: '#F7F6F1',
    padding: Spacing.four,
  },
  calendarHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#E8E5DC',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: {
    width: '14.2857%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 12,
    paddingVertical: Spacing.one,
  },
  calendarDaySelected: {
    backgroundColor: '#E8E5DC',
  },
  calendarMuscleLabel: {
    color: '#587C00',
    fontSize: 10,
    lineHeight: 12,
  },
  noPeriodResults: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  sectionTitle: { paddingBottom: Spacing.two },
  selectedSection: { gap: Spacing.two },
  historyRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: Spacing.four,
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
  itemSeparator: { height: Spacing.two },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.56 },
});
