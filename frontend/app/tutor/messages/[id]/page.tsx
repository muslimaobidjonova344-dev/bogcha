import { Thread } from '@/features/Messages';

export default function Page({ params }: { params: { id: string } }) {
  return <Thread id={params.id} base="/tutor" />;
}
