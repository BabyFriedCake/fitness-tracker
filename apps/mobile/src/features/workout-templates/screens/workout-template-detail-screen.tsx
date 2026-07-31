import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
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
import type { ExerciseId } from '@/domain/exercise';

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
      onOpenExercise={(exerciseId) => {
        router.push({
          pathname: '/exercises/[id]',
          params: { id: exerciseId },
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
  readonly onOpenExercise: (exerciseId: ExerciseId) => void;
};

export function WorkoutTemplateDetailContent({
  state,
  controls,
  onBack,
  onEditTemplate,
  onOpenExercise,
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
            <ThemedText type="default" style={styles.backIcon}>
              ←
            </ThemedText>
          </Pressable>
          <View style={styles.topBarSpacer} />
        </View>

        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && (
          <ErrorState message={state.message} onReload={controls.reload} />
        )}
        {state.status === 'notFound' && (
          <ErrorState message={state.message} onReload={controls.reload} />
        )}
        {state.status === 'ready' && (
          <TemplateDetail
            template={state.template}
            onOpenExercise={onOpenExercise}
            onEditTemplate={onEditTemplate}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function TemplateDetail({
  template,
  onOpenExercise,
  onEditTemplate,
}: {
  readonly template: WorkoutTemplateDetail;
  readonly onOpenExercise: (exerciseId: ExerciseId) => void;
  readonly onEditTemplate: (templateId: WorkoutTemplateId) => void;
}) {
  return (
    <View style={styles.detailBody}>
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <ThemedText type="title" style={styles.heroTitle}>
            {template.name}
          </ThemedText>
          {template.description ? (
            <ThemedText type="small" themeColor="textSecondary">
              {template.description}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.overviewCard}>
          <View style={styles.overviewIcon}>
            <SymbolView
              name="clock.fill"
              size={28}
              weight="semibold"
              tintColor="#6D3DF5"
            />
          </View>
          <View style={styles.overviewCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              力量训练 · {template.exerciseCount} 个动作
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDuration(template.estimatedDurationMinutes)} ·{' '}
              {template.totalTargetSets} 组 ·{' '}
              {formatCalories(template.estimatedCalories)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.exerciseList}>
          {template.exercises.map((exercise, index) => (
            <Pressable
              key={exercise.id}
              onPress={() => {
                onOpenExercise(exercise.exerciseId);
              }}
              accessibilityRole="button"
              accessibilityLabel={`查看动作${exercise.name}`}
              style={({ pressed }) => [
                styles.exerciseRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.exercisePosition}>
                <ThemedText type="smallBold" style={styles.positionText}>
                  {(index + 1).toString().padStart(2, '0')}
                </ThemedText>
              </View>
              <View style={styles.exerciseCopy}>
                <ThemedText type="default" style={styles.exerciseName}>
                  {exercise.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {exercise.targetSets} 组 · {exercise.targetRepsLabel} 次 ·{' '}
                  {exercise.restSeconds} 秒
                  {exercise.weight !== null
                    ? ` · ${formatWeight(exercise.weight)} 公斤`
                    : ''}
                </ThemedText>
              </View>
              <SymbolView
                name="chevron.right"
                size={22}
                weight="semibold"
                tintColor="#B59CFA"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {template.status === 'active' && (
        <View style={styles.fixedEditAction}>
          <EditButton
            onPress={() => {
              onEditTemplate(template.id);
            }}
          />
        </View>
      )}
    </View>
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
      accessibilityLabel="编辑模板"
      style={({ pressed }) => [
        styles.editButton,
        { backgroundColor: theme.actionPrimary },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={{ color: theme.actionOnPrimary }}>
        编辑
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

function formatWeight(weight: number): string {
  return Number.isInteger(weight)
    ? String(weight)
    : String(Number(weight.toFixed(2)));
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
  topBarSpacer: { width: 48, height: 48 },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 2,
  },
  backIcon: { color: '#6D3DF5', fontSize: 32, lineHeight: 36 },
  editButton: {
    alignItems: 'center',
    minHeight: 58,
    justifyContent: 'center',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: 29,
    backgroundColor: '#6D3DF5',
    paddingHorizontal: Spacing.four,
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
  detailBody: { flex: 1, position: 'relative' },
  detailScroll: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: 58 + Spacing.three * 2,
  },
  fixedEditAction: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
  hero: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  heroTitle: {
    maxWidth: 580,
    fontSize: 52,
    lineHeight: 60,
  },
  overviewCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEE9F8',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  overviewIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F0EAFF',
  },
  overviewCopy: { flex: 1, gap: Spacing.one },
  exerciseList: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  exerciseRow: {
    minHeight: 122,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4DDF1',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 1,
  },
  exercisePosition: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F0EAFF',
  },
  positionText: { color: '#6D3DF5', fontSize: 22, lineHeight: 28 },
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
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
