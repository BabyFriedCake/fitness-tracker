import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Exercise } from '@/domain/exercise';
import {
  formatEquipment,
  formatMuscleGroup,
} from '@/features/exercise-library/components/exercise-labels';
import {
  useExerciseDetail,
  type ExerciseDetailScreenState,
} from '@/features/exercise-library/application/use-exercise-detail';
import { useTheme } from '@/hooks/use-theme';

export type ExerciseDetailScreenProps = {
  readonly exerciseId: string;
  readonly onBack?: () => void;
};

export function ExerciseDetailScreen({
  exerciseId,
  onBack,
}: ExerciseDetailScreenProps) {
  const model = useExerciseDetail(exerciseId);

  return (
    <ExerciseDetailContent
      state={model.state}
      onBack={onBack}
      onReload={model.reload}
    />
  );
}

export type ExerciseDetailContentProps = {
  readonly state: ExerciseDetailScreenState;
  readonly onBack?: () => void;
  readonly onReload?: () => void;
};

export function ExerciseDetailContent({
  state,
  onBack,
  onReload,
}: ExerciseDetailContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {onBack && <BackButton onBack={onBack} />}
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'not-found' && <NotFoundState />}
          {state.status === 'error' && (
            <ErrorState message={state.message} onReload={onReload} />
          )}
          {state.status === 'ready' && (
            <ExerciseDetail exercise={state.exercise} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BackButton({ onBack }: { readonly onBack: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="返回动作库"
      style={({ pressed }) => [
        styles.backButton,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold">返回动作库</ThemedText>
    </Pressable>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="default">正在加载动作详情</ThemedText>
    </ThemedView>
  );
}

function NotFoundState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">没有找到这个动作</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        这个动作可能尚未导入，或链接已失效。
      </ThemedText>
    </ThemedView>
  );
}

function ErrorState({
  message,
  onReload,
}: {
  readonly message: string;
  readonly onReload?: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">动作详情加载失败</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      {onReload && (
        <Pressable
          onPress={onReload}
          accessibilityRole="button"
          accessibilityLabel="重新加载动作详情"
          style={({ pressed }) => [
            styles.reloadButton,
            { borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">重新加载</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

function ExerciseDetail({ exercise }: { readonly exercise: Exercise }) {
  const primaryMuscleGroup = formatMuscleGroup(exercise.primaryMuscleGroup);
  const equipment = formatEquipment(exercise.equipment);
  const secondaryMuscleGroups =
    exercise.secondaryMuscleGroups.map(formatMuscleGroup);
  const attribution = getExerciseSourceAttribution(exercise);
  const instructionSteps = getPreferredInstructionSteps(exercise);

  return (
    <>
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle">{exercise.nameZh}</ThemedText>
        {exercise.nameEn && exercise.nameEn !== exercise.nameZh && (
          <ThemedText type="small" themeColor="textSecondary">
            {exercise.nameEn}
          </ThemedText>
        )}
        <ThemedText type="smallBold">
          {primaryMuscleGroup} · {equipment}
        </ThemedText>
        {exercise.status === 'inactive' && (
          <ThemedText type="small" themeColor="textSecondary">
            状态：停用，仅用于历史记录兼容。
          </ThemedText>
        )}
      </ThemedView>

      <ExerciseMedia exercise={exercise} />

      <DetailSection title="动作说明">
        <ThemedText type="default">
          {exercise.description ?? '暂无动作说明。'}
        </ThemedText>
      </DetailSection>

      <DetailSection title="训练信息">
        <DetailLine label="主要肌群" value={primaryMuscleGroup} />
        <DetailLine
          label="辅助肌群"
          value={
            secondaryMuscleGroups.length > 0
              ? secondaryMuscleGroups.join('、')
              : '未记录'
          }
        />
        <DetailLine label="器械" value={equipment} />
        <DetailLine
          label="训练类型"
          value={exercise.type === 'strength' ? '力量' : '有氧'}
        />
      </DetailSection>

      <DetailSection title="动作步骤">
        {instructionSteps ? (
          <>
            {instructionSteps.language !== 'zh' && (
              <ThemedText type="small" themeColor="textSecondary">
                暂无中文步骤，显示已导入的其他语言说明。
              </ThemedText>
            )}
            {instructionSteps.steps.map((step, index) => (
              <ThemedView key={`${index}-${step}`} style={styles.stepLine}>
                <ThemedText type="smallBold">{index + 1}.</ThemedText>
                <ThemedText type="default" style={styles.stepText}>
                  {step}
                </ThemedText>
              </ThemedView>
            ))}
          </>
        ) : (
          <ThemedText type="default">暂无动作步骤。</ThemedText>
        )}
      </DetailSection>

      <DetailSection title="来源与许可">
        <DetailLine label="来源" value={attribution.sourceName} />
        <DetailLine label="引用" value={attribution.reference} />
        <DetailLine label="许可" value={attribution.license} />
        {attribution.attribution !== '未记录' && (
          <DetailLine label="归属" value={attribution.attribution} />
        )}
      </DetailSection>
    </>
  );
}

function ExerciseMedia({ exercise }: { readonly exercise: Exercise }) {
  if (exercise.imageUri) {
    return (
      <Image
        source={exercise.imageUri}
        contentFit="contain"
        accessibilityLabel={`${exercise.nameZh}动作图片`}
        style={styles.exerciseImage}
      />
    );
  }

  return <ImagePlaceholder exerciseName={exercise.nameZh} />;
}

function ImagePlaceholder({ exerciseName }: { readonly exerciseName: string }) {
  const theme = useTheme();

  return (
    <ThemedView
      style={[
        styles.imagePlaceholder,
        { borderColor: theme.backgroundSelected },
      ]}
      accessibilityLabel={`动作图片占位：${exerciseName}`}
    >
      <ThemedText type="small" themeColor="textSecondary">
        暂无动作图片
      </ThemedText>
    </ThemedView>
  );
}

function DetailSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedView style={styles.sectionBody}>{children}</ThemedView>
    </ThemedView>
  );
}

function DetailLine({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <ThemedView style={styles.detailLine}>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.detailLabel}
      >
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.detailValue}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

function getExerciseSourceAttribution(exercise: Exercise): {
  readonly sourceName: string;
  readonly reference: string;
  readonly license: string;
  readonly attribution: string;
} {
  return {
    sourceName: exercise.source?.name ?? '未记录',
    reference: exercise.source?.reference ?? '未记录',
    license: exercise.source?.license ?? '未记录',
    attribution: exercise.source?.attribution ?? '未记录',
  };
}

function getPreferredInstructionSteps(exercise: Exercise):
  | {
      readonly language: string;
      readonly steps: readonly string[];
    }
  | undefined {
  const instructionSteps = exercise.instructionSteps;
  if (!instructionSteps) {
    return undefined;
  }

  const preferredLanguage = instructionSteps.zh?.length
    ? 'zh'
    : instructionSteps.en?.length
      ? 'en'
      : Object.keys(instructionSteps).find(
          (language) => instructionSteps[language]?.length,
        );

  return preferredLanguage
    ? {
        language: preferredLanguage,
        steps: instructionSteps[preferredLanguage],
      }
    : undefined;
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
  },
  scrollContent: {
    flexGrow: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  backButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  header: {
    gap: Spacing.one,
  },
  imagePlaceholder: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  exerciseImage: {
    width: '100%',
    aspectRatio: 1.6,
  },
  section: {
    gap: Spacing.two,
  },
  sectionBody: {
    gap: Spacing.two,
  },
  detailLine: {
    gap: Spacing.one,
  },
  detailLabel: {
    flexShrink: 1,
  },
  detailValue: {
    flexShrink: 1,
  },
  stepLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  stepText: {
    flex: 1,
  },
  feedbackState: {
    flexGrow: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  reloadButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
});
