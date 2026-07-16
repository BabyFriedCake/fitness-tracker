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
  useWorkoutTemplateCreate,
  type WorkoutTemplateCreateScreenControls,
  type WorkoutTemplateCreateScreenState,
} from '@/features/workout-templates/application/use-workout-template-create';
import { formatDefaultTemplateExerciseConfig } from '@/features/workout-templates/application/workout-template-create-defaults';
import type { WorkoutTemplateCreateRouteParams } from '@/features/workout-templates/application/workout-template-create-route-params';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutTemplateCreateScreen({
  routeParams,
}: {
  readonly routeParams: WorkoutTemplateCreateRouteParams;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const model = useWorkoutTemplateCreate(routeParams);
  const pendingNavigationActionRef = useRef<NavigationAction | null>(null);

  usePreventRemove(model.controls.shouldConfirmExit(), ({ data }) => {
    pendingNavigationActionRef.current = data.action;
    model.controls.requestExit();
  });

  useEffect(() => {
    if (!model.state.isSaved) {
      return;
    }

    router.dismissTo('/templates');
  }, [model.state.isSaved, router]);

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
    <WorkoutTemplateCreateContent
      {...model}
      onAddExercise={(href) => {
        router.push(href);
      }}
      onExit={() => {
        router.back();
      }}
      onConfirmExit={() => {
        model.controls.confirmExit();
      }}
    />
  );
}

export type WorkoutTemplateCreateContentProps = {
  readonly state: WorkoutTemplateCreateScreenState;
  readonly controls: WorkoutTemplateCreateScreenControls;
  readonly onAddExercise: (href: Href) => void;
  readonly onExit: () => void;
  readonly onConfirmExit: () => void;
};

export function WorkoutTemplateCreateContent({
  state,
  controls,
  onAddExercise,
  onExit,
  onConfirmExit,
}: WorkoutTemplateCreateContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <Header
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
          {state.status === 'ready' && (
            <>
              <CreateForm
                state={state}
                controls={controls}
                onAddExercise={onAddExercise}
              />
            </>
          )}
          {state.isConfirmingDiscard && (
            <DiscardConfirmModal
              visible
              onCancel={controls.cancelExit}
              onConfirm={onConfirmExit}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Header({ onCancel }: { readonly onCancel: () => void }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.header}>
      <ThemedView style={styles.headerCopy}>
        <ThemedText type="subtitle">创建训练模板</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          设置名称并从动作库添加标准动作。
        </ThemedText>
      </ThemedView>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="退出创建训练模板"
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">取消</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="default">正在准备训练模板</ThemedText>
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
      <ThemedText type="default">训练模板准备失败</ThemedText>
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
        accessibilityLabel="重新加载训练模板创建页"
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

function CreateForm({
  state,
  controls,
  onAddExercise,
}: {
  readonly state: Extract<
    WorkoutTemplateCreateScreenState,
    { readonly status: 'ready' }
  >;
  readonly controls: WorkoutTemplateCreateScreenControls;
  readonly onAddExercise: (href: Href) => void;
}) {
  const theme = useTheme();
  const isExerciseLoading =
    state.draft.selectedExerciseLoadStatus === 'loading';
  const isSaveDisabled = state.isSaving || isExerciseLoading;

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.formContent}
      >
        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">名称</ThemedText>
          <TextInput
            value={state.draft.name}
            onChangeText={controls.updateName}
            placeholder="例如 Push"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="训练模板名称"
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
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
              },
            ]}
          />
        </ThemedView>

        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="smallBold">动作</ThemedText>
          <Pressable
            onPress={() =>
              onAddExercise(controls.createExerciseSelectionHref())
            }
            accessibilityRole="button"
            accessibilityLabel="从动作库添加动作"
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">添加动作</ThemedText>
          </Pressable>
        </ThemedView>

        {isExerciseLoading && (
          <ThemedView style={styles.inlineLoading}>
            <ActivityIndicator />
            <ThemedText type="small" themeColor="textSecondary">
              正在加载已选动作
            </ThemedText>
          </ThemedView>
        )}

        {state.draft.selectedExercises.length > 0 ? (
          <ThemedView style={styles.exerciseList}>
            {state.draft.selectedExercises.map((exercise, index) => (
              <ThemedView
                key={exercise.id}
                type="backgroundElement"
                style={[
                  styles.exerciseRow,
                  { borderColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="smallBold">{index + 1}</ThemedText>
                <ThemedView style={styles.exerciseCopy}>
                  <ThemedText type="default">{exercise.nameZh}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatMuscleGroup(exercise.primaryMuscleGroup)} ·{' '}
                    {formatEquipment(exercise.equipment)} ·{' '}
                    {formatDefaultTemplateExerciseConfig()}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            ))}
          </ThemedView>
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
              至少添加一个动作后才能保存模板。
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
            : isExerciseLoading
              ? '正在加载已选动作'
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
            : isExerciseLoading
              ? '加载动作中'
              : '保存模板'}
        </ThemedText>
      </Pressable>
    </>
  );
}

function DiscardConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: {
  readonly visible: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ThemedView style={styles.modalScrim}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.modalContent,
            { borderColor: theme.backgroundSelected },
          ]}
          accessibilityRole="alert"
        >
          <ThemedText type="default">放弃创建模板？</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            当前输入不会保存。
          </ThemedText>
          <ThemedView style={styles.modalActions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="继续编辑训练模板"
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">继续编辑</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="放弃创建训练模板"
              style={({ pressed }) => [
                styles.dangerButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">放弃创建</ThemedText>
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
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.three,
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
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  textArea: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
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
  exerciseList: {
    gap: Spacing.two,
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  exerciseCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  emptyExerciseState: {
    gap: Spacing.one,
    borderRadius: Spacing.two,
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
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
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
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dangerButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
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
