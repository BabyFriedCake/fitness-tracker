import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { SessionExerciseId } from '@/domain/workout-session';
import {
  useTodayPlanEdit,
  type TodayPlanEditExerciseDraft,
  type TodayPlanEditRouteParams,
  type TodayPlanEditState,
} from '@/features/workout-session/application/use-today-plan-edit';
import { useTheme } from '@/hooks/use-theme';

export function TodayPlanEditScreen({
  routeParams,
}: {
  readonly routeParams: TodayPlanEditRouteParams;
}) {
  const router = useRouter();
  const model = useTodayPlanEdit(routeParams);

  return (
    <TodayPlanEditContent
      {...model}
      onBack={() => router.back()}
      onOpenExerciseLibrary={() =>
        router.push(model.controls.createExerciseSelectionHref())
      }
      onSaved={() => router.back()}
    />
  );
}

export function TodayPlanEditContent({
  state,
  controls,
  onBack,
  onOpenExerciseLibrary,
  onSaved,
}: {
  readonly state: TodayPlanEditState;
  readonly controls: ReturnType<typeof useTodayPlanEdit>['controls'];
  readonly onBack: () => void;
  readonly onOpenExerciseLibrary: () => void;
  readonly onSaved: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="取消编辑此次训练"
            style={({ pressed }) => [
              styles.topButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="default" themeColor="textSecondary">
              ← 取消
            </ThemedText>
          </Pressable>
          {state.status === 'ready' && (
            <Pressable
              onPress={async () => {
                const didSave = await controls.save();

                if (didSave) {
                  onSaved();
                }
              }}
              disabled={state.isSaving}
              accessibilityRole="button"
              accessibilityLabel="保存此次训练"
              accessibilityState={{ disabled: state.isSaving }}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && !state.isSaving && styles.pressed,
                state.isSaving && styles.disabled,
              ]}
            >
              <ThemedText type="smallBold" style={styles.accentText}>
                {state.isSaving ? '保存中' : '保存'}
              </ThemedText>
            </Pressable>
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
          <ReadyState
            state={state}
            controls={controls}
            onOpenExerciseLibrary={onOpenExerciseLibrary}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ReadyState({
  state,
  controls,
  onOpenExerciseLibrary,
}: {
  readonly state: Extract<TodayPlanEditState, { readonly status: 'ready' }>;
  readonly controls: ReturnType<typeof useTodayPlanEdit>['controls'];
  readonly onOpenExerciseLibrary: () => void;
}) {
  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText type="small" themeColor="textSecondary">
          编辑此次训练
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          {state.draft.title}
        </ThemedText>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">训练动作</ThemedText>
          <Pressable
            onPress={onOpenExerciseLibrary}
            disabled={state.isSaving}
            accessibilityRole="button"
            accessibilityLabel="从动作库添加到此次训练"
            accessibilityState={{ disabled: state.isSaving }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && !state.isSaving && styles.pressed,
              state.isSaving && styles.disabled,
            ]}
          >
            <ThemedText type="smallBold" style={styles.addButtonText}>
              + 从动作库添加
            </ThemedText>
          </Pressable>
        </View>

        {state.fieldErrors.exercises && (
          <ThemedText accessibilityRole="alert" style={styles.errorText}>
            {state.fieldErrors.exercises}
          </ThemedText>
        )}

        {state.draft.exercises.map((exercise, index) => (
          <ExerciseEditCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            isSaving={state.isSaving}
            fieldErrors={state.fieldErrors}
            onUpdate={controls.updateExerciseConfig}
            onRemove={controls.requestRemoveExercise}
          />
        ))}

        {state.actionError && (
          <ThemedText accessibilityRole="alert" style={styles.errorText}>
            {state.actionError}
          </ThemedText>
        )}
      </ScrollView>

      <RemoveExerciseModal
        exercise={state.draft.exercises.find(
          (exercise) => exercise.id === state.pendingRemoveExerciseId,
        )}
        onCancel={controls.cancelRemoveExercise}
        onConfirm={controls.confirmRemoveExercise}
      />
    </>
  );
}

function ExerciseEditCard({
  exercise,
  index,
  isSaving,
  fieldErrors,
  onUpdate,
  onRemove,
}: {
  readonly exercise: TodayPlanEditExerciseDraft;
  readonly index: number;
  readonly isSaving: boolean;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly onUpdate: ReturnType<
    typeof useTodayPlanEdit
  >['controls']['updateExerciseConfig'];
  readonly onRemove: (sessionExerciseId: SessionExerciseId) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.exerciseCard}>
      <View style={styles.exerciseCardHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {(index + 1).toString().padStart(2, '0')}
        </ThemedText>
        <ThemedText type="default" style={styles.exerciseName}>
          {exercise.name}
        </ThemedText>
        <Pressable
          onPress={() => onRemove(exercise.id)}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={`删除此次训练动作${exercise.name}`}
          accessibilityState={{ disabled: isSaving }}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && !isSaving && styles.pressed,
            isSaving && styles.disabled,
          ]}
        >
          <ThemedText type="smallBold" style={styles.removeText}>
            ×
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.configGrid}>
        <ConfigInput
          label="组数"
          value={exercise.targetSets}
          error={fieldErrors[`${exercise.id}:targetSets`]}
          editable={!isSaving}
          onChangeText={(value) => onUpdate(exercise.id, 'targetSets', value)}
        />
        <ConfigInput
          label="次数"
          value={exercise.targetReps}
          error={fieldErrors[`${exercise.id}:targetReps`]}
          editable={!isSaving}
          onChangeText={(value) => onUpdate(exercise.id, 'targetReps', value)}
        />
        <ConfigInput
          label="休息"
          value={exercise.restSeconds}
          error={fieldErrors[`${exercise.id}:restSeconds`]}
          editable={!isSaving}
          onChangeText={(value) => onUpdate(exercise.id, 'restSeconds', value)}
        />
      </View>
    </ThemedView>
  );
}

function ConfigInput({
  label,
  value,
  error,
  editable,
  onChangeText,
}: {
  readonly label: string;
  readonly value: string;
  readonly error?: string;
  readonly editable: boolean;
  readonly onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType="number-pad"
        accessibilityLabel={label}
        style={styles.input}
      />
      {error && (
        <ThemedText
          type="small"
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

function RemoveExerciseModal({
  exercise,
  onCancel,
  onConfirm,
}: {
  readonly exercise?: TodayPlanEditExerciseDraft;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <Modal
      visible={Boolean(exercise)}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <ThemedView type="backgroundElement" style={styles.modalCard}>
          <ThemedText type="subtitle">删除动作</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {exercise ? `从此次训练中删除 ${exercise.name}。` : ''}
          </ThemedText>
          <View style={styles.modalActions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="取消删除动作"
              style={styles.modalButton}
            >
              <ThemedText type="smallBold">取消</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="确认删除动作"
              style={[styles.modalButton, styles.destructiveButton]}
            >
              <ThemedText type="smallBold" style={styles.destructiveText}>
                删除
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="default">正在加载此次训练</ThemedText>
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
      <ThemedText type="default">此次训练加载失败</ThemedText>
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
        accessibilityLabel="重新加载此次训练"
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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  topButton: { minHeight: 44, justifyContent: 'center' },
  saveButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#1B2016',
    paddingHorizontal: Spacing.three,
  },
  accentText: { color: '#CAFF00' },
  scrollContent: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  title: { fontSize: 52, lineHeight: 58 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addButton: { minHeight: 44, justifyContent: 'center' },
  addButtonText: { color: '#4F7900' },
  exerciseCard: {
    gap: Spacing.three,
    borderRadius: 24,
    padding: Spacing.three,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  exerciseName: { flex: 1, fontSize: 22, lineHeight: 30 },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#A8453D', fontSize: 28, lineHeight: 32 },
  configGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  inputWrap: {
    minWidth: 132,
    flex: 1,
    gap: Spacing.one,
    borderRadius: 16,
    backgroundColor: '#EDEBE4',
    padding: Spacing.two,
  },
  input: {
    minHeight: 44,
    color: '#1B1D18',
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: { color: '#A8453D' },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    borderRadius: 24,
    padding: Spacing.four,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  modalButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
  },
  destructiveButton: { backgroundColor: '#F7E8E5' },
  destructiveText: { color: '#A8453D' },
  reloadButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
