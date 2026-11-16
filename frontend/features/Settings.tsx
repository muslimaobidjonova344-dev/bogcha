'use client';
import { PhoneField } from '@/features/auth/inputs';
import { formatUzPhone } from '@/lib/phone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import LockSettings from './LockSettings';
import { Button, Card, Field, PageTitle, useToast, Async } from '@/components/ui/ui';
import { useMe } from '@/hooks/useAuth';
import { get, patch, post, put, del } from '@/lib/api';
import { dmyHm, errMsg } from '@/lib/format';

const LABELS: Record<string, string> = {
  application_submitted: 'Ariza yuborildi', application_under_review: "Ariza ko'rib chiqilmoqda", application_accepted: 'Ariza qabul qilindi',
  application_rejected: 'Ariza rad etildi / bekor qilindi', application_more_info: "Qo'shimcha ma'lumot so'raldi", new_message: 'Yangi xabar',
  interview_scheduled: 'Suhbat belgilandi', lesson_reminder: 'Dars eslatmasi', provider_approved: 'Muassasa tasdiqlandi', provider_rejected: 'Muassasa rad etildi',
  review_new: 'Yangi sharh', system: 'Tizim xabarlari',
};

export default function Settings() {
  const me = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [pw, setPw] = useState({ old_password: '', new_password: '' });
  const [totp, setTotp] = useState<{ secret?: string; otpauth_uri?: string } | null>(null);
  const [code, setCode] = useState('');
  const prefs = useQuery({ queryKey: ['notif-settings'], queryFn: () => get('/notifications/settings') });
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => get('/auth/sessions') });
  const [local, setLocal] = useState<any>(null);
  const u = me.data;
  const saveProfile = useMutation({ mutationFn: () => patch('/auth/me', { full_name: name ?? u.full_name, ...(phone ? { phone } : {}) }), onSuccess: () => { toast.ok('Saqlandi'); qc.invalidateQueries({ queryKey: ['me'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const changePw = useMutation({ mutationFn: () => post('/auth/change-password', pw), onSuccess: () => { toast.ok("Parol o'zgartirildi"); setPw({ old_password: '', new_password: '' }); }, onError: (e) => toast.err(errMsg(e)) });
  const savePrefs = useMutation({ mutationFn: () => put('/notifications/settings', { prefs: local }), onSuccess: () => toast.ok('Saqlandi'), onError: (e) => toast.err(errMsg(e)) });
  const resend = useMutation({ mutationFn: () => post('/auth/resend-verification', { email: u.email }), onSuccess: () => toast.ok('Tasdiqlash xati yuborildi'), onError: (e) => toast.err(errMsg(e)) });
  const setup = useMutation({ mutationFn: () => post('/auth/2fa/setup'), onSuccess: (d) => setTotp(d), onError: (e) => toast.err(errMsg(e)) });
  const enable = useMutation({ mutationFn: () => post('/auth/2fa/enable', { code }), onSuccess: () => { toast.ok('2FA yoqildi'); setTotp(null); setCode(''); qc.invalidateQueries({ queryKey: ['me'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const disable = useMutation({ mutationFn: () => post('/auth/2fa/disable', { code }), onSuccess: () => { toast.ok("2FA o'chirildi"); setCode(''); qc.invalidateQueries({ queryKey: ['me'] }); }, onError: (e) => toast.err(errMsg(e)) });
  const revoke = useMutation({ mutationFn: (id: string) => del(`/auth/sessions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) });
  if (!u) return null;
  const cur = local ?? prefs.data?.prefs;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Sozlamalar" />
      <Card>
        <h2 className="mb-3 font-bold text-primary">Profil</h2>
        <div className="space-y-3">
          <Field label="Ism va familiya"><input className="input" value={name ?? u.full_name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email" hint={u.email_verified ? 'Tasdiqlangan ✓' : 'Tasdiqlanmagan'}><input className="input bg-black/5" value={u.email || ''} disabled /></Field>
          {!u.email_verified && <Button variant="outline" loading={resend.isPending} onClick={() => resend.mutate()}>Tasdiqlash xatini qayta yuborish</Button>}
          <PhoneField label="Telefon raqami" value={phone ?? formatUzPhone(u.phone || '')} onChange={setPhone} />
          <Button loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>Saqlash</Button>
        </div>
      </Card>
      <LockSettings />
      <Card>
        <h2 className="mb-3 font-bold text-primary">Parolni o&apos;zgartirish</h2>
        <div className="space-y-3">
          <Field label="Eski parol"><input type="password" className="input" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} autoComplete="current-password" /></Field>
          <Field label="Yangi parol" hint="Kamida 8 belgi, harf va raqam"><input type="password" className="input" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" /></Field>
          <Button loading={changePw.isPending} onClick={() => changePw.mutate()}>Parolni yangilash</Button>
        </div>
      </Card>
      <Card>
        <h2 className="mb-1 font-bold text-primary">Ikki bosqichli himoya (2FA)</h2>
        <p className="mb-3 text-sm text-black/60">Google Authenticator yoki shunga o&apos;xshash ilova kerak. Holat: <b>{u.totp_enabled ? 'yoqilgan' : "o'chiq"}</b></p>
        {!u.totp_enabled && !totp && <Button variant="outline" onClick={() => setup.mutate()}>2FA ni yoqish</Button>}
        {totp && (
          <div className="space-y-2 text-sm">
            <p>Ilovaga quyidagi maxfiy kalitni kiriting:</p>
            <code className="block break-all rounded-lg bg-primary-50 p-2">{totp.secret}</code>
            <Field label="Ilovadagi 6 xonali kod"><input className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} /></Field>
            <Button loading={enable.isPending} onClick={() => enable.mutate()}>Tasdiqlash</Button>
          </div>
        )}
        {u.totp_enabled && u.role !== 'super_admin' && (
          <div className="flex items-end gap-2"><Field label="Kod"><input className="input" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} /></Field><Button variant="danger" onClick={() => disable.mutate()}>O&apos;chirish</Button></div>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 font-bold text-primary">Bildirishnoma turlari</h2>
        <Async q={prefs} rows={3}>
          {(d) => (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="text-left text-xs text-black/50"><th className="py-1">Turi</th><th>Ilovada</th><th>Email</th></tr></thead>
                  <tbody>{d.types.map((t: string) => (
                    <tr key={t} className="border-t border-black/5">
                      <td className="py-2 pr-2">{LABELS[t] || t}</td>
                      {(['in_app', 'email'] as const).map((ch) => (
                        <td key={ch}><input type="checkbox" className="h-5 w-5 accent-[#245C43]" checked={cur?.[t]?.[ch] ?? true} onChange={(e) => setLocal({ ...(cur || {}), [t]: { ...(cur?.[t] || { in_app: true, email: true }), [ch]: e.target.checked } })} /></td>
                      ))}
                    </tr>))}</tbody></table>
              </div>
              <Button className="mt-3" loading={savePrefs.isPending} onClick={() => savePrefs.mutate()}>Saqlash</Button>
            </>
          )}
        </Async>
      </Card>
      <Card>
        <h2 className="mb-3 font-bold text-primary">Faol sessiyalar</h2>
        <Async q={sessions} rows={2}>{(list) => (
          <div className="space-y-2">{list.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-primary-50 p-2 text-xs"><span className="truncate">{s.ip} · {(s.user_agent || '').slice(0, 40)} · {dmyHm(s.created_at)}</span><Button variant="ghost" className="!min-h-[36px] !py-1" onClick={() => revoke.mutate(s.id)}>Yopish</Button></div>))}</div>)}
        </Async>
      </Card>
    </div>
  );
}
