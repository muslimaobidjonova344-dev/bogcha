'use client';
import { ContractView } from '@/features/Contracts';

export default function Page({ params }: { params: { id: string } }) {
  return <ContractView id={params.id} role="parent" base="/parent" />;
}
