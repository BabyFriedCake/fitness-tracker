import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '@/domain/exercise';
import {
  formatEquipment,
  formatMuscleGroup,
} from '@/features/exercise-library/components/exercise-labels';
import { ExerciseRow } from '@/features/exercise-library/components/exercise-row';
import {
  useExerciseLibrary,
  type ExerciseLibraryScreenControls,
  type ExerciseLibraryScreenState,
} from '@/features/exercise-library/application/use-exercise-library';
import { useTheme } from '@/hooks/use-theme';

export function ExerciseLibraryScreen() {
  return <ExerciseLibraryContent {...useExerciseLibrary()} />;
}

export type ExerciseLibraryContentProps = {
  readonly state: ExerciseLibraryScreenState;
  readonly controls: ExerciseLibraryScreenControls;
};

export function ExerciseLibraryContent({
  state,
  controls,
}: ExerciseLibraryContentProps) {
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
            <>
              <ExerciseLibraryControls controls={controls} />
              {state.exercises.length > 0 ? (
                <ExerciseList exercises={state.exercises} />
              ) : (
                <NoResultsState onClearFilters={controls.clearFilters} />
              )}
            </>
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

function ExerciseLibraryControls({
  controls,
}: {
  readonly controls: ExerciseLibraryScreenControls;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.controls}>
      <TextInput
        value={controls.filters.queryText}
        onChangeText={controls.updateQuery}
        placeholder="搜索中文或英文动作"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        accessibilityLabel="搜索动作"
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
      />

      <FilterChipGroup
        title="肌群"
        accessibilityLabelPrefix="按肌群筛选"
        options={MUSCLE_GROUPS}
        selectedValues={controls.filters.muscleGroups}
        formatLabel={formatMuscleGroup}
        onToggle={controls.toggleMuscleGroup}
      />

      <FilterChipGroup
        title="器械"
        accessibilityLabelPrefix="按器械筛选"
        options={EQUIPMENT_TYPES}
        selectedValues={controls.filters.equipment}
        formatLabel={formatEquipment}
        onToggle={controls.toggleEquipment}
      />

      {controls.hasActiveFilters && (
        <Pressable
          onPress={controls.clearFilters}
          accessibilityRole="button"
          accessibilityLabel="清除搜索和筛选条件"
          style={({ pressed }) => [
            styles.clearButton,
            { borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">清除筛选</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

function FilterChipGroup<T extends MuscleGroup | Equipment>({
  title,
  accessibilityLabelPrefix,
  options,
  selectedValues,
  formatLabel,
  onToggle,
}: {
  readonly title: string;
  readonly accessibilityLabelPrefix: string;
  readonly options: readonly T[];
  readonly selectedValues: readonly T[];
  readonly formatLabel: (value: T) => string;
  readonly onToggle: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.filterGroup}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.filterChips}
      >
        {options.map((option) => {
          const label = formatLabel(option);
          const isSelected = selectedValues.includes(option);

          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${accessibilityLabelPrefix}：${label}`}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
                  borderColor: isSelected
                    ? theme.text
                    : theme.backgroundSelected,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                themeColor={isSelected ? 'text' : 'textSecondary'}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
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

function NoResultsState({
  onClearFilters,
}: {
  readonly onClearFilters: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.feedbackState}>
      <ThemedText type="default">没有找到匹配动作</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        换个关键词，或清除筛选后再试。
      </ThemedText>
      <Pressable
        onPress={onClearFilters}
        accessibilityRole="button"
        accessibilityLabel="清除搜索和筛选条件"
        style={({ pressed }) => [
          styles.clearButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">清除筛选</ThemedText>
      </Pressable>
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
      keyboardShouldPersistTaps="handled"
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
  controls: {
    gap: Spacing.two,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  filterGroup: {
    gap: Spacing.one,
  },
  filterChips: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  filterChip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  clearButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
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
