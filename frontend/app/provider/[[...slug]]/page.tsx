'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/lib/format';

/** Backend bildirishnomalaridagi /provider/... havolalarini rolga qarab yo'naltiradi. */
export default function ProviderRedirect({ params }: { params: { slug?: string[] } }) {
  const me = useMe(); const router = useRouter();
  useEffect(() => {
    if (me.isLoading) return;
    const rest = '/' + (params.slug || []).join('/');
    if (!me.data) router.replace('/login?next=' + encodeURIComponent('/provider' + (rest === '/' ? '' : rest)));
    else router.replace((ROLE_HOME[me.data.role] || '/') + (rest === '/' ? '' : rest));
  }, [me.isLoading, me.data]); // eslint-disable-line
  return <p className="p-8 text-center text-black/50">Yo‘naltirilmoqda…</p>;
}
