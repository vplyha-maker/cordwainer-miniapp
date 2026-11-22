import { useEffect, useState, useCallback, useMemo } from 'react'
import { BANNED_EVENT_NAME } from '../utils/analytics'
import {
  ActivityStudioChart,
  ConversionFunnelChart,
  DonutCard,
  PagesBarChart,
} from './admin/AdminCharts'
import {
  exportEditorialPdfReport,
  exportPagesCsv,
  exportUsersCsv,
  exportWorkbookExcel,
} from './admin/exportUtils'
import {
  CHART_PALETTE,
  DARK_INPUT_STYLE,
  PRODUCT_OPTIONS,
  calcDeltaPct,
  formatDateShort,
  formatNum,
  formatTime,
  type AdminTab,
  type DayDetailPayload,
  type HealthPayload,
  type PeriodDays,
  type SavedFilterPreset,
  type StatsPayload,
  type UserDetailPayload,
} from './admin/types'

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string
    }
  }
}

const PRESETS_STORAGE_KEY = 'cordwaine_admin_filter_presets_v1'

function getInitData(): string {
  if (typeof window === 'undefined') return ''
  return (window as unknown as TgWindow).Telegram?.WebApp?.initData || ''
}

function loadSavedPresets(): SavedFilterPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedFilterPreset[]) : []
  } catch {
    return []
  }
}

export function AdminStatsButton() {
  const [bannedReason, setBannedReason] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<AdminTab>('overview')
  const [days, setDays] = useState<PeriodDays>(7)
  const [hideAdmin, setHideAdmin] = useState(true)

  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Smart Search & Saved Presets
  const [globalQuery, setGlobalQuery] = useState('')
  const [presets, setPresets] = useState<SavedFilterPreset[]>(() => loadSavedPresets())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Day Drill-Down
  const [dayDetail, setDayDetail] = useState<DayDetailPayload | null>(null)
  const [dayLoading, setDayLoading] = useState(false)

  // System Health
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // CRM & Confirmations
  const [crmUserId, setCrmUserId] = useState('')
  const [crmProductId, setCrmProductId] = useState('pro_pigments')
  const [productMenuOpen, setProductMenuOpen] = useState(false)
  const [banReasonInput, setBanReasonInput] = useState('')
  const [crmBusy, setCrmBusy] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string
    onConfirm: () => void
  } | null>(null)

  // Users filtering & sorting
  const [userSearch, setUserSearch] = useState('')
  const [userSourceFilter, setUserSourceFilter] = useState<'all' | 'telegram' | 'web'>('all')
  const [userSort, setUserSort] = useState<'recent' | 'events' | 'pro'>('recent')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetailPayload | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)

  // Audit Log filter
  const [auditFilter, setAuditFilter] = useState('')

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const onBanned = (e: Event) => {
      const ce = e as CustomEvent<string>
      setBannedReason(ce.detail || 'Доступ ограничен администратором')
    }
    window.addEventListener(BANNED_EVENT_NAME, onBanned)
    return () => window.removeEventListener(BANNED_EVENT_NAME, onBanned)
  }, [])

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
          setError('Не удалось загрузить статистику из Neon')
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

  const loadHealth = useCallback(async () => {
    const initData = getInitData()
    if (!initData) return
    setHealthLoading(true)
    try {
      const res = await fetch('/api/check-purchase?action=health', {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      if (res.ok) {
        const data = (await res.json()) as HealthPayload
        setHealth(data)
      }
    } catch {
      // ignore
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const loadDayDetail = async (dayIso: string) => {
    const initData = getInitData()
    if (!initData) return
    setDayLoading(true)
    try {
      const qs = new URLSearchParams({
        action: 'day',
        date: dayIso,
        hideAdmin: hideAdmin ? '1' : '0',
      })
      const res = await fetch(`/api/check-purchase?${qs.toString()}`, {
        headers: { 'X-Telegram-Init-Data': initData },
      })
      if (res.ok) {
        const data = (await res.json()) as DayDetailPayload
        setDayDetail(data)
      }
    } catch {
      // ignore
    } finally {
      setDayLoading(false)
    }
  }

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

  const executeCrmAction = async (revoke: boolean) => {
    const initData = getInitData()
    if (!initData || !crmUserId.trim()) return
    setCrmBusy(true)
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
        flashToast(`Ошибка: ${data.error || 'операция не выполнена'}`)
      } else {
        flashToast(
          revoke
            ? `Отозван ${crmProductId} для #${crmUserId.trim()}`
            : `Выдан ${crmProductId} для #${crmUserId.trim()} ✓`
        )
        void loadStats(days, hideAdmin)
      }
    } catch {
      flashToast('Ошибка сети')
    } finally {
      setCrmBusy(false)
    }
  }

  const executeBanAction = async (targetId: string, unban: boolean) => {
    const initData = getInitData()
    if (!initData || !targetId.trim()) return
    setCrmBusy(true)
    try {
      const res = await fetch('/api/check-purchase?action=ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
        body: JSON.stringify({
          targetUserId: targetId.trim(),
          unban,
          reason: banReasonInput.trim(),
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        flashToast(`Ошибка: ${data.error || 'не удалось выполнить'}`)
      } else {
        flashToast(
          unban
            ? `#${targetId.trim()} разблокирован ✓`
            : `#${targetId.trim()} заблокирован`
        )
        if (!unban) setBanReasonInput('')
        void loadStats(days, hideAdmin)
      }
    } catch {
      flashToast('Ошибка сети')
    } finally {
      setCrmBusy(false)
    }
  }

  const saveCurrentFilterPreset = () => {
    const label = `${days >= 3650 ? 'Всё' : `${days}д`} · ${hideAdmin ? 'Без меня' : 'Все'}`
    if (presets.some((p) => p.days === days && p.hideAdmin === hideAdmin)) {
      flashToast('Такой пресет уже сохранён')
      return
    }
    const next = [...presets, { id: String(Date.now()), name: label, days, hideAdmin }].slice(-4)
    setPresets(next)
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    flashToast(`Пресет «${label}» сохранён`)
  }

  const filteredUsers = useMemo(() => {
    if (!stats) return []
    const q = userSearch.trim().toLowerCase()
    const list = stats.users.filter((u) => {
      if (userSourceFilter !== 'all' && u.source !== userSourceFilter) return false
      if (!q) return true
      return (
        u.user_id.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_page || '').toLowerCase().includes(q)
      )
    })
    return [...list].sort((a, b) => {
      if (userSort === 'events') return b.events_count - a.events_count
      if (userSort === 'pro') return b.pro_count - a.pro_count
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
    })
  }, [stats, userSearch, userSourceFilter, userSort])

  const filteredAudit = useMemo(() => {
    if (!stats) return []
    const q = auditFilter.trim().toLowerCase()
    if (!q) return stats.auditLog
    return stats.auditLog.filter((row) => {
      const hay = `${row.event} ${row.user_id} ${JSON.stringify(row.meta || {})}`.toLowerCase()
      return hay.includes(q)
    })
  }, [stats, auditFilter])

  const smartSearchHits = useMemo(() => {
    const q = globalQuery.trim().toLowerCase()
    if (!q || !stats) return null
    const users = stats.users
      .filter(
        (u) =>
          u.user_id.toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.first_name || '').toLowerCase().includes(q)
      )
      .slice(0, 4)
    const pages = stats.topPages.filter((p) => p.page.toLowerCase().includes(q)).slice(0, 4)
    const events = stats.events.filter((e) => e.event.toLowerCase().includes(q)).slice(0, 3)
    return { users, pages, events }
  }, [globalQuery, stats])

  if (bannedReason !== null && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#0B0B0C] text-[#F5F1EB] flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl border border-[#E05A6D]/35 bg-[#141413] p-6 text-center space-y-3 shadow-2xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#E05A6D]">
            CORDWAINE · ACCESS DENIED
          </div>
          <h2 className="text-[22px] font-serif">Доступ ограничен</h2>
          <p className="text-[13.5px] text-[#B5AFA4] leading-relaxed">{bannedReason}</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  const activeProductOption =
    PRODUCT_OPTIONS.find((p) => p.id === crmProductId) || PRODUCT_OPTIONS[0]

  const navItems: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Обзор' },
    { id: 'pages', label: 'Аналитика', count: stats?.topPages.length },
    { id: 'crm', label: 'PRO · CRM', count: stats?.summary.total_pro },
    { id: 'users', label: 'Люди', count: stats?.users.length },
    { id: 'audit', label: 'Журнал', count: stats?.auditLog.length },
    { id: 'health', label: 'Система' },
  ]

  const periodItems: { d: PeriodDays; label: string }[] = [
    { d: 1, label: '24ч' },
    { d: 7, label: '7д' },
    { d: 30, label: '30д' },
    { d: 3650, label: 'Всё' },
  ]

  const tgDelta = stats ? calcDeltaPct(stats.summary.tg_users, stats.previous.tg_users) : null
  const webDelta = stats ? calcDeltaPct(stats.summary.web_users, stats.previous.web_users) : null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          void loadStats(days, hideAdmin)
          void loadHealth()
        }}
        title="Cordwaine Command Center"
        className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-[#141413]/92 text-[#C9A86A] border border-[#C9A86A]/45 flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#1E1D1A] transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/82 flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-4xl lg:max-w-[1280px] h-[95dvh] md:h-[90vh] flex flex-col lg:flex-row rounded-t-3xl md:rounded-2xl bg-[#0B0B0C] text-[#F5F1EB] border border-[#F4F0E8]/[0.1] overflow-hidden shadow-2xl relative"
          >
            {/* === ДЕСКТОПНЫЙ САЙДБАР === */}
            <aside className="hidden lg:flex lg:w-[252px] shrink-0 flex-col justify-between bg-[#10100F] border-r border-[#F4F0E8]/[0.08] p-5">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#C9A86A]">
                      CORDWAINE · ADMIN
                    </span>
                  </div>
                  <h2 className="text-[18px] font-semibold text-[#F5F1EB] mt-1">
                    Command Center
                  </h2>
                  <p className="text-[12px] text-[#8C867C] mt-0.5 font-mono">
                    {stats?.syncedAt ? `Обновлено ${formatTime(stats.syncedAt)}` : 'Neon Live'}
                  </p>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = tab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTab(item.id)
                          if (item.id === 'health') void loadHealth()
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-[13.5px] font-medium cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#C9A86A]/15 text-[#F5F1EB] border border-[#C9A86A]/35'
                            : 'text-[#9A948A] hover:bg-white/[0.04] hover:text-[#F5F1EB] border border-transparent'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-md ${
                              active
                                ? 'bg-[#C9A86A] text-[#0B0B0C] font-semibold'
                                : 'bg-white/[0.06] text-[#9A948A]'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-[#F4F0E8]/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    const next = !hideAdmin
                    setHideAdmin(next)
                    void loadStats(days, next)
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-[12px] font-medium border cursor-pointer text-left ${
                    hideAdmin
                      ? 'border-[#C9A86A]/45 bg-[#C9A86A]/12 text-[#E5C992]'
                      : 'border-[#F4F0E8]/[0.1] bg-[#141413] text-[#9A948A]'
                  }`}
                >
                  {hideAdmin ? '✓ Без моих визитов' : 'С моими визитами'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full py-2 rounded-xl border border-[#F4F0E8]/[0.1] text-[12.5px] text-[#9A948A] hover:text-[#F5F1EB] cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </aside>

            {/* === ОСНОВНАЯ ОБЛАСТЬ === */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <header className="px-4 sm:px-6 pt-3.5 pb-3 bg-[#10100F] border-b border-[#F4F0E8]/[0.08] shrink-0 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 lg:hidden">
                      <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#C9A86A] whitespace-nowrap">
                        CORDWAINE · ADMIN
                      </span>
                    </div>
                    <h2 className="text-[17px] sm:text-[19px] font-semibold text-[#F5F1EB] leading-snug">
                      {navItems.find((n) => n.id === tab)?.label}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={!stats}
                      onClick={() => setShowExportMenu((v) => !v)}
                      className="h-9 px-2.5 rounded-xl text-[12px] font-medium border border-[#F4F0E8]/[0.14] bg-[#141413] text-[#E5DFD5] cursor-pointer disabled:opacity-40"
                    >
                      Экспорт
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void loadStats(days, hideAdmin)
                        if (tab === 'health') void loadHealth()
                      }}
                      disabled={loading}
                      className="h-9 px-3 rounded-xl text-[12px] font-medium border border-[#C9A86A]/35 bg-[#C9A86A]/10 text-[#E5C992] cursor-pointer disabled:opacity-50"
                    >
                      {loading ? '…' : 'Обновить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="lg:hidden w-9 h-9 rounded-xl border border-[#F4F0E8]/[0.12] bg-[#141413] text-[#B5AFA4] flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Меню экспорта */}
                {showExportMenu && stats && (
                  <div className="p-2.5 rounded-xl bg-[#0B0B0C] border border-[#C9A86A]/35 flex flex-wrap items-center gap-2">
                    <span className="text-[11.5px] text-[#9A948A] mr-auto">
                      Экспорт данных:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        exportUsersCsv(stats)
                        setShowExportMenu(false)
                        flashToast('CSV пользователей скачан')
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1C1B19] border border-[#F4F0E8]/[0.12] text-[12px] text-[#F5F1EB] cursor-pointer"
                    >
                      CSV (Люди)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportPagesCsv(stats)
                        setShowExportMenu(false)
                        flashToast('CSV разделов скачан')
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1C1B19] border border-[#F4F0E8]/[0.12] text-[12px] text-[#F5F1EB] cursor-pointer"
                    >
                      CSV (Разделы)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportWorkbookExcel(stats)
                        setShowExportMenu(false)
                        flashToast('Excel (.xls) сформирован')
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#C9A86A]/20 border border-[#C9A86A]/40 text-[12px] text-[#E5C992] font-semibold cursor-pointer"
                    >
                      Excel (.xls)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportEditorialPdfReport(stats)
                        setShowExportMenu(false)
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#34D399]/15 border border-[#34D399]/35 text-[12px] text-[#8CE6C0] font-semibold cursor-pointer"
                    >
                      PDF Отчёт
                    </button>
                  </div>
                )}

                {/* Smart Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={globalQuery}
                    onChange={(e) => setGlobalQuery(e.target.value)}
                    placeholder="Smart Search: Telegram ID, @username, раздел, событие…"
                    style={DARK_INPUT_STYLE}
                    className="w-full h-9 px-3 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.12] text-[12.5px] placeholder:text-[#7D776E] focus:outline-none focus:border-[#C9A86A]"
                  />
                  {smartSearchHits && (
                    <div className="absolute left-0 right-0 top-10 z-30 rounded-xl bg-[#141413] border border-[#C9A86A]/35 p-3 shadow-2xl space-y-2.5 max-h-64 overflow-y-auto">
                      {smartSearchHits.users.length === 0 &&
                      smartSearchHits.pages.length === 0 &&
                      smartSearchHits.events.length === 0 ? (
                        <div className="text-[12px] text-[#8C867C]">Ничего не найдено</div>
                      ) : (
                        <>
                          {smartSearchHits.users.map((u) => (
                            <button
                              key={u.user_id}
                              type="button"
                              onClick={() => {
                                setUserSearch(u.user_id)
                                setTab('users')
                                setGlobalQuery('')
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] flex justify-between text-[12px] cursor-pointer"
                            >
                              <span className="text-[#F5F1EB]">
                                👤 {u.first_name || 'Guest'} #{u.user_id}
                              </span>
                              <span className="text-[#C9A86A] font-mono">Люди →</span>
                            </button>
                          ))}
                          {smartSearchHits.pages.map((p) => (
                            <button
                              key={p.page}
                              type="button"
                              onClick={() => {
                                setTab('pages')
                                setGlobalQuery('')
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] flex justify-between text-[12px] cursor-pointer"
                            >
                              <span className="text-[#F5F1EB] font-mono">📄 {p.page}</span>
                              <span className="text-[#60A5FA] font-mono">{p.opens} откр.</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Мобильная / планшетная навигация (6 вкладок горизонтально) */}
                <div className="lg:hidden flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {navItems.map((item) => {
                    const active = tab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTab(item.id)
                          if (item.id === 'health') void loadHealth()
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap shrink-0 cursor-pointer border ${
                          active
                            ? 'bg-[#C9A86A] text-[#0B0B0C] border-[#C9A86A]'
                            : 'bg-[#0B0B0C] text-[#9A948A] border-[#F4F0E8]/[0.08]'
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>

                {/* Фильтры периода + Сохранённые пресеты */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] p-0.5">
                    {periodItems.map((p) => (
                      <button
                        key={p.d}
                        type="button"
                        onClick={() => {
                          setDays(p.d)
                          void loadStats(p.d, hideAdmin)
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11.5px] font-mono cursor-pointer ${
                          days === p.d
                            ? 'bg-[#22211F] text-[#F5F1EB] font-semibold'
                            : 'text-[#8C867C]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={saveCurrentFilterPreset}
                      title="Сохранить фильтр"
                      className="px-2 py-1 rounded-lg border border-[#F4F0E8]/[0.1] bg-[#141413] text-[11.5px] text-[#9A948A] cursor-pointer"
                    >
                      + Пресет
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !hideAdmin
                        setHideAdmin(next)
                        void loadStats(days, next)
                      }}
                      className={`lg:hidden px-2.5 py-1 rounded-lg text-[11.5px] font-medium border cursor-pointer whitespace-nowrap ${
                        hideAdmin
                          ? 'border-[#C9A86A]/45 bg-[#C9A86A]/12 text-[#E5C992]'
                          : 'border-[#F4F0E8]/[0.1] bg-[#141413] text-[#9A948A]'
                      }`}
                    >
                      {hideAdmin ? '✓ Без меня' : 'Все'}
                    </button>
                  </div>
                </div>

                {presets.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {presets.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => {
                          setDays(pr.days)
                          setHideAdmin(pr.hideAdmin)
                          void loadStats(pr.days, pr.hideAdmin)
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono text-[#CFC9BE] whitespace-nowrap cursor-pointer"
                      >
                        ★ {pr.name}
                      </button>
                    ))}
                  </div>
                )}
              </header>

              {/* Тело */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {error && (
                  <div className="p-4 rounded-2xl border border-[#E05A6D]/40 bg-[#E05A6D]/10 text-[#F4A3AE] text-[13px]">
                    {error}
                  </div>
                )}

                {loading && !stats && (
                  <div className="py-16 text-center text-[13.5px] text-[#8C867C]">
                    Загрузка аналитики из Neon…
                  </div>
                )}

                {/* === 1. ОБЗОР === */}
                {stats && tab === 'overview' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="flex items-center justify-between text-[12px] text-[#9A948A]">
                          <span>Telegram уник.</span>
                          {tgDelta && (
                            <span className="font-mono text-[11px] text-[#34D399]">{tgDelta}</span>
                          )}
                        </div>
                        <div className="mt-2 font-mono text-[26px] leading-none font-bold text-[#C9A86A] tabular-nums">
                          {formatNum(stats.summary.tg_users)}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#7D776E] font-mono">
                          Событий: {formatNum(stats.summary.total_events)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="flex items-center justify-between text-[12px] text-[#9A948A]">
                          <span>Браузер (Web)</span>
                          {webDelta && (
                            <span className="font-mono text-[11px] text-[#60A5FA]">{webDelta}</span>
                          )}
                        </div>
                        <div className="mt-2 font-mono text-[26px] leading-none font-bold text-[#60A5FA] tabular-nums">
                          {formatNum(stats.summary.web_users)}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#7D776E] font-mono">
                          Сред. соб./чел: {stats.summary.avg_events_per_user}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="text-[12px] text-[#9A948A]">Новые / Возвраты</div>
                        <div className="mt-2 font-mono text-[24px] leading-none font-bold text-[#F5F1EB] tabular-nums">
                          {stats.summary.new_users} / {stats.summary.returning_users}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#7D776E] font-mono">
                          Retention 30д: {stats.summary.retention_pct}%
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#34D399]/25 p-4">
                        <div className="text-[12px] text-[#8CE6C0]">PRO (оценка в ⭐)</div>
                        <div className="mt-2 font-mono text-[24px] leading-none font-bold text-[#34D399] tabular-nums">
                          {formatNum(stats.summary.total_pro)} · {formatNum(stats.summary.total_stars)}⭐
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#8C867C] font-mono">
                          Расч. экв. ~${stats.summary.total_net_usd}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-8 space-y-3">
                        <ActivityStudioChart
                          daily={stats.daily}
                          onSelectDayIso={(iso) => void loadDayDetail(iso)}
                        />

                        {/* Drill-Down по выбранному дню */}
                        {(dayLoading || dayDetail) && (
                          <div className="rounded-2xl bg-[#141413] border border-[#C9A86A]/35 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-[#E5C992]">
                                Детали за {dayDetail?.date || '…'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDayDetail(null)}
                                className="text-[12px] text-[#8C867C] cursor-pointer"
                              >
                                Закрыть ✕
                              </button>
                            </div>
                            {dayLoading ? (
                              <div className="text-[12px] text-[#8C867C]">Загрузка дня…</div>
                            ) : dayDetail ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                                <div>
                                  <div className="text-[#8C867C] mb-1">Топ разделов:</div>
                                  {dayDetail.pages.length === 0 ? (
                                    <div className="text-[#6E6860]">Нет открытий</div>
                                  ) : (
                                    dayDetail.pages.map((p) => (
                                      <div key={p.page} className="flex justify-between font-mono py-0.5">
                                        <span>{p.page}</span>
                                        <span className="text-[#C9A86A]">{p.opens}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                                <div>
                                  <div className="text-[#8C867C] mb-1">Активные пользователи:</div>
                                  {dayDetail.users.length === 0 ? (
                                    <div className="text-[#6E6860]">Нет визитов</div>
                                  ) : (
                                    dayDetail.users.slice(0, 6).map((u) => (
                                      <div key={u.user_id} className="flex justify-between font-mono py-0.5">
                                        <span className="truncate">
                                          {u.username ? `@${u.username}` : `#${u.user_id}`}
                                        </span>
                                        <span className="text-[#60A5FA]">{u.events_count}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-4">
                        <DonutCard
                          title="Каналы трафика"
                          centerValue={formatNum(
                            stats.summary.tg_users + stats.summary.web_users
                          )}
                          items={[
                            { name: 'Telegram', value: stats.summary.tg_users, color: '#C9A86A' },
                            { name: 'Web', value: stats.summary.web_users, color: '#60A5FA' },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DonutCard
                        title="Языки аудитории"
                        centerValue={formatNum(stats.langs.reduce((a, b) => a + b.users, 0))}
                        items={stats.langs.map((l, idx) => ({
                          name: (l.lang || 'other').toUpperCase(),
                          value: l.users,
                          color: CHART_PALETTE[idx % CHART_PALETTE.length],
                        }))}
                      />
                      <DonutCard
                        title="Платформы устройств"
                        centerValue={formatNum(stats.platforms.reduce((a, b) => a + b.users, 0))}
                        items={stats.platforms.map((p, idx) => ({
                          name: p.platform || 'web',
                          value: p.users,
                          color: CHART_PALETTE[(idx + 1) % CHART_PALETTE.length],
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* === 2. АНАЛИТИКА И ВОРОНКА === */}
                {stats && tab === 'pages' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-7">
                        <PagesBarChart pages={stats.topPages} />
                      </div>
                      <div className="lg:col-span-5">
                        <ConversionFunnelChart
                          steps={[
                            { name: 'Всего визитов', value: stats.summary.total_users },
                            {
                              name: 'Повторные',
                              value: stats.summary.returning_users,
                            },
                            {
                              name: 'Telegram',
                              value: stats.summary.tg_users,
                            },
                            { name: 'PRO-доступы', value: stats.summary.total_pro },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-3">
                      <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                        События системы
                      </h3>
                      <div className="divide-y divide-[#F4F0E8]/[0.06]">
                        {stats.events.map((ev) => (
                          <div key={ev.event} className="py-2.5 flex justify-between font-mono text-[12.5px]">
                            <span className="text-[#F5F1EB]">{ev.event}</span>
                            <span>
                              <span className="text-[#C9A86A] font-semibold">
                                {formatNum(ev.unique_users)} чел
                              </span>
                              <span className="text-[#7D776E]"> · {formatNum(ev.total)}×</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* === 3. PRO · CRM === */}
                {stats && tab === 'crm' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="rounded-2xl bg-[#141413] border border-[#C9A86A]/30 p-4 sm:p-5 space-y-4">
                        <div>
                          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                            Управление PRO-доступом
                          </h3>
                          <p className="text-[12px] text-[#8C867C] mt-0.5">
                            Все операции фиксируются в журнале администратора
                          </p>
                        </div>

                        <div className="space-y-3">
                          <label className="block space-y-1.5">
                            <span className="text-[12px] text-[#B5AFA4] font-medium">
                              ID пользователя
                            </span>
                            <input
                              type="text"
                              value={crmUserId}
                              onChange={(e) => setCrmUserId(e.target.value.trim())}
                              placeholder="Telegram ID (или web_… для бана)"
                              style={DARK_INPUT_STYLE}
                              className="w-full h-11 px-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.18] font-mono text-[14px] placeholder:text-[#7D776E] focus:outline-none focus:border-[#C9A86A]"
                            />
                          </label>

                          <div className="space-y-1.5">
                            <span className="text-[12px] text-[#B5AFA4] font-medium">
                              Модуль PRO
                            </span>
                            <button
                              type="button"
                              onClick={() => setProductMenuOpen((v) => !v)}
                              className="w-full h-11 px-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.18] flex items-center justify-between text-[13.5px] text-[#F5F1EB] cursor-pointer"
                            >
                              <span className="font-medium truncate">
                                {activeProductOption.label}
                              </span>
                              <span className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-[12px] text-[#C9A86A]">
                                  {activeProductOption.price}
                                </span>
                                <span className="text-[#8C867C] text-[11px]">
                                  {productMenuOpen ? '▲' : '▼'}
                                </span>
                              </span>
                            </button>

                            {productMenuOpen && (
                              <div className="rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.18] divide-y divide-[#F4F0E8]/[0.06] overflow-hidden">
                                {PRODUCT_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setCrmProductId(opt.id)
                                      setProductMenuOpen(false)
                                    }}
                                    className={`w-full px-3.5 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                      opt.id === crmProductId
                                        ? 'bg-[#C9A86A]/18 text-[#F5F1EB] font-semibold'
                                        : 'text-[#CFC9BE]'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    <span className="font-mono text-[12px] text-[#C9A86A]">
                                      {opt.price}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() => void executeCrmAction(false)}
                              className="h-11 rounded-xl bg-[#C9A86A] text-[#0B0B0C] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40"
                            >
                              {crmBusy ? '…' : 'Выдать PRO'}
                            </button>
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() =>
                                setPendingConfirm({
                                  title: `Отозвать ${crmProductId} у #${crmUserId}?`,
                                  onConfirm: () => void executeCrmAction(true),
                                })
                              }
                              className="h-11 rounded-xl border border-[#F4F0E8]/[0.18] bg-[#1C1B19] text-[#F5F1EB] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40"
                            >
                              Забрать PRO
                            </button>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-[#F4F0E8]/[0.08] space-y-3">
                          <h4 className="text-[13.5px] font-semibold text-[#F4A3AE]">
                            Блокировка пользователя
                          </h4>
                          <input
                            type="text"
                            value={banReasonInput}
                            onChange={(e) => setBanReasonInput(e.target.value)}
                            placeholder="Причина блокировки (необязательно)"
                            style={DARK_INPUT_STYLE}
                            className="w-full h-11 px-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.18] text-[13.5px] placeholder:text-[#7D776E] focus:outline-none focus:border-[#E05A6D]"
                          />
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() =>
                                setPendingConfirm({
                                  title: `Заблокировать пользователя #${crmUserId}?`,
                                  onConfirm: () => void executeBanAction(crmUserId, false),
                                })
                              }
                              className="h-11 rounded-xl bg-[#C83E52] text-[#F5F1EB] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40"
                            >
                              Заблокировать
                            </button>
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() => void executeBanAction(crmUserId, true)}
                              className="h-11 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-[#8CE6C0] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40"
                            >
                              Разблокировать
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                            Заблокированные ({stats.bannedUsers.length})
                          </h3>
                        </div>
                        {stats.bannedUsers.length === 0 ? (
                          <div className="text-[13px] text-[#7D776E]">Список пуст</div>
                        ) : (
                          <div className="divide-y divide-[#F4F0E8]/[0.06]">
                            {stats.bannedUsers.map((b) => (
                              <div key={b.user_id} className="py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-mono text-[13px] font-semibold text-[#F4A3AE]">
                                    #{b.user_id}
                                  </div>
                                  <div className="text-[12px] text-[#8C867C] truncate">
                                    {b.reason || 'Без причины'} · {formatTime(b.created_at)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={crmBusy}
                                  onClick={() => void executeBanAction(b.user_id, true)}
                                  className="px-3 py-1.5 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-[#8CE6C0] text-[12px] cursor-pointer shrink-0"
                                >
                                  Разбанить
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-5">
                      <DonutCard
                        title="Распределение PRO-модулей (⭐)"
                        subtitle={`Всего ${formatNum(stats.summary.total_pro)} активаций · усл. экв. ~$${stats.summary.total_net_usd}`}
                        centerValue={`${formatNum(stats.summary.total_stars)} ⭐`}
                        items={stats.proBreakdown.map((r, idx) => ({
                          name: `${r.product_id} (${r.count})`,
                          value: r.stars,
                          color: CHART_PALETTE[idx % CHART_PALETTE.length],
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* === 4. ЛЮДИ (User Intelligence) === */}
                {stats && tab === 'users' && (
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Поиск по ID, @username, имени или разделу…"
                        style={DARK_INPUT_STYLE}
                        className="flex-1 h-10 px-3.5 rounded-xl bg-[#141413] border border-[#F4F0E8]/[0.14] text-[13px] placeholder:text-[#7D776E] focus:outline-none focus:border-[#C9A86A]"
                      />

                      <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-xl bg-[#141413] border border-[#F4F0E8]/[0.1] p-0.5">
                          {(
                            [
                              ['all', 'Все'],
                              ['telegram', 'TG'],
                              ['web', 'Web'],
                            ] as const
                          ).map(([f, lbl]) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setUserSourceFilter(f)}
                              className={`px-2.5 py-1 rounded-lg text-[12px] cursor-pointer ${
                                userSourceFilter === f
                                  ? 'bg-[#C9A86A] text-[#0B0B0C] font-semibold'
                                  : 'text-[#9A948A]'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>

                        <div className="inline-flex rounded-xl bg-[#141413] border border-[#F4F0E8]/[0.1] p-0.5">
                          {(
                            [
                              ['recent', 'Новые'],
                              ['events', 'Актив.'],
                              ['pro', 'PRO'],
                            ] as const
                          ).map(([s, lbl]) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setUserSort(s)}
                              className={`px-2.5 py-1 rounded-lg text-[12px] cursor-pointer ${
                                userSort === s
                                  ? 'bg-[#22211F] text-[#F5F1EB] font-semibold'
                                  : 'text-[#8C867C]'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] overflow-hidden">
                      <div className="px-4 sm:px-5 py-3 border-b border-[#F4F0E8]/[0.08] flex justify-between items-center text-[12.5px] text-[#9A948A]">
                        <span>Найдено пользователей: {filteredUsers.length}</span>
                      </div>

                      {filteredUsers.length === 0 ? (
                        <div className="py-10 text-center text-[13px] text-[#8C867C]">
                          Пользователи не найдены
                        </div>
                      ) : (
                        <div className="divide-y divide-[#F4F0E8]/[0.06]">
                          {filteredUsers.map((u) => {
                            const isOpen = selectedUserId === u.user_id
                            const isTg = u.source === 'telegram'
                            return (
                              <div key={u.user_id} className="px-4 sm:px-5 py-3.5">
                                <button
                                  type="button"
                                  onClick={() => void loadUserDetail(u.user_id)}
                                  className="w-full text-left flex items-center justify-between gap-3 bg-transparent border-0 p-0 text-inherit cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-[11px] font-bold shrink-0 border ${
                                        isTg
                                          ? 'bg-[#C9A86A]/15 text-[#E5C992] border-[#C9A86A]/35'
                                          : 'bg-[#60A5FA]/15 text-[#93C5FD] border-[#60A5FA]/35'
                                      }`}
                                    >
                                      {isTg ? 'TG' : 'WEB'}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13.5px] font-semibold text-[#F5F1EB] truncate">
                                          {u.first_name || 'Guest'}
                                        </span>
                                        {u.username ? (
                                          <span className="text-[12.5px] font-mono text-[#C9A86A]">
                                            @{u.username}
                                          </span>
                                        ) : (
                                          <span className="text-[12px] font-mono text-[#8C867C]">
                                            #{u.user_id}
                                          </span>
                                        )}
                                        {u.pro_count > 0 && (
                                          <span className="px-2 py-0.5 rounded-md bg-[#34D399]/15 text-[#8CE6C0] font-mono text-[11px] font-semibold">
                                            PRO ×{u.pro_count}
                                          </span>
                                        )}
                                        {u.active_days >= 2 && (
                                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[#CFC9BE] font-mono text-[10.5px]">
                                            {u.active_days}д
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[12px] text-[#8C867C] mt-0.5 truncate">
                                        {u.last_page || '—'} · {u.platform || 'web'} · {u.events_count} соб. · с {formatDateShort(u.first_seen)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="font-mono text-[12px] text-[#B5AFA4] tabular-nums">
                                      {formatTime(u.last_seen)}
                                    </div>
                                    <div className="text-[11px] text-[#7D776E] mt-0.5">
                                      {isOpen ? '▲' : '▼'}
                                    </div>
                                  </div>
                                </button>

                                {isOpen && (
                                  <div className="mt-3 p-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] space-y-3">
                                    {userDetailLoading ? (
                                      <div className="text-[12.5px] text-[#8C867C]">
                                        Загрузка профиля…
                                      </div>
                                    ) : userDetail ? (
                                      <>
                                        <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-[#F4F0E8]/[0.06]">
                                          <div className="text-[12px] font-mono text-[#CFC9BE]">
                                            <span className="text-[#8C867C]">PRO: </span>
                                            {userDetail.products.length
                                              ? userDetail.products.join(', ')
                                              : 'нет'}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCrmUserId(u.user_id)
                                              setTab('crm')
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-[#C9A86A]/18 border border-[#C9A86A]/35 text-[#E5C992] text-[12px] font-semibold cursor-pointer"
                                          >
                                            В CRM / Бан →
                                          </button>
                                        </div>

                                        {userDetail.adminHistory.length > 0 && (
                                          <div className="text-[11.5px] font-mono text-[#E5C992] space-y-1">
                                            <div className="text-[#8C867C]">История админ-действий:</div>
                                            {userDetail.adminHistory.map((h, idx) => (
                                              <div key={idx}>
                                                {h.event} · {formatTime(h.created_at)}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                                          {userDetail.events.map((ev, i) => (
                                            <div
                                              key={`${ev.created_at}-${i}`}
                                              className="flex justify-between font-mono text-[12px] text-[#B5AFA4]"
                                            >
                                              <span className="truncate">
                                                <span className="text-[#F5F1EB]">{ev.event}</span>
                                                <span className="text-[#7D776E]"> · {ev.page || '—'}</span>
                                              </span>
                                              <span className="text-[#7D776E] shrink-0">
                                                {formatTime(ev.created_at)}
                                              </span>
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
                  </div>
                )}

                {/* === 5. ЖУРНАЛ ДЕЙСТВИЙ АДМИНА === */}
                {stats && tab === 'audit' && (
                  <div className="space-y-3.5">
                    <input
                      type="text"
                      value={auditFilter}
                      onChange={(e) => setAuditFilter(e.target.value)}
                      placeholder="Фильтр журнала (admin_grant, admin_ban, ID…)"
                      style={DARK_INPUT_STYLE}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#141413] border border-[#F4F0E8]/[0.14] text-[13px] placeholder:text-[#7D776E] focus:outline-none focus:border-[#C9A86A]"
                    />

                    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] overflow-hidden">
                      {filteredAudit.length === 0 ? (
                        <div className="py-12 text-center text-[13px] text-[#8C867C]">
                          Операций администратора пока нет
                        </div>
                      ) : (
                        <div className="divide-y divide-[#F4F0E8]/[0.06]">
                          {filteredAudit.map((row) => {
                            const target = String(row.meta?.targetUserId || '—')
                            const prod = row.meta?.productId
                              ? ` · ${String(row.meta.productId)}`
                              : ''
                            return (
                              <div
                                key={row.id}
                                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="font-mono text-[13px] font-semibold text-[#E5C992] truncate">
                                    {row.event}
                                  </div>
                                  <div className="text-[12px] text-[#9A948A] font-mono truncate mt-0.5">
                                    Объект: #{target}
                                    {prod} · Админ: #{row.user_id}
                                  </div>
                                </div>
                                <span className="font-mono text-[11.5px] text-[#7D776E] shrink-0">
                                  {formatTime(row.created_at)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* === 6. СОСТОЯНИЕ СИСТЕМЫ (System Health) === */}
                {tab === 'health' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="text-[12px] text-[#9A948A]">API Vercel</div>
                        <div className="mt-2 text-[18px] font-semibold text-[#34D399]">
                          {healthLoading ? 'Проверка…' : health?.apiStatus === 'ok' ? '● Работает' : 'Нет данных'}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="text-[12px] text-[#9A948A]">Neon PostgreSQL</div>
                        <div
                          className={`mt-2 text-[18px] font-semibold ${
                            health?.dbStatus === 'ok'
                              ? 'text-[#34D399]'
                              : health?.dbStatus === 'warn'
                              ? 'text-[#F59E0B]'
                              : 'text-[#E05A6D]'
                          }`}
                        >
                          {healthLoading
                            ? 'Проверка…'
                            : health?.dbStatus === 'ok'
                            ? `● ${health.dbLatencyMs} мс`
                            : health?.dbStatus === 'warn'
                            ? `▲ Медленно (${health.dbLatencyMs} мс)`
                            : '✕ Ошибка'}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="text-[12px] text-[#9A948A]">Последнее событие</div>
                        <div className="mt-2 font-mono text-[15px] font-semibold text-[#F5F1EB]">
                          {formatTime(health?.lastEventAt)}
                        </div>
                      </div>
                    </div>

                    {health && (
                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 divide-y divide-[#F4F0E8]/[0.06] text-[13px]">
                        <div className="py-2.5 flex justify-between">
                          <span className="text-[#9A948A]">Таблица app_events</span>
                          <span className="font-mono text-[#F5F1EB]">
                            {health.tables.app_events ?? 'Недоступна'} строк
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-[#9A948A]">Таблица user_purchases</span>
                          <span className="font-mono text-[#F5F1EB]">
                            {health.tables.user_purchases ?? 'Недоступна'} строк
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-[#9A948A]">Таблица banned_users</span>
                          <span className="font-mono text-[#F5F1EB]">
                            {health.tables.banned_users === null
                              ? 'Не создана'
                              : `${health.tables.banned_users} строк`}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-[#9A948A]">TELEGRAM_BOT_TOKEN</span>
                          <span className="font-mono text-[#34D399]">
                            {health.botTokenConfigured ? 'Подключён' : 'Отсутствует'}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-[#9A948A]">ADMIN_TELEGRAM_ID</span>
                          <span className="font-mono text-[#34D399]">
                            {health.adminIdConfigured ? 'Подключён' : 'Отсутствует'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Модалка подтверждения критических действий */}
            {pendingConfirm && (
              <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
                <div className="max-w-sm w-full rounded-2xl bg-[#141413] border border-[#E05A6D]/40 p-5 space-y-4 shadow-2xl">
                  <div className="text-[15px] font-semibold text-[#F5F1EB]">
                    {pendingConfirm.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPendingConfirm(null)}
                      className="h-10 rounded-xl border border-[#F4F0E8]/[0.15] text-[13px] text-[#CFC9BE] cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const fn = pendingConfirm.onConfirm
                        setPendingConfirm(null)
                        fn()
                      }}
                      className="h-10 rounded-xl bg-[#C83E52] text-[#F5F1EB] font-semibold text-[13px] cursor-pointer"
                    >
                      Подтвердить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Toast-уведомление */}
            {toast && (
              <div className="absolute bottom-4 right-4 z-40 px-4 py-2.5 rounded-xl bg-[#1C1B19] border border-[#C9A86A]/45 text-[12.5px] font-mono text-[#E5C992] shadow-xl">
                {toast}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
