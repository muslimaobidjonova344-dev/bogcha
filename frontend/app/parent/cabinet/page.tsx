import Cabinet from '@/features/Cabinet';
import { PARENT_NAV } from '@/lib/nav';

export default function Page() {
  return <Cabinet nav={PARENT_NAV} base="/parent" />;
}
