import { PlaceholderScreen } from '@/components/placeholder-screen';
import { getTopLevelRoute } from '@/constants/routes';

export default function ExercisesRoute() {
  return <PlaceholderScreen route={getTopLevelRoute('exercises')} />;
}
