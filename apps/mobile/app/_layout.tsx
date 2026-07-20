import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercises/[id]" />
        <Stack.Screen name="templates/new" />
        <Stack.Screen name="templates/[id]" />
        <Stack.Screen name="workout-sessions/[id]" />
        <Stack.Screen name="workout-sessions/[id]/summary" />
      </Stack>
    </ThemeProvider>
  );
}
