import Cabinet from '@/features/Cabinet';
import { KG_NAV } from '@/lib/nav';

export default function Page() {
  return <Cabinet nav={KG_NAV} base="/kindergarten" />;
}
