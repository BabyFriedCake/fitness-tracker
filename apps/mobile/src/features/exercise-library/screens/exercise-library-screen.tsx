import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRef } from 'react';
import { Image } from 'expo-image';
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
import { resolveExerciseImageSource } from '../../../assets/exercise-media';

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
  const content = (
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

  if (selectionMode.status !== 'selecting') {
    return content;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        router.dismissTo({
          pathname: selectionMode.returnTo,
          params: selectionMode.returnParams,
        } as Href);
      }}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭动作选择弹层"
          onPress={() => {
            router.dismissTo({
              pathname: selectionMode.returnTo,
              params: selectionMode.returnParams,
            } as Href);
          }}
          style={styles.sheetScrim}
        />
        <View style={styles.sheetPanel}>
          <View style={styles.selectionSheetHeader}>
            <Pressable
              onPress={() => {
                router.dismissTo({
                  pathname: selectionMode.returnTo,
                  params: selectionMode.returnParams,
                } as Href);
              }}
              accessibilityRole="button"
              accessibilityLabel="关闭动作选择"
              style={({ pressed }) => [
                styles.selectionCloseButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="default" style={styles.selectionCloseText}>
                ×
              </ThemedText>
            </Pressable>
          </View>
          {content}
        </View>
      </View>
    </Modal>
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
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
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
              onOpenExercise={onOpenExercise}
              onSelectExercise={onSelectExercise}
            />
          )}
        </ThemedView>
      </SafeAreaView>
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
  onOpenExercise,
  onSelectExercise,
}: {
  readonly controls: ExerciseLibraryScreenControls;
  readonly exercises: readonly Exercise[];
  readonly selectionMode: ExerciseLibrarySelectionMode;
  readonly onOpenExercise: (exercise: Exercise) => void;
  readonly onSelectExercise: (exercise: Exercise) => void;
}) {
  const exerciseListRef = useRef<FlatList<Exercise>>(null);

  return (
    <View style={styles.libraryShell}>
      <ExerciseLibraryTopBar controls={controls} />
      <View style={styles.libraryBody}>
        <MuscleGroupRail
          controls={controls}
          onSelectMuscleGroup={() => {
            exerciseListRef.current?.scrollToOffset({
              offset: 0,
              animated: true,
            });
          }}
        />
        <View style={styles.resultsPane}>
          <EquipmentChips controls={controls} />
          {exercises.length > 0 ? (
            <ExerciseList
              exercises={exercises}
              selectionMode={selectionMode}
              listRef={exerciseListRef}
              onOpenExercise={onOpenExercise}
              onSelectExercise={onSelectExercise}
            />
          ) : (
            <NoResultsState />
          )}
        </View>
      </View>
    </View>
  );
}

function ExerciseLibraryTopBar({
  controls,
}: {
  readonly controls: ExerciseLibraryScreenControls;
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
              color: theme.text,
            },
          ]}
        />
      </View>
    </View>
  );
}

function MuscleGroupRail({
  controls,
  onSelectMuscleGroup,
}: {
  readonly controls: ExerciseLibraryScreenControls;
  readonly onSelectMuscleGroup: () => void;
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
            onPress={() => {
              controls.toggleMuscleGroup(muscleGroup);
              onSelectMuscleGroup();
            }}
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
              type={isSelected ? 'smallBold' : 'default'}
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

function NoResultsState() {
  return (
    <ThemedView style={styles.feedbackState}>
      <ThemedText type="default">没有找到匹配动作</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        换个关键词，或调整当前筛选条件后再试。
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
  selectionMode,
  listRef,
  onOpenExercise,
  onSelectExercise,
}: {
  readonly exercises: readonly Exercise[];
  readonly selectionMode: ExerciseLibrarySelectionMode;
  readonly listRef: React.RefObject<FlatList<Exercise> | null>;
  readonly onOpenExercise: (exercise: Exercise) => void;
  readonly onSelectExercise: (exercise: Exercise) => void;
}) {
  return (
    <FlatList
      ref={listRef}
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
          <Image
            source={resolveExerciseImageSource(exercise.imageUri)}
            contentFit="cover"
            accessibilityIgnoresInvertColors
            accessibilityLabel={`${exercise.nameZh}动作图片`}
            style={styles.exerciseImage}
          />
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
          <ThemedText
            type="smallBold"
            style={action.disabled ? undefined : styles.exerciseActionText}
          >
            {action.label}
          </ThemedText>
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
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetPanel: {
    height: '86%',
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    backgroundColor: '#F8F6FC',
    overflow: 'hidden',
  },
  selectionSheetHeader: {
    height: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  selectionCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  selectionCloseText: { color: '#6D3DF5', fontSize: 28, lineHeight: 32 },
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  searchWrap: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    minHeight: 40,
    minWidth: 0,
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.three,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  libraryBody: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4DDF1',
    backgroundColor: '#F8F6FC',
  },
  muscleRail: {
    width: 84,
    flexGrow: 0,
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E4DDF1',
    backgroundColor: '#F3EEFC',
  },
  muscleRailContent: {
    paddingVertical: Spacing.two,
  },
  muscleRailItem: {
    minHeight: 50,
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingHorizontal: Spacing.three,
  },
  muscleRailItemSelected: {
    borderLeftColor: '#6D3DF5',
    backgroundColor: '#F1EBFF',
  },
  muscleRailText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
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
    backgroundColor: '#F1EBFF',
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
    // minHeight: 186,
    gap: Spacing.two,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: Spacing.two,
    shadowColor: '#6D3DF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  exerciseCardPressable: {
    gap: Spacing.one,
  },
  exerciseImageFrame: {
    height: 176,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#EEE7FF',
  },
  exerciseImage: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: '#6D3DF5',
    color: '#FFFFFF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  exerciseCardTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  attributes: {
    flexShrink: 1,
  },
  exerciseActionButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#6D3DF5',
    paddingHorizontal: Spacing.two,
  },
  exerciseActionText: {
    color: '#FFFFFF',
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
