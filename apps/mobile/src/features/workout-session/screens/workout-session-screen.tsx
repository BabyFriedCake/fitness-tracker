import { useEffect } from 'react';
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
import { useRouter, type Href } from 'expo-router';
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
import type {
  WorkoutCompanionRuntimePhase,
  WorkoutRuntimeSnapshot,
} from '@/features/workout-session/application/workout-runtime-engine';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutSessionScreen({
  routeParams,
}: {
  readonly routeParams: WorkoutSessionRouteParams;
}) {
  const router = useRouter();
  const model = useWorkoutSessionScreen(routeParams);
  const navigationIntent =
    model.state.status === 'ready' ? model.state.navigationIntent : undefined;
  const sessionId =
    model.state.status === 'ready' ? model.state.data.session.id : undefined;

  useEffect(() => {
    if (!navigationIntent || !sessionId) {
      return;
    }

    model.controls.clearNavigationIntent();

    if (navigationIntent === 'summary') {
      router.replace(`/workout-sessions/${sessionId}/summary` as Href);
      return;
    }

    router.dismissTo('/');
  }, [model.controls, navigationIntent, router, sessionId]);

  return (
    <WorkoutSessionScreenContent {...model} onBack={() => router.back()} />
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
  const isRuntimeRunning = state.companionRuntime?.phase === 'running';
  const currentExercise = state.runtime.currentExercise;
  const canEditSet =
    isActive &&
    isRuntimeRunning &&
    !!currentExercise &&
    !currentExercise.isSkipped &&
    !currentExercise.isCompleted &&
    !state.isConfirmingSkip &&
    !state.isMutating;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SessionHeader
          data={data}
          canEnd={
            isActive &&
            !state.isMutating &&
            !state.isConfirmingSkip &&
            state.endFlow === 'closed'
          }
          onBack={onBack}
          onEnd={controls.requestEndSession}
        />
        <ProgressSummary runtime={state.runtime} />
        <RuntimeStatusPanel state={state} controls={controls} />
        {state.actionError && (
          <ThemedText accessibilityRole="alert">{state.actionError}</ThemedText>
        )}
        <ExerciseList
          runtime={state.runtime}
          controls={controls}
          canSelect={
            isActive &&
            isRuntimeRunning &&
            !state.isMutating &&
            !state.isConfirmingSkip
          }
        />

        {currentExercise ? (
          <>
            <CurrentExerciseSection
              runtime={state.runtime}
              completedReps={state.companionRuntime?.progress.completedReps}
              coachFeedback={state.coachFeedback}
            />
            <CompletedSets sets={currentExercise.sets} />
            <SetEditor
              state={state}
              controls={controls}
              disabled={!canEditSet}
            />
            <ExerciseActions
              exercise={currentExercise}
              isActive={isActive}
              isRuntimeRunning={isRuntimeRunning}
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
          <RestTimerStatus
            status={data.restTimerStatus}
            remainingSeconds={state.companionRuntime?.restRemainingSeconds}
            exerciseName={currentExercise?.exerciseNameSnapshot}
            nextSetNumber={state.runtime.currentSetNumber}
            canFinish={state.companionRuntime?.phase === 'resting'}
            onFinish={() => {
              void controls.finishRest();
            }}
          />
        )}
        {state.canRetryCompanionEvent && (
          <PrimaryButton
            label="重试保存"
            accessibilityLabel="重试训练状态保存"
            disabled={state.isMutating}
            onPress={controls.retryCompanionEvent}
          />
        )}
      </ScrollView>
      <SkipExerciseConfirmModal
        visible={state.isConfirmingSkip}
        exerciseName={currentExercise?.exerciseNameSnapshot ?? ''}
        onCancel={controls.cancelSkipExercise}
        onConfirm={() => {
          void controls.confirmSkipExercise();
        }}
      />
      <EndSessionModal state={state} controls={controls} />
    </KeyboardAvoidingView>
  );
}

function SessionHeader({
  data,
  canEnd,
  onBack,
  onEnd,
}: {
  readonly data: WorkoutSessionScreenData;
  readonly canEnd: boolean;
  readonly onBack: () => void;
  readonly onEnd: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="保存并退出训练"
          style={({ pressed }) => [
            styles.headerButton,
            { borderColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">保存退出</ThemedText>
        </Pressable>
        {data.session.status === 'in_progress' && (
          <Pressable
            onPress={onEnd}
            disabled={!canEnd}
            accessibilityRole="button"
            accessibilityLabel="结束本次训练"
            accessibilityState={{ disabled: !canEnd }}
            style={({ pressed }) => [
              styles.headerButton,
              { borderColor: theme.backgroundSelected },
              !canEnd && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">结束训练</ThemedText>
          </Pressable>
        )}
      </View>
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
  runtime,
}: {
  readonly runtime: WorkoutRuntimeSnapshot;
}) {
  const exercisePosition =
    runtime.currentExerciseIndex === undefined
      ? 0
      : runtime.currentExerciseIndex + 1;

  return (
    <View style={styles.progressRow} accessibilityLabel="训练进度">
      <ThemedText type="smallBold">
        动作 {exercisePosition} / {runtime.orderedExercises.length}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        已完成 {runtime.completedSets} / {runtime.targetSets} 组
      </ThemedText>
    </View>
  );
}

function RuntimeStatusPanel({
  state,
  controls,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
}) {
  const theme = useTheme();
  const canStart =
    state.data.session.status === 'draft' &&
    state.runtime.status === 'idle' &&
    !state.isMutating;
  const canPause =
    state.data.session.status === 'in_progress' &&
    state.companionRuntime?.phase === 'running' &&
    state.endFlow === 'closed' &&
    !state.isMutating &&
    !state.isConfirmingSkip;
  const canResume =
    state.data.session.status === 'in_progress' &&
    state.companionRuntime?.phase === 'paused' &&
    state.endFlow === 'closed' &&
    !state.isMutating &&
    !state.isConfirmingSkip;

  return (
    <View
      style={[
        styles.runtimePanel,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
      accessibilityLabel={`陪练运行状态：${formatCompanionRuntimeStatus(
        state.companionRuntime?.phase,
        state.runtime.status,
      )}`}
    >
      <View style={styles.runtimeCopy}>
        <ThemedText type="small" themeColor="textSecondary">
          陪练状态
        </ThemedText>
        <ThemedText type="default">
          {formatCompanionRuntimeStatus(
            state.companionRuntime?.phase,
            state.runtime.status,
          )}
        </ThemedText>
      </View>
      {canStart && (
        <PrimaryButton
          label={state.isMutating ? '正在开始' : '开始训练'}
          accessibilityLabel="开始训练"
          disabled={!canStart}
          onPress={() => {
            void controls.startWorkout();
          }}
        />
      )}
      {state.companionRuntime?.phase === 'running' && (
        <SecondaryButton
          label="暂停"
          accessibilityLabel="暂停训练"
          disabled={!canPause}
          onPress={controls.pauseWorkout}
        />
      )}
      {state.companionRuntime?.phase === 'paused' && (
        <PrimaryButton
          label="继续"
          accessibilityLabel="继续训练"
          disabled={!canResume}
          onPress={controls.resumeWorkout}
        />
      )}
    </View>
  );
}

function ExerciseList({
  runtime,
  controls,
  canSelect,
}: {
  readonly runtime: WorkoutRuntimeSnapshot;
  readonly controls: WorkoutSessionScreenControls;
  readonly canSelect: boolean;
}) {
  return (
    <View style={styles.exerciseList} accessibilityLabel="当前训练动作列表">
      {runtime.orderedExercises.map((exercise, index) => {
        const isCurrent = exercise.id === runtime.currentExercise?.id;
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
  runtime,
  completedReps,
  coachFeedback,
}: {
  readonly runtime: WorkoutRuntimeSnapshot;
  readonly completedReps?: number;
  readonly coachFeedback?: string;
}) {
  const exercise = runtime.currentExercise;

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
        第 {runtime.currentSet ?? 1} / {exercise.targetSets} 组 · 目标{' '}
        {exercise.targetRepsMin}–{exercise.targetRepsMax} 次
      </ThemedText>
      <ThemedText type="smallBold">
        {completedReps === undefined
          ? formatCurrentSetState(exercise)
          : `已完成 ${completedReps} / ${getExerciseTargetReps(exercise)} 次`}
      </ThemedText>
      {coachFeedback && (
        <ThemedText type="small" accessibilityLiveRegion="polite">
          {coachFeedback}
        </ThemedText>
      )}
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
    </View>
  );
}

function NumberEditor({
  label,
  value,
  unit,
  step,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly step: number;
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
    onChange(String(Number(next.toFixed(2))));
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
  isRuntimeRunning,
  isMutating,
  controls,
}: {
  readonly exercise: SessionExercise;
  readonly isActive: boolean;
  readonly isRuntimeRunning: boolean;
  readonly isMutating: boolean;
  readonly controls: WorkoutSessionScreenControls;
}) {
  const canMutateExercise = isActive && isRuntimeRunning && !isMutating;

  return (
    <View style={styles.actionRow}>
      {exercise.isSkipped ? (
        <SecondaryButton
          label="恢复动作"
          accessibilityLabel={`恢复动作${exercise.exerciseNameSnapshot}`}
          disabled={!canMutateExercise || exercise.isCompleted}
          onPress={() => {
            void controls.resumeExercise();
          }}
        />
      ) : (
        <SecondaryButton
          label="跳过动作"
          accessibilityLabel={`跳过动作${exercise.exerciseNameSnapshot}`}
          disabled={!canMutateExercise || exercise.isCompleted}
          onPress={controls.requestSkipExercise}
        />
      )}
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

function EndSessionModal({
  state,
  controls,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
}) {
  const theme = useTheme();
  const isConfirmingCancel = state.endFlow === 'confirm_cancel';

  return (
    <Modal
      visible={state.endFlow !== 'closed'}
      transparent
      animationType="fade"
      onRequestClose={controls.continueSession}
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
          <ThemedText type="default">
            {isConfirmingCancel ? '放弃本次训练？' : '结束本次训练？'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isConfirmingCancel
              ? '已完成的组会保留为已取消记录，但不会进入正式统计。'
              : '保存并结束后可以查看这次训练的客观总结。'}
          </ThemedText>
          {state.actionError && (
            <ThemedText accessibilityRole="alert">
              {state.actionError}
            </ThemedText>
          )}
          <View style={styles.modalActions}>
            <SecondaryButton
              label="继续训练"
              accessibilityLabel="继续本次训练"
              disabled={state.isMutating}
              onPress={controls.continueSession}
            />
            {isConfirmingCancel ? (
              <PrimaryButton
                label={state.isMutating ? '正在取消' : '确认放弃'}
                accessibilityLabel="确认放弃本次训练"
                disabled={state.isMutating}
                onPress={() => {
                  void controls.confirmCancelSession();
                }}
              />
            ) : (
              <>
                <PrimaryButton
                  label={state.isMutating ? '正在保存' : '保存并结束'}
                  accessibilityLabel="保存并完成本次训练"
                  disabled={state.isMutating}
                  onPress={() => {
                    void controls.confirmCompleteSession();
                  }}
                />
                <SecondaryButton
                  label="放弃本次训练"
                  accessibilityLabel="请求放弃本次训练"
                  disabled={state.isMutating}
                  onPress={controls.requestCancelSession}
                />
              </>
            )}
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

function RestTimerStatus({
  status,
  remainingSeconds,
  exerciseName,
  nextSetNumber,
  canFinish,
  onFinish,
}: {
  readonly status: WorkoutSessionTimerDisplayStatus;
  readonly remainingSeconds?: number;
  readonly exerciseName?: string;
  readonly nextSetNumber?: number;
  readonly canFinish: boolean;
  readonly onFinish: () => void;
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
      {remainingSeconds !== undefined && (
        <ThemedText type="title" accessibilityLabel="休息剩余时间">
          {formatRemainingSeconds(remainingSeconds)}
        </ThemedText>
      )}
      {exerciseName && nextSetNumber !== undefined && (
        <ThemedText type="small" themeColor="textSecondary">
          下一组：{exerciseName} · 第 {nextSetNumber} 组
        </ThemedText>
      )}
      {canFinish && (
        <SecondaryButton
          label="结束休息"
          accessibilityLabel="结束当前休息"
          onPress={onFinish}
        />
      )}
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

function formatRemainingSeconds(value: number): string {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(
    2,
    '0',
  )}`;
}

function formatRuntimeStatus(
  status: Extract<
    WorkoutSessionScreenState,
    { status: 'ready' }
  >['runtime']['status'],
): string {
  switch (status) {
    case 'idle':
      return '未开始';
    case 'running':
      return '训练中';
    case 'paused':
      return '训练暂停';
    case 'completed':
      return '训练完成';
  }
}

function formatCompanionRuntimeStatus(
  phase: WorkoutCompanionRuntimePhase | undefined,
  fallback: Extract<
    WorkoutSessionScreenState,
    { status: 'ready' }
  >['runtime']['status'],
): string {
  switch (phase) {
    case 'running':
      return '训练中';
    case 'paused':
      return '训练暂停';
    case 'set_completion_pending':
      return '正在确认本组完成';
    case 'resting':
      return '休息中';
    case 'exercise_completion_pending':
      return '正在保存训练结果';
    case 'completed':
      return '训练完成';
    default:
      return formatRuntimeStatus(fallback);
  }
}

function getExerciseTargetReps(exercise: SessionExercise): number {
  return exercise.targetRepsMin === exercise.targetRepsMax
    ? exercise.targetRepsMax
    : exercise.targetRepsMin;
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight)
    ? String(weight)
    : String(Number(weight.toFixed(2)));
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
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerButton: {
    minHeight: 44,
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
  runtimePanel: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  runtimeCopy: { gap: Spacing.one },
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
