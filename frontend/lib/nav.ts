import { Bell, Building2, CalendarClock, CalendarDays, ClipboardList, FileText, FolderKanban, Gauge, GraduationCap, Heart, History, Home, Image as ImageIcon, LayoutDashboard, Layers, MapPin, MessageSquare, Search, Settings, ShieldAlert, ShieldCheck, Star, Tag, Users, UserCog, Baby, BarChart3, Wallet, Clock, BookOpen, Flag, ScrollText, Globe, Map as MapIcon, UserSquare2, ListChecks, Eye } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: any; badge?: 'messages' | 'notifications' | 'moderation' };

export const PARENT_NAV: NavItem[] = [
  { href: '/parent', label: 'Umumiy sahifa', icon: LayoutDashboard },
  { href: '/parent/search', label: 'Qidiruv', icon: Search },
  { href: '/parent/map', label: 'Xarita', icon: MapPin },
  { href: '/parent/applications', label: 'Mening arizalarim', icon: ClipboardList },
  { href: '/parent/children', label: 'Farzandlarim', icon: Baby },
  { href: '/parent/contracts', label: 'Shartnomalar', icon: FileText },
  { href: '/parent/saved', label: 'Saqlanganlar', icon: Heart },
  { href: '/parent/messages', label: 'Xabarlar', icon: MessageSquare, badge: 'messages' },
  { href: '/parent/notifications', label: 'Bildirishnomalar', icon: Bell, badge: 'notifications' },
  { href: '/parent/reviews', label: 'Sharhlarim', icon: Star },
  { href: '/parent/settings', label: 'Sozlamalar', icon: Settings },
];
export const PARENT_TABS = [
  { href: '/parent', label: 'Bosh sahifa', icon: Home },
  { href: '/parent/search', label: 'Qidiruv', icon: Search },
  { href: '/parent/applications', label: 'Arizalar', icon: ClipboardList },
  { href: '/parent/messages', label: 'Xabarlar', icon: MessageSquare, badge: 'messages' as const },
  { href: '/parent/cabinet', label: 'Kabinet', icon: UserSquare2 },
];

export const KG_NAV: NavItem[] = [
  { href: '/kindergarten', label: 'Umumiy sahifa', icon: LayoutDashboard },
  { href: '/kindergarten/applications', label: 'Arizalar', icon: ClipboardList },
  { href: '/kindergarten/children', label: 'Bolalar', icon: Baby },
  { href: '/kindergarten/contracts', label: 'Shartnomalar', icon: FileText },
  { href: '/kindergarten/groups', label: 'Guruhlar', icon: Layers },
  { href: '/kindergarten/staff', label: 'Tarbiyachilar', icon: Users },
  { href: '/kindergarten/profile', label: 'Muassasa profili', icon: Building2 },
  { href: '/kindergarten/services', label: 'Xizmatlar', icon: ListChecks },
  { href: '/kindergarten/prices', label: 'Narxlar', icon: Wallet },
  { href: '/kindergarten/schedule', label: 'Jadval', icon: CalendarDays },
  { href: '/kindergarten/vacancies', label: "Bo'sh o'rinlar", icon: Eye },
  { href: '/kindergarten/gallery', label: 'Galereya', icon: ImageIcon },
  { href: '/kindergarten/messages', label: 'Xabarlar', icon: MessageSquare, badge: 'messages' },
  { href: '/kindergarten/reviews', label: 'Sharhlar', icon: Star },
  { href: '/kindergarten/statistics', label: 'Statistika', icon: BarChart3 },
  { href: '/kindergarten/settings', label: 'Sozlamalar', icon: Settings },
];
export const KG_TABS = [
  { href: '/kindergarten', label: 'Bosh sahifa', icon: Home },
  { href: '/kindergarten/applications', label: 'Arizalar', icon: ClipboardList },
  { href: '/kindergarten/groups', label: 'Guruhlar', icon: Layers },
  { href: '/kindergarten/messages', label: 'Xabarlar', icon: MessageSquare, badge: 'messages' as const },
  { href: '/kindergarten/cabinet', label: 'Kabinet', icon: UserSquare2 },
];

export const TUTOR_NAV: NavItem[] = [
  { href: '/tutor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tutor/profile', label: 'Mening profilim', icon: UserCog },
  { href: '/tutor/subjects', label: 'Fanlar', icon: BookOpen },
  { href: '/tutor/services', label: 'Dars xizmatlari', icon: ListChecks },
  { href: '/tutor/prices', label: 'Narxlar', icon: Wallet },
  { href: '/tutor/schedule', label: 'Dars jadvali', icon: CalendarDays },
  { href: '/tutor/availability', label: "Bo'sh vaqtlar", icon: Clock },
  { href: '/tutor/students', label: "O'quvchilar", icon: GraduationCap },
  { href: '/tutor/contracts', label: 'Shartnomalar', icon: FileText },
  { href: '/tutor/requests', label: "Dars so'rovlari", icon: ClipboardList },
  { href: '/tutor/history', label: 'Darslar tarixi', icon: History },
  { href: '/tutor/messages', label: 'Xabarlar', icon: MessageSquare, badge: 'messages' },
  { href: '/tutor/reviews', label: 'Sharhlar', icon: Star },
  { href: '/tutor/statistics', label: 'Statistika', icon: BarChart3 },
  { href: '/tutor/settings', label: 'Sozlamalar', icon: Settings },
];
export const TUTOR_TABS = [
  { href: '/tutor', label: 'Bosh sahifa', icon: Home },
  { href: '/tutor/schedule', label: 'Jadval', icon: CalendarDays },
  { href: '/tutor/students', label: "O'quvchilar", icon: GraduationCap },
  { href: '/tutor/messages', label: 'Xabarlar', icon: MessageSquare, badge: 'messages' as const },
  { href: '/tutor/cabinet', label: 'Kabinet', icon: UserSquare2 },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Gauge },
  { href: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
  { href: '/admin/users?role=parent', label: 'Ota-onalar', icon: Baby },
  { href: '/admin/providers?type=kindergarten', label: "Bog'chalar", icon: Building2 },
  { href: '/admin/providers?type=tutor', label: 'Repetitorlar', icon: GraduationCap },
  { href: '/admin/moderation', label: 'Tasdiqlash navbati', icon: ShieldCheck, badge: 'moderation' },
  { href: '/admin/applications', label: 'Arizalar monitoringi', icon: FolderKanban },
  { href: '/admin/reviews', label: 'Sharhlar', icon: Star },
  { href: '/admin/reports', label: 'Shikoyatlar', icon: Flag },
  { href: '/admin/messages', label: 'Xabarlar nazorati', icon: MessageSquare },
  { href: '/admin/notifications', label: 'Bildirishnomalar', icon: Bell, badge: 'notifications' },
  { href: '/admin/regions', label: 'Hududlar', icon: Globe },
  { href: '/admin/categories', label: 'Kategoriyalar', icon: Tag },
  { href: '/admin/exports', label: 'Hisobotlar', icon: FileText },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/settings', label: 'Tizim sozlamalari', icon: Settings },
];
export const ADMIN_TABS = [
  { href: '/admin', label: 'Dashboard', icon: Gauge },
  { href: '/admin/moderation', label: 'Tasdiqlash', icon: ShieldCheck, badge: 'moderation' as const },
  { href: '/admin/applications', label: 'Monitoring', icon: FolderKanban },
  { href: '/admin/notifications', label: 'Bildirish', icon: Bell, badge: 'notifications' as const },
  { href: '/admin/cabinet', label: 'Kabinet', icon: UserSquare2 },
];
