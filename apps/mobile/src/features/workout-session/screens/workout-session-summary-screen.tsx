import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useWorkoutSessionSummaryScreen,
  type WorkoutSessionSummaryScreenState,
} from '@/features/workout-session/application/use-workout-session-summary-screen';
import type { WorkoutSessionRouteParams } from '@/features/workout-session/application/use-workout-session-screen';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutSessionSummaryScreen({
  routeParams,
}: {
  readonly routeParams: WorkoutSessionRouteParams;
}) {
  const router = useRouter();
  const model = useWorkoutSessionSummaryScreen(routeParams);

  return (
    <WorkoutSessionSummaryScreenContent
      state={model.state}
      onDone={() => router.dismissTo('/')}
      onOpenHistory={() => router.push('/history')}
      onReload={model.reload}
    />
  );
}

export function WorkoutSessionSummaryScreenContent({
  state,
  onDone,
  onOpenHistory,
  onReload,
}: {
  readonly state: WorkoutSessionSummaryScreenState;
  readonly onDone: () => void;
  readonly onOpenHistory: () => void;
  readonly onReload: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {state.status === 'loading' && (
          <ThemedView style={styles.feedback} accessibilityRole="progressbar">
            <ActivityIndicator />
            <ThemedText>正在计算训练总结</ThemedText>
          </ThemedView>
        )}
        {state.status === 'error' && (
          <ThemedView style={styles.feedback} accessibilityRole="alert">
            <ThemedText type="subtitle" style={styles.centerText}>
              总结暂时不可用
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              {state.message}
            </ThemedText>
            <View style={styles.actions}>
              <SummaryButton
                label="返回今天"
                accessibilityLabel="从训练总结返回今天"
                onPress={onDone}
              />
              <SummaryButton
                label="重新加载"
                accessibilityLabel="重新加载训练总结"
                primary
                onPress={onReload}
              />
            </View>
          </ThemedView>
        )}
        {state.status === 'ready' && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                训练完成
              </ThemedText>
              <ThemedText type="subtitle" numberOfLines={2}>
                {state.summary.workoutName}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {formatDateTime(state.summary.startedAt)} –{' '}
                {formatDateTime(state.summary.endedAt)}
              </ThemedText>
            </View>
            <View style={styles.metrics}>
              <SummaryMetric
                label="总时长"
                value={formatDuration(state.summary.durationSeconds)}
              />
              <SummaryMetric
                label="完成动作"
                value={`${state.summary.completedExerciseCount} 个`}
              />
              <SummaryMetric
                label="完成组数"
                value={`${state.summary.completedSetCount} 组`}
              />
              <SummaryMetric
                label="总训练量"
                value={`${formatVolume(state.summary.totalVolume)} kg`}
              />
            </View>
            <SummaryButton
              label="完成"
              accessibilityLabel="完成查看训练总结"
              primary
              onPress={onDone}
            />
            <SummaryButton
              label="查看历史"
              accessibilityLabel="从训练总结查看历史训练"
              onPress={onOpenHistory}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.metric} accessibilityLabel={`${label}：${value}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="subtitle">{value}</ThemedText>
    </View>
  );
}

function SummaryButton({
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

function formatDuration(durationSeconds: number): string {
  const totalMinutes = Math.floor(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.five,
    padding: Spacing.four,
  },
  header: { gap: Spacing.two },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metric: {
    minWidth: 150,
    flexBasis: '50%',
    flexGrow: 1,
    gap: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.four,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  feedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  actions: {
    width: '100%',
    gap: Spacing.two,
  },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
