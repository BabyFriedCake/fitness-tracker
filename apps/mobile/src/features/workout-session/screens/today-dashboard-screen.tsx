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
    />
  );
}

export type TodayDashboardScreenContentProps = {
  readonly state: TodayDashboardScreenState;
  readonly controls: TodayDashboardScreenControls;
  readonly onCreateTemplate: () => void;
  readonly onOpenWorkoutSession: (sessionId: WorkoutSessionId) => void;
};

export function TodayDashboardScreenContent({
  state,
  controls,
  onCreateTemplate,
  onOpenWorkoutSession,
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
}: {
  readonly state: Extract<TodayDashboardScreenState, { status: 'ready' }>;
  readonly controls: TodayDashboardScreenControls;
  readonly onCreateTemplate: () => void;
  readonly onOpenWorkoutSession: (sessionId: WorkoutSessionId) => void;
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
