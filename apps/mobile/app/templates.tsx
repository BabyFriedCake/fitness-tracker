import { PlaceholderScreen } from '@/components/placeholder-screen';
import { getTopLevelRoute } from '@/constants/routes';

export default function TemplatesRoute() {
  return <PlaceholderScreen route={getTopLevelRoute('templates')} />;
}
