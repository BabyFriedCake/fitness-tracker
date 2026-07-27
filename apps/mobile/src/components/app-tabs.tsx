import { Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { TOP_LEVEL_ROUTES } from '@/constants/routes';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const theme = scheme ?? 'light';
  const colors = Colors[theme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {TOP_LEVEL_ROUTES.map((route) => (
        <NativeTabs.Trigger key={route.key} name={route.name}>
          <Label>{route.title}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
