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
import {
  ApplicationResetProvider,
  useApplicationReset,
} from '@/features/application-reset';
import { useOnboardingGate } from '@/features/onboarding/application/onboarding-state';
import { WorkoutCompanionSettingsProvider } from '@/features/workout-session/application/workout-companion-settings';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ApplicationResetProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ResetAwareApp />
      </ThemeProvider>
    </ApplicationResetProvider>
  );
}

function ResetAwareApp() {
  const { resetVersion } = useApplicationReset();

  return <AppNavigator key={resetVersion} />;
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
