import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type Exercise,
} from '@/domain/exercise';
import {
  formatEquipment,
  formatMuscleGroup,
} from '@/features/exercise-library/components/exercise-labels';
import {
  createExerciseSelectionResultParams,
  isExerciseAlreadySelected,
  parseExerciseLibrarySelectionMode,
  type ExerciseLibrarySelectionMode,
} from '@/features/exercise-library/application/exercise-selection-flow';
import {
  useExerciseLibrary,
  type ExerciseLibraryScreenControls,
  type ExerciseLibraryScreenState,
} from '@/features/exercise-library/application/use-exercise-library';
import { useTheme } from '@/hooks/use-theme';

export function ExerciseLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string | string[];
    context?: string | string[];
    returnTo?: string | string[];
    returnParams?: string | string[];
    selectedIds?: string | string[];
  }>();
  const selectionMode = parseExerciseLibrarySelectionMode(params);

  return (
    <ExerciseLibraryContent
      {...useExerciseLibrary()}
      selectionMode={selectionMode}
      onOpenExercise={(exercise) => {
        router.push({
          pathname: '/exercises/[id]',
          params: { id: exercise.id },
        });
      }}
      onSelectExercise={(exercise) => {
        if (
          selectionMode.status !== 'selecting' ||
          isExerciseAlreadySelected(selectionMode, exercise.id)
        ) {
          return;
        }

        router.dismissTo({
          pathname: selectionMode.returnTo,
          params: {
            ...selectionMode.returnParams,
            ...createExerciseSelectionResultParams(
              selectionMode.context,
              exercise.id,
            ),
          },
        } as Href);
      }}
      onCancelSelection={() => {
        if (selectionMode.status === 'selecting') {
          router.dismissTo({
            pathname: selectionMode.returnTo,
            params: selectionMode.returnParams,
          } as Href);
          return;
        }

        router.replace('/exercises');
      }}
    />
  );
}

export type ExerciseLibraryContentProps = {
  readonly state: ExerciseLibraryScreenState;
  readonly controls: ExerciseLibraryScreenControls;
  readonly selectionMode: ExerciseLibrarySelectionMode;
  readonly onOpenExercise: (exercise: Exercise) => void;
  readonly onSelectExercise: (exercise: Exercise) => void;
  readonly onCancelSelection: () => void;
};

export function ExerciseLibraryContent({
  state,
  controls,
  selectionMode,
  onOpenExercise,
  onSelectExercise,
  onCancelSelection,
}: ExerciseLibraryContentProps) {
  const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(
    null,
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          {selectionMode.status === 'selecting' && (
            <SelectionBanner
              selectionMode={selectionMode}
              onCancelSelection={onCancelSelection}
            />
          )}
          {selectionMode.status === 'invalid' && (
            <InvalidSelectionState
              message={selectionMode.message}
              onCancelSelection={onCancelSelection}
            />
          )}
          {state.status === 'loading' && <LoadingState />}
          {state.status === 'empty' && <EmptyState />}
          {state.status === 'error' && <ErrorState message={state.message} />}
          {state.status === 'ready' && (
            <ExerciseLibraryReadyState
              controls={controls}
              exercises={state.exercises}
              selectionMode={selectionMode}
              unsupportedMessage={unsupportedMessage}
              onOpenExercise={onOpenExercise}
              onSelectExercise={onSelectExercise}
              onUnsupportedCustomExercise={() => {
                setUnsupportedMessage('当前版本暂不支持自定义动作。');
              }}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SelectionBanner({
  selectionMode,
  onCancelSelection,
}: {
  readonly selectionMode: Extract<
    ExerciseLibrarySelectionMode,
    { readonly status: 'selecting' }
  >;
  readonly onCancelSelection: () => void;
}) {
  const theme = useTheme();
  const contextLabel =
    selectionMode.context === 'template' ? '训练模板' : '今日训练';
  const title = `为${contextLabel}选择动作`;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.selectionBanner,
        { borderColor: theme.backgroundSelected },
      ]}
    >
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        选择一个标准动作返回来源页面。
      </ThemedText>
      <Pressable
        onPress={onCancelSelection}
        accessibilityRole="button"
        accessibilityLabel="取消动作选择"
        style={({ pressed }) => [
          styles.clearButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">取消</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function InvalidSelectionState({
  message,
  onCancelSelection,
}: {
  readonly message: string;
  readonly onCancelSelection: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.selectionBanner,
        { borderColor: theme.backgroundSelected },
      ]}
      accessibilityRole="alert"
    >
      <ThemedText type="smallBold">无法进入选择模式</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
      <Pressable
        onPress={onCancelSelection}
        accessibilityRole="button"
        accessibilityLabel="返回动作库浏览模式"
        style={({ pressed }) => [
          styles.clearButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">返回动作库</ThemedText>
      </Pressable>
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

function ExerciseLibraryReadyState({
  controls,
  exercises,
  selectionMode,
  unsupportedMessage,
  onOpenExercise,
  onSelectExercise,
  onUnsupportedCustomExercise,
}: {
  readonly controls: ExerciseLibraryScreenControls;
  readonly exercises: readonly Exercise[];
  readonly selectionMode: ExerciseLibrarySelectionMode;
  readonly unsupportedMessage: string | null;
  readonly onOpenExercise: (exercise: Exercise) => void;
  readonly onSelectExercise: (exercise: Exercise) => void;
  readonly onUnsupportedCustomExercise: () => void;
}) {
  const selectedMuscleGroup = controls.filters.muscleGroups[0];

  return (
    <View style={styles.libraryShell}>
      <ExerciseLibraryTopBar
        controls={controls}
        unsupportedMessage={unsupportedMessage}
        onUnsupportedCustomExercise={onUnsupportedCustomExercise}
      />
      <View style={styles.libraryBody}>
        <MuscleGroupRail controls={controls} />
        <View style={styles.resultsPane}>
          <EquipmentChips controls={controls} />
          <ThemedText type="title" style={styles.resultsTitle}>
            {selectedMuscleGroup
              ? `${formatMuscleGroup(selectedMuscleGroup)}动作`
              : '全部动作'}
          </ThemedText>
          {exercises.length > 0 ? (
            <ExerciseList
              exercises={exercises}
              selectionMode={selectionMode}
              onOpenExercise={onOpenExercise}
              onSelectExercise={onSelectExercise}
            />
          ) : (
            <NoResultsState onClearFilters={controls.clearFilters} />
          )}
        </View>
      </View>
    </View>
  );
}

function ExerciseLibraryTopBar({
  controls,
  unsupportedMessage,
  onUnsupportedCustomExercise,
}: {
  readonly controls: ExerciseLibraryScreenControls;
  readonly unsupportedMessage: string | null;
  readonly onUnsupportedCustomExercise: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.topControls}>
      <View style={styles.searchWrap}>
        <TextInput
          value={controls.filters.queryText}
          onChangeText={controls.updateQuery}
          placeholder="输入动作名字搜索"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          accessibilityLabel="搜索动作"
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.backgroundElement,
              color: theme.text,
            },
          ]}
        />
        {controls.hasActiveFilters && (
          <Pressable
            onPress={controls.clearFilters}
            accessibilityRole="button"
            accessibilityLabel="清除搜索和筛选条件"
            style={({ pressed }) => [
              styles.inlineClearButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              清除
            </ThemedText>
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={onUnsupportedCustomExercise}
        accessibilityRole="button"
        accessibilityLabel="创建自定义动作"
        style={({ pressed }) => [
          styles.addExerciseButton,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="title" style={styles.addExerciseText}>
          +
        </ThemedText>
      </Pressable>
      {unsupportedMessage && (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          accessibilityRole="alert"
          style={styles.unsupportedText}
        >
          {unsupportedMessage}
        </ThemedText>
      )}
    </View>
  );
}

function MuscleGroupRail({
  controls,
}: {
  readonly controls: ExerciseLibraryScreenControls;
}) {
  return (
    <ScrollView
      style={styles.muscleRail}
      contentContainerStyle={styles.muscleRailContent}
      showsVerticalScrollIndicator={false}
    >
      {MUSCLE_GROUPS.map((muscleGroup) => {
        const label = formatMuscleGroup(muscleGroup);
        const isSelected = controls.filters.muscleGroups.includes(muscleGroup);

        return (
          <Pressable
            key={muscleGroup}
            onPress={() => controls.toggleMuscleGroup(muscleGroup)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`按肌群筛选：${label}`}
            style={({ pressed }) => [
              styles.muscleRailItem,
              isSelected && styles.muscleRailItemSelected,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="default"
              themeColor={isSelected ? 'text' : 'textSecondary'}
              style={styles.muscleRailText}
            >
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function EquipmentChips({
  controls,
}: {
  readonly controls: ExerciseLibraryScreenControls;
}) {
  const theme = useTheme();

  return (
    <View style={styles.equipmentSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.filterChips}
      >
        {EQUIPMENT_TYPES.map((equipment) => {
          const label = formatEquipment(equipment);
          const isSelected = controls.filters.equipment.includes(equipment);

          return (
            <Pressable
              key={equipment}
              onPress={() => controls.toggleEquipment(equipment)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`按器械筛选：${label}`}
              style={({ pressed }) => [
                styles.filterChip,
                isSelected && styles.filterChipSelected,
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
    </View>
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
  selectionMode,
  onOpenExercise,
  onSelectExercise,
}: {
  readonly exercises: readonly Exercise[];
  readonly selectionMode: ExerciseLibrarySelectionMode;
  readonly onOpenExercise: (exercise: Exercise) => void;
  readonly onSelectExercise: (exercise: Exercise) => void;
}) {
  return (
    <FlatList
      data={exercises}
      numColumns={2}
      keyExtractor={(exercise) => exercise.id}
      renderItem={({ item }) => (
        <ExerciseCard
          exercise={item}
          onPress={onOpenExercise}
          action={getExerciseRowSelectionAction(
            item,
            selectionMode,
            onSelectExercise,
          )}
        />
      )}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.listColumns}
      ItemSeparatorComponent={ListSeparator}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={8}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel="动作列表"
    />
  );
}

function ExerciseCard({
  exercise,
  onPress,
  action,
}: {
  readonly exercise: Exercise;
  readonly onPress: (exercise: Exercise) => void;
  readonly action?: ReturnType<typeof getExerciseRowSelectionAction>;
}) {
  const muscleGroup = formatMuscleGroup(exercise.primaryMuscleGroup);
  const equipment = formatEquipment(exercise.equipment);

  return (
    <ThemedView type="backgroundElement" style={styles.exerciseCard}>
      <Pressable
        onPress={() => onPress(exercise)}
        accessibilityRole="button"
        accessibilityLabel={`查看${exercise.nameZh}详情，${muscleGroup}，${equipment}`}
        style={({ pressed }) => [
          styles.exerciseCardPressable,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.exerciseImageFrame}>
          {exercise.imageUri ? (
            <Image
              source={{ uri: exercise.imageUri }}
              accessibilityIgnoresInvertColors
              style={styles.exerciseImage}
            />
          ) : (
            <ThemedText type="title" style={styles.exerciseImageInitial}>
              {exercise.nameZh.slice(0, 1)}
            </ThemedText>
          )}
          <ThemedText type="smallBold" style={styles.imageBadge}>
            讲解
          </ThemedText>
        </View>
        <ThemedText type="default" style={styles.exerciseCardTitle}>
          {exercise.nameZh}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.attributes}
        >
          {muscleGroup} · {equipment}
        </ThemedText>
      </Pressable>
      {action && (
        <Pressable
          disabled={action.disabled}
          onPress={() => action.onPress(exercise)}
          accessibilityRole="button"
          accessibilityState={{ disabled: action.disabled ?? false }}
          accessibilityLabel={action.accessibilityLabel}
          style={({ pressed }) => [
            styles.exerciseActionButton,
            pressed && !action.disabled && styles.pressed,
            action.disabled && styles.disabled,
          ]}
        >
          <ThemedText type="smallBold">{action.label}</ThemedText>
        </Pressable>
      )}
      {action?.disabledHint && (
        <ThemedText type="small" themeColor="textSecondary">
          {action.disabledHint}
        </ThemedText>
      )}
    </ThemedView>
  );
}

function getExerciseRowSelectionAction(
  exercise: Exercise,
  selectionMode: ExerciseLibrarySelectionMode,
  onSelectExercise: (exercise: Exercise) => void,
) {
  if (selectionMode.status !== 'selecting') {
    return undefined;
  }

  const alreadySelected = isExerciseAlreadySelected(selectionMode, exercise.id);

  return {
    label: alreadySelected ? '已添加' : '添加',
    accessibilityLabel: alreadySelected
      ? `${exercise.nameZh}已添加，不能重复选择`
      : `添加${exercise.nameZh}`,
    disabled: alreadySelected,
    disabledHint: alreadySelected ? '已添加，不能重复选择。' : undefined,
    onPress: onSelectExercise,
  };
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
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  selectionBanner: {
    gap: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginHorizontal: Spacing.four,
  },
  libraryShell: { flex: 1, gap: Spacing.three },
  topControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  searchWrap: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    minHeight: 72,
    minWidth: 0,
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  inlineClearButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  addExerciseButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: '#E6F0FF',
  },
  addExerciseText: {
    color: '#1677EF',
    fontSize: 48,
    lineHeight: 54,
  },
  unsupportedText: {
    width: '100%',
    paddingLeft: Spacing.one,
  },
  libraryBody: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0DDD4',
  },
  muscleRail: {
    width: 118,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E0DDD4',
  },
  muscleRailContent: {
    paddingVertical: Spacing.two,
  },
  muscleRailItem: {
    minHeight: 64,
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingHorizontal: Spacing.three,
  },
  muscleRailItemSelected: {
    borderLeftColor: '#1677EF',
  },
  muscleRailText: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 26,
  },
  resultsPane: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  equipmentSection: {
    gap: Spacing.one,
  },
  filterChips: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  filterChip: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterChipSelected: {
    backgroundColor: '#E6F0FF',
  },
  resultsTitle: {
    fontSize: 46,
    lineHeight: 54,
  },
  listColumns: {
    gap: Spacing.two,
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
  exerciseCard: {
    flex: 1,
    minHeight: 286,
    gap: Spacing.two,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: Spacing.two,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseCardPressable: {
    gap: Spacing.one,
  },
  exerciseImageFrame: {
    height: 176,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#DCE9AD',
  },
  exerciseImage: {
    ...StyleSheet.absoluteFill,
  },
  exerciseImageInitial: {
    color: 'rgba(27, 32, 22, 0.28)',
    fontSize: 96,
    lineHeight: 104,
    padding: Spacing.two,
  },
  imageBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderBottomRightRadius: 12,
    backgroundColor: '#1677EF',
    color: '#FFFFFF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  exerciseCardTitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  attributes: {
    flexShrink: 1,
  },
  exerciseActionButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#E8F6B8',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
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
