import { useRouter } from 'expo-router';

import { PersonalCenterScreen } from '@/features/workout-session/screens/personal-center-screen';

export default function ProfileRoute() {
  const router = useRouter();

  return (
    <PersonalCenterScreen
      onBack={() => router.back()}
      onOpenSettings={() => router.push('/settings')}
    />
  );
}
