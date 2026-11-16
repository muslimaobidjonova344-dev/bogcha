'use client';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ClipboardList, Clock, FileSignature, Percent, Star, TrendingUp, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Async, Card, PageTitle, Tabs } from '@/components/ui/ui';
import { BarChart, C, ChartCard, Donut, Funnel, HBars, Kpi, LineChart, hoursText, num } from '@/components/ui/Charts';
import { cleanName } from '@/components/ui/Art';
import { get } from '@/lib/api';
import { APP_STATUS, uzs } from '@/lib/format';

const STATUS_COLOR: Record<string, string> = { SUBMITTED: C.sun, UNDER_REVIEW: C.blue, MORE_INFO_REQUIRED: C.coral, INTERVIEW_SCHEDULED: C.violet, ACCEPTED: C.green, REJECTED: '#C8574B', CANCELLED: C.gray };
const statusData = (sc: Record<string, number>) => Object.entries(APP_STATUS).map(([k, v]) => ({ k: v.label, v: sc[k] || 0, color: STATUS_COLOR[k] }));
const CONTRACT: Record<string, { k: string; color: string }> = { active: { k: 'Faol (imzolangan)', color: C.green }, sent: { k: 'Imzo kutilmoqda', color: C.sun }, cancelled: { k: 'Bekor qilingan', color: C.gray } };
const LESSON: Record<string, { k: string; color: string }> = { done: { k: 'O‘tkazilgan', color: C.green }, planned: { k: 'Rejalashtirilgan', color: C.blue }, cancelled: { k: 'Bekor qilingan', color: C.gray } };
const mapCounts = (src: Record<string, number> | undefined, dict: Record<string, { k: string; color: string }>) => Object.entries(dict).map(([k, v]) => ({ k: v.k, v: src?.[k] || 0, color: v.color }));
const peak = (labels: string[], vals: number[]) => { const i = vals.indexOf(Math.max(...vals)); return vals[i] > 0 ? { label: labels[i], v: vals[i] } : null; };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/* ======================= Administrator hisobotlari ======================= */
export function AdminAnalytics() {
  const [months, setMonths] = useState('6');
  const q = useQuery({ queryKey: ['adm-analytics', months], queryFn: () => get('/admin/analytics', { months: Number(months) }) });
  return (
    <>
      <PageTitle title="Hisobotlar" sub="Platformadagi barcha jarayonlarning umumiy ko‘rinishi: foydalanuvchilar, arizalar, shartnomalar va sifat" action={<Tabs value={months} onChange={setMonths} tabs={[{ id: '3', label: '3 oy' }, { id: '6', label: '6 oy' }, { id: '12', label: '12 oy' }]} />} />
      <Async q={q} rows={4}>{(d) => {
        const k = d.kpi, m = d.months as string[];
        const total = (i: number) => d.applications.kindergarten[i] + d.applications.tutor[i];
        const per = m.map((_, i) => total(i));
        const pk = peak(m, per);
        const topRegion = d.by_region[0];
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi tone="green" label="Foydalanuvchilar" value={num(k.users_total)} hint={`shundan ${num(k.users_new)} tasi so‘nggi ${months} oyda qo‘shilgan`} icon={<Users size={16} />} />
              <Kpi label="Faol muassasalar" value={num(k.providers_active)} hint={`${num(k.providers_pending)} tasi tekshiruv kutmoqda`} icon={<BadgeCheck size={16} />} />
              <Kpi tone="sun" label={`Arizalar (${months} oy)`} value={num(k.applications_period)} hint={`jami ${num(k.applications_total)} ta`} icon={<ClipboardList size={16} />} />
              <Kpi label="Qabul qilish ko‘rsatkichi" value={k.acceptance_rate == null ? '—' : `${k.acceptance_rate}%`} hint="qaror qilingan arizalar ichida qabul ulushi" icon={<Percent size={16} />} />
              <Kpi label="O‘rtacha javob vaqti" value={hoursText(k.avg_response_hours)} hint="ariza yuborilgandan birinchi javobgacha" icon={<Clock size={16} />} />
              <Kpi tone="peach" label="O‘rtacha reyting" value={k.avg_rating ? `${k.avg_rating} ★` : '—'} hint={`${num(k.reviews_total)} ta chop etilgan sharh`} icon={<Star size={16} />} />
              <Kpi label="Faol shartnomalar" value={num(k.contracts_active)} hint={`${num(k.contracts_pending)} tasi imzo kutmoqda`} icon={<FileSignature size={16} />} />
              <Kpi label="Bog‘cha shartnomalari (oyiga)" value={uzs(k.kg_monthly_total)} hint="faol shartnomalar bo‘yicha oylik to‘lovlar yig‘indisi" icon={<Wallet size={16} />} />
            </div>

            <Card className="!bg-primary-50/60">
              <h2 className="mb-2 flex items-center gap-2 font-extrabold text-primary"><TrendingUp size={18} />Qisqa xulosa</h2>
              <ul className="list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-black/75">
                <li>So‘nggi {months} oyda <b>{num(k.applications_period)}</b> ta ariza yuborilgan{pk ? <>; eng faol oy — <b>{pk.label}</b> ({pk.v} ta)</> : null}.</li>
                {k.acceptance_rate != null && <li>Qaror qilingan arizalarning <b>{k.acceptance_rate}%</b> i qabul qilingan.</li>}
                {k.avg_response_hours != null && <li>Muassasalar arizaga o‘rtacha <b>{hoursText(k.avg_response_hours)}</b> ichida javob beradi.</li>}
                {topRegion && <li>Eng ko‘p ariza <b>{topRegion.k}</b> hududidan ({num(topRegion.v)} ta).</li>}
                {k.providers_pending > 0 && <li><b>{k.providers_pending}</b> ta muassasa tekshiruv navbatida — «Tekshiruv» bo‘limida ko‘rib chiqing.</li>}
              </ul>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Arizalar dinamikasi" hint="Har oy nechta ariza yuborilgani va ulardan nechtasi qabul qilingani." insight={pk ? `Eng yuqori ko‘rsatkich: ${pk.label} — ${pk.v} ta ariza.` : undefined}>
                <LineChart labels={m} series={[{ name: 'Bog‘cha arizalari', color: C.green, values: d.applications.kindergarten }, { name: 'Repetitor arizalari', color: C.blue, values: d.applications.tutor }, { name: 'Qabul qilingan', color: C.sun, values: d.applications.accepted }]} />
              </ChartCard>
              <ChartCard title="Yangi foydalanuvchilar" hint="Har oy ro‘yxatdan o‘tgan ota-onalar va muassasa egalari (ustma-ust)." insight={`${months} oyda ${num(sum(d.users.parents))} ta ota-ona va ${num(sum(d.users.providers))} ta muassasa egasi qo‘shilgan.`}>
                <BarChart stacked labels={m} series={[{ name: 'Ota-onalar', color: C.green, values: d.users.parents }, { name: 'Muassasa egalari', color: C.sun, values: d.users.providers }]} />
              </ChartCard>
              <ChartCard title="Arizalar holati bo‘yicha" hint="Barcha arizalar hozir qaysi bosqichda ekanini ko‘rsatadi." insight={`Jami ${num(k.applications_total)} ta ariza, ${num(d.status_counts.ACCEPTED || 0)} tasi qabul qilingan.`}>
                <Donut data={statusData(d.status_counts)} unit="ariza" />
              </ChartCard>
              <ChartCard title="Ariza yo‘li (voronka)" hint="Ariza yuborilgandan shartnoma imzolanguncha qancha ariza yetib boradi." insight="Foizlar har bosqichning oldingi bosqichga nisbatini ko‘rsatadi.">
                <Funnel steps={d.funnel} />
              </ChartCard>
              <ChartCard title="Hududlar bo‘yicha arizalar" hint="Qaysi viloyat/shaharda talab ko‘proq." insight={topRegion ? `Talab eng yuqori hudud: ${topRegion.k}.` : undefined}>
                <HBars data={d.by_region} />
              </ChartCard>
              <ChartCard title="Reyting taqsimoti" hint="Ota-onalar qoldirgan sharhlar necha yulduz olgan." insight={k.avg_rating ? `O‘rtacha baho: ${k.avg_rating} / 5.` : undefined}>
                <HBars color={C.sun} data={[5, 4, 3, 2, 1].map((s) => ({ k: `${'★'.repeat(s)}`, v: d.ratings[String(s)] || 0 }))} />
              </ChartCard>
              <ChartCard title="Shartnomalar holati" hint="Qabul qilingan arizalar bo‘yicha tuzilgan shartnomalar.">
                <Donut data={mapCounts(d.contracts, CONTRACT)} unit="shartnoma" />
              </ChartCard>
              <ChartCard title="Repetitor darslari" hint="Rejalashtirilgan, o‘tkazilgan va bekor qilingan darslar.">
                <Donut data={mapCounts(d.lessons, LESSON)} unit="dars" />
              </ChartCard>
              <ChartCard title="Muassasalar turi va holati" hint="Platformadagi bog‘cha va repetitorlar soni, tasdiqlash holati.">
                <Donut data={[{ k: 'Bog‘chalar', v: d.type_split.kindergarten, color: C.green }, { k: 'Repetitorlar', v: d.type_split.tutor, color: C.blue }]} unit="muassasa" />
                <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold">{Object.entries(d.providers_by_status as Record<string, number>).map(([s, n]) => <span key={s} className="rounded-full bg-primary-50 px-2.5 py-1 text-primary">{({ approved: 'Tasdiqlangan', pending: 'Kutilmoqda', under_review: 'Tekshiruvda', rejected: 'Rad etilgan', suspended: 'To‘xtatilgan' } as any)[s] || s}: {n}</span>)}</div>
              </ChartCard>
              <ChartCard title="Xabarlar faolligi" hint="Ota-onalar va muassasalar o‘rtasida har oy yozilgan xabarlar soni.">
                <BarChart labels={m} series={[{ name: 'Xabarlar', color: C.sage, values: d.messages }]} />
              </ChartCard>
            </div>

            <ChartCard title="Eng faol muassasalar" hint="Eng ko‘p ariza olgan bog‘cha va repetitorlar." className="!p-0 overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[13.5px]">
                <thead className="bg-primary-50 text-[12px] uppercase tracking-wide text-primary/70"><tr><th className="px-4 py-2">#</th><th className="px-2 py-2">Muassasa</th><th className="px-2 py-2">Turi</th><th className="px-2 py-2 text-right">Arizalar</th><th className="px-2 py-2 text-right">Qabul</th><th className="px-4 py-2 text-right">Reyting</th></tr></thead>
                <tbody>{d.top_providers.map((p: any, i: number) => <tr key={p.id} className="border-t border-black/5"><td className="px-4 py-2.5 font-extrabold text-primary">{i + 1}</td><td className="px-2 py-2.5 font-semibold">{cleanName(p.name)}</td><td className="px-2 py-2.5 text-black/60">{p.type === 'tutor' ? 'Repetitor' : 'Bog‘cha'}</td><td className="px-2 py-2.5 text-right font-bold">{p.applications}</td><td className="px-2 py-2.5 text-right">{p.accepted}</td><td className="px-4 py-2.5 text-right">{p.reviews ? `${p.rating.toFixed(1)} ★ (${p.reviews})` : '—'}</td></tr>)}</tbody>
              </table></div>
            </ChartCard>
          </div>
        );
      }}</Async>
    </>
  );
}

/* ======================= Bog'cha / repetitor statistikasi ======================= */
export function ProviderReports() {
  const q = useQuery({ queryKey: ['prov-stats'], queryFn: () => get('/me/provider/statistics') });
  return (
    <>
      <PageTitle title="Statistika" sub="Arizalar, shartnomalar, sifat va daromad ko‘rsatkichlari" />
      <Async q={q} rows={4}>{(d) => {
        const kg = d.type === 'kindergarten';
        const m: string[] = d.months || [];
        const tot = sum(Object.values(d.status_counts as Record<string, number>));
        const monthApps: number[] = (d.applications_by_month || []).map((x: any) => x.count);
        const pk = peak(m, monthApps);
        const groups = d.groups || [];
        const cap = sum(groups.map((g: any) => g.capacity)), cur = sum(groups.map((g: any) => g.current));
        const ct = d.contracts || {};
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi tone="green" label="Jami arizalar" value={num(tot)} hint={`${num(d.status_counts.SUBMITTED || 0)} tasi yangi`} icon={<ClipboardList size={16} />} />
              <Kpi label="Qabul darajasi" value={d.conversion_rate == null ? '—' : `${d.conversion_rate}%`} hint="qaror qilingan arizalar ichida qabul ulushi" icon={<Percent size={16} />} />
              <Kpi label="O‘rtacha javob vaqti" value={hoursText(d.avg_response_hours)} hint="ota-ona tezkor javobni yoqtiradi" icon={<Clock size={16} />} />
              <Kpi tone="peach" label="Reyting" value={d.rating_count ? `${Number(d.rating_avg).toFixed(1)} ★` : '—'} hint={`${num(d.rating_count)} ta sharh`} icon={<Star size={16} />} />
              <Kpi label="Faol shartnomalar" value={num(ct.active || 0)} hint={`${num(ct.sent || 0)} tasi imzo kutmoqda`} icon={<FileSignature size={16} />} />
              <Kpi tone="sun" label={kg ? 'Shartnomalar bo‘yicha oylik tushum' : 'So‘nggi 30 kun daromadi'} value={uzs(d.income_monthly)} hint={kg ? 'faol shartnomalardagi oylik to‘lovlar' : 'o‘tkazilgan darslar bo‘yicha'} icon={<Wallet size={16} />} />
              {kg ? <Kpi label="Guruhlar to‘liqligi" value={cap ? `${Math.round((cur / cap) * 100)}%` : '—'} hint={`${num(cur)} / ${num(cap)} o‘rin band`} /> : <Kpi label="O‘tkazilgan darslar" value={num(d.lessons?.done || 0)} hint={`${num(d.lessons?.planned || 0)} tasi rejada`} />}
              <Kpi label="Arizalar (12 oy)" value={num(sum(monthApps))} hint={pk ? `eng faol oy: ${pk.label}` : 'hali ariza yo‘q'} icon={<TrendingUp size={16} />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Arizalar dinamikasi (12 oy)" hint="Har oy kelgan arizalar, qabul qilinganlari va rad etilganlari." insight={pk ? `Eng ko‘p ariza ${pk.label} oyida — ${pk.v} ta.` : undefined}>
                <LineChart labels={m} series={[{ name: 'Kelgan arizalar', color: C.green, values: monthApps }, { name: 'Qabul qilingan', color: C.sun, values: d.accepted_by_month }, { name: 'Rad etilgan', color: C.coral, values: d.rejected_by_month }]} />
              </ChartCard>
              <ChartCard title="Arizalar holati" hint="Hozirgi arizalar qaysi bosqichda ekani." insight={d.status_counts.SUBMITTED ? `${d.status_counts.SUBMITTED} ta yangi ariza javob kutmoqda.` : 'Barcha arizalar ko‘rib chiqilgan.'}>
                <Donut data={statusData(d.status_counts)} unit="ariza" />
              </ChartCard>
              {kg ? (
                <ChartCard title="Guruhlar bo‘yicha to‘lganlik" hint="Har bir guruhda nechta o‘rin band.">
                  <HBars data={groups.map((g: any) => ({ k: g.name, v: g.current, sub: `${g.capacity} o‘rindan ${g.current} tasi band · ${Math.max(g.capacity - g.current, 0)} ta bo‘sh` }))} />
                </ChartCard>
              ) : (
                <ChartCard title="Oylik o‘tkazilgan darslar" hint="Har oy nechta dars o‘tkazilgani." insight={`Jami ${num(d.lessons?.done || 0)} ta dars o‘tkazilgan.`}>
                  <BarChart labels={m} series={[{ name: 'Darslar', color: C.green, values: d.lessons_by_month || [] }]} />
                </ChartCard>
              )}
              <ChartCard title="Reyting taqsimoti" hint="Sharhlar necha yulduz olgani." insight={d.rating_count ? `O‘rtacha baho: ${Number(d.rating_avg).toFixed(1)} / 5.` : 'Hali sharh yo‘q.'}>
                <HBars color={C.sun} data={[5, 4, 3, 2, 1].map((s) => ({ k: '★'.repeat(s), v: d.rating_distribution[String(s)] || 0 }))} />
              </ChartCard>
              <ChartCard title="Shartnomalar holati" hint="Qabul qilingan arizalar bo‘yicha shartnomalar.">
                <Donut data={mapCounts(ct, CONTRACT)} unit="shartnoma" />
              </ChartCard>
              {!kg && <ChartCard title="Darslar holati"><Donut data={mapCounts(d.lessons, LESSON)} unit="dars" /></ChartCard>}
            </div>
          </div>
        );
      }}</Async>
    </>
  );
}
