'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/lib/format';

export default function MessageRedirect({ params }: { params: { id: string } }) {
  const me = useMe(); const router = useRouter();
  useEffect(() => {
    if (me.isLoading) return;
    if (!me.data) router.replace('/login?next=' + encodeURIComponent('/messages/' + params.id));
    else router.replace(`${ROLE_HOME[me.data.role] || ''}/messages/${params.id}`);
  }, [me.isLoading, me.data]); // eslint-disable-line
  return <p className="p-8 text-center text-black/50">Yo‘naltirilmoqda…</p>;
}
