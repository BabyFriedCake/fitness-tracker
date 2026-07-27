import { router } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/screens/onboarding-screen';

export default function OnboardingRoute() {
  return (
    <OnboardingScreen
      onFinish={() => {
        router.replace('/(tabs)');
      }}
    />
  );
}
