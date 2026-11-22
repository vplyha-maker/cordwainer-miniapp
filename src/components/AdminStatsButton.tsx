import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import * as echarts from 'echarts/core'
import {
  LineChart,
  BarChart,
  PieChart,
  type LineSeriesOption,
  type BarSeriesOption,
  type PieSeriesOption,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { BANNED_EVENT_NAME } from '../utils/analytics'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
])

type AdminECOption = echarts.ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | TooltipComponentOption
>

type TgWindow = {
  Telegram?: {
    WebApp?: {
      initData?: string
    }
  }
}

type AdminTab = 'overview' | 'pages' | 'crm' | 'users'
type PeriodDays = 1 | 7 | 30 | 3650
type ChartSourceFilter = 'all' | 'tg' | 'web'
type ChartKind = 'line' | 'bar'

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

interface BannedRow {
  user_id: string
  reason: string | null
  created_at: string
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
  bannedUsers: BannedRow[]
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

const PALETTE = ['#d9b57d', '#38bdf8', '#34d399', '#a78bfa', '#fb7185', '#f59e0b']

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

function buildLast14Days(raw: DailyRow[]): DailyRow[] {
  const byLabel = new Map<string, DailyRow>()
  for (let i = 0; i < raw.length; i++) {
    byLabel.set(raw[i].day_label, raw[i])
  }
  const out: DailyRow[] = []
  const now = new Date()
  for (let offset = 13; offset >= 0; offset--) {
    const d = new Date(now.getTime() - offset * 86400 * 1000)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const label = `${dd}.${mm}`
    const hit = byLabel.get(label)
    out.push({
      day_label: label,
      tg_users: hit ? hit.tg_users : 0,
      web_users: hit ? hit.web_users : 0,
    })
  }
  return out
}

function EChartCanvas({ option, height }: { option: AdminECOption; height: number }) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const instRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const inst = echarts.init(el, undefined, {
      renderer: 'canvas',
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
    instRef.current = inst
    const ro = new ResizeObserver(() => inst.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      inst.dispose()
      instRef.current = null
    }
  }, [])

  useEffect(() => {
    instRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={elRef}
      style={{ height: `${height}px`, width: '100%', touchAction: 'pan-y' }}
    />
  )
}

function AdminActivityChart({ daily }: { daily: DailyRow[] }) {
  const [sourceFilter, setSourceFilter] = useState<ChartSourceFilter>('all')
  const [chartKind, setChartKind] = useState<ChartKind>('line')

  const seriesData = useMemo(() => buildLast14Days(daily), [daily])

  const option = useMemo<AdminECOption>(() => {
    const labels = seriesData.map((d) => d.day_label)
    const tgData = seriesData.map((d) => d.tg_users)
    const webData = seriesData.map((d) => d.web_users)

    const series: (LineSeriesOption | BarSeriesOption)[] = []

    if (sourceFilter === 'all' || sourceFilter === 'tg') {
      if (chartKind === 'line') {
        series.push({
          name: 'Telegram',
          type: 'line',
          data: tgData,
          smooth: 0.36,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: '#d9b57d' },
          itemStyle: { color: '#d9b57d', borderColor: '#111110', borderWidth: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(217, 181, 125, 0.38)' },
              { offset: 1, color: 'rgba(217, 181, 125, 0.02)' },
            ]),
          },
        })
      } else {
        series.push({
          name: 'Telegram',
          type: 'bar',
          barMaxWidth: 14,
          data: tgData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#e6c58f' },
              { offset: 1, color: '#9a723c' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        })
      }
    }

    if (sourceFilter === 'all' || sourceFilter === 'web') {
      if (chartKind === 'line') {
        series.push({
          name: 'Web',
          type: 'line',
          data: webData,
          smooth: 0.36,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.2, color: '#38bdf8' },
          itemStyle: { color: '#38bdf8', borderColor: '#111110', borderWidth: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(56, 189, 248, 0.30)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.02)' },
            ]),
          },
        })
      } else {
        series.push({
          name: 'Web',
          type: 'bar',
          barMaxWidth: 14,
          data: webData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#7dd3fc' },
              { offset: 1, color: '#0284c7' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        })
      }
    }

    return {
      animationDuration: 280,
      grid: { top: 14, right: 10, bottom: 24, left: 30 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17,17,16,0.96)',
        borderColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        padding: [8, 10],
        textStyle: {
          color: '#f5f3ee',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: chartKind === 'bar',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255,255,255,0.52)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9.5,
          interval: 2,
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitNumber: 3,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.48)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
        },
      },
      series,
    }
  }, [seriesData, sourceFilter, chartKind])

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.12em] text-white/65 font-semibold">
          Активность (14 дней)
        </span>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-lg bg-black/40 border border-white/10 p-0.5">
            {(
              [
                ['all', 'Все', 'text-white'],
                ['tg', 'TG', 'text-[#d9b57d]'],
                ['web', 'Web', 'text-[#38bdf8]'],
              ] as const
            ).map(([id, label, activeColor]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSourceFilter(id)}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono cursor-pointer ${
                  sourceFilter === id
                    ? `bg-white/15 font-semibold ${activeColor}`
                    : 'text-white/45'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg bg-black/40 border border-white/10 p-0.5">
            {(
              [
                ['line', '∿'],
                ['bar', '▮'],
              ] as const
            ).map(([k, icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartKind(k)}
                className={`px-2 py-0.5 rounded-md text-[11px] cursor-pointer ${
                  chartKind === k ? 'bg-white/15 text-white' : 'text-white/45'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      <EChartCanvas option={option} height={185} />
    </div>
  )
}

function DonutCard({
  title,
  centerValue,
  items,
}: {
  title: string
  centerValue: string
  items: { name: string; value: number; color: string }[]
}) {
  const option = useMemo<AdminECOption>(() => {
    const nonZero = items.filter((i) => i.value > 0)
    const data = nonZero.length
      ? nonZero.map((i) => ({
          name: i.name,
          value: i.value,
          itemStyle: { color: i.color },
        }))
      : [{ name: 'Нет данных', value: 1, itemStyle: { color: 'rgba(255,255,255,0.08)' } }]

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(17,17,16,0.96)',
        borderColor: 'rgba(255,255,255,0.14)',
        textStyle: {
          color: '#f5f3ee',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
        formatter: '{b}: <b>{c}</b> ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['56%', '84%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#111110', borderWidth: 2, borderRadius: 4 },
          label: { show: false },
          data,
        },
      ],
    }
  }, [items])

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
      <div className="text-[10.5px] uppercase tracking-[0.1em] text-white/55 font-semibold">
        {title}
      </div>
      <div className="relative">
        <EChartCanvas option={option} height={116} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[13px] font-bold text-white/90">
            {centerValue}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        {items.slice(0, 4).map((it) => (
          <div key={it.name} className="flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 truncate text-white/75">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: it.color }}
              />
              <span className="truncate">{it.name}</span>
            </span>
            <span className="font-semibold text-white">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PagesBarChart({ pages }: { pages: PageStat[] }) {
  const top = useMemo(() => pages.slice(0, 8).reverse(), [pages])

  const option = useMemo<AdminECOption>(
    () => ({
      animationDuration: 260,
      grid: { top: 8, right: 16, bottom: 20, left: 78 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(17,17,16,0.96)',
        borderColor: 'rgba(255,255,255,0.14)',
        textStyle: {
          color: '#f5f3ee',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.45)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9.5,
        },
      },
      yAxis: {
        type: 'category',
        data: top.map((p) => p.page),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255,255,255,0.82)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10.5,
        },
      },
      series: [
        {
          name: 'TG уник.',
          type: 'bar',
          stack: 'u',
          barMaxWidth: 14,
          data: top.map((p) => p.tg_users),
          itemStyle: { color: '#d9b57d', borderRadius: [0, 0, 0, 0] },
        },
        {
          name: 'Web уник.',
          type: 'bar',
          stack: 'u',
          barMaxWidth: 14,
          data: top.map((p) => p.web_users),
          itemStyle: { color: '#38bdf8', borderRadius: [0, 4, 4, 0] },
        },
      ],
    }),
    [top]
  )

  if (!top.length) return null

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2">
      <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 font-semibold">
        Рейтинг разделов (TG + Web)
      </div>
      <EChartCanvas option={option} height={Math.max(140, top.length * 28)} />
    </div>
  )
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

  const [crmUserId, setCrmUserId] = useState('')
  const [crmProductId, setCrmProductId] = useState('pro_pigments')
  const [banReasonInput, setBanReasonInput] = useState('')
  const [crmBusy, setCrmBusy] = useState(false)
  const [crmMessage, setCrmMessage] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetailPayload | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)

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

  const handleBanAction = async (targetId: string, unban: boolean) => {
    const initData = getInitData()
    if (!initData || !targetId.trim()) return
    setCrmBusy(true)
    setCrmMessage(null)
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
        setCrmMessage(`Ошибка: ${data.error || 'не удалось выполнить'}`)
      } else {
        setCrmMessage(
          unban
            ? `Пользователь #${targetId.trim()} разблокирован ✓`
            : `Пользователь #${targetId.trim()} заблокирован`
        )
        if (!unban) setBanReasonInput('')
        void loadStats(days, hideAdmin)
      }
    } catch {
      setCrmMessage('Ошибка сети')
    } finally {
      setCrmBusy(false)
    }
  }

  if (bannedReason !== null && !isAdmin) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#0e0e10] text-[#f5f3ee] flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl border border-rose-500/35 bg-[#161514] p-6 text-center space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-rose-400">
            CORDWAINE · ACCESS DENIED
          </div>
          <h2 className="text-[20px] font-serif">Доступ ограничен</h2>
          <p className="text-[13px] text-white/70 leading-relaxed">{bannedReason}</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

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
                      tab === id ? 'bg-[#d9b57d] text-[#111110]' : 'text-white/65'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

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
                      <div className="mt-1 font-mono text-[20px] font-bold text-[#38bdf8]">
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

                  <AdminActivityChart daily={stats.daily} />

                  {/* Два Donut-графика: Каналы и Языки */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <DonutCard
                      title="Каналы"
                      centerValue={String(stats.summary.tg_users + stats.summary.web_users)}
                      items={[
                        { name: 'Telegram', value: stats.summary.tg_users, color: '#d9b57d' },
                        { name: 'Web', value: stats.summary.web_users, color: '#38bdf8' },
                      ]}
                    />

                    <DonutCard
                      title="Языки"
                      centerValue={String(
                        stats.langs.reduce((a, b) => a + b.users, 0)
                      )}
                      items={stats.langs.map((l, idx) => ({
                        name: (l.lang || 'other').toUpperCase(),
                        value: l.users,
                        color: PALETTE[idx % PALETTE.length],
                      }))}
                    />
                  </div>
                </>
              )}

              {/* === ВКЛАДКА 2: РАЗДЕЛЫ И СОБЫТИЯ === */}
              {stats && tab === 'pages' && (
                <>
                  <PagesBarChart pages={stats.topPages} />

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

              {/* === ВКЛАДКА 3: PRO & CRM & БАН === */}
              {stats && tab === 'crm' && (
                <>
                  {stats.proBreakdown.length > 0 && (
                    <DonutCard
                      title="Выручка по PRO-модулям (⭐)"
                      centerValue={`${stats.summary.total_stars} ⭐`}
                      items={stats.proBreakdown.map((r, idx) => ({
                        name: `${r.product_id} (${r.count})`,
                        value: r.stars,
                        color: PALETTE[idx % PALETTE.length],
                      }))}
                    />
                  )}

                  <div className="rounded-xl bg-white/[0.04] border border-[#d9b57d]/35 p-3.5 space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#d9b57d] font-semibold">
                      Управление PRO-доступом
                    </div>

                    <input
                      type="text"
                      value={crmUserId}
                      onChange={(e) => setCrmUserId(e.target.value.trim())}
                      placeholder="Telegram ID (или web_... для бана)"
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
                        className="py-2.5 rounded-xl border border-white/25 text-white/85 font-semibold text-[12.5px] cursor-pointer disabled:opacity-40"
                      >
                        Забрать PRO
                      </button>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-2.5">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-rose-400 font-semibold">
                        Блокировка пользователя
                      </div>
                      <input
                        type="text"
                        value={banReasonInput}
                        onChange={(e) => setBanReasonInput(e.target.value)}
                        placeholder="Причина (необязательно)"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-[12px] text-white focus:outline-none focus:border-rose-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={crmBusy || !crmUserId}
                          onClick={() => void handleBanAction(crmUserId, false)}
                          className="py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-[12.5px] cursor-pointer disabled:opacity-40"
                        >
                          Заблокировать
                        </button>
                        <button
                          type="button"
                          disabled={crmBusy || !crmUserId}
                          onClick={() => void handleBanAction(crmUserId, true)}
                          className="py-2.5 rounded-xl border border-emerald-500/45 text-emerald-300 font-semibold text-[12.5px] cursor-pointer disabled:opacity-40"
                        >
                          Разблокировать
                        </button>
                      </div>
                    </div>

                    {crmMessage && (
                      <div className="text-[12px] font-mono text-[#d9b57d]">{crmMessage}</div>
                    )}
                  </div>

                  <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/60 mb-2">
                      Заблокированные ({stats.bannedUsers.length})
                    </div>
                    {stats.bannedUsers.length === 0 ? (
                      <div className="text-white/45">Список пуст</div>
                    ) : (
                      <div className="divide-y divide-white/8">
                        {stats.bannedUsers.map((b) => (
                          <div key={b.user_id} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-[12px] text-rose-300">#{b.user_id}</div>
                              <div className="text-[11px] text-white/55 truncate">
                                {b.reason || 'Без причины'} · {formatTime(b.created_at)}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={crmBusy}
                              onClick={() => void handleBanAction(b.user_id, true)}
                              className="px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-300 text-[11px] cursor-pointer shrink-0"
                            >
                              Разбанить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                                        : 'bg-sky-500/20 text-sky-300'
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
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCrmUserId(u.user_id)
                                          setTab('crm')
                                        }}
                                        className="px-2 py-1 rounded-md bg-[#d9b57d]/20 text-[#d9b57d] text-[10.5px] font-semibold cursor-pointer"
                                      >
                                        В CRM / Бан →
                                      </button>
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
