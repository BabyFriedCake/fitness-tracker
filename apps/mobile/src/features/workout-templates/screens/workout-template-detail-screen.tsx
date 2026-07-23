import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import type { WorkoutTemplateDetail } from '@/features/workout-templates/application/load-workout-template-detail';
import {
  useWorkoutTemplateDetail,
  type WorkoutTemplateDetailRouteParams,
  type WorkoutTemplateDetailScreenControls,
  type WorkoutTemplateDetailScreenState,
} from '@/features/workout-templates/application/use-workout-template-detail';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutTemplateDetailScreen({
  routeParams,
}: {
  readonly routeParams: WorkoutTemplateDetailRouteParams;
}) {
  const router = useRouter();

  return (
    <WorkoutTemplateDetailContent
      {...useWorkoutTemplateDetail(routeParams)}
      onBack={() => {
        router.back();
      }}
      onEditTemplate={(templateId) => {
        router.push({
          pathname: '/templates/[id]/edit',
          params: { id: templateId },
        } as unknown as Href);
      }}
    />
  );
}

export type WorkoutTemplateDetailContentProps = {
  readonly state: WorkoutTemplateDetailScreenState;
  readonly controls: WorkoutTemplateDetailScreenControls;
  readonly onBack: () => void;
  readonly onEditTemplate: (templateId: WorkoutTemplateId) => void;
};

export function WorkoutTemplateDetailContent({
  state,
  controls,
  onBack,
  onEditTemplate,
}: WorkoutTemplateDetailContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="返回训练模板列表"
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="default" themeColor="textSecondary">
              ← 训练模板
            </ThemedText>
          </Pressable>
          {state.status === 'ready' && state.template.status === 'active' && (
            <EditButton
              onPress={() => {
                onEditTemplate(state.template.id);
              }}
            />
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
          <TemplateDetail template={state.template} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function TemplateDetail({
  template,
}: {
  readonly template: WorkoutTemplateDetail;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <ThemedText type="small" themeColor="textSecondary">
          力量训练 · {template.exerciseCount} 个动作
        </ThemedText>
        <ThemedText type="title" style={styles.heroTitle}>
          {template.name}
        </ThemedText>
        {template.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {template.description}
          </ThemedText>
        ) : null}
        <View style={styles.metricBand}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {formatDuration(template.estimatedDurationMinutes)} ·{' '}
            {template.totalTargetSets} 组 ·{' '}
            {formatCalories(template.estimatedCalories)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.exerciseList}>
        {template.exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {(index + 1).toString().padStart(2, '0')}
            </ThemedText>
            <View style={styles.exerciseCopy}>
              <ThemedText type="default" style={styles.exerciseName}>
                {exercise.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {exercise.targetSets} 组 · {exercise.targetRepsLabel} 次 ·{' '}
                {exercise.restSeconds} 秒
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="default">正在加载训练模板</ThemedText>
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
      <ThemedText type="default">训练模板加载失败</ThemedText>
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
        accessibilityLabel="重新加载训练模板详情"
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

function EditButton({ onPress }: { readonly onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="编辑此次训练"
      style={({ pressed }) => [
        styles.editButton,
        { backgroundColor: theme.text },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={{ color: '#CAFF00' }}>
        编辑此次训练
      </ThemedText>
    </Pressable>
  );
}

function formatDuration(value: number | null): string {
  return value === null ? '时长待估算' : `${value} 分钟`;
}

function formatCalories(value: number | null): string {
  return value === null ? '预计消耗待估算' : `预计消耗 ${value} 千卡`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset,
  },
  topBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  editButton: {
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: 28,
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  hero: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  heroTitle: {
    maxWidth: 580,
  },
  metricBand: {
    minHeight: 88,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#EAE8E1',
    paddingHorizontal: Spacing.four,
  },
  exerciseList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCD8CE',
  },
  exerciseRow: {
    minHeight: 136,
    flexDirection: 'row',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1DED6',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  exerciseCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  exerciseName: {
    fontWeight: '700',
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  reloadButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
