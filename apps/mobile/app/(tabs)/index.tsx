import { PlaceholderScreen } from '@/components/placeholder-screen';
import { getTopLevelRoute } from '@/constants/routes';

export default function TodayRoute() {
  return <PlaceholderScreen route={getTopLevelRoute('today')} />;
}
