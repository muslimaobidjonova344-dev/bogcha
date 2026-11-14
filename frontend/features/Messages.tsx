'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, FileText, Paperclip, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Async, Button, Card, Empty, PageTitle, useToast } from '@/components/ui/ui';
import { useMe } from '@/hooks/useAuth';
import { get, post, uploadFile } from '@/lib/api';
import { dmyHm, errMsg } from '@/lib/format';

export function ConversationList({ base }: { base: string }) {
  const q = useQuery({ queryKey: ['conversations'], queryFn: () => get('/conversations') });
  return (
    <>
      <PageTitle title="Xabarlar" />
      <Async q={q} empty={<Empty title="Suhbatlar yo'q" text="Muassasa sahifasidan «Xabar yozish» tugmasi orqali suhbat boshlang." />}>
        {(list) => (
          <div className="space-y-2">
            {list.map((c: any) => (
              <Link key={c.id} href={`${base}/messages/${c.id}`}>
                <Card className="flex items-center gap-3 !p-3 hover:shadow-pop transition">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary-light font-bold text-primary">{c.title.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="truncate font-bold">{c.title}</span><span className="shrink-0 text-xs text-black/40">{c.last_message ? dmyHm(c.last_message.created_at) : ''}</span></div>
                    <div className="truncate text-sm text-black/55">{c.last_message ? (c.last_message.kind === 'text' ? c.last_message.body : '📎 Fayl') : 'Xabar yo‘q'}</div>
                  </div>
                  {c.unread_count > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">{c.unread_count}</span>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}

export function Thread({ id, base }: { id: string; base: string }) {
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const q = useQuery({ queryKey: ['messages', id], queryFn: () => get(`/conversations/${id}/messages`), refetchInterval: 15_000 });
  const conv = useQuery({ queryKey: ['conversations'], queryFn: () => get('/conversations') });
  const title = conv.data?.find((c: any) => c.id === id)?.title || 'Suhbat';
  useEffect(() => { post(`/conversations/${id}/read`).then(() => qc.invalidateQueries({ queryKey: ['conversations'] })).catch(() => {}); }, [id, q.data?.length]); // eslint-disable-line
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [q.data?.length]);
  const send = useMutation({
    mutationFn: (b: any) => post(`/conversations/${id}/messages`, b),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['messages', id] }); qc.invalidateQueries({ queryKey: ['conversations'] }); },
    onError: (e) => toast.err(errMsg(e)),
  });
  const onFile = async (f?: File | null) => {
    if (!f) return;
    try {
      const kind = f.type.startsWith('image/') ? 'image' : 'document';
      const up = await uploadFile(f, 'private');
      send.mutate({ kind, file_id: up.id });
    } catch (e) { toast.err(errMsg(e)); }
  };
  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-3xl flex-col lg:h-[calc(100dvh-8rem)]">
      <div className="mb-2 flex items-center gap-2">
        <Link href={`${base}/messages`} className="rounded-xl p-2 hover:bg-black/5" aria-label="Orqaga"><ArrowLeft size={20} /></Link>
        <h1 className="truncate text-lg font-extrabold text-primary">{title}</h1>
      </div>
      <div className="card flex-1 space-y-2 overflow-y-auto p-3">
        {q.isLoading && <div className="skeleton h-12 w-2/3" />}
        {q.data?.length === 0 && <p className="py-10 text-center text-sm text-black/50">Birinchi xabarni yozing</p>}
        {q.data?.map((m: any) => {
          const mine = m.sender_id === me.data?.id;
          return (
            <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={clsx('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'bg-primary text-white rounded-br-md' : 'bg-primary-50 rounded-bl-md')}>
                {m.hidden ? <i className="opacity-60">Xabar moderator tomonidan yashirilgan</i> : m.kind === 'text' ? <span className="whitespace-pre-wrap break-words">{m.body}</span> : m.kind === 'image' && m.file ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={`/api/v1/files/${m.file.id}/download`} target="_blank"><img src={`/api/v1/files/${m.file.id}/download`} alt={m.file.filename} className="max-h-60 rounded-xl" /></a>
                ) : m.file ? <a className="flex items-center gap-2 underline" href={`/api/v1/files/${m.file.id}/download`} target="_blank"><FileText size={16} />{m.file.filename}</a> : null}
                <div className={clsx('mt-1 text-[10px]', mine ? 'text-white/70' : 'text-black/40')}>{dmyHm(m.created_at)}{mine && (m.read_at ? ' · ✓✓' : ' · ✓')}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form className="mt-2 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate({ kind: 'text', body: text }); }}>
        <label className="btn btn-outline cursor-pointer !px-3" aria-label="Fayl biriktirish"><Paperclip size={18} /><input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <textarea className="input !min-h-[44px] max-h-32 resize-none" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Xabar yozing..."
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate({ kind: 'text', body: text }); } }} maxLength={4000} />
        <Button type="submit" loading={send.isPending} aria-label="Yuborish"><Send size={18} /></Button>
      </form>
    </div>
  );
}
