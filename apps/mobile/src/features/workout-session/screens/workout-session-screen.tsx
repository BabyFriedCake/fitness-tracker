import { useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { SessionExercise, WorkoutSet } from '@/domain/workout-session';
import {
  useWorkoutSessionScreen,
  type WorkoutSessionRouteParams,
  type WorkoutSessionScreenControls,
  type WorkoutSessionScreenState,
} from '@/features/workout-session/application/use-workout-session-screen';
import { useWorkoutCompanionSettings } from '@/features/workout-session/application/workout-companion-settings';
import type { WorkoutSessionScreenData } from '@/features/workout-session/application/load-workout-session-screen';
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
  const { voiceFeedbackEnabled, inputSourceMode } =
    useWorkoutCompanionSettings();
  const model = useWorkoutSessionScreen(routeParams, {
    voiceFeedbackEnabled,
    workoutCompanionEventSourceMode: inputSourceMode,
  });
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
  const runtimePhase = state.companionRuntime?.phase;
  const isRuntimeRunning = runtimePhase === 'running';
  const currentExercise = state.runtime.currentExercise;
  const canEditSet =
    isActive &&
    isRuntimeRunning &&
    !!currentExercise &&
    !currentExercise.isSkipped &&
    !currentExercise.isCompleted &&
    !state.isConfirmingSkip &&
    !state.isMutating;
  const canEnd =
    isActive &&
    !state.isMutating &&
    !state.isConfirmingSkip &&
    state.endFlow === 'closed';

  if (runtimePhase === 'paused') {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PausedWorkoutState state={state} controls={controls} canEnd={canEnd} />
        <EndSessionModal state={state} controls={controls} />
      </KeyboardAvoidingView>
    );
  }

  if (runtimePhase === 'resting') {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RestingWorkoutState state={state} controls={controls} />
        <EndSessionModal state={state} controls={controls} />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SessionHeader data={data} />
        {currentExercise ? (
          <>
            <CurrentExerciseSection
              runtime={state.runtime}
              completedReps={state.companionRuntime?.progress.completedReps}
              targetWeight={state.setDraft.weight}
            />
            {state.actionError && (
              <ThemedText
                accessibilityRole="alert"
                style={styles.workoutAlertText}
              >
                {state.actionError}
              </ThemedText>
            )}
            <WorkoutNavigationControls
              state={state}
              controls={controls}
              canPause={canEditSet && state.endFlow === 'closed'}
            />
            <ProgressSummary runtime={state.runtime} />
            <CompletedSets sets={currentExercise.sets} />
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
          </>
        ) : (
          <ThemedText style={[styles.emptyCopy, styles.workoutMutedText]}>
            这次训练没有动作。
          </ThemedText>
        )}

        {state.canRetryCompanionEvent && (
          <PrimaryButton
            label="重试保存"
            accessibilityLabel="重试训练状态保存"
            disabled={state.isMutating}
            onPress={controls.retryCompanionEvent}
          />
        )}
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="保存并退出训练"
          style={({ pressed }) => [
            styles.saveExitBottomButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={styles.workoutAccentText}>
            保存退出
          </ThemedText>
        </Pressable>
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

function SessionHeader({ data }: { readonly data: WorkoutSessionScreenData }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        <ThemedText
          type="subtitle"
          numberOfLines={2}
          style={styles.workoutTitle}
        >
          {data.session.workoutNameSnapshot}
        </ThemedText>
      </View>
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
      <ThemedText type="smallBold" style={styles.workoutText}>
        动作 {exercisePosition} / {runtime.orderedExercises.length}
      </ThemedText>
      <ThemedText type="small" style={styles.workoutMutedText}>
        已完成 {runtime.completedSets} / {runtime.targetSets} 组
      </ThemedText>
    </View>
  );
}

function WorkoutNavigationControls({
  state,
  controls,
  canPause,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
  readonly canPause: boolean;
}) {
  const currentIndex = state.runtime.currentExerciseIndex;
  const currentExercise = state.runtime.currentExercise;
  const currentSetNumber = state.runtime.currentSetNumber ?? 1;
  const previousExercise =
    currentIndex === undefined
      ? undefined
      : state.runtime.orderedExercises
          .slice(0, currentIndex)
          .reverse()
          .find((exercise) => exercise.isEnabled);
  const nextExercise =
    currentIndex === undefined
      ? undefined
      : state.runtime.orderedExercises
          .slice(currentIndex + 1)
          .find((exercise) => exercise.isEnabled);
  const canNavigate =
    state.data.session.status === 'in_progress' &&
    state.companionRuntime?.phase === 'running' &&
    !state.isMutating &&
    !state.isConfirmingSkip &&
    state.endFlow === 'closed';
  const canMovePrevious =
    !!currentExercise &&
    (currentSetNumber > 1 || !!previousExercise) &&
    canNavigate;
  const canMoveNext =
    !!currentExercise &&
    (currentSetNumber < currentExercise.targetSets || !!nextExercise) &&
    canNavigate;

  return (
    <View style={styles.runtimeControls} accessibilityLabel="训练控制">
      <Pressable
        disabled={!canMovePrevious}
        accessibilityRole="button"
        accessibilityLabel="上一个"
        accessibilityState={{ disabled: !canMovePrevious }}
        onPress={() => {
          void controls.moveWorkoutPosition(-1);
        }}
        style={({ pressed }) => [
          styles.sideControlButton,
          !canMovePrevious && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="default" style={styles.workoutMutedText}>
          ‹ 上一个
        </ThemedText>
      </Pressable>
      <Pressable
        disabled={!canPause}
        accessibilityRole="button"
        accessibilityLabel="暂停训练"
        accessibilityState={{ disabled: !canPause }}
        onPress={controls.pauseWorkout}
        style={({ pressed }) => [
          styles.pauseControlButton,
          !canPause && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.pauseControlText}>Ⅱ</ThemedText>
      </Pressable>
      <Pressable
        disabled={!canMoveNext}
        accessibilityRole="button"
        accessibilityLabel="下一个"
        accessibilityState={{ disabled: !canMoveNext }}
        onPress={() => {
          void controls.moveWorkoutPosition(1);
        }}
        style={({ pressed }) => [
          styles.sideControlButton,
          !canMoveNext && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="default" style={styles.workoutMutedText}>
          下一个 ›
        </ThemedText>
      </Pressable>
    </View>
  );
}

function PausedWorkoutState({
  state,
  controls,
  canEnd,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
  readonly canEnd: boolean;
}) {
  const currentExercise = state.runtime.currentExercise;
  const completedReps = state.companionRuntime?.progress.completedReps ?? 0;
  const targetReps = currentExercise
    ? getExerciseTargetReps(currentExercise)
    : 0;

  return (
    <View
      style={styles.pausedState}
      accessibilityLabel="陪练运行状态：训练暂停"
    >
      <View style={styles.pausedCenter}>
        <ThemedText style={styles.workoutEyebrow}>训练已暂停</ThemedText>
        <ThemedText style={styles.pausedHeadline}>调整一下呼吸。</ThemedText>
        {currentExercise && (
          <View
            style={styles.pausedContextCard}
            accessible
            accessibilityLabel={`暂停训练当前动作：${currentExercise.exerciseNameSnapshot}`}
          >
            <ThemedText type="smallBold" style={styles.workoutText}>
              {currentExercise.exerciseNameSnapshot}
            </ThemedText>
            <ThemedText type="default" style={styles.workoutMutedText}>
              第 {state.runtime.currentSet ?? 1} 组 · {completedReps} /{' '}
              {targetReps} 次 · {state.setDraft.weight} kg
            </ThemedText>
            <ThemedText type="small" style={styles.workoutMutedText}>
              暂停期间不会推进次数。
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.pausedActions}>
        <PrimaryButton
          label="继续"
          accessibilityLabel="继续训练"
          disabled={state.isMutating}
          onPress={controls.resumeWorkout}
        />
        <Pressable
          disabled={!canEnd}
          accessibilityRole="button"
          accessibilityLabel="结束本次训练"
          accessibilityState={{ disabled: !canEnd }}
          onPress={controls.requestEndSession}
          style={({ pressed }) => [
            styles.pausedEndButton,
            !canEnd && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={styles.workoutMutedText}>
            结束训练
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function RestingWorkoutState({
  state,
  controls,
}: {
  readonly state: Extract<WorkoutSessionScreenState, { status: 'ready' }>;
  readonly controls: WorkoutSessionScreenControls;
}) {
  const currentExercise = state.runtime.currentExercise;
  const remainingSeconds = state.companionRuntime?.restRemainingSeconds ?? 0;
  const nextSetNumber =
    state.runtime.currentSetNumber ?? state.runtime.currentSet;

  return (
    <View
      style={styles.restingState}
      accessibilityLabel={`陪练运行状态：${formatCompanionRuntimeStatus(
        state.companionRuntime?.phase,
        state.runtime.status,
      )}`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="跳过休息"
        disabled={state.isMutating}
        onPress={() => {
          void controls.finishRest();
        }}
        style={({ pressed }) => [
          styles.skipRestButton,
          state.isMutating && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold" style={styles.workoutAccentText}>
          跳过休息
        </ThemedText>
      </Pressable>
      <View style={styles.restingCenter}>
        <ThemedText style={styles.workoutEyebrow}>休息调整</ThemedText>
        <ThemedText
          accessibilityLabel="休息剩余时间"
          style={styles.restingTimerDisplay}
        >
          {formatRemainingSeconds(remainingSeconds)}
        </ThemedText>
        <ThemedText type="default" style={styles.workoutMutedText}>
          距离下一组
        </ThemedText>
      </View>
      {currentExercise && (
        <View style={styles.nextSetCard}>
          <View style={styles.nextSetCopy}>
            <ThemedText type="small" style={styles.workoutMutedText}>
              下一组
            </ThemedText>
            <ThemedText type="subtitle" style={styles.workoutText}>
              {currentExercise.exerciseNameSnapshot} · 第 {nextSetNumber} 组
            </ThemedText>
            <ThemedText type="default" style={styles.workoutMutedText}>
              {state.setDraft.weight} 公斤 · {currentExercise.targetRepsMin}
              {currentExercise.targetRepsMin === currentExercise.targetRepsMax
                ? ''
                : `-${currentExercise.targetRepsMax}`}{' '}
              次
            </ThemedText>
          </View>
          <View
            style={styles.nextSetThumbnail}
            accessible
            accessibilityLabel={`下一组动作示意图：${currentExercise.exerciseNameSnapshot}`}
          >
            <ThemedText style={styles.nextSetThumbnailText}>
              {currentExercise.exerciseNameSnapshot.slice(0, 1)}
            </ThemedText>
          </View>
        </View>
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
            <ThemedText
              type="smallBold"
              style={[styles.exercisePosition, styles.workoutMutedText]}
            >
              {index + 1}
            </ThemedText>
            <View style={styles.exerciseRowCopy}>
              <ThemedText numberOfLines={2} style={styles.workoutText}>
                {exercise.exerciseNameSnapshot}
              </ThemedText>
              <ThemedText type="small" style={styles.workoutMutedText}>
                {formatExerciseState(exercise)}
              </ThemedText>
            </View>
            {isCurrent && (
              <ThemedText type="smallBold" style={styles.workoutAccentText}>
                当前
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function CurrentExerciseSection({
  runtime,
  completedReps,
  targetWeight,
}: {
  readonly runtime: WorkoutRuntimeSnapshot;
  readonly completedReps?: number;
  readonly targetWeight: string;
}) {
  const exercise = runtime.currentExercise;

  if (!exercise) {
    return null;
  }

  const targetReps = getExerciseTargetReps(exercise);
  const repProgress = completedReps ?? 0;

  return (
    <View style={styles.primarySection}>
      <View
        style={styles.exerciseHeroImage}
        accessible
        accessibilityLabel="当前动作示意图"
      >
        <View style={styles.exerciseHeroGlow} />
        <ThemedText style={styles.exerciseHeroInitial}>
          {exercise.exerciseNameSnapshot.slice(0, 1)}
        </ThemedText>
        <ThemedText style={styles.exerciseHeroCaption}>动作示意</ThemedText>
      </View>
      <View style={styles.exerciseIdentity}>
        <ThemedText style={styles.workoutEyebrow}>当前动作</ThemedText>
        <ThemedText type="subtitle" style={styles.workoutTitle}>
          {exercise.exerciseNameSnapshot}
        </ThemedText>
        <ThemedText style={styles.workoutMutedText}>
          第 {runtime.currentSet ?? 1} / {exercise.targetSets} 组 ·{' '}
          {formatTargetWeight(targetWeight)}目标 {targetReps} 次
        </ThemedText>
      </View>
      <View style={styles.repPanel}>
        <View>
          <ThemedText style={styles.workoutMutedText}>次数进度</ThemedText>
          <ThemedText style={styles.repCount}>
            {completedReps === undefined ? '—' : repProgress}
            <ThemedText style={styles.repTarget}> / {targetReps}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.workoutMutedText}>
            {completedReps === undefined
              ? formatCurrentSetState(exercise)
              : `已完成 ${repProgress} / ${targetReps} 次`}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function formatTargetWeight(value: string): string {
  const weight = Number(value);

  if (!Number.isFinite(weight) || weight <= 0) {
    return '';
  }

  return `${formatWeight(weight)} 公斤 · `;
}

function CompletedSets({ sets }: { readonly sets: readonly WorkoutSet[] }) {
  if (sets.length === 0) {
    return (
      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.workoutText}>
          已完成组
        </ThemedText>
        <ThemedText type="small" style={styles.workoutMutedText}>
          还没有完成的组。
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.workoutText}>
        已完成组
      </ThemedText>
      {sets.map((workoutSet) => (
        <View key={workoutSet.id} style={styles.completedSetRow}>
          <ThemedText type="small" style={styles.workoutMutedText}>
            第 {workoutSet.setNumber} 组
          </ThemedText>
          <ThemedText type="smallBold" style={styles.workoutText}>
            {formatWeight(workoutSet.weight)} kg × {workoutSet.actualReps} 次
          </ThemedText>
          {workoutSet.isExtraSet && (
            <ThemedText type="small" style={styles.workoutMutedText}>
              额外组
            </ThemedText>
          )}
        </View>
      ))}
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
            { borderColor: 'rgba(223, 221, 212, 0.88)' },
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
              tone="surface"
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
              tone="surface"
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
                  tone="surface"
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
        { backgroundColor: theme.actionPrimary },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: theme.actionOnPrimary, textAlign: 'center' }}
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
  tone = 'workout',
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly tone?: 'workout' | 'surface';
  readonly onPress: () => void;
}) {
  const theme = useTheme();
  const isWorkoutTone = tone === 'workout';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          borderColor: isWorkoutTone
            ? 'rgba(255, 255, 255, 0.18)'
            : theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={[
          styles.centerText,
          isWorkoutTone ? styles.workoutMutedText : undefined,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
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
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#151813',
  },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scrollContent: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  header: { gap: Spacing.three },
  headerTitle: { gap: Spacing.two, alignItems: 'flex-start' },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseList: {
    gap: Spacing.one,
  },
  exerciseRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  exercisePosition: { width: 24, textAlign: 'center' },
  exerciseRowCopy: { flex: 1 },
  primarySection: { gap: Spacing.three },
  exerciseHeroImage: {
    height: 330,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#20231E',
  },
  exerciseHeroGlow: {
    position: 'absolute',
    top: -40,
    right: -24,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(202, 255, 0, 0.36)',
  },
  exerciseHeroInitial: {
    color: '#FFFFFF',
    fontSize: 96,
    lineHeight: 104,
    fontWeight: '700',
  },
  exerciseHeroCaption: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  exerciseIdentity: { gap: Spacing.one },
  repPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  repCount: {
    color: '#FFFFFF',
    fontSize: 72,
    lineHeight: 76,
    fontWeight: '700',
    letterSpacing: 0,
  },
  repTarget: {
    color: 'rgba(255, 255, 255, 0.36)',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  coachPanel: {
    flex: 1,
    alignSelf: 'center',
    gap: Spacing.one,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.three,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  coachLabel: {
    color: '#CAFF00',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  coachCopy: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  voiceToggle: {
    minWidth: 48,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
  },
  voiceToggleEnabled: {
    borderColor: '#CAFF00',
    backgroundColor: 'rgba(202, 255, 0, 0.18)',
  },
  voiceToggleEnabledText: { color: '#CAFF00' },
  section: {
    gap: Spacing.three,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing.three,
  },
  completedSetRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  saveExitBottomButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202, 255, 0, 0.42)',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
  },
  runtimeControls: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sideControlButton: {
    minWidth: 112,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
  },
  pauseControlButton: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: '#CAFF00',
  },
  pauseControlText: {
    color: '#151813',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  pausedState: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  pausedCenter: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  pausedHeadline: {
    color: '#FFFFFF',
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '700',
    textAlign: 'center',
  },
  pausedContextCard: {
    width: '100%',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: Spacing.three,
  },
  pausedActions: {
    gap: Spacing.three,
  },
  pausedEndButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  restingState: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  skipRestButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  restingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  restingTimerDisplay: {
    color: '#FFFFFF',
    fontSize: 86,
    lineHeight: 94,
    fontWeight: '800',
    letterSpacing: 0,
  },
  nextSetCard: {
    minHeight: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: Spacing.three,
  },
  nextSetCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  nextSetThumbnail: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(202, 255, 0, 0.18)',
  },
  nextSetThumbnailText: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  workoutText: { color: '#FFFFFF' },
  workoutTitle: { color: '#FFFFFF' },
  workoutMutedText: { color: 'rgba(255, 255, 255, 0.58)' },
  workoutAccentText: { color: '#CAFF00' },
  workoutEyebrow: {
    color: '#CAFF00',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  workoutAlertText: {
    color: '#FFFFFF',
    borderRadius: 16,
    backgroundColor: 'rgba(164, 93, 84, 0.28)',
    padding: Spacing.three,
  },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72 },
});
