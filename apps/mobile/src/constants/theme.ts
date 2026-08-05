/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#211735',
    background: '#F8F6FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EAE3F6',
    textSecondary: '#756C89',
    statusSuccess: '#6D3DF5',
    actionPrimary: '#6D3DF5',
    actionOnPrimary: '#FFFFFF',
    workoutBackground: '#1D1729',
    workoutSurface: '#29203A',
    workoutTextSecondary: '#FFFFFF80',
  },
  dark: {
    text: '#ffffff',
    background: '#1D1729',
    backgroundElement: '#29203A',
    backgroundSelected: '#3A2C52',
    textSecondary: '#FFFFFF99',
    statusSuccess: '#A78BFA',
    actionPrimary: '#8B5CF6',
    actionOnPrimary: '#FFFFFF',
    workoutBackground: '#1D1729',
    workoutSurface: '#29203A',
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
