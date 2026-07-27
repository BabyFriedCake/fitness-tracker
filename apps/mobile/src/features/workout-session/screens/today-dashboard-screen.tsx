import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  DAILY_STATUS_VALUES,
  type DailyStatusValue,
} from '@/domain/daily-status';
import type { TodayWorkoutPlanId } from '@/domain/today-workout-plan';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import type { WorkoutSessionId } from '@/domain/workout-session';
import {
  useTodayDashboard,
  type TodayDashboardScreenControls,
  type TodayDashboardScreenState,
} from '@/features/workout-session/application/use-today-dashboard';
import type {
  TodayDashboardPlanItem,
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
      onOpenTemplate={(templateId) => {
        router.push({
          pathname: '/templates/[id]',
          params: { id: templateId },
        });
      }}
      onOpenTodayPlan={(planId) => {
        router.push({
          pathname: '/today-plans/[id]',
          params: { id: planId },
        });
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
  readonly onOpenTemplate: (templateId: WorkoutTemplateId) => void;
  readonly onOpenTodayPlan: (planId: TodayWorkoutPlanId) => void;
  readonly onOpenWorkoutSession: (sessionId: WorkoutSessionId) => void;
  readonly onOpenHistory: () => void;
};

export function TodayDashboardScreenContent({
  state,
  controls,
  onCreateTemplate,
  onOpenTemplate,
  onOpenTodayPlan,
  onOpenWorkoutSession,
  onOpenHistory,
}: TodayDashboardScreenContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              7 月 23 日 · 星期四
            </ThemedText>
            <ThemedText type="title">专注每一次动作。</ThemedText>
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
                onOpenTemplate={onOpenTemplate}
                onOpenTodayPlan={onOpenTodayPlan}
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
  onOpenTemplate,
  onOpenTodayPlan,
  onOpenWorkoutSession,
  onOpenHistory,
}: {
  readonly state: Extract<TodayDashboardScreenState, { status: 'ready' }>;
  readonly controls: TodayDashboardScreenControls;
  readonly onCreateTemplate: () => void;
  readonly onOpenTemplate: (templateId: WorkoutTemplateId) => void;
  readonly onOpenTodayPlan: (planId: TodayWorkoutPlanId) => void;
  readonly onOpenWorkoutSession: (sessionId: WorkoutSessionId) => void;
  readonly onOpenHistory: () => void;
}) {
  const [isPlanPickerVisible, setIsPlanPickerVisible] = useState(false);
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
        <TodayPlanList
          plans={state.data.todayPlans}
          templates={state.data.templates}
          disabled={hasBlockingSession || state.isCreatingSession}
          isCreating={state.isCreatingSession}
          onOpenPicker={() => setIsPlanPickerVisible(true)}
          onStartPlan={async (planId) => {
            const sessionId = await controls.startTodayPlan(planId);

            if (sessionId) {
              onOpenWorkoutSession(sessionId);
            }
          }}
          onOpenTodayPlan={onOpenTodayPlan}
        />
      )}

      <TodayPlanPickerModal
        visible={isPlanPickerVisible}
        templates={state.data.templates}
        plans={state.data.todayPlans}
        isSubmitting={state.isCreatingSession}
        onClose={() => setIsPlanPickerVisible(false)}
        onAddTemplate={async (templateId) => {
          const didAdd = await controls.addTodayPlanFromTemplate(templateId);

          if (didAdd) {
            setIsPlanPickerVisible(false);
          }
        }}
      />

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
            backgroundColor: theme.workoutSurface,
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
        ]}
      >
        <ThemedText style={styles.sessionBadge}>接下来</ThemedText>
        <ThemedText type="subtitle" style={styles.sessionHeroTitle}>
          暂无进行中的训练
        </ThemedText>
        <ThemedText style={styles.sessionHeroMeta}>
          当前没有进行中的训练
        </ThemedText>
        <ThemedText style={styles.sessionHeroMeta}>
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
          backgroundColor: theme.workoutSurface,
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
      ]}
    >
      <ThemedText style={styles.sessionBadge}>
        {formatSessionStatus(entry.status)}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.sessionHeroTitle}>
        第{' '}
        {Math.max(1, entry.completedSetCount + 1)
          .toString()
          .padStart(2, '0')}{' '}
        组正在进行
      </ThemedText>
      <ThemedText style={styles.sessionHeroMeta}>
        {entry.workoutName} · 已完成 {progressLabel}
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

function TodayPlanList({
  plans,
  templates,
  disabled,
  isCreating,
  onOpenPicker,
  onStartPlan,
  onOpenTodayPlan,
}: {
  readonly plans: readonly TodayDashboardPlanItem[];
  readonly templates: readonly TodayDashboardTemplateItem[];
  readonly disabled: boolean;
  readonly isCreating: boolean;
  readonly onOpenPicker: () => void;
  readonly onStartPlan: (planId: TodayDashboardPlanItem['id']) => Promise<void>;
  readonly onOpenTodayPlan: (planId: TodayDashboardPlanItem['id']) => void;
}) {
  return (
    <View style={styles.templateSection}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">训练计划</ThemedText>
        <Pressable
          onPress={onOpenPicker}
          accessibilityRole="button"
          accessibilityLabel="添加训练计划"
          style={({ pressed }) => [
            styles.addPlanButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={styles.accentText}>
            + 添加计划
          </ThemedText>
        </Pressable>
      </View>

      {plans.length === 0 ? (
        <ThemedView style={styles.emptyPlanCard}>
          <ThemedText type="default">今天还没有训练计划</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            从训练模板中选择今天要完成的训练。
          </ThemedText>
        </ThemedView>
      ) : (
        <View accessibilityLabel="今日训练计划列表">
          {plans.map((plan, index) => (
            <View key={plan.id}>
              <TodayPlanCard
                plan={plan}
                disabled={disabled}
                isCreating={isCreating}
                onStartPlan={onStartPlan}
                onOpenTodayPlan={onOpenTodayPlan}
              />
              {index < plans.length - 1 && <ListSeparator />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TodayPlanCard({
  plan,
  disabled,
  isCreating,
  onStartPlan,
  onOpenTodayPlan,
}: {
  readonly plan: TodayDashboardPlanItem;
  readonly disabled: boolean;
  readonly isCreating: boolean;
  readonly onStartPlan: (planId: TodayDashboardPlanItem['id']) => Promise<void>;
  readonly onOpenTodayPlan: (planId: TodayDashboardPlanItem['id']) => void;
}) {
  const theme = useTheme();
  const metrics = `${plan.exerciseCount} 个动作 · ${plan.totalTargetSets} 组`;
  const isCompleted = plan.status === 'completed';
  const buttonLabel = isCompleted
    ? '已完成'
    : plan.status === 'in_progress'
      ? '继续'
      : '开始';
  const isStartDisabled = disabled || isCompleted;

  return (
    <View
      style={[
        styles.templateCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <Pressable
        onPress={() => onOpenTodayPlan(plan.id)}
        accessibilityRole="button"
        accessibilityLabel={`查看今日训练计划${plan.name}，${metrics}`}
        style={({ pressed }) => [
          styles.templatePreview,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.templateIcon}>
          <ThemedText type="smallBold" themeColor="statusSuccess">
            训练
          </ThemedText>
        </View>
        <View style={styles.templateCopy}>
          <ThemedText type="default">{plan.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {metrics}
          </ThemedText>
        </View>
      </Pressable>
      <Pressable
        onPress={() => void onStartPlan(plan.id)}
        disabled={isStartDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${buttonLabel}训练${plan.name}`}
        accessibilityState={{ disabled: isStartDisabled }}
        style={({ pressed }) => [
          styles.templateStartButton,
          pressed && !isStartDisabled && styles.pressed,
          isStartDisabled && styles.disabled,
        ]}
      >
        <ThemedText type="smallBold" style={styles.templateStartText}>
          {isCreating ? '…' : buttonLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function TodayPlanPickerModal({
  visible,
  templates,
  plans,
  isSubmitting,
  onClose,
  onAddTemplate,
}: {
  readonly visible: boolean;
  readonly templates: readonly TodayDashboardTemplateItem[];
  readonly plans: readonly TodayDashboardPlanItem[];
  readonly isSubmitting: boolean;
  readonly onClose: () => void;
  readonly onAddTemplate: (templateId: WorkoutTemplateId) => Promise<void>;
}) {
  const plannedTemplateIds = new Set(plans.map((plan) => plan.templateId));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalScrim}>
        <View style={styles.planPicker}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="subtitle">添加计划</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                从训练模板中多选添加
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="关闭添加计划"
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="subtitle">×</ThemedText>
            </Pressable>
          </View>
          <View style={styles.pickerList}>
            {templates.map((template) => {
              const isAdded = plannedTemplateIds.has(template.id);

              return (
                <Pressable
                  key={template.id}
                  onPress={() => void onAddTemplate(template.id)}
                  disabled={isAdded || isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isAdded
                      ? `${template.name}已添加到今日计划`
                      : `添加${template.name}到今日计划`
                  }
                  accessibilityState={{ disabled: isAdded || isSubmitting }}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    pressed && !isAdded && styles.pressed,
                    isAdded && styles.disabled,
                  ]}
                >
                  <View>
                    <ThemedText type="default">{template.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {template.exerciseCount} 个动作 ·{' '}
                      {template.totalTargetSets} 组
                    </ThemedText>
                  </View>
                  <View style={styles.pickerRadio}>
                    {isAdded && <View style={styles.pickerRadioSelected} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
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
    minHeight: 260,
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    padding: Spacing.four,
  },
  sessionBadge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#CAFF00',
    color: '#1B2016',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sessionHeroTitle: {
    color: '#FFFFFF',
  },
  sessionHeroMeta: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  templateSection: { gap: Spacing.three },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addPlanButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#1B2016',
    paddingHorizontal: Spacing.three,
  },
  accentText: { color: '#CAFF00' },
  emptyPlanCard: {
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    padding: Spacing.four,
  },
  templateCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    padding: Spacing.three,
  },
  templatePreview: {
    minHeight: 76,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  templateCopy: { flex: 1, gap: Spacing.one },
  templateIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#E8F6B8',
  },
  templateStartButton: {
    minWidth: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#1B2016',
    paddingHorizontal: Spacing.two,
  },
  templateStartText: { color: '#CAFF00' },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: Spacing.four,
  },
  planPicker: {
    gap: Spacing.four,
    borderRadius: 28,
    backgroundColor: '#F7F5EF',
    padding: Spacing.four,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  pickerList: { gap: Spacing.two },
  pickerRow: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    borderColor: '#DAD7CE',
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
  },
  pickerRadio: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    borderColor: '#C9C5BA',
  },
  pickerRadioSelected: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CAFF00',
  },
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
