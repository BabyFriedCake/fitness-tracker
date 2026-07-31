import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  useOnboarding,
  type OnboardingScreenControls,
  type OnboardingScreenState,
} from '@/features/onboarding/application/onboarding-state';
import { useTheme } from '@/hooks/use-theme';

export function OnboardingScreen({
  onFinish,
}: {
  readonly onFinish: () => void;
}) {
  const model = useOnboarding();

  return <OnboardingContent {...model} onFinish={onFinish} />;
}

export type OnboardingContentProps = {
  readonly state: OnboardingScreenState;
  readonly controls: OnboardingScreenControls;
  readonly onFinish: () => void;
};

export function OnboardingContent({
  state,
  controls,
  onFinish,
}: OnboardingContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && (
          <FeedbackState
            title="首次设置加载失败"
            message={state.message}
            actionLabel="重新加载"
            accessibilityLabel="重新加载首次设置"
            onAction={controls.reload}
          />
        )}
        {state.status === 'ready' && (
          <ReadyState state={state} controls={controls} onFinish={onFinish} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedback} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="small" themeColor="textSecondary">
        正在准备首次设置
      </ThemedText>
    </ThemedView>
  );
}

function FeedbackState({
  title,
  message,
  actionLabel,
  accessibilityLabel,
  onAction,
}: {
  readonly title: string;
  readonly message: string;
  readonly actionLabel: string;
  readonly accessibilityLabel: string;
  readonly onAction: () => void;
}) {
  return (
    <ThemedView style={styles.feedback} accessibilityRole="alert">
      <ThemedText type="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      <OnboardingButton
        label={actionLabel}
        accessibilityLabel={accessibilityLabel}
        primary
        onPress={onAction}
      />
    </ThemedView>
  );
}

function ReadyState({
  state,
  controls,
  onFinish,
}: {
  readonly state: Extract<OnboardingScreenState, { readonly status: 'ready' }>;
  readonly controls: OnboardingScreenControls;
  readonly onFinish: () => void;
}) {
  const step = state.progress.step;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          Fitness Tracker
        </ThemedText>
        <ThemedText type="title">{getStepTitle(step)}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          {getStepDescription(step)}
        </ThemedText>
      </View>

      <StepIndicator step={step} />

      {step === 'welcome' && (
        <View style={styles.actionStack}>
          <OnboardingButton
            label="开始设置"
            accessibilityLabel="开始首次设置"
            primary
            onPress={() => {
              void controls.startSetup();
            }}
          />
          <OnboardingButton
            label="稍后"
            accessibilityLabel="跳过首次设置并进入今天"
            onPress={() => {
              void controls.complete().then((didComplete) => {
                if (didComplete) {
                  onFinish();
                }
              });
            }}
          />
        </View>
      )}

      {step === 'goal' && (
        <View style={styles.actionStack}>
          <ChoiceCard
            title="从空白模板开始"
            description="先创建一个空白模板，之后自己添加动作。"
            onPress={() => {
              void controls.chooseTemplate('blank');
            }}
          />
          <ChoiceCard
            title="使用示例模板"
            description="创建一个包含基础动作的全身训练模板。"
            onPress={() => {
              void controls.chooseTemplate('example');
            }}
          />
          <OnboardingButton
            label="跳过目标"
            accessibilityLabel="跳过训练方向选择"
            onPress={() => {
              void controls.skipGoal();
            }}
          />
        </View>
      )}

      {step === 'template' && (
        <View style={styles.actionStack}>
          <ThemedView type="backgroundElement" style={styles.infoCard}>
            <ThemedText type="smallBold">创建第一个训练模板</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {state.progress.templateChoice === 'example'
                ? '将创建一个包含卧推、高位下拉、肩推和腿举的示例模板。'
                : state.progress.templateChoice === 'blank'
                  ? '将创建一个空白模板，之后可以继续添加动作。'
                  : '你可以创建空白模板，也可以使用示例模板。'}
            </ThemedText>
          </ThemedView>

          <OnboardingButton
            label="创建空白模板"
            accessibilityLabel="创建空白训练模板"
            primary={state.progress.templateChoice !== 'example'}
            disabled={state.isSubmitting}
            onPress={() => {
              void controls.createBlankTemplate();
            }}
          />
          <OnboardingButton
            label="创建示例模板"
            accessibilityLabel="创建示例训练模板"
            primary={state.progress.templateChoice === 'example'}
            disabled={state.isSubmitting}
            onPress={() => {
              void controls.createExampleTemplate();
            }}
          />
          <OnboardingButton
            label="稍后"
            accessibilityLabel="稍后创建模板并进入今天"
            disabled={state.isSubmitting}
            onPress={() => {
              void controls.complete().then((didComplete) => {
                if (didComplete) {
                  onFinish();
                }
              });
            }}
          />
        </View>
      )}

      {step === 'completed' && (
        <View style={styles.actionStack}>
          <ThemedView type="backgroundElement" style={styles.infoCard}>
            <ThemedText type="smallBold">准备好了</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              你可以从今天页面添加训练计划，或继续完善模板。
            </ThemedText>
          </ThemedView>
          <OnboardingButton
            label="开始第一次训练"
            accessibilityLabel="完成首次设置并进入今天"
            primary
            onPress={onFinish}
          />
          <OnboardingButton
            label="稍后"
            accessibilityLabel="完成首次设置稍后训练"
            onPress={onFinish}
          />
        </View>
      )}

      {state.actionError && (
        <ThemedText accessibilityRole="alert">{state.actionError}</ThemedText>
      )}
    </ScrollView>
  );
}

function StepIndicator({ step }: { readonly step: string }) {
  const steps = ['welcome', 'goal', 'template', 'completed'];
  const currentIndex = Math.max(0, steps.indexOf(step));

  return (
    <View
      style={styles.stepRow}
      accessibilityLabel={`首次设置第 ${currentIndex + 1} 步`}
    >
      {steps.map((item, index) => (
        <View
          key={item}
          style={[
            styles.stepDot,
            index <= currentIndex && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );
}

function ChoiceCard({
  title,
  description,
  onPress,
}: {
  readonly title: string;
  readonly description: string;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.choiceCard,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
    </Pressable>
  );
}

function OnboardingButton({
  label,
  accessibilityLabel,
  primary = false,
  disabled = false,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly primary?: boolean;
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
        styles.button,
        primary
          ? { backgroundColor: theme.text }
          : { borderColor: theme.backgroundSelected, borderWidth: 1 },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={primary ? { color: theme.background } : undefined}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function getStepTitle(step: string): string {
  switch (step) {
    case 'goal':
      return '选择训练开始方式。';
    case 'template':
      return '创建第一个模板。';
    case 'completed':
      return '准备好了。';
    case 'welcome':
    default:
      return '欢迎使用 Fitness Tracker。';
  }
}

function getStepDescription(step: string): string {
  switch (step) {
    case 'goal':
      return '可以直接从空白模板开始，也可以用示例模板快速体验。';
    case 'template':
      return '模板只影响未来训练，不会改写历史数据。';
    case 'completed':
      return '接下来从今天页面添加训练计划并开始训练。';
    case 'welcome':
    default:
      return '记录真实训练，看见长期进步。';
  }
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
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  stepDotActive: {
    backgroundColor: '#0f172a',
  },
  actionStack: {
    gap: Spacing.three,
  },
  infoCard: {
    gap: Spacing.one,
    borderRadius: 24,
    padding: Spacing.three,
  },
  choiceCard: {
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
  },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    paddingHorizontal: Spacing.three,
  },
  feedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
