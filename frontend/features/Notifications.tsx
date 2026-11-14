'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Async, Button, Card, Empty, PageTitle, Pagination } from '@/components/ui/ui';
import { get, post } from '@/lib/api';
import { dmyHm } from '@/lib/format';

const PROVIDER_LINK = /^\/provider\//;

export default function Notifications() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications', page], queryFn: () => get('/notifications', { page, page_size: 15 }) });
  const readAll = useMutation({ mutationFn: () => post('/notifications/read-all'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const readOne = useMutation({ mutationFn: (id: string) => post(`/notifications/${id}/read`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  return (
    <>
      <PageTitle title="Bildirishnomalar" action={<Button variant="outline" onClick={() => readAll.mutate()}>Hammasini o&apos;qilgan deb belgilash</Button>} />
      <Async q={q} empty={<Empty title="Bildirishnomalar yo'q" text="Yangi voqealar shu yerda ko'rinadi." />}>
        {(d) => (
          <>
            <div className="space-y-2">
              {d.items.map((n: any) => (
                <Link key={n.id} href={n.link || '#'} onClick={() => !n.read && readOne.mutate(n.id)}>
                  <Card className={`flex items-start gap-3 !p-3 ${n.read ? 'opacity-70' : 'border-l-4 !border-l-primary'}`}>
                    <Bell size={18} className="mt-1 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-primary">{n.title}</div>
                      {n.body && <div className="text-sm text-black/65 break-words">{n.body}</div>}
                      <div className="mt-1 text-xs text-black/40">{dmyHm(n.created_at)}</div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <Pagination page={page} pageSize={15} total={d.total} onChange={setPage} />
          </>
        )}
      </Async>
    </>
  );
}
