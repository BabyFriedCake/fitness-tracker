import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Exercise } from '@/domain/exercise';
import { ExerciseRow } from '@/features/exercise-library/components/exercise-row';
import {
  useExerciseLibrary,
  type ExerciseLibraryScreenState,
} from '@/features/exercise-library/application/use-exercise-library';

export function ExerciseLibraryScreen() {
  return <ExerciseLibraryContent state={useExerciseLibrary()} />;
}

export type ExerciseLibraryContentProps = {
  readonly state: ExerciseLibraryScreenState;
};

export function ExerciseLibraryContent({ state }: ExerciseLibraryContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">动作库</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              浏览已保存的标准动作。
            </ThemedText>
          </ThemedView>

          {state.status === 'loading' && <LoadingState />}
          {state.status === 'empty' && <EmptyState />}
          {state.status === 'error' && <ErrorState message={state.message} />}
          {state.status === 'ready' && (
            <ExerciseList exercises={state.exercises} />
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
      <ThemedText type="default">正在加载动作库</ThemedText>
    </ThemedView>
  );
}

function EmptyState() {
  return (
    <ThemedView style={styles.feedbackState}>
      <ThemedText type="default">还没有可用动作</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        动作库数据尚未导入，请重新打开应用后再试。
      </ThemedText>
    </ThemedView>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">动作库加载失败</ThemedText>
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

function ExerciseList({
  exercises,
}: {
  readonly exercises: readonly Exercise[];
}) {
  return (
    <FlatList
      data={exercises}
      keyExtractor={(exercise) => exercise.id}
      renderItem={({ item }) => <ExerciseRow exercise={item} />}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={ListSeparator}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={8}
      accessibilityLabel="动作列表"
    />
  );
}

function ListSeparator() {
  return <ThemedView style={styles.separator} />;
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
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  listContent: {
    paddingBottom: Spacing.three,
  },
  separator: {
    height: Spacing.two,
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
});
