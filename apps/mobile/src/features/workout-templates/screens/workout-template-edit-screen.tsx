import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { useNavigation, useRouter, type Href } from 'expo-router';
import {
  usePreventRemove,
  type NavigationAction,
} from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  formatEquipment,
  formatMuscleGroup,
} from '@/features/exercise-library/components/exercise-labels';
import {
  useWorkoutTemplateEdit,
  type WorkoutTemplateEditDraftState,
  type WorkoutTemplateEditScreenControls,
  type WorkoutTemplateEditScreenState,
} from '@/features/workout-templates/application/use-workout-template-edit';
import type { WorkoutTemplateEditRouteParams } from '@/features/workout-templates/application/workout-template-edit-route-params';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutTemplateEditScreen({
  routeParams,
}: {
  readonly routeParams: WorkoutTemplateEditRouteParams;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const model = useWorkoutTemplateEdit(routeParams);
  const pendingNavigationActionRef = useRef<NavigationAction | null>(null);
  const isArchiveComplete =
    model.state.status === 'ready' && model.state.isArchiveComplete;

  usePreventRemove(model.controls.shouldConfirmExit(), ({ data }) => {
    if (
      model.state.status === 'ready' &&
      (model.state.isSaving || model.state.isArchiving)
    ) {
      return;
    }

    pendingNavigationActionRef.current = data.action;
    model.controls.requestExit();
  });

  useEffect(() => {
    if (!model.state.isSaved && !isArchiveComplete) {
      return;
    }

    router.dismissTo('/templates');
  }, [isArchiveComplete, model.state.isSaved, router]);

  useEffect(() => {
    if (!model.state.isExitAuthorized) {
      return;
    }

    const pendingAction = pendingNavigationActionRef.current;
    pendingNavigationActionRef.current = null;

    if (pendingAction) {
      navigation.dispatch(pendingAction);
      return;
    }

    router.back();
  }, [model.state.isExitAuthorized, navigation, router]);

  return (
    <WorkoutTemplateEditContent
      {...model}
      onAddExercise={(href) => {
        router.push(href);
      }}
      onExit={() => {
        router.back();
      }}
      onCancelExit={() => {
        pendingNavigationActionRef.current = null;
        model.controls.cancelExit();
      }}
      onConfirmExit={() => {
        model.controls.confirmExit();
      }}
    />
  );
}

export type WorkoutTemplateEditContentProps = {
  readonly state: WorkoutTemplateEditScreenState;
  readonly controls: WorkoutTemplateEditScreenControls;
  readonly onAddExercise: (href: Href) => void;
  readonly onExit: () => void;
  readonly onCancelExit: () => void;
  readonly onConfirmExit: () => void;
};

export function WorkoutTemplateEditContent({
  state,
  controls,
  onAddExercise,
  onExit,
  onCancelExit,
  onConfirmExit,
}: WorkoutTemplateEditContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <Header
            isBusy={
              state.status === 'ready' && (state.isSaving || state.isArchiving)
            }
            onCancel={() => {
              if (controls.requestExit()) {
                onExit();
              }
            }}
          />

          {state.status === 'loading' && <LoadingState />}
          {state.status === 'error' && (
            <ErrorState message={state.message} onReload={controls.reload} />
          )}
          {state.status === 'notFound' && (
            <ErrorState message={state.message} onReload={controls.reload} />
          )}
          {state.status === 'ready' && (
            <EditForm
              state={state}
              controls={controls}
              onAddExercise={onAddExercise}
            />
          )}
          {state.status === 'ready' && state.pendingRemoveExerciseId && (
            <RemoveExerciseModal
              onCancel={controls.cancelRemoveExercise}
              onConfirm={controls.confirmRemoveExercise}
            />
          )}
          {state.status === 'ready' && state.isConfirmingArchive && (
            <ArchiveTemplateModal
              isArchiving={state.isArchiving}
              hasUnsavedChanges={controls.shouldConfirmExit()}
              onCancel={controls.cancelArchive}
              onConfirm={controls.confirmArchive}
            />
          )}
          {state.isConfirmingDiscard && (
            <DiscardConfirmModal
              onCancel={onCancelExit}
              onConfirm={onConfirmExit}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Header({
  isBusy,
  onCancel,
}: {
  readonly isBusy: boolean;
  readonly onCancel: () => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.header}>
      <ThemedView style={styles.headerCopy}>
        <ThemedText type="small" themeColor="textSecondary">
          编辑模板
        </ThemedText>
        <ThemedText type="title">训练模板</ThemedText>
      </ThemedView>
      <Pressable
        disabled={isBusy}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy }}
        accessibilityLabel="退出编辑训练模板"
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            borderColor: theme.backgroundSelected,
            opacity: isBusy ? 0.56 : 1,
          },
          pressed && !isBusy && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">← 取消</ThemedText>
      </Pressable>
    </ThemedView>
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
        accessibilityLabel="重新加载训练模板编辑页"
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">重新加载</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function EditForm({
  state,
  controls,
  onAddExercise,
}: {
  readonly state: Extract<
    WorkoutTemplateEditScreenState,
    { readonly status: 'ready' }
  >;
  readonly controls: WorkoutTemplateEditScreenControls;
  readonly onAddExercise: (href: Href) => void;
}) {
  const theme = useTheme();
  const isArchived = state.templateStatus === 'archived';
  const isExerciseLoading = state.draft.exerciseLoadStatus === 'loading';
  const isFormDisabled =
    isArchived ||
    state.isSaving ||
    state.isArchiving ||
    state.isConfirmingArchive;
  const isSaveDisabled =
    state.isSaving ||
    state.isArchiving ||
    state.isConfirmingArchive ||
    isExerciseLoading ||
    isArchived;
  const isArchiveDisabled = isFormDisabled;

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.formContent}
      >
        {isArchived && (
          <ThemedView
            type="backgroundElement"
            style={[styles.banner, { borderColor: theme.backgroundSelected }]}
            accessibilityRole="alert"
          >
            <ThemedText type="smallBold">已归档模板不能编辑</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              当前模板仅可查看，不会影响历史训练记录。
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">名称</ThemedText>
          <TextInput
            value={state.draft.name}
            onChangeText={controls.updateName}
            editable={!isFormDisabled}
            placeholder="例如 Push"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="训练模板名称"
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
                opacity: isFormDisabled ? 0.64 : 1,
              },
            ]}
          />
          {state.fieldErrors.name && (
            <ThemedText type="small" themeColor="textSecondary">
              {state.fieldErrors.name}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">描述</ThemedText>
          <TextInput
            value={state.draft.description}
            onChangeText={controls.updateDescription}
            editable={!isFormDisabled}
            placeholder="例如 胸肩三头"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="训练模板描述"
            multiline
            style={[
              styles.textArea,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
                opacity: isFormDisabled ? 0.64 : 1,
              },
            ]}
          />
        </ThemedView>

        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle">训练动作</ThemedText>
          <Pressable
            disabled={isFormDisabled}
            onPress={() =>
              onAddExercise(controls.createExerciseSelectionHref())
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: isFormDisabled }}
            accessibilityLabel="从动作库添加动作"
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.backgroundSelected,
                opacity: isFormDisabled ? 0.56 : 1,
              },
              pressed && !isFormDisabled && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">+ 从动作库添加</ThemedText>
          </Pressable>
        </ThemedView>

        {isExerciseLoading && (
          <ThemedView style={styles.inlineLoading}>
            <ActivityIndicator />
            <ThemedText type="small" themeColor="textSecondary">
              正在加载模板动作
            </ThemedText>
          </ThemedView>
        )}

        {state.draft.exercises.length > 0 ? (
          <ExerciseEditorList
            draft={state.draft}
            controls={controls}
            disabled={isFormDisabled}
            fieldErrors={state.fieldErrors}
          />
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[
              styles.emptyExerciseState,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText type="default">还没有添加动作</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              至少保留一个动作后才能保存模板。
            </ThemedText>
          </ThemedView>
        )}

        {state.fieldErrors.exercises && (
          <ThemedText type="small" themeColor="textSecondary">
            {state.fieldErrors.exercises}
          </ThemedText>
        )}
        {state.saveError && (
          <ThemedView style={styles.inlineError} accessibilityRole="alert">
            <ThemedText type="smallBold">训练模板保存失败</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {state.saveError}
            </ThemedText>
          </ThemedView>
        )}
        {state.archiveError && (
          <ThemedView style={styles.inlineError} accessibilityRole="alert">
            <ThemedText type="smallBold">训练模板归档失败</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {state.archiveError}
            </ThemedText>
          </ThemedView>
        )}
        {!isArchived && (
          <ThemedView style={styles.archiveSection}>
            <ThemedText type="smallBold">归档</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              不再使用的模板可以归档，历史训练记录不会被删除。
            </ThemedText>
            <Pressable
              disabled={isArchiveDisabled}
              onPress={controls.requestArchive}
              accessibilityRole="button"
              accessibilityState={{ disabled: isArchiveDisabled }}
              accessibilityLabel="归档训练模板"
              style={({ pressed }) => [
                styles.dangerButton,
                {
                  borderColor: theme.backgroundSelected,
                  opacity: isArchiveDisabled ? 0.56 : 1,
                },
                pressed && !isArchiveDisabled && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">归档模板</ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </ScrollView>

      <Pressable
        disabled={isSaveDisabled}
        onPress={async () => {
          await controls.save();
        }}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaveDisabled }}
        accessibilityLabel={
          state.isSaving
            ? '正在保存训练模板'
            : state.isArchiving
              ? '正在归档训练模板'
              : isExerciseLoading
                ? '正在加载模板动作'
                : isArchived
                  ? '已归档模板不能保存'
                  : '保存训练模板'
        }
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: theme.text,
            opacity: isSaveDisabled ? 0.56 : 1,
          },
          pressed && !isSaveDisabled && styles.pressed,
        ]}
      >
        <ThemedText
          type="smallBold"
          style={[styles.primaryButtonText, { color: theme.background }]}
        >
          {state.isSaving
            ? '保存中'
            : state.isArchiving
              ? '归档中'
              : isExerciseLoading
                ? '加载动作中'
                : '保存模板'}
        </ThemedText>
      </Pressable>
    </>
  );
}

function ExerciseEditorList({
  draft,
  controls,
  disabled,
  fieldErrors,
}: {
  readonly draft: WorkoutTemplateEditDraftState;
  readonly controls: WorkoutTemplateEditScreenControls;
  readonly disabled: boolean;
  readonly fieldErrors: {
    readonly exerciseConfigs?: Readonly<Record<string, string>>;
  };
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.exerciseList}>
      {draft.exercises.map((exercise, index) => (
        <ThemedView
          key={exercise.exerciseId}
          type="backgroundElement"
          style={[
            styles.exerciseCard,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          <ThemedView style={styles.exerciseHeader}>
            <ThemedView style={styles.exerciseCopy}>
              <ThemedText type="small" themeColor="textSecondary">
                ⋮⋮
              </ThemedText>
              <ThemedText type="default">
                {exercise.exercise?.nameZh ?? '动作信息缺失'}
              </ThemedText>
              {exercise.exercise && (
                <ThemedText type="small" themeColor="textSecondary">
                  {formatMuscleGroup(exercise.exercise.primaryMuscleGroup)} ·{' '}
                  {formatEquipment(exercise.exercise.equipment)}
                </ThemedText>
              )}
            </ThemedView>
            <ThemedView style={styles.exerciseActions}>
              <ExerciseActionButton
                label="上移"
                accessibilityLabel={`上移动作${exercise.exercise?.nameZh ?? exercise.exerciseId}`}
                disabled={disabled || index === 0}
                onPress={() => controls.moveExerciseUp(exercise.exerciseId)}
              />
              <ExerciseActionButton
                label="下移"
                accessibilityLabel={`下移动作${exercise.exercise?.nameZh ?? exercise.exerciseId}`}
                disabled={disabled || index === draft.exercises.length - 1}
                onPress={() => controls.moveExerciseDown(exercise.exerciseId)}
              />
              <ExerciseActionButton
                label="删除"
                accessibilityLabel={`移除动作${exercise.exercise?.nameZh ?? exercise.exerciseId}`}
                disabled={disabled}
                variant="danger"
                onPress={() =>
                  controls.requestRemoveExercise(exercise.exerciseId)
                }
              />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.configGrid}>
            <ConfigInput
              label="组数"
              value={String(exercise.targetSets)}
              disabled={disabled}
              accessibilityLabel={`修改${exercise.exercise?.nameZh ?? exercise.exerciseId}目标组数`}
              onChangeText={(value) =>
                controls.updateExerciseConfig(
                  exercise.exerciseId,
                  'targetSets',
                  value,
                )
              }
            />
            <ConfigInput
              label="最小"
              value={String(exercise.targetRepsMin)}
              disabled={disabled}
              accessibilityLabel={`修改${exercise.exercise?.nameZh ?? exercise.exerciseId}最小次数`}
              onChangeText={(value) =>
                controls.updateExerciseConfig(
                  exercise.exerciseId,
                  'targetRepsMin',
                  value,
                )
              }
            />
            <ConfigInput
              label="最大"
              value={String(exercise.targetRepsMax)}
              disabled={disabled}
              accessibilityLabel={`修改${exercise.exercise?.nameZh ?? exercise.exerciseId}最大次数`}
              onChangeText={(value) =>
                controls.updateExerciseConfig(
                  exercise.exerciseId,
                  'targetRepsMax',
                  value,
                )
              }
            />
            <ConfigInput
              label="休息"
              value={String(exercise.restSeconds)}
              disabled={disabled}
              accessibilityLabel={`修改${exercise.exercise?.nameZh ?? exercise.exerciseId}休息时间`}
              onChangeText={(value) =>
                controls.updateExerciseConfig(
                  exercise.exerciseId,
                  'restSeconds',
                  value,
                )
              }
            />
          </ThemedView>

          {fieldErrors.exerciseConfigs?.[exercise.exerciseId] && (
            <ThemedText type="small" themeColor="textSecondary">
              {fieldErrors.exerciseConfigs[exercise.exerciseId]}
            </ThemedText>
          )}
        </ThemedView>
      ))}
    </ThemedView>
  );
}

function ExerciseActionButton({
  label,
  accessibilityLabel,
  disabled,
  variant = 'secondary',
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled: boolean;
  readonly variant?: 'secondary' | 'danger';
  readonly onPress: () => void;
}) {
  const theme = useTheme();
  const buttonStyle =
    variant === 'danger' ? styles.dangerButton : styles.secondaryButton;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        buttonStyle,
        {
          borderColor: theme.backgroundSelected,
          opacity: disabled ? 0.56 : 1,
        },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function ConfigInput({
  label,
  value,
  disabled,
  accessibilityLabel,
  onChangeText,
}: {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly accessibilityLabel: string;
  readonly onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.configField}>
      <ThemedText type="small">{label}</ThemedText>
      <TextInput
        value={value}
        editable={!disabled}
        keyboardType="number-pad"
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.configInput,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            color: theme.text,
            opacity: disabled ? 0.64 : 1,
          },
        ]}
      />
    </ThemedView>
  );
}

function RemoveExerciseModal({
  onCancel,
  onConfirm,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <ConfirmModal
      title="移除模板动作？"
      message="只会从当前模板移除，不会删除动作库中的标准动作。"
      confirmLabel="移除动作"
      confirmAccessibilityLabel="确认移除模板动作"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function DiscardConfirmModal({
  onCancel,
  onConfirm,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <ConfirmModal
      title="放弃编辑模板？"
      message="当前修改不会保存。"
      confirmLabel="放弃编辑"
      confirmAccessibilityLabel="放弃编辑训练模板"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function ArchiveTemplateModal({
  isArchiving,
  hasUnsavedChanges,
  onCancel,
  onConfirm,
}: {
  readonly isArchiving: boolean;
  readonly hasUnsavedChanges: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmModal
      title="归档训练模板？"
      message={
        hasUnsavedChanges
          ? '当前未保存修改不会保存。归档后默认列表将不再显示该模板，历史训练记录不会被删除。'
          : '归档后默认列表将不再显示该模板，历史训练记录不会被删除。'
      }
      confirmLabel={isArchiving ? '归档中' : '归档模板'}
      confirmAccessibilityLabel={
        isArchiving ? '正在归档训练模板' : '确认归档训练模板'
      }
      confirmDisabled={isArchiving}
      cancelDisabled={isArchiving}
      onCancel={onCancel}
      onConfirm={() => {
        void onConfirm();
      }}
    />
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmAccessibilityLabel,
  confirmDisabled = false,
  cancelDisabled = false,
  onCancel,
  onConfirm,
}: {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly confirmAccessibilityLabel: string;
  readonly confirmDisabled?: boolean;
  readonly cancelDisabled?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible transparent animationType="fade">
      <ThemedView style={styles.modalScrim}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.modalContent,
            { borderColor: theme.backgroundSelected },
          ]}
          accessibilityRole="alert"
        >
          <ThemedText type="default">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          <ThemedView style={styles.modalActions}>
            <Pressable
              disabled={cancelDisabled}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityState={{ disabled: cancelDisabled }}
              accessibilityLabel="继续编辑训练模板"
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: theme.backgroundSelected,
                  opacity: cancelDisabled ? 0.56 : 1,
                },
                pressed && !cancelDisabled && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">继续编辑</ThemedText>
            </Pressable>
            <Pressable
              disabled={confirmDisabled}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityState={{ disabled: confirmDisabled }}
              accessibilityLabel={confirmAccessibilityLabel}
              style={({ pressed }) => [
                styles.dangerButton,
                {
                  borderColor: theme.backgroundSelected,
                  opacity: confirmDisabled ? 0.56 : 1,
                },
                pressed && !confirmDisabled && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">{confirmLabel}</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
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
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  formContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  textInput: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  textArea: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  banner: {
    gap: Spacing.one,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  exerciseList: {
    gap: Spacing.three,
  },
  exerciseCard: {
    gap: Spacing.three,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseCopy: {
    flex: 1,
    gap: Spacing.three,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DFDDD4',
    paddingTop: Spacing.two,
  },
  configGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  configField: {
    width: '23%',
    minWidth: 128,
    gap: Spacing.one,
    borderRadius: 18,
    backgroundColor: '#EFEEE8',
    padding: Spacing.two,
  },
  configInput: {
    minHeight: 40,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  emptyExerciseState: {
    gap: Spacing.one,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  inlineError: {
    gap: Spacing.one,
  },
  inlineLoading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  archiveSection: {
    gap: Spacing.one,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dangerButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modalScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
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
  pressed: {
    opacity: 0.72,
  },
});
