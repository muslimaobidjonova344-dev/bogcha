import Cabinet from '@/features/Cabinet';
import { TUTOR_NAV } from '@/lib/nav';

export default function Page() {
  return <Cabinet nav={TUTOR_NAV} base="/tutor" />;
}
