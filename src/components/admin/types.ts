export type AdminTab = 'overview' | 'pages' | 'crm' | 'users' | 'audit' | 'health'
export type PeriodDays = 1 | 7 | 30 | 3650
export type ChartSourceFilter = 'all' | 'tg' | 'web'
export type ChartKind = 'line' | 'area' | 'bar'

export interface DailyRow {
  day_iso: string
  day_label: string
  tg_users: number
  web_users: number
  events: number
}

export interface PageStat {
  page: string
  tg_users: number
  web_users: number
  opens: number
}

export interface CountRow {
  lang?: string
  platform?: string
  users: number
}

export interface EventRow {
  event: string
  unique_users: number
  total: number
}

export interface ProRow {
  product_id: string
  count: number
  stars: number
  net_usd: number
}

export interface BannedRow {
  user_id: string
  reason: string | null
  created_at: string
}

export interface UserRow {
  user_id: string
  username: string | null
  first_name: string | null
  source: string
  platform: string | null
  lang: string | null
  events_count: number
  active_days: number
  first_seen: string
  last_seen: string
  last_page: string | null
  pro_count: number
}

export interface AuditRow {
  id: number
  user_id: string
  username: string | null
  first_name: string | null
  event: string
  meta: Record<string, unknown> | null
  created_at: string
}

export interface UserDetailPayload {
  userId: string
  products: string[]
  events: {
    event: string
    page: string | null
    platform: string | null
    lang: string | null
    created_at: string
  }[]
  adminHistory: {
    event: string
    meta: Record<string, unknown> | null
    created_at: string
  }[]
}

export interface DayDetailPayload {
  date: string
  pages: { page: string; opens: number }[]
  users: {
    user_id: string
    username: string | null
    first_name: string | null
    source: string
    events_count: number
  }[]
}

export interface HealthPayload {
  checkedAt: string
  apiStatus: 'ok' | 'error'
  dbStatus: 'ok' | 'warn' | 'error'
  dbLatencyMs: number
  botTokenConfigured: boolean
  adminIdConfigured: boolean
  tables: {
    app_events: number | null
    user_purchases: number | null
    banned_users: number | null
  }
  lastEventAt: string | null
  error?: string
}

export interface StatsPayload {
  days: number
  hideAdmin: boolean
  syncedAt: string
  summary: {
    tg_users: number
    web_users: number
    total_users: number
    total_events: number
    avg_events_per_user: number
    new_users: number
    returning_users: number
    retention_pct: number
    total_pro: number
    total_stars: number
    total_net_usd: number
  }
  previous: {
    tg_users: number
    web_users: number
    total_users: number
    total_events: number
  }
  daily: DailyRow[]
  topPages: PageStat[]
  langs: CountRow[]
  platforms: CountRow[]
  events: EventRow[]
  proBreakdown: ProRow[]
  users: UserRow[]
  bannedUsers: BannedRow[]
  auditLog: AuditRow[]
}

export interface SavedFilterPreset {
  id: string
  name: string
  days: PeriodDays
  hideAdmin: boolean
}

export const PRODUCT_OPTIONS = [
  { id: 'pro_pigments', label: 'Пигменты', price: '1000 ⭐' },
  { id: 'pro_videos', label: 'Видео-лукбук', price: '350 ⭐' },
  { id: 'pro_colors', label: '3D Цвета', price: '250 ⭐' },
  { id: 'pro_heel', label: 'Каблук', price: '250 ⭐' },
  { id: 'pro_last', label: 'Колодка', price: '250 ⭐' },
  { id: 'pro_sizes', label: 'Размеры', price: '150 ⭐' },
  { id: 'all', label: 'Все 6 модулей', price: 'ALL' },
]

export const CHART_PALETTE = [
  '#C9A86A',
  '#60A5FA',
  '#34D399',
  '#A78BFA',
  '#F59E0B',
  '#E05A6D',
]

export const DARK_INPUT_STYLE = {
  color: '#F5F1EB',
  WebkitTextFillColor: '#F5F1EB',
  caretColor: '#C9A86A',
} as const

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatNum(n: number): string {
  return n.toLocaleString('ru-RU')
}

export function calcDeltaPct(current: number, previous: number): string | null {
  if (previous <= 0) return current > 0 ? '+100%' : null
  const pct = Math.round(((current - previous) / previous) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

