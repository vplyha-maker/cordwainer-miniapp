import { useEffect, useState, useCallback } from 'react'

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string
    }
  }
}

type AdminTab = 'overview' | 'pages' | 'crm' | 'users'
type PeriodDays = 1 | 7 | 30 | 3650

interface DailyRow {
  day_label: string
  tg_users: number
  web_users: number
}

interface PageStat {
  page: string
  tg_users: number
  web_users: number
  opens: number
}

interface CountRow {
  lang?: string
  platform?: string
  users: number
}

interface EventRow {
  event: string
  unique_users: number
  total: number
}

interface ProRow {
  product_id: string
  count: number
  stars: number
  net_usd: number
}

interface UserRow {
  user_id: string
  username: string | null
  first_name: string | null
  source: string
  platform: string | null
  lang: string | null
  events_count: number
  last_seen: string
  last_page: string | null
  pro_count: number
}

interface UserDetailPayload {
  userId: string
  products: string[]
  events: {
    event: string
    page: string | null
    platform: string | null
    lang: string | null
    created_at: string
  }[]
}

interface StatsPayload {
  days: number
  hideAdmin: boolean
  summary: {
    tg_users: number
    web_users: number
    total_events: number
    retention_pct: number
    total_pro: number
    total_stars: number
    total_net_usd: number
  }
  daily: DailyRow[]
  topPages: PageStat[]
  langs: CountRow[]
  platforms: CountRow[]
  events: EventRow[]
  proBreakdown: ProRow[]
  users: UserRow[]
}

const PRODUCT_OPTIONS = [
  { id: 'pro_pigments', label: 'Пигменты (1000 ⭐)' },
  { id: 'pro_videos', label: 'Видео-лукбук (350 ⭐)' },
  { id: 'pro_colors', label: '3D Цвета (250 ⭐)' },
  { id: 'pro_heel', label: 'Каблук (250 ⭐)' },
  { id: 'pro_last', label: 'Колодка (250 ⭐)' },
  { id: 'pro_sizes', label: 'Размеры (150 ⭐)' },
  { id: 'all', label: '★ ВСЕ 6 МОДУЛЕЙ' },
]

function getInitData(): string {
  if (typeof window === 'undefined') return ''
  return (window as unknown as TgWindow).Telegram?.WebApp?.initData || ''
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function AdminStatsButton() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<AdminTab>('overview')
  const [days, setDays] = useState<PeriodDays>(7)
  const [hideAdmin, setHideAdmin] = useState(true)

  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  // CRM State
  const [crmUserId, setCrmUserId] = useState('')
  const [crmProductId, setCrmProductId] = useState('pro_pigments')
  const [crmBusy, setCrmBusy] = useState(false)
  const [crmMessage, setCrmMessage] = useState<string | null>(null)

  // User Detail State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetailPayload | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)

  useEffect(() => {
    const initData = getInitData()
    if (!initData) return

    let active = true
    fetch('/api/check-purchase?action=stats&check=1', {
      headers: { 'X-Telegram-Init-Data': initData },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (active && data?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const loadStats = useCallback(
    async (nextDays: PeriodDays = days, nextHide: boolean = hideAdmin) => {
      const initData = getInitData()
      if (!initData) return
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams({
          action: 'stats',
          days: String(nextDays),
          hideAdmin: nextHide ? '1' : '0',
        })
        const res = await fetch(`/api/check-purchase?${qs.toString()}`, {
          headers: { 'X-Telegram-Init-Data': initData },
        })
        if (!res.ok) {
          setError('Ошибка загрузки статистики из Neon')
          setLoading(false)
          return
        }
        const data = (await res.json()) as StatsPayload
        setStats(data)
      } catch {
        setError('Ошибка сети')
      } finally {
        setLoading(false)
      }
    },
    [days, hideAdmin]
  )

  const loadUserDetail = async (uid: string) => {
    const initData = getInitData()
    if (!initData) return
    if (selectedUserId === uid) {
      setSelectedUserId(null)
      return
    }
    setSelectedUserId(uid)
    setUserDetail(null)
    setUserDetailLoading(true)
    try {
      const res = await fetch(
        `/api/check-purchase?action=user&targetId=${encodeURIComponent(uid)}`,
        { headers: { 'X-Telegram-Init-Data': initData } }
      )
      if (res.ok) {
        const data = (await res.json()) as UserDetailPayload
        setUserDetail(data)
      }
    } catch {
      // ignore
    } finally {
      setUserDetailLoading(false)
    }
  }

  const handleCrmAction = async (revoke: boolean) => {
    const initData = getInitData()
    if (!initData || !crmUserId.trim()) return
    setCrmBusy(true)
    setCrmMessage(null)
    try {
      const res = await fetch('/api/check-purchase?action=grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
        body: JSON.stringify({
          targetUserId: crmUserId.trim(),
          productId: crmProductId,
          revoke,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setCrmMessage(`Ошибка: ${data.error || 'не удалось выполнить'}`)
      } else {
        setCrmMessage(
          revoke
            ? `Доступ ${crmProductId} снят для #${crmUserId.trim()}`
            : `Доступ ${crmProductId} выдан для #${crmUserId.trim()} ✓`
        )
        void loadStats(days, hideAdmin)
      }
    } catch {
      setCrmMessage('Ошибка сети')
    } finally {
      setCrmBusy(false)
    }
  }

  if (!isAdmin) return null

  const maxDaily = stats?.daily?.reduce(
    (m, r) => Math.max(m, r.tg_users + r.web_users),
    1
  ) || 1
  const totalOpens = stats?.topPages?.reduce((a, b) => a + b.opens, 0) || 1

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          void loadStats(days, hideAdmin)
        }}
        title="Cordwaine Analytics"
        className="fixed bottom-4 left-4 z-50 w-9 h-9 rounded-full bg-black/80 text-[#d9b57d] border border-[#d9b57d]/45 flex items-center justify-center shadow-lg cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl h-[90dvh] sm:h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#111110] text-[#f5f3ee] border border-white/15 overflow-hidden"
          >
            {/* Шапка */}
            <div className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#d9b57d]">
                    CORDWAINE · ANALYTICS &amp; CRM
                  </div>
                  <div className="text-[15px] font-semibold">Панель владельца</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void loadStats(days, hideAdmin)}
                    disabled={loading}
                    className="px-2.5 py-1.5 rounded-lg text-[11.5px] border border-white/15 text-[#d9b57d] cursor-pointer"
                  >
                    {loading ? '...' : 'Обновить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-2.5 py-1.5 rounded-lg text-[11.5px] border border-white/15 text-white/70 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Вкладки */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/10">
                {(
                  [
                    ['overview', 'Обзор'],
                    ['pages', 'Разделы'],
                    ['crm', 'PRO · CRM'],
                    ['users', 'Люди'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer ${
                      tab === id
                        ? 'bg-[#d9b57d] text-[#111110]'
                        : 'text-white/65'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Период + Скрыть мои визиты */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="inline-flex rounded-lg bg-white/[0.04] border border-white/10 p-0.5">
                  {(
                    [
                      [1, '24ч'],
                      [7, '7д'],
                      [30, '30д'],
                      [3650, 'Всё'],
                    ] as const
                  ).map(([d, label]) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDays(d)
                        void loadStats(d, hideAdmin)
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer ${
                        days === d ? 'bg-white/15 text-white font-semibold' : 'text-white/55'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !hideAdmin
                    setHideAdmin(next)
                    void loadStats(days, next)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer ${
                    hideAdmin
                      ? 'border-[#d9b57d]/50 bg-[#d9b57d]/15 text-[#d9b57d]'
                      : 'border-white/15 text-white/55'
                  }`}
                >
                  {hideAdmin ? '✓ Без моих визитов' : 'С моими визитами'}
                </button>
              </div>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12.5px]">
              {error && (
                <div className="p-3 rounded-xl border border-rose-500/40 text-rose-300">
                  {error}
                </div>
              )}

              {loading && !stats && (
                <div className="py-12 text-center text-white/50">Загрузка из Neon...</div>
              )}

              {/* === ВКЛАДКА 1: ОБЗОР === */}
              {stats && tab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] uppercase text-white/55">Telegram уник.</div>
                      <div className="mt-1 font-mono text-[20px] font-bold text-[#d9b57d]">
                        {stats.summary.tg_users}
                      </div>
                      <div className="text-[11px] text-white/50">
                        Событий: {stats.summary.total_events}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] uppercase text-white/55">Браузер (Web)</div>
                      <div className="mt-1 font-mono text-[20px] font-bold text-white">
                        {stats.summary.web_users}
                      </div>
                      <div className="text-[11px] text-white/50">
                        Возвраты 30д: {stats.summary.retention_pct}%
                      </div>
                    </div>

                    <div className="col-span-2 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/25 p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10.5px] uppercase text-emerald-300/80">
                          PRO-доступы (Neon)
                        </div>
                        <div className="mt-0.5 font-mono text-[18px] font-bold text-emerald-300">
                          {stats.summary.total_pro} · {stats.summary.total_stars} ⭐
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10.5px] text-white/55">Оценка чистыми</div>
                        <div className="font-mono text-[16px] font-bold text-emerald-300">
                          ~${stats.summary.total_net_usd}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 14-дневный график */}
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-white/60">
                        Активность (14 дней)
                      </span>
                      <div className="flex items-center gap-3 text-[10.5px]">
                        <span className="inline-flex items-center gap-1 text-[#d9b57d]">
                          <span className="w-2 h-2 rounded-xs bg-[#d9b57d]" /> TG
                        </span>
                        <span className="inline-flex items-center gap-1 text-white/65">
                          <span className="w-2 h-2 rounded-xs bg-white/40" /> Web
                        </span>
                      </div>
                    </div>
                    {stats.daily.length === 0 ? (
                      <div className="py-6 text-center text-white/40">Нет данных за 14 дней</div>
                    ) : (
                      <div className="flex items-end gap-1.5 h-28 pt-2">
                        {stats.daily.map((d) => {
                          const total = d.tg_users + d.web_users
                          const tgH = Math.round((d.tg_users / maxDaily) * 100)
                          const webH = Math.round((d.web_users / maxDaily) * 100)
                          return (
                            <div
                              key={d.day_label}
                              className="flex-1 flex flex-col items-center h-full justify-end gap-1 min-w-0"
                            >
                              <span className="font-mono text-[9.5px] text-white/60">
                                {total}
                              </span>
                              <div className="w-full max-w-[20px] flex flex-col justify-end h-16 bg-white/[0.04] rounded-t overflow-hidden">
                                <div
                                  style={{ height: `${webH}%` }}
                                  className="w-full bg-white/40"
                                />
                                <div
                                  style={{ height: `${tgH}%` }}
                                  className="w-full bg-[#d9b57d]"
                                />
                              </div>
                              <span className="font-mono text-[9px] text-white/45 truncate">
                                {d.day_label.slice(0, 5)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Языки и платформы */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] uppercase text-white/55 mb-2">Языки</div>
                      <div className="space-y-1.5">
                        {stats.langs.map((l) => (
                          <div key={l.lang} className="flex justify-between font-mono text-[11.5px]">
                            <span className="uppercase text-white/80">{l.lang}</span>
                            <span className="text-[#d9b57d] font-semibold">{l.users}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] uppercase text-white/55 mb-2">Платформы</div>
                      <div className="space-y-1.5">
                        {stats.platforms.map((p) => (
                          <div key={p.platform} className="flex justify-between font-mono text-[11.5px]">
                            <span className="text-white/80 truncate">{p.platform}</span>
                            <span className="text-white font-semibold">{p.users}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* === ВКЛАДКА 2: РАЗДЕЛЫ И СОБЫТИЯ === */}
              {stats && tab === 'pages' && (
                <>
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2.5">
                      Популярные разделы
                    </div>
                    {stats.topPages.length === 0 ? (
                      <div className="text-white/45">Нет данных</div>
                    ) : (
                      <div className="space-y-2.5">
                        {stats.topPages.map((p) => {
                          const share = Math.round((p.opens / totalOpens) * 100)
                          return (
                            <div key={p.page} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{p.page}</span>
                                <span className="font-mono text-[11px] text-white/75 shrink-0">
                                  TG {p.tg_users} · W {p.web_users} · {p.opens} ({share}%)
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-[#d9b57d] rounded-full"
                                  style={{ width: `${Math.max(4, share)}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2">
                      События и воронка
                    </div>
                    <div className="divide-y divide-white/8">
                      {stats.events.map((ev) => (
                        <div key={ev.event} className="py-2 flex justify-between font-mono text-[11.5px]">
                          <span className="text-white/85">{ev.event}</span>
                          <span className="text-[#d9b57d]">
                            {ev.unique_users} чел · {ev.total}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* === ВКЛАДКА 3: PRO & CRM === */}
              {stats && tab === 'crm' && (
                <>
                  {/* Выдать / забрать PRO */}
                  <div className="rounded-xl bg-white/[0.04] border border-[#d9b57d]/35 p-3.5 space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#d9b57d] font-semibold">
                      Управление PRO-доступом (без SQL)
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={crmUserId}
                      onChange={(e) => setCrmUserId(e.target.value.replace(/\D/g, ''))}
                      placeholder="Telegram ID пользователя (например 8686072747)"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 font-mono text-[12.5px] text-white focus:outline-none focus:border-[#d9b57d]"
                    />

                    <select
                      value={crmProductId}
                      onChange={(e) => setCrmProductId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-[12.5px] text-white focus:outline-none focus:border-[#d9b57d]"
                    >
                      {PRODUCT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={crmBusy || !crmUserId}
                        onClick={() => void handleCrmAction(false)}
                        className="py-2.5 rounded-xl bg-[#d9b57d] text-[#111110] font-semibold text-[12.5px] cursor-pointer disabled:opacity-40"
                      >
                        {crmBusy ? '...' : 'Выдать PRO'}
                      </button>
                      <button
                        type="button"
                        disabled={crmBusy || !crmUserId}
                        onClick={() => void handleCrmAction(true)}
                        className="py-2.5 rounded-xl border border-rose-500/45 text-rose-300 font-semibold text-[12.5px] cursor-pointer disabled:opacity-40"
                      >
                        Забрать PRO
                      </button>
                    </div>

                    {crmMessage && (
                      <div className="text-[12px] font-mono text-[#d9b57d]">{crmMessage}</div>
                    )}
                  </div>

                  {/* Разбивка по модулям */}
                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2">
                      Активации по модулям
                    </div>
                    <div className="divide-y divide-white/8">
                      {stats.proBreakdown.map((row) => (
                        <div key={row.product_id} className="py-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-[12px]">{row.product_id}</span>
                          <span className="font-mono text-[11.5px] text-emerald-300">
                            {row.count} шт · {row.stars} ⭐ (~${row.net_usd})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* === ВКЛАДКА 4: ЛЮДИ === */}
              {stats && tab === 'users' && (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2">
                    Уникальные пользователи (тап = профиль)
                  </div>
                  {stats.users.length === 0 ? (
                    <div className="text-white/45 py-4 text-center">Пока нет пользователей</div>
                  ) : (
                    <div className="divide-y divide-white/8">
                      {stats.users.map((u) => {
                        const isOpen = selectedUserId === u.user_id
                        return (
                          <div key={u.user_id} className="py-2">
                            <button
                              type="button"
                              onClick={() => void loadUserDetail(u.user_id)}
                              className="w-full text-left flex items-center justify-between gap-2 bg-transparent border-0 p-0 text-inherit cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-medium truncate flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase ${
                                      u.source === 'telegram'
                                        ? 'bg-[#d9b57d]/20 text-[#d9b57d]'
                                        : 'bg-white/10 text-white/70'
                                    }`}
                                  >
                                    {u.source === 'telegram' ? 'TG' : 'WEB'}
                                  </span>
                                  <span className="truncate">
                                    {u.first_name || 'Guest'}{' '}
                                    {u.username ? (
                                      <span className="text-[#d9b57d]">@{u.username}</span>
                                    ) : (
                                      <span className="text-white/45 font-mono text-[11px]">
                                        #{u.user_id}
                                      </span>
                                    )}
                                  </span>
                                  {u.pro_count > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9.5px]">
                                      PRO×{u.pro_count}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-white/55 mt-0.5">
                                  {u.last_page || '—'} · {u.platform || 'web'} · {u.events_count} соб.
                                </div>
                              </div>
                              <span className="font-mono text-[10.5px] text-white/45 shrink-0">
                                {formatTime(u.last_seen)}
                              </span>
                            </button>

                            {isOpen && (
                              <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                                {userDetailLoading ? (
                                  <div className="text-white/45 text-[11px]">Загрузка пути...</div>
                                ) : userDetail ? (
                                  <>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono text-[11px] text-white/70">
                                        PRO: {userDetail.products.length ? userDetail.products.join(', ') : 'нет'}
                                      </span>
                                      {u.source === 'telegram' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCrmUserId(u.user_id)
                                            setTab('crm')
                                          }}
                                          className="px-2 py-1 rounded-md bg-[#d9b57d]/20 text-[#d9b57d] text-[10.5px] font-semibold cursor-pointer"
                                        >
                                          В CRM →
                                        </button>
                                      )}
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {userDetail.events.map((ev, i) => (
                                        <div key={`${ev.created_at}-${i}`} className="flex justify-between font-mono text-[10.5px] text-white/65">
                                          <span>
                                            {ev.event}: {ev.page || '—'}
                                          </span>
                                          <span>{formatTime(ev.created_at)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
