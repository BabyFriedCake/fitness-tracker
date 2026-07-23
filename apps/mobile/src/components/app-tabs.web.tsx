import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import {
  Pressable,
  useColorScheme,
  useWindowDimensions,
  View,
  StyleSheet,
} from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { TOP_LEVEL_ROUTES } from '@/constants/routes';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const compact = width < 640;

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList compact={compact}>
          {TOP_LEVEL_ROUTES.map((route) => (
            <TabTrigger
              key={route.key}
              name={route.name}
              href={route.href}
              asChild
            >
              <TabButton compact={compact}>{route.title}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  compact = false,
  ...props
}: TabTriggerSlotProps & { readonly compact?: boolean }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        compact && styles.compactTrigger,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.tabButtonView, compact && styles.compactTabButtonView]}
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? 'text' : 'textSecondary'}
          style={compact ? styles.compactTabText : undefined}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList({
  compact = false,
  ...props
}: TabListProps & { readonly compact?: boolean }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.innerContainer,
          compact && styles.compactInnerContainer,
          { borderColor: colors.backgroundSelected },
        ]}
      >
        {!compact && (
          <ThemedText type="smallBold" style={styles.brandText}>
            Fitness Tracker
          </ThemedText>
        )}

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  compactInnerContainer: {
    paddingHorizontal: Spacing.one,
    gap: 0,
  },
  compactTrigger: {
    minWidth: 0,
    flex: 1,
  },
  compactTabButtonView: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  compactTabText: {
    textAlign: 'center',
  },
});
