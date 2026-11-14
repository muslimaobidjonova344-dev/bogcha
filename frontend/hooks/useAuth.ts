'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { get, post } from '@/lib/api';
import { ROLE_HOME } from '@/lib/format';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => { try { return await get('/auth/me'); } catch (e: any) { if (e.status === 401) return null; throw e; } },
    staleTime: 60_000,
  });
}

/** Rolni majburiy tekshiradi (UI uchun; asosiy himoya backendda). */
export function useRequireRole(roles: string[]) {
  const q = useMe();
  const router = useRouter();
  useEffect(() => {
    if (q.isLoading) return;
    if (!q.data) router.replace('/login?next=' + encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/'));
    else if (!roles.includes(q.data.role)) router.replace(ROLE_HOME[q.data.role] || '/');
  }, [q.isLoading, q.data]); // eslint-disable-line
  return q;
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => { try { await post('/auth/logout'); } catch {} qc.clear(); router.replace('/'); };
}
