import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
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
      indicatorColor={colors.actionPrimary}
      iconColor={{
        default: colors.textSecondary,
        selected: colors.actionPrimary,
      }}
      labelStyle={{ selected: { color: colors.actionPrimary } }}
    >
      {TOP_LEVEL_ROUTES.map((route) => (
        <NativeTabs.Trigger key={route.key} name={route.name}>
          <Icon sf={getTabIcon(route.key)} />
          <Label>{route.title}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

function getTabIcon(key: (typeof TOP_LEVEL_ROUTES)[number]['key']) {
  switch (key) {
    case 'today':
      return { default: 'house', selected: 'house.fill' } as const;
    case 'templates':
      return { default: 'dumbbell', selected: 'dumbbell.fill' } as const;
    case 'exercises':
      return {
        default: 'square.grid.2x2',
        selected: 'square.grid.2x2.fill',
      } as const;
    case 'history':
      return { default: 'clock', selected: 'clock.fill' } as const;
  }
}
