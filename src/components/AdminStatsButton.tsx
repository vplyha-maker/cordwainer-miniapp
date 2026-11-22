import { useEffect, useState, useCallback } from 'react'

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string
    }
  }
}

interface PeriodStats {
  tg_users: number
  web_users: number
  events?: number
}

interface PageStat {
  page: string
  tg_users: number
  web_users: number
  opens: number
}

interface RecentVisit {
  user_id: string
  username: string | null
  first_name: string | null
  platform: string | null
  page: string | null
  event: string
  created_at: string
}

interface StatsPayload {
  today: PeriodStats
  week: PeriodStats
  allTime: { tg_users: number; web_users: number; purchases: number }
  topPages: PageStat[]
  recentTelegram: RecentVisit[]
}

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
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const loadStats = useCallback(async () => {
    const initData = getInitData()
    if (!initData) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/check-purchase?action=stats', {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      if (!res.ok) {
        setError('Нет доступа или таблица app_events ещё не создана')
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
  }, [])

  if (!isAdmin) return null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          void loadStats()
        }}
        title="Admin Stats"
        className="fixed bottom-4 left-4 z-50 w-9 h-9 rounded-full bg-black/75 text-[#d9b57d] border border-[#d9b57d]/40 flex items-center justify-center shadow-lg cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[86vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#141413] text-[#f5f3ee] border border-white/15 overflow-hidden"
          >
            <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-[#d9b57d]">
                  CORDWAINE · ADMIN
                </div>
                <div className="text-[15px] font-semibold">Статистика (Telegram + Web)</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadStats()}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg text-[12px] border border-white/15 text-[#d9b57d] cursor-pointer"
                >
                  {loading ? '...' : 'Обновить'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-2.5 py-1 rounded-lg text-[12px] border border-white/15 text-white/70 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 text-[12.5px]">
              {error && (
                <div className="p-3 rounded-xl border border-rose-500/40 text-rose-300">
                  {error}
                </div>
              )}

              {loading && !stats && (
                <div className="py-10 text-center text-white/50">Загрузка из Neon...</div>
              )}

              {stats && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] text-white/55 uppercase">Сегодня</div>
                      <div className="mt-1 font-mono text-[14px] font-semibold text-[#d9b57d]">
                        TG: {stats.today.tg_users}
                      </div>
                      <div className="font-mono text-[11.5px] text-white/70">
                        Web: {stats.today.web_users}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] text-white/55 uppercase">7 дней</div>
                      <div className="mt-1 font-mono text-[14px] font-semibold text-[#d9b57d]">
                        TG: {stats.week.tg_users}
                      </div>
                      <div className="font-mono text-[11.5px] text-white/70">
                        Web: {stats.week.web_users}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <div className="text-[10.5px] text-white/55 uppercase">Всего</div>
                      <div className="mt-1 font-mono text-[14px] font-semibold text-emerald-400">
                        PRO: {stats.allTime.purchases}
                      </div>
                      <div className="font-mono text-[11.5px] text-white/70">
                        TG: {stats.allTime.tg_users} · W: {stats.allTime.web_users}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2">
                      Разделы (30 дней)
                    </div>
                    {stats.topPages.length === 0 ? (
                      <div className="text-white/45">Пока нет данных</div>
                    ) : (
                      <div className="divide-y divide-white/8">
                        {stats.topPages.map((p) => (
                          <div key={p.page} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{p.page}</span>
                            <span className="font-mono text-[11.5px] text-white/75 shrink-0">
                              TG {p.tg_users} · Web {p.web_users} · ({p.opens})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2">
                      Последние входы в Telegram
                    </div>
                    {stats.recentTelegram.length === 0 ? (
                      <div className="text-white/45">Пока нет визитов</div>
                    ) : (
                      <div className="divide-y divide-white/8">
                        {stats.recentTelegram.map((v, idx) => (
                          <div key={`${v.user_id}-${v.created_at}-${idx}`} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {v.first_name || 'User'}{' '}
                                {v.username ? (
                                  <span className="text-[#d9b57d]">@{v.username}</span>
                                ) : (
                                  <span className="text-white/45 font-mono text-[11px]">
                                    #{v.user_id}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-white/55 truncate">
                                {v.page || v.event} · {v.platform || 'tg'}
                              </div>
                            </div>
                            <span className="font-mono text-[11px] text-white/50 shrink-0">
                              {formatTime(v.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

