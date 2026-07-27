import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { WorkoutCompanionSettingsProvider } from '@/features/workout-session/application/workout-companion-settings';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <WorkoutCompanionSettingsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="exercises/[id]" />
          <Stack.Screen name="templates/new" />
          <Stack.Screen name="templates/[id]" />
          <Stack.Screen name="templates/[id]/edit" />
          <Stack.Screen name="workout-sessions/[id]" />
          <Stack.Screen name="workout-sessions/[id]/summary" />
        </Stack>
      </WorkoutCompanionSettingsProvider>
    </ThemeProvider>
  );
}
