/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B2016',
    background: '#F1F0EA',
    backgroundElement: '#F7F6F1',
    backgroundSelected: '#DFDDD4',
    textSecondary: '#77766D',
    statusSuccess: '#577414',
    actionPrimary: '#CAFF00',
    actionOnPrimary: '#1B2016',
    workoutBackground: '#151813',
    workoutSurface: '#20231E',
    workoutTextSecondary: '#FFFFFF80',
  },
  dark: {
    text: '#ffffff',
    background: '#151813',
    backgroundElement: '#20231E',
    backgroundSelected: '#343A30',
    textSecondary: '#FFFFFF99',
    statusSuccess: '#CAFF00',
    actionPrimary: '#CAFF00',
    actionOnPrimary: '#1B2016',
    workoutBackground: '#151813',
    workoutSurface: '#20231E',
    workoutTextSecondary: '#FFFFFF80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
