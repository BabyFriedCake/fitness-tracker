import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export function PersonalCenterScreen({
  onBack,
  onOpenSettings,
}: {
  readonly onBack: () => void;
  readonly onOpenSettings: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <ThemedText type="small" themeColor="textSecondary">
              个人中心
            </ThemedText>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="返回今天"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" themeColor="textSecondary">
                返回
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="title">我的</ThemedText>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <ThemedText type="title" style={styles.avatarText}>
                我
              </ThemedText>
            </View>
            <View style={styles.profileCopy}>
              <ThemedText type="subtitle" style={styles.profileTitle}>
                我的训练
              </ThemedText>
              <ThemedText type="small" style={styles.profileSubtitle}>
                本地优先，训练数据仅保存在此设备
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              训练与偏好
            </ThemedText>
            <SettingsRow
              label="偏好设置"
              description="语音教练、自动计数与本地数据"
              onPress={onOpenSettings}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              身体数据
            </ThemedText>
            <View style={styles.unconfiguredCard}>
              <ThemedText type="default">尚未设置身体数据</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                当前版本不会虚构身高、体重或 BMI。该能力将在资料设置完成后显示。
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SettingsRow({
  label,
  description,
  onPress,
}: {
  readonly label: string;
  readonly description: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`打开${label}`}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <View style={styles.settingsCopy}>
        <ThemedText type="default">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" themeColor="textSecondary">
        →
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  profileCard: {
    minHeight: 168,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 32,
    backgroundColor: '#1B2016',
    padding: Spacing.four,
  },
  avatar: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    backgroundColor: '#CAFF00',
  },
  avatarText: { color: '#1B2016', fontSize: 44, lineHeight: 48 },
  profileCopy: { flex: 1, gap: Spacing.one },
  profileTitle: {
    color: '#FFFFFF',
    fontFamily: 'system-ui',
    fontSize: 28,
    lineHeight: 36,
  },
  profileSubtitle: { color: 'rgba(255, 255, 255, 0.62)' },
  section: { gap: Spacing.two },
  settingsRow: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCD8CE',
    borderRadius: 24,
    backgroundColor: '#F7F6F1',
    paddingHorizontal: Spacing.three,
  },
  settingsCopy: { flex: 1, gap: Spacing.one },
  unconfiguredCard: {
    gap: Spacing.one,
    borderRadius: 24,
    backgroundColor: '#EAE8E1',
    padding: Spacing.three,
  },
  pressed: { opacity: 0.72 },
});
