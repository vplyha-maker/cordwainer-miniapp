import type { CSSProperties } from 'react';

export type AdminTab = 'overview' | 'analytics' | 'crm' | 'users' | 'audit' | 'system';

export type DailyPoint = {
  day_iso: string;
  label: string;
  tg: number;
  web: number;
  events: number;
};

export type PageStat = {
  page: string;
  tg: number;
  web: number;
  events: number;
};

export type EventStat = {
  event: string;
  users: number;
  count: number;
};

export type NameValue = {
  name: string;
  value: number;
};

export type ProBreakdownItem = {
  product_id: string;
  count: number;
  stars: number;
};

export type UserItem = {
  user_id: string;
  username: string;
  first_name: string;
  source: string;
  platform: string;
  lang: string;
  last_page: string;
  events: number;
  last_seen: string;
  pro_count: number;
  is_banned: boolean;
};

export type BannedItem = {
  user_id: string;
  reason: string;
  created_at: string;
};

export type AuditEntry = {
  id: number;
  actor_id: string;
  event: string;
  target: string;
  via: string;
  meta: string;
  created_at: string;
};

export type AdminStats = {
  ok: boolean;
  via?: 'telegram' | 'web';
  days: number;
  hideAdmin: boolean;
  summary: {
    tgUnique: number;
    webUnique: number;
    totalEvents: number;
    prevTgUnique: number;
    prevWebUnique: number;
    prevTotalEvents: number;
    newUsers: number;
    returningUsers: number;
    retention30d: number;
    avgEventsPerUser: number;
    proUsers?: number;
    proTotal: number;
    proStars: number;
    proUsdEst: number;
  };
  daily: DailyPoint[];
  pages: PageStat[];
  events: EventStat[];
  languages: NameValue[];
  platforms: NameValue[];
  proBreakdown: ProBreakdownItem[];
  users: UserItem[];
  banned: BannedItem[];
  auditLog: AuditEntry[];
};

export type DayDetail = {
  date: string;
  tg: number;
  web: number;
  events: number;
  topPages: Array<{ page: string; count: number }>;
  users: Array<{
    user_id: string;
    username: string;
    first_name: string;
    source: string;
    events: number;
  }>;
};

export type HealthData = {
  ok: boolean;
  latencyMs: number;
  eventsCount: number;
  purchasesCount: number;
  bannedCount: number;
  lastEventAt: string | null;
  adminIdConfigured: boolean;
  webKeyConfigured?: boolean;
  via?: string;
};

export type UserProfile = {
  targetId: string;
  products: string[];
  isBanned: boolean;
  banReason: string;
  events: Array<{
    event: string;
    page: string;
    platform: string;
    created_at: string;
  }>;
  adminHistory: Array<{
    event: string;
    meta: string;
    created_at: string;
  }>;
};

export type FilterPreset = {
  id: string;
  label: string;
  days: number;
  hideAdmin: boolean;
};

export type ProCatalogItem = {
  id: string;
  label: string;
  price: string;
};

export const PRO_CATALOG: ProCatalogItem[] = [
  { id: 'pro_pigments', label: 'Пигменты', price: '1000 ★' },
  { id: 'pro_videos', label: 'Видео-лукбук', price: '350 ★' },
  { id: 'pro_colors', label: '3D Цвета', price: '250 ★' },
  { id: 'pro_heel', label: 'Каблук', price: '250 ★' },
  { id: 'pro_last', label: 'Колодка', price: '250 ★' },
  { id: 'pro_sizes', label: 'Размеры', price: '150 ★' },
  { id: 'all', label: 'Все 6 модулей', price: 'ALL' },
];

export const PALETTE = {
  gold: '#C9A86A',
  blue: '#5B9BFF',
  emerald: '#3FD08F',
  violet: '#A87BFF',
  coral: '#F06A7E',
  amber: '#F5B041',
  muted: '#8D867C',
  border: 'rgba(255,255,255,0.09)',
  surface: '#141412',
};

export const DARK_INPUT_STYLE: CSSProperties = {
  color: '#F5F1EB',
  WebkitTextFillColor: '#F5F1EB',
  caretColor: '#C9A86A',
  backgroundColor: '#0E0E0D',
};

export function formatShortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}, ${hh}:${min}`;
}

export function formatDelta(cur: number, prev: number): { text: string; positive: boolean; neutral: boolean } {
  if (prev === 0 && cur === 0) return { text: '0%', positive: false, neutral: true };
  if (prev === 0) return { text: '+100%', positive: true, neutral: false };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { text: '0%', positive: false, neutral: true };
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, positive: pct > 0, neutral: false };
}
