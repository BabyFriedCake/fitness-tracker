import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useOnboardingGate } from '@/features/onboarding/application/onboarding-state';
import { WorkoutCompanionSettingsProvider } from '@/features/workout-session/application/workout-companion-settings';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppNavigator />
    </ThemeProvider>
  );
}

function AppNavigator() {
  const onboardingGate = useOnboardingGate();

  if (onboardingGate.status === 'loading') {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <WorkoutCompanionSettingsProvider>
      <Stack
        initialRouteName={onboardingGate.isCompleted ? '(tabs)' : 'onboarding'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercises/[id]" />
        <Stack.Screen name="templates/new" />
        <Stack.Screen name="templates/[id]" />
        <Stack.Screen name="templates/[id]/edit" />
        <Stack.Screen name="today-plans/[id]/edit" />
        <Stack.Screen name="workout-sessions/[id]" />
        <Stack.Screen name="workout-sessions/[id]/summary" />
      </Stack>
    </WorkoutCompanionSettingsProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
