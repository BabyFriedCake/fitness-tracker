import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APPLICATION_DATABASE_NAME } from '@/database/constants';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useApplicationReset } from '@/features/application-reset';

import {
  useWorkoutCompanionSettings,
  type WorkoutCompanionSettingsState,
} from '../application/workout-companion-settings';

const INPUT_SOURCE_OPTIONS: {
  readonly value: WorkoutCompanionSettingsState['inputSourceMode'];
  readonly label: string;
  readonly description: string;
}[] = [
  {
    value: 'off',
    label: '关闭',
    description: '不接收陪练输入，仅保留手动训练流程。',
  },
  {
    value: 'mock_auto_rep',
    label: 'Mock 自动计数',
    description: '开发演示用，点击后会发送模拟次数事件。',
  },
];

export function WorkoutCompanionSettingsScreen() {
  const {
    voiceFeedbackEnabled,
    inputSourceMode,
    setVoiceFeedbackEnabled,
    setInputSourceMode,
  } = useWorkoutCompanionSettings();
  const { requestApplicationReset } = useApplicationReset();
  const [isResetting, setIsResetting] = useState(false);

  async function resetDevelopmentData(): Promise<void> {
    if (isResetting) {
      return;
    }

    setIsResetting(true);

    try {
      await deleteDatabaseAsync(APPLICATION_DATABASE_NAME);
      requestApplicationReset();
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pageHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            当前训练会话
          </ThemedText>
          <ThemedText type="title">Companion 设置</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            这里只影响当前应用会话，不会写入用户设置或训练历史。
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">语音教练</ThemedText>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <ThemedText type="default">语音反馈</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                关闭后，训练页仍可手动操作，不会影响已保存记录。
              </ThemedText>
            </View>
            <Switch
              value={voiceFeedbackEnabled}
              onValueChange={setVoiceFeedbackEnabled}
              accessibilityLabel="切换语音教练"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">输入源</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            当前输入源：{formatInputSourceMode(inputSourceMode)}
          </ThemedText>
          <View style={styles.optionList}>
            {INPUT_SOURCE_OPTIONS.map((option) => {
              const selected = option.value === inputSourceMode;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setInputSourceMode(option.value);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`选择${option.label}输入源`}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.optionButton,
                    selected && styles.optionButtonSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <ThemedText type="smallBold">{option.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {option.description}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.optionDot,
                      selected && styles.optionDotSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">说明</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mock 仅用于开发和演示。真实识别、摄像头、姿态检测与 AI 推理仍然
            不在当前版本范围内。
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">开发环境</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            仅用于本地调试和真机验证。重置后会清空本地训练数据并重新初始化。
          </ThemedText>
          <Pressable
            onPress={() => void resetDevelopmentData()}
            disabled={isResetting}
            accessibilityRole="button"
            accessibilityLabel="重置开发环境数据"
            accessibilityState={{ disabled: isResetting }}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && !isResetting && styles.pressed,
              isResetting && styles.resetButtonDisabled,
            ]}
          >
            {isResetting ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="smallBold">重置开发环境数据</ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">音频权限</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            当前版本只显示权限边界，不请求系统音频权限。后续会在真实 Voice/TTS
            接入时补齐平台级请求与降级策略。
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function formatInputSourceMode(
  mode: WorkoutCompanionSettingsState['inputSourceMode'],
) {
  switch (mode) {
    case 'mock_auto_rep':
      return 'Mock 自动计数';
    case 'off':
    default:
      return '关闭';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  pageHeader: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  toggleCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  optionList: {
    gap: Spacing.two,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  optionButtonSelected: {
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  optionCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.3)',
  },
  optionDotSelected: {
    backgroundColor: '#0f172a',
  },
  resetButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1B2016',
    paddingHorizontal: Spacing.four,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.75,
  },
});
