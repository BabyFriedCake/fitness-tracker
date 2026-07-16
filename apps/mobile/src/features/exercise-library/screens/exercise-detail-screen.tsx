import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
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
  return (
    <ExerciseDetailContent
      state={useExerciseDetail(exerciseId)}
      onBack={onBack}
    />
  );
}

export type ExerciseDetailContentProps = {
  readonly state: ExerciseDetailScreenState;
  readonly onBack?: () => void;
};

export function ExerciseDetailContent({
  state,
  onBack,
}: ExerciseDetailContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {onBack && <BackButton onBack={onBack} />}
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'not-found' && <NotFoundState />}
          {state.status === 'error' && <ErrorState message={state.message} />}
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

function ErrorState({ message }: { readonly message: string }) {
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
    </ThemedView>
  );
}

function ExerciseDetail({ exercise }: { readonly exercise: Exercise }) {
  const primaryMuscleGroup = formatMuscleGroup(exercise.primaryMuscleGroup);
  const equipment = formatEquipment(exercise.equipment);
  const secondaryMuscleGroups =
    exercise.secondaryMuscleGroups.map(formatMuscleGroup);
  const attribution = getExerciseSourceAttribution(exercise);

  return (
    <>
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle">{exercise.nameZh}</ThemedText>
        {exercise.nameEn && (
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

      <ImagePlaceholder exerciseName={exercise.nameZh} />

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
      </DetailSection>

      <DetailSection title="来源与许可">
        <DetailLine label="来源" value={attribution.sourceName} />
        <DetailLine label="引用" value={attribution.reference} />
        <DetailLine label="许可" value={attribution.license} />
      </DetailSection>
    </>
  );
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
} {
  const sourceReference = exercise.source?.reference;
  const sourceParts = sourceReference?.split(';').map((part) => part.trim());
  const licensePart = sourceParts?.find((part) => part.startsWith('license='));
  const reference = sourceParts
    ?.filter((part) => part && !part.startsWith('license='))
    .join('; ');
  const license = licensePart?.replace('license=', '').trim();

  return {
    sourceName: exercise.source?.name ?? '未记录',
    reference: reference || '未记录',
    license: license || '未记录',
  };
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
  pressed: {
    opacity: 0.72,
  },
});
