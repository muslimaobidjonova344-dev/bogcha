import { ApplicationDetail } from '@/features/Parent';

export default function Page({ params }: { params: { id: string } }) {
  return <ApplicationDetail id={params.id} />;
}
