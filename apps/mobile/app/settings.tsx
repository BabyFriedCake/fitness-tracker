import { PlaceholderScreen } from '@/components/placeholder-screen';
import { getTopLevelRoute } from '@/constants/routes';

export default function SettingsRoute() {
  return <PlaceholderScreen route={getTopLevelRoute('settings')} />;
}
