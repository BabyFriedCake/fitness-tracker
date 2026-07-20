import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useRecoverableWorkoutSession,
  type RecoverableWorkoutSessionState,
} from '@/features/workout-session/application/use-active-workout-session';
import { useTheme } from '@/hooks/use-theme';

export function TodayWorkoutRecoveryScreen() {
  const router = useRouter();
  const model = useRecoverableWorkoutSession();

  return (
    <TodayWorkoutRecoveryScreenContent
      state={model.state}
      onReload={model.reload}
      onResume={async (sessionId) => {
        const didContinue = await model.continueSession(sessionId);

        if (didContinue) {
          router.push({
            pathname: '/workout-sessions/[id]',
            params: { id: sessionId },
          });
        }
      }}
    />
  );
}

export function TodayWorkoutRecoveryScreenContent({
  state,
  onReload,
  onResume,
}: {
  readonly state: RecoverableWorkoutSessionState;
  readonly onReload: () => void;
  readonly onResume: (
    sessionId: Extract<
      RecoverableWorkoutSessionState,
      { status: 'ready' }
    >['data']['session']['id'],
  ) => void | Promise<void>;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">今天</ThemedText>
          {state.status === 'loading' && (
            <View style={styles.feedback} accessibilityRole="progressbar">
              <ActivityIndicator />
              <ThemedText type="small" themeColor="textSecondary">
                正在检查可恢复的训练
              </ThemedText>
            </View>
          )}
          {state.status === 'empty' && (
            <ThemedText themeColor="textSecondary">
              当前没有可恢复的训练。
            </ThemedText>
          )}
          {state.status === 'error' && (
            <View style={styles.feedback} accessibilityRole="alert">
              <ThemedText>{state.message}</ThemedText>
              <Pressable
                onPress={onReload}
                accessibilityRole="button"
                accessibilityLabel="重新加载可恢复的训练"
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="smallBold">重新加载</ThemedText>
              </Pressable>
            </View>
          )}
          {state.status === 'ready' && (
            <View style={styles.recoverySection}>
              <View style={styles.recoveryCopy}>
                <ThemedText type="small" themeColor="textSecondary">
                  {state.data.session.status === 'draft'
                    ? '可恢复的训练草稿'
                    : '进行中的训练'}
                </ThemedText>
                <ThemedText type="default">
                  {state.data.session.workoutNameSnapshot}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatRecoveryPosition(state)}
                </ThemedText>
                {state.data.restTimerStatus && (
                  <ThemedText type="small" themeColor="textSecondary">
                    休息计时：{formatTimerStatus(state.data.restTimerStatus)}
                  </ThemedText>
                )}
              </View>
              <Pressable
                onPress={() => void onResume(state.data.session.id)}
                disabled={state.isContinuing}
                accessibilityRole="button"
                accessibilityLabel={`继续训练${state.data.session.workoutNameSnapshot}`}
                accessibilityState={{ disabled: state.isContinuing }}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.text },
                  state.isContinuing && styles.disabledButton,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.background }}
                >
                  {state.isContinuing ? '正在恢复' : '继续训练'}
                </ThemedText>
              </Pressable>
              {state.continueError && (
                <ThemedText accessibilityRole="alert">
                  {state.continueError}
                </ThemedText>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function formatRecoveryPosition(
  state: Extract<RecoverableWorkoutSessionState, { status: 'ready' }>,
): string {
  if (!state.runtime.currentExercise) {
    return '当前没有可执行动作';
  }

  return `${state.runtime.currentExercise.exerciseNameSnapshot} · 第 ${
    state.runtime.currentSet ?? 1
  } 组`;
}

function formatTimerStatus(
  status: NonNullable<
    Extract<
      RecoverableWorkoutSessionState,
      { status: 'ready' }
    >['data']['restTimerStatus']
  >,
): string {
  switch (status) {
    case 'running':
      return '进行中';
    case 'paused':
      return '已暂停';
    case 'completed':
      return '已结束';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  recoverySection: {
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.four,
  },
  recoveryCopy: { gap: Spacing.one },
  feedback: { gap: Spacing.three },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  disabledButton: { opacity: 0.5 },
});
