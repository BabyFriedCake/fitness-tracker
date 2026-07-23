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
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useTodayPlanDetail,
  type TodayPlanDetailData,
  type TodayPlanDetailRouteParams,
  type TodayPlanDetailState,
} from '@/features/workout-session/application/use-today-plan-detail';
import { useTheme } from '@/hooks/use-theme';

export function TodayPlanDetailScreen({
  routeParams,
}: {
  readonly routeParams: TodayPlanDetailRouteParams;
}) {
  const router = useRouter();
  const model = useTodayPlanDetail(routeParams);

  return (
    <TodayPlanDetailContent
      {...model}
      onBack={() => router.back()}
      onOpenWorkoutSession={(sessionId) => {
        router.push({
          pathname: '/workout-sessions/[id]',
          params: { id: sessionId },
        });
      }}
    />
  );
}

export function TodayPlanDetailContent({
  state,
  controls,
  onBack,
  onOpenWorkoutSession,
}: {
  readonly state: TodayPlanDetailState;
  readonly controls: ReturnType<typeof useTodayPlanDetail>['controls'];
  readonly onBack: () => void;
  readonly onOpenWorkoutSession: (sessionId: string) => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="返回今日训练"
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="default" themeColor="textSecondary">
              ← 训练模板
            </ThemedText>
          </Pressable>
          {state.status === 'ready' &&
            state.data.plan.status !== 'completed' && (
              <Pressable
                onPress={async () => {
                  const sessionId = await controls.startPlan();

                  if (sessionId) {
                    onOpenWorkoutSession(sessionId);
                  }
                }}
                disabled={state.isStarting}
                accessibilityRole="button"
                accessibilityLabel="编辑此次训练"
                accessibilityState={{ disabled: state.isStarting }}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.pressed,
                  state.isStarting && styles.disabled,
                ]}
              >
                <ThemedText type="smallBold" style={styles.accentText}>
                  编辑此次训练
                </ThemedText>
              </Pressable>
            )}
        </View>

        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && (
          <ErrorState message={state.message} onReload={controls.reload} />
        )}
        {state.status === 'notFound' && (
          <ErrorState message={state.message} onReload={controls.reload} />
        )}
        {state.status === 'ready' && (
          <PlanDetail
            data={state.data}
            isStarting={state.isStarting}
            actionError={state.actionError}
            onStart={async () => {
              const sessionId = await controls.startPlan();

              if (sessionId) {
                onOpenWorkoutSession(sessionId);
              }
            }}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function PlanDetail({
  data,
  isStarting,
  actionError,
  onStart,
}: {
  readonly data: TodayPlanDetailData;
  readonly isStarting: boolean;
  readonly actionError?: string;
  readonly onStart: () => Promise<void>;
}) {
  const totalSets = data.template.exercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );
  const isCompleted = data.plan.status === 'completed';

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          力量训练 · {data.template.exercises.length} 个动作
        </ThemedText>
        <ThemedText type="title" style={styles.heroTitle}>
          {data.plan.titleSnapshot}
        </ThemedText>
        <View style={styles.metricBand}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            时长待估算 · {totalSets} 组 · 预计消耗待估算
          </ThemedText>
        </View>
      </View>

      <View style={styles.exerciseList}>
        {data.exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {(index + 1).toString().padStart(2, '0')}
            </ThemedText>
            <View style={styles.exerciseCopy}>
              <ThemedText type="default" style={styles.exerciseName}>
                {exercise.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {exercise.targetSets} 组 · {exercise.targetRepsMin}
                {exercise.targetRepsMax === exercise.targetRepsMin
                  ? ''
                  : `-${exercise.targetRepsMax}`}{' '}
                次 · {exercise.restSeconds} 秒
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      {actionError && (
        <ThemedText accessibilityRole="alert">{actionError}</ThemedText>
      )}

      <Pressable
        onPress={() => void onStart()}
        disabled={isCompleted || isStarting}
        accessibilityRole="button"
        accessibilityLabel={isCompleted ? '今日训练已完成' : '开始今日训练计划'}
        accessibilityState={{ disabled: isCompleted || isStarting }}
        style={({ pressed }) => [
          styles.startButton,
          pressed && !isCompleted && styles.pressed,
          (isCompleted || isStarting) && styles.disabled,
        ]}
      >
        <ThemedText type="smallBold" style={styles.accentText}>
          {isCompleted ? '已完成' : isStarting ? '正在启动' : '开始训练'}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="default">正在加载今日训练计划</ThemedText>
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
  const theme = useTheme();

  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">今日训练计划加载失败</ThemedText>
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
        accessibilityLabel="重新加载今日训练计划"
        style={({ pressed }) => [
          styles.reloadButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">重新加载</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  editButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#1B2016',
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  hero: { gap: Spacing.three, paddingTop: Spacing.three },
  heroTitle: { fontSize: 64, lineHeight: 70 },
  metricBand: {
    borderRadius: 24,
    backgroundColor: '#E8E5DC',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  exerciseList: { borderTopWidth: StyleSheet.hairlineWidth },
  exerciseRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
  },
  exerciseCopy: { flex: 1, gap: Spacing.one },
  exerciseName: { fontSize: 22, lineHeight: 30 },
  startButton: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#1B2016',
  },
  accentText: { color: '#CAFF00' },
  reloadButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
