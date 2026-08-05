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
import type { WorkoutSessionSummaryExercise } from '@/features/workout-session/application/workout-session-completion-recovery';
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
          <View style={styles.readyRoot}>
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="返回今天"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.backArrow}>‹</ThemedText>
            </Pressable>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {state.summary.status === 'completed'
                    ? '训练完成'
                    : '训练已取消'}
                </ThemedText>
                <ThemedText type="title" style={styles.heroTitle}>
                  {state.summary.workoutName}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.dateLine}>
                  ◷ {formatDateTime(state.summary.startedAt)} –{' '}
                  {formatDateTime(state.summary.endedAt)}
                </ThemedText>
              </View>
              <View style={styles.metrics}>
                <SummaryMetric
                  icon="◷"
                  label="总时长"
                  value={formatDuration(state.summary.durationSeconds)}
                />
                <SummaryMetric
                  icon="▥"
                  label="完成动作"
                  value={`${state.summary.completedExerciseCount} 个`}
                />
                <SummaryMetric
                  icon="▰"
                  label="完成组数"
                  value={`${state.summary.completedSetCount} 组`}
                />
                <SummaryMetric
                  icon="kg"
                  label="总训练量"
                  value={`${formatVolume(state.summary.totalVolume)} kg`}
                />
              </View>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionIcon}>▤</ThemedText>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  动作记录
                </ThemedText>
              </View>
              <View style={styles.exerciseHistory}>
                {state.summary.exercises.map((exercise, index) => (
                  <ExerciseHistory
                    key={`${index}-${exercise.exerciseName}`}
                    exercise={exercise}
                  />
                ))}
              </View>
              {state.summary.notes && (
                <View style={styles.notes}>
                  <ThemedText type="smallBold">训练备注</ThemedText>
                  <ThemedText>{state.summary.notes}</ThemedText>
                </View>
              )}
              <SummaryButton
                label="查看历史"
                accessibilityLabel="从训练历史详情查看历史训练"
                onPress={onOpenHistory}
              />
            </ScrollView>
            <View style={styles.bottomAction}>
              <SummaryButton
                label="完成"
                accessibilityLabel="完成查看训练历史详情"
                primary
                onPress={onDone}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ExerciseHistory({
  exercise,
}: {
  readonly exercise: WorkoutSessionSummaryExercise;
}) {
  return (
    <View style={styles.exercise}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseIdentity}>
          <View style={styles.exerciseIcon}>
            <ThemedText style={styles.exerciseIconText}>⌁</ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.exerciseName}>
            {exercise.exerciseName}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {exercise.skipped
            ? '已跳过'
            : exercise.completed
              ? '已完成'
              : '未完成'}
        </ThemedText>
      </View>
      {exercise.sets.length > 0 ? (
        exercise.sets.map((workoutSet) => (
          <View
            key={`${workoutSet.setNumber}-${workoutSet.completedAt}`}
            style={styles.setRow}
            accessibilityLabel={`第 ${workoutSet.setNumber} 组，${formatVolume(workoutSet.weight)} kg，${workoutSet.actualReps} 次`}
          >
            <ThemedText type="small">第 {workoutSet.setNumber} 组</ThemedText>
            <ThemedText type="smallBold">
              {formatVolume(workoutSet.weight)} kg × {workoutSet.actualReps} 次
            </ThemedText>
          </View>
        ))
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          没有已完成组。
        </ThemedText>
      )}
      <ThemedText type="default" themeColor="textSecondary">
        训练量 {formatVolume(exercise.totalVolume)} kg
      </ThemedText>
    </View>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.metric} accessibilityLabel={`${label}：${value}`}>
      <View style={styles.metricIcon}>
        <ThemedText style={styles.metricIconText}>{icon}</ThemedText>
      </View>
      <View style={styles.metricCopy}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.metricValue}>
          {value}
        </ThemedText>
      </View>
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
  readyRoot: { flex: 1 },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingTop: 92,
    paddingBottom: 116,
  },
  hero: { gap: Spacing.two, paddingTop: Spacing.four },
  heroTitle: { fontSize: 48, lineHeight: 56, color: '#211735' },
  dateLine: { fontSize: 18, lineHeight: 26 },
  backButton: {
    position: 'absolute',
    zIndex: 2,
    top: Spacing.three,
    left: Spacing.three,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6D3DF5',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  backArrow: { color: '#6D3DF5', fontSize: 42, lineHeight: 46 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    shadowColor: '#6D3DF5',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  metric: {
    width: '50%',
    minHeight: 122,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#EAE3F6',
  },
  metricIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#F0EAFB',
  },
  metricIconText: { color: '#6D3DF5', fontSize: 24, fontWeight: '800' },
  metricCopy: { flex: 1, gap: 2 },
  metricValue: { fontSize: 26, lineHeight: 34, color: '#211735' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionIcon: { color: '#6D3DF5', fontSize: 28 },
  sectionTitle: { fontSize: 26, lineHeight: 34 },
  exerciseHistory: { gap: Spacing.three },
  exercise: {
    gap: Spacing.two,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    shadowColor: '#6D3DF5',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  exerciseIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#F0EAFB',
  },
  exerciseIconText: { color: '#6D3DF5', fontSize: 28 },
  exerciseName: { flex: 1, fontSize: 22, lineHeight: 30 },
  setRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  notes: {
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#F0EAFB',
  },
  bottomAction: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.three,
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
