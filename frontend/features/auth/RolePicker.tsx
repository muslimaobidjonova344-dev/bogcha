'use client';
import { motion } from 'framer-motion';
import { Baby, Building2, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { SubmitButton, TextField } from './fields';

export const ROLE_OPTIONS = [
  { id: 'parent', label: 'Ota-ona', hint: 'Bog‘cha va repetitor qidiraman', icon: Baby },
  { id: 'kindergarten_admin', label: 'Bog‘cha administratori', hint: 'Bog‘chamni joylayman', icon: Building2 },
  { id: 'tutor', label: 'Repetitor', hint: 'Dars beraman', icon: GraduationCap },
] as const;

/** Google bilan birinchi marta kirganda: hisob turini tanlash bosqichi. */
export default function RolePicker({ loading, error, onPick, onCancel }: { loading?: boolean; error?: string; onPick: (role: string, providerName?: string) => void; onCancel: () => void }) {
  const [role, setRole] = useState('parent'); const [name, setName] = useState('');
  const bad = role === 'kindergarten_admin' && !name.trim();
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <p className="text-[15px] text-black/60">Siz Kichkintoy’ga birinchi marta kiryapsiz. Hisob turini tanlang:</p>
      <div role="radiogroup" className="space-y-2">
        {ROLE_OPTIONS.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${role === r.id ? 'border-primary bg-primary-50 ring-2 ring-primary' : 'border-black/10 bg-white hover:border-primary/40'}`}>
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${role === r.id ? 'bg-primary text-white' : 'bg-secondary-light text-primary'}`}><r.icon size={20} /></span>
            <span><span className="block text-[15px] font-extrabold text-primary">{r.label}</span><span className="block text-[12.5px] text-black/50">{r.hint}</span></span>
          </button>
        ))}
      </div>
      {role === 'kindergarten_admin' && <TextField label="Bog‘cha nomi" value={name} onChange={(e) => setName(e.target.value)} />}
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <SubmitButton type="button" loading={loading} disabled={bad} onClick={() => onPick(role, name.trim() || undefined)}>Davom etish</SubmitButton>
      <button type="button" onClick={onCancel} className="block w-full text-center text-[15px] font-bold text-primary underline-offset-4 hover:underline">Bekor qilish</button>
    </motion.div>
  );
}
