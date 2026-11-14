import ProviderDetail from '@/features/ProviderDetail';

export default function Page({ params }: { params: { id: string } }) { return <ProviderDetail id={params.id} type="kindergarten" />; }
