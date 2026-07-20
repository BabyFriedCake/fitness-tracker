import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type {
  SessionExercise,
  WorkoutSessionStatus,
  WorkoutSet,
} from '@/domain/workout-session';
import {
  useWorkoutSessionScreen,
  type WorkoutSessionRouteParams,
  type WorkoutSessionScreenControls,
  type WorkoutSessionScreenState,
} from '@/features/workout-session/application/use-workout-session-screen';
import type {
  WorkoutSessionScreenData,
  WorkoutSessionTimerDisplayStatus,
} from '@/features/workout-session/application/load-workout-session-screen';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutSessionScreen({
  routeParams,
}: {
  readonly routeParams: WorkoutSessionRouteParams;
}) {
  const router = useRouter();

  return (
    <WorkoutSessionScreenContent
      {...useWorkoutSessionScreen(routeParams)}
      onBack={() => router.back()}
    />
  );
}

export type WorkoutSessionScreenContentProps = {
  readonly state: WorkoutSessionScreenState;
  readonly controls: WorkoutSessionScreenControls;
  readonly onBack: () => void;
};

export function WorkoutSessionScreenContent({
  state,
  controls,
  onBack,
}: WorkoutSessionScreenContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && (
          <ErrorState
            message={state.message}
            onBack={onBack}
            onReload={controls.reload}
          />
        )}
        {state.status === 'ready' && (
          <ReadyState state={state} controls={controls} onBack={onBack} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText>正在加载训练</ThemedText>
    </ThemedView>
  );
}

function ErrorState({
  message,
  onBack,
  onReload,
}: {
  readonly message: string;
  readonly onBack: () => void;
  readonly onReload: () => void;
}) {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="subtitle" style={styles.centerText}>
        训练加载失败
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      <View style={styles.feedbackActions}>
        <SecondaryButton
          label="返回"
          accessibilityLabel="返回上一页"
          onPress={onBack}
        />
        <PrimaryButton
          label="重新加载"
          accessibilityLabel="重新加载训练"
          onPress={onReload}
        />
      </View>
    </ThemedView>
  );
}

function ReadyState({
  state,
  controls,
  onBack,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
  readonly onBack: () => void;
}) {
  const { data } = state;
  const isActive = data.session.status === 'in_progress';
  const currentExercise = data.currentExercise;
  const canEditSet =
    isActive &&
    !!currentExercise &&
    !currentExercise.isSkipped &&
    !currentExercise.isCompleted &&
    !state.isConfirmingSkip &&
    !state.isMutating;
  const setDisabledReason = getSetDisabledReason(state);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SessionHeader data={data} onBack={onBack} />
        <ProgressSummary data={data} />
        <ExerciseList
          data={data}
          controls={controls}
          canSelect={isActive && !state.isMutating && !state.isConfirmingSkip}
        />

        {currentExercise ? (
          <>
            <CurrentExerciseSection data={data} />
            <CompletedSets sets={currentExercise.sets} />
            <SetEditor
              state={state}
              controls={controls}
              disabled={!canEditSet}
            />
            <ExerciseActions
              exercise={currentExercise}
              isActive={isActive}
              isMutating={state.isMutating || state.isConfirmingSkip}
              controls={controls}
            />
          </>
        ) : (
          <ThemedText themeColor="textSecondary" style={styles.emptyCopy}>
            这次训练没有动作。
          </ThemedText>
        )}

        {data.restTimerStatus && (
          <RestTimerStatus status={data.restTimerStatus} />
        )}
      </ScrollView>
      {currentExercise && (
        <CompleteSetAction
          state={state}
          controls={controls}
          disabled={!canEditSet}
          disabledReason={setDisabledReason}
        />
      )}
      <SkipExerciseConfirmModal
        visible={state.isConfirmingSkip}
        exerciseName={currentExercise?.exerciseNameSnapshot ?? ''}
        onCancel={controls.cancelSkipExercise}
        onConfirm={() => {
          void controls.confirmSkipExercise();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function SessionHeader({
  data,
  onBack,
}: {
  readonly data: WorkoutSessionScreenData;
  readonly onBack: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="返回上一页"
        style={({ pressed }) => [
          styles.backButton,
          { borderColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold">返回</ThemedText>
      </Pressable>
      <View style={styles.headerTitle}>
        <ThemedText type="subtitle" numberOfLines={2}>
          {data.session.workoutNameSnapshot}
        </ThemedText>
        <StatusChip status={data.session.status} />
      </View>
    </View>
  );
}

function StatusChip({ status }: { readonly status: WorkoutSessionStatus }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.statusChip, { borderColor: theme.backgroundSelected }]}
      accessibilityLabel={`训练状态：${formatSessionStatus(status)}`}
    >
      <ThemedText type="smallBold">{formatSessionStatus(status)}</ThemedText>
    </View>
  );
}

function ProgressSummary({
  data,
}: {
  readonly data: WorkoutSessionScreenData;
}) {
  const exercisePosition =
    data.currentExerciseIndex === undefined ? 0 : data.currentExerciseIndex + 1;

  return (
    <View style={styles.progressRow} accessibilityLabel="训练进度">
      <ThemedText type="smallBold">
        动作 {exercisePosition} / {data.orderedExercises.length}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        已完成 {data.completedSetCount} / {data.totalTargetSetCount} 组
      </ThemedText>
    </View>
  );
}

function ExerciseList({
  data,
  controls,
  canSelect,
}: {
  readonly data: WorkoutSessionScreenData;
  readonly controls: WorkoutSessionScreenControls;
  readonly canSelect: boolean;
}) {
  return (
    <View style={styles.exerciseList} accessibilityLabel="当前训练动作列表">
      {data.orderedExercises.map((exercise, index) => {
        const isCurrent = exercise.id === data.currentExercise?.id;
        const isSelectable = canSelect && exercise.isEnabled && !isCurrent;

        return (
          <Pressable
            key={exercise.id}
            disabled={!isSelectable}
            onPress={() => {
              void controls.selectExercise(exercise.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isCurrent
                ? `当前动作${exercise.exerciseNameSnapshot}`
                : `切换到动作${exercise.exerciseNameSnapshot}`
            }
            accessibilityState={{
              disabled: !isSelectable,
              selected: isCurrent,
            }}
            style={({ pressed }) => [
              styles.exerciseRow,
              !exercise.isEnabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.exercisePosition}>
              {index + 1}
            </ThemedText>
            <View style={styles.exerciseRowCopy}>
              <ThemedText numberOfLines={2}>
                {exercise.exerciseNameSnapshot}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatExerciseState(exercise)}
              </ThemedText>
            </View>
            {isCurrent && <ThemedText type="smallBold">当前</ThemedText>}
          </Pressable>
        );
      })}
    </View>
  );
}

function CurrentExerciseSection({
  data,
}: {
  readonly data: WorkoutSessionScreenData;
}) {
  const exercise = data.currentExercise;

  if (!exercise) {
    return null;
  }

  return (
    <View style={styles.primarySection}>
      <ThemedText type="small" themeColor="textSecondary">
        当前动作
      </ThemedText>
      <ThemedText type="subtitle">{exercise.exerciseNameSnapshot}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        第 {data.currentSetNumber ?? 1} / {exercise.targetSets} 组 · 目标{' '}
        {exercise.targetRepsMin}–{exercise.targetRepsMax} 次
      </ThemedText>
      <ThemedText type="smallBold">
        {formatCurrentSetState(exercise)}
      </ThemedText>
    </View>
  );
}

function CompletedSets({ sets }: { readonly sets: readonly WorkoutSet[] }) {
  if (sets.length === 0) {
    return (
      <View style={styles.section}>
        <ThemedText type="smallBold">已完成组</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          还没有完成的组。
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">已完成组</ThemedText>
      {sets.map((workoutSet) => (
        <View key={workoutSet.id} style={styles.completedSetRow}>
          <ThemedText type="small">第 {workoutSet.setNumber} 组</ThemedText>
          <ThemedText type="smallBold">
            {formatWeight(workoutSet.weight)} kg × {workoutSet.actualReps} 次
          </ThemedText>
          {workoutSet.isExtraSet && (
            <ThemedText type="small" themeColor="textSecondary">
              额外组
            </ThemedText>
          )}
        </View>
      ))}
    </View>
  );
}

function SetEditor({
  state,
  controls,
  disabled,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
  readonly disabled: boolean;
}) {
  return (
    <View style={styles.section}>
      <NumberEditor
        label="重量"
        value={state.setDraft.weight}
        unit="kg"
        step={2.5}
        disabled={disabled}
        onChange={controls.updateWeight}
      />
      <NumberEditor
        label="次数"
        value={state.setDraft.actualReps}
        unit="次"
        step={1}
        integer
        disabled={disabled}
        onChange={controls.updateActualReps}
      />
      {state.actionError && (
        <ThemedText accessibilityRole="alert">{state.actionError}</ThemedText>
      )}
    </View>
  );
}

function CompleteSetAction({
  state,
  controls,
  disabled,
  disabledReason,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
  readonly disabled: boolean;
  readonly disabledReason?: string;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.primaryActionBar}>
      {disabledReason && (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.centerText}
        >
          {disabledReason}
        </ThemedText>
      )}
      <PrimaryButton
        label={state.isMutating ? '正在保存' : '完成本组'}
        accessibilityLabel="完成当前组"
        disabled={disabled}
        onPress={() => {
          void controls.recordSet();
        }}
      />
    </ThemedView>
  );
}

function NumberEditor({
  label,
  value,
  unit,
  step,
  integer = false,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly step: number;
  readonly integer?: boolean;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const adjust = (direction: -1 | 1) => {
    const current = Number(value);
    const next = Math.max(
      0,
      (Number.isFinite(current) ? current : 0) + step * direction,
    );
    onChange(String(integer ? Math.round(next) : Number(next.toFixed(2))));
  };

  return (
    <View style={styles.numberEditor}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.stepperRow}>
        <StepperButton
          label={`减少${label}`}
          symbol="−"
          disabled={disabled}
          onPress={() => adjust(-1)}
        />
        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={onChange}
            editable={!disabled}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={`${label}输入`}
            style={[
              styles.numberInput,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {unit}
          </ThemedText>
        </View>
        <StepperButton
          label={`增加${label}`}
          symbol="+"
          disabled={disabled}
          onPress={() => adjust(1)}
        />
      </View>
    </View>
  );
}

function StepperButton({
  label,
  symbol,
  disabled,
  onPress,
}: {
  readonly label: string;
  readonly symbol: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.stepperButton,
        { borderColor: theme.backgroundSelected },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="subtitle">{symbol}</ThemedText>
    </Pressable>
  );
}

function ExerciseActions({
  exercise,
  isActive,
  isMutating,
  controls,
}: {
  readonly exercise: SessionExercise;
  readonly isActive: boolean;
  readonly isMutating: boolean;
  readonly controls: WorkoutSessionScreenControls;
}) {
  return (
    <View style={styles.actionRow}>
      {exercise.isSkipped ? (
        <SecondaryButton
          label="恢复动作"
          accessibilityLabel={`恢复动作${exercise.exerciseNameSnapshot}`}
          disabled={!isActive || exercise.isCompleted || isMutating}
          onPress={() => {
            void controls.resumeExercise();
          }}
        />
      ) : (
        <SecondaryButton
          label="跳过动作"
          accessibilityLabel={`跳过动作${exercise.exerciseNameSnapshot}`}
          disabled={!isActive || exercise.isCompleted || isMutating}
          onPress={controls.requestSkipExercise}
        />
      )}
      <SecondaryButton
        label="完成动作"
        accessibilityLabel={`完成动作${exercise.exerciseNameSnapshot}`}
        disabled={
          !isActive || exercise.isSkipped || exercise.isCompleted || isMutating
        }
        onPress={() => {
          void controls.completeExercise();
        }}
      />
    </View>
  );
}

function SkipExerciseConfirmModal({
  visible,
  exerciseName,
  onCancel,
  onConfirm,
}: {
  readonly visible: boolean;
  readonly exerciseName: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <ThemedView style={styles.modalScrim}>
        <ThemedView
          type="backgroundElement"
          style={[
            styles.modalContent,
            { borderColor: theme.backgroundSelected },
          ]}
          accessibilityRole="alert"
        >
          <ThemedText type="default">跳过{exerciseName}？</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            已完成的组会保留。
          </ThemedText>
          <View style={styles.modalActions}>
            <SecondaryButton
              label="继续训练"
              accessibilityLabel="取消跳过动作"
              onPress={onCancel}
            />
            <PrimaryButton
              label="确认跳过"
              accessibilityLabel={`确认跳过动作${exerciseName}`}
              onPress={onConfirm}
            />
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function RestTimerStatus({
  status,
}: {
  readonly status: WorkoutSessionTimerDisplayStatus;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.timerStatus,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
      accessibilityLabel={`休息计时状态：${formatTimerStatus(status)}`}
    >
      <ThemedText type="small" themeColor="textSecondary">
        休息计时
      </ThemedText>
      <ThemedText type="default">{formatTimerStatus(status)}</ThemedText>
    </View>
  );
}

function PrimaryButton({
  label,
  accessibilityLabel,
  disabled = false,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: theme.text },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: theme.background, textAlign: 'center' }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  accessibilityLabel,
  disabled = false,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: theme.backgroundSelected },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={styles.centerText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function formatSessionStatus(status: WorkoutSessionStatus): string {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'in_progress':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
  }
}

function formatExerciseState(exercise: SessionExercise): string {
  if (exercise.isCompleted) {
    return '已完成';
  }
  if (exercise.isSkipped) {
    return '已跳过';
  }
  return `${exercise.sets.length} / ${exercise.targetSets} 组`;
}

function formatCurrentSetState(exercise: SessionExercise): string {
  if (exercise.isCompleted) {
    return '动作已完成';
  }
  if (exercise.isSkipped) {
    return '动作已跳过';
  }
  return '当前组待记录';
}

function formatTimerStatus(status: WorkoutSessionTimerDisplayStatus): string {
  switch (status) {
    case 'running':
      return '休息进行中';
    case 'paused':
      return '休息已暂停';
    case 'completed':
      return '休息已结束';
  }
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight)
    ? String(weight)
    : String(Number(weight.toFixed(2)));
}

function getSetDisabledReason(
  state: Extract<WorkoutSessionScreenState, { status: 'ready' }>,
): string | undefined {
  if (state.data.session.status !== 'in_progress') {
    return '当前训练状态不可记录组。';
  }
  if (state.isMutating) {
    return '正在保存，请稍候。';
  }
  if (state.isConfirmingSkip) {
    return '请先处理跳过动作确认。';
  }
  if (state.data.currentExercise?.isSkipped) {
    return '请先恢复当前动作。';
  }
  if (state.data.currentExercise?.isCompleted) {
    return '当前动作已完成，请选择其他动作。';
  }
  return undefined;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scrollContent: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  header: { gap: Spacing.three },
  headerTitle: { gap: Spacing.two, alignItems: 'flex-start' },
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  statusChip: {
    minHeight: 32,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exerciseRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  exercisePosition: { width: 24, textAlign: 'center' },
  exerciseRowCopy: { flex: 1 },
  primarySection: { gap: Spacing.two },
  section: {
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.four,
  },
  completedSetRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  numberEditor: { gap: Spacing.two },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepperButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  numberInput: {
    minWidth: 0,
    flex: 1,
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  primaryActionBar: {
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  secondaryButton: {
    minHeight: 44,
    flexGrow: 1,
    flexBasis: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  timerStatus: {
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  feedbackActions: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  modalScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.four,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  centerText: { textAlign: 'center' },
  emptyCopy: { textAlign: 'center', paddingVertical: Spacing.four },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72 },
});
