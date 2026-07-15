import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { TopLevelRoute } from '@/constants/routes';

export type PlaceholderScreenProps = {
  readonly route: TopLevelRoute;
};

export function PlaceholderScreen({ route }: PlaceholderScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="subtitle" style={styles.title}>
            {route.title}
          </ThemedText>
          <ThemedText
            type="default"
            themeColor="textSecondary"
            style={styles.note}
          >
            {route.note}
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
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
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  note: {
    textAlign: 'center',
  },
});
