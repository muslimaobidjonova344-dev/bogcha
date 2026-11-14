import { ConversationList } from '@/features/Messages';
import { PageTitle } from '@/components/ui/ui';

export default function Page() {
  return <><PageTitle title="Xabarlar" /><ConversationList base="/parent" /></>;
}
