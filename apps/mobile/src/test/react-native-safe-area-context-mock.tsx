import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

export const SafeAreaView = View;

export function SafeAreaProvider({ children }: PropsWithChildren) {
  return children;
}

export function useSafeAreaInsets() {
  return { top: 47, right: 0, bottom: 34, left: 0 };
}
