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
  DAILY_STATUS_VALUES,
  type DailyStatusValue,
} from '@/domain/daily-status';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import type { WorkoutSessionId } from '@/domain/workout-session';
import {
  useTodayDashboard,
  type TodayDashboardScreenControls,
  type TodayDashboardScreenState,
} from '@/features/workout-session/application/use-today-dashboard';
import type {
  TodayDashboardSessionEntry,
  TodayDashboardTemplateItem,
} from '@/features/workout-session/application/today-dashboard';
import { useTheme } from '@/hooks/use-theme';

export function TodayDashboardScreen() {
  const router = useRouter();
  const model = useTodayDashboard();

  return (
    <TodayDashboardScreenContent
      {...model}
      onCreateTemplate={() => {
        router.push('/templates/new');
      }}
      onOpenWorkoutSession={(sessionId) => {
        router.push({
          pathname: '/workout-sessions/[id]',
          params: { id: sessionId },
        });
      }}
      onOpenHistory={() => {
        router.push('/history');
      }}
    />
  );
}

export type TodayDashboardScreenContentProps = {
  readonly state: TodayDashboardScreenState;
  readonly controls: TodayDashboardScreenControls;
  readonly onCreateTemplate: () => void;
  readonly onOpenWorkoutSession: (sessionId: WorkoutSessionId) => void;
  readonly onOpenHistory: () => void;
};

export function TodayDashboardScreenContent({
  state,
  controls,
  onCreateTemplate,
  onOpenWorkoutSession,
  onOpenHistory,
}: TodayDashboardScreenContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">今天</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              选择模板开始训练，或继续已保存的训练。
            </ThemedText>
          </View>

          {state.status === 'loading' && <LoadingState />}
          {state.status === 'error' && (
            <ErrorState message={state.message} onReload={controls.reload} />
          )}
          {state.status === 'ready' && (
            <ScrollView
              contentContainerStyle={styles.readyScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <ReadyState
                state={state}
                controls={controls}
                onCreateTemplate={onCreateTemplate}
                onOpenWorkoutSession={onOpenWorkoutSession}
                onOpenHistory={onOpenHistory}
              />
            </ScrollView>
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
        正在加载今日训练
      </ThemedText>
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
      <ThemedText type="default">今日训练加载失败</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      <SecondaryButton
        label="重新加载"
        accessibilityLabel="重新加载今日训练"
        onPress={onReload}
      />
    </ThemedView>
  );
}

function ReadyState({
  state,
  controls,
  onCreateTemplate,
  onOpenWorkoutSession,
  onOpenHistory,
}: {
  readonly state: Extract<TodayDashboardScreenState, { status: 'ready' }>;
  readonly controls: TodayDashboardScreenControls;
  readonly onCreateTemplate: () => void;
  readonly onOpenWorkoutSession: (sessionId: WorkoutSessionId) => void;
  readonly onOpenHistory: () => void;
}) {
  const hasBlockingSession =
    state.data.sessionEntry.status === 'draft' ||
    state.data.sessionEntry.status === 'in_progress';

  return (
    <View style={styles.readyContent}>
      <SessionEntryCard
        entry={state.data.sessionEntry}
        isContinuing={state.isContinuingSession}
        onContinue={async (sessionId) => {
          const didContinue = await controls.continueSession(sessionId);

          if (didContinue) {
            onOpenWorkoutSession(sessionId);
          }
        }}
      />

      {state.actionError && (
        <ThemedText accessibilityRole="alert">{state.actionError}</ThemedText>
      )}

      <DailyStatusSelector
        value={state.data.dailyStatus}
        onChange={controls.updateDailyStatus}
      />

      {state.data.templates.length === 0 ? (
        <EmptyTemplateEntry onCreateTemplate={onCreateTemplate} />
      ) : (
        <TemplateStartList
          templates={state.data.templates}
          disabled={hasBlockingSession || state.isCreatingSession}
          isCreating={state.isCreatingSession}
          onCreateSession={controls.createSessionFromTemplate}
        />
      )}

      {state.data.recommendation && (
        <Recommendation
          title={state.data.recommendation.title}
          message={state.data.recommendation.message}
        />
      )}

      {state.data.recentWorkout && (
        <RecentWorkout
          workout={state.data.recentWorkout}
          onOpenHistory={onOpenHistory}
        />
      )}

      {state.data.weeklySummary && (
        <WeeklySummary summary={state.data.weeklySummary} />
      )}

      <SecondaryButton
        label="查看全部历史"
        accessibilityLabel="查看历史训练"
        onPress={onOpenHistory}
      />
    </View>
  );
}

function DailyStatusSelector({
  value,
  onChange,
}: {
  readonly value?: DailyStatusValue;
  readonly onChange: (status: DailyStatusValue) => Promise<void>;
}) {
  const theme = useTheme();

  return (
    <View style={styles.statusSection}>
      <ThemedText type="default">今日状态</ThemedText>
      <View style={styles.statusOptions}>
        {DAILY_STATUS_VALUES.map((status) => {
          const selected = status === value;
          const label = formatDailyStatus(status);

          return (
            <Pressable
              key={status}
              onPress={() => void onChange(status)}
              accessibilityRole="button"
              accessibilityLabel={`今日状态：${label}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.statusOption,
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
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        状态仅用于记录和提示，不会自动修改训练。
      </ThemedText>
    </View>
  );
}

function Recommendation({
  title,
  message,
}: {
  readonly title: string;
  readonly message: string;
}) {
  return (
    <View style={styles.insightSection}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </View>
  );
}

function RecentWorkout({
  workout,
  onOpenHistory,
}: {
  readonly workout: NonNullable<
    Extract<
      TodayDashboardScreenState,
      { status: 'ready' }
    >['data']['recentWorkout']
  >;
  readonly onOpenHistory: () => void;
}) {
  return (
    <Pressable
      onPress={onOpenHistory}
      accessibilityRole="button"
      accessibilityLabel={`查看最近训练${workout.workoutName}`}
      style={({ pressed }) => [
        styles.insightSection,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        最近完成
      </ThemedText>
      <ThemedText type="default">{workout.workoutName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {workout.completedSetCount} 组 · {formatVolume(workout.totalVolume)} kg
      </ThemedText>
    </Pressable>
  );
}

function WeeklySummary({
  summary,
}: {
  readonly summary: NonNullable<
    Extract<
      TodayDashboardScreenState,
      { status: 'ready' }
    >['data']['weeklySummary']
  >;
}) {
  return (
    <View style={styles.insightSection}>
      <ThemedText type="smallBold">本周概览</ThemedText>
      <View style={styles.weeklyMetrics}>
        <ThemedText type="small">
          {summary.completedWorkoutCount} 次训练
        </ThemedText>
        <ThemedText type="small">{summary.completedSetCount} 组</ThemedText>
        <ThemedText type="small">
          {formatVolume(summary.totalVolume)} kg
        </ThemedText>
      </View>
    </View>
  );
}

function SessionEntryCard({
  entry,
  isContinuing,
  onContinue,
}: {
  readonly entry: TodayDashboardSessionEntry;
  readonly isContinuing: boolean;
  readonly onContinue: (sessionId: WorkoutSessionId) => Promise<void>;
}) {
  const theme = useTheme();

  if (entry.status === 'none') {
    return (
      <ThemedView
        type="backgroundElement"
        style={[
          styles.sessionCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <ThemedText type="default">当前没有进行中的训练</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          选择一个训练模板，系统会创建今天的训练草稿。
        </ThemedText>
      </ThemedView>
    );
  }

  const canContinue =
    entry.status === 'draft' || entry.status === 'in_progress';
  const progressLabel = `${entry.completedSetCount} / ${entry.totalTargetSetCount} 组`;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.sessionCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {formatSessionStatus(entry.status)}
      </ThemedText>
      <ThemedText type="default">{entry.workoutName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        已完成 {progressLabel}
      </ThemedText>
      <PrimaryButton
        label={isContinuing ? '正在恢复' : getSessionActionLabel(entry.status)}
        accessibilityLabel={`${getSessionActionLabel(entry.status)}${entry.workoutName}`}
        disabled={!canContinue || isContinuing}
        onPress={() => void onContinue(entry.sessionId)}
      />
    </ThemedView>
  );
}

function EmptyTemplateEntry({
  onCreateTemplate,
}: {
  readonly onCreateTemplate: () => void;
}) {
  return (
    <ThemedView style={styles.feedbackState}>
      <ThemedText type="default">还没有训练模板</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        创建第一个模板，开始记录训练。
      </ThemedText>
      <PrimaryButton
        label="创建训练模板"
        accessibilityLabel="创建第一个训练模板"
        onPress={onCreateTemplate}
      />
    </ThemedView>
  );
}

function TemplateStartList({
  templates,
  disabled,
  isCreating,
  onCreateSession,
}: {
  readonly templates: readonly TodayDashboardTemplateItem[];
  readonly disabled: boolean;
  readonly isCreating: boolean;
  readonly onCreateSession: (templateId: WorkoutTemplateId) => Promise<void>;
}) {
  return (
    <View style={styles.templateSection}>
      <ThemedText type="default">选择今日训练</ThemedText>
      <View accessibilityLabel="今日训练模板列表">
        {templates.map((template, index) => (
          <View key={template.id}>
            <TemplateStartCard
              template={template}
              disabled={disabled}
              isCreating={isCreating}
              onCreateSession={onCreateSession}
            />
            {index < templates.length - 1 && <ListSeparator />}
          </View>
        ))}
      </View>
    </View>
  );
}

function TemplateStartCard({
  template,
  disabled,
  isCreating,
  onCreateSession,
}: {
  readonly template: TodayDashboardTemplateItem;
  readonly disabled: boolean;
  readonly isCreating: boolean;
  readonly onCreateSession: (templateId: WorkoutTemplateId) => Promise<void>;
}) {
  const theme = useTheme();
  const metrics = `${template.exerciseCount} 个动作 · ${template.totalTargetSets} 组`;

  return (
    <Pressable
      onPress={() => void onCreateSession(template.id)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`开始训练${template.name}，${metrics}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.templateCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.templateCopy}>
        <ThemedText type="default">{template.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {metrics}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{isCreating ? '创建中' : '开始'}</ThemedText>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: theme.text },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText type="smallBold" style={{ color: theme.background }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

function formatSessionStatus(
  status: Exclude<TodayDashboardSessionEntry['status'], 'none'>,
): string {
  switch (status) {
    case 'draft':
      return '可恢复的训练草稿';
    case 'in_progress':
      return '进行中的训练';
    case 'completed':
      return '最近训练已完成';
    case 'cancelled':
      return '最近训练已取消';
  }
}

function getSessionActionLabel(
  status: Exclude<TodayDashboardSessionEntry['status'], 'none'>,
): string {
  switch (status) {
    case 'draft':
      return '继续训练';
    case 'in_progress':
      return '继续训练';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
  }
}

function formatDailyStatus(status: DailyStatusValue): string {
  switch (status) {
    case 'normal':
      return '正常';
    case 'fatigued':
      return '疲劳';
    case 'menstrual':
      return '经期';
    case 'unwell':
      return '不适';
  }
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
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
  readyScrollContent: { paddingBottom: Spacing.four },
  readyContent: { gap: Spacing.four },
  statusSection: { gap: Spacing.two },
  statusOptions: { flexDirection: 'row', gap: Spacing.one },
  statusOption: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  insightSection: {
    gap: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  weeklyMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sessionCard: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  templateSection: { gap: Spacing.three },
  templateCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  templateCopy: { flex: 1, gap: Spacing.one },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  feedbackState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  centerText: { textAlign: 'center' },
  separator: { height: Spacing.two },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
