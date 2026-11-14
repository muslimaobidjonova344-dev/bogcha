import { ProviderApplicationDetail } from '@/features/ProviderCommon';

export default function Page({ params }: { params: { id: string } }) {
  return <ProviderApplicationDetail id={params.id} />;
}
