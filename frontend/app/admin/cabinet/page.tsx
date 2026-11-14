import Cabinet from '@/features/Cabinet';
import { ADMIN_NAV } from '@/lib/nav';

export default function Page() {
  return <Cabinet nav={ADMIN_NAV} base="/admin" />;
}
