import { useRouter } from 'expo-router';

import { WorkoutCompanionSettingsScreen } from '@/features/workout-session/screens/workout-companion-settings-screen';

export default function SettingsRoute() {
  const router = useRouter();

  return <WorkoutCompanionSettingsScreen onBack={() => router.back()} />;
}
