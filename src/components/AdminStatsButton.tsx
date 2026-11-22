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
  { id: 'pro_pigments', label: 'Пигменты', price: '1000 ⭐' },
  { id: 'pro_videos', label: 'Видео-лукбук', price: '350 ⭐' },
  { id: 'pro_colors', label: '3D Цвета', price: '250 ⭐' },
  { id: 'pro_heel', label: 'Каблук', price: '250 ⭐' },
  { id: 'pro_last', label: 'Колодка', price: '250 ⭐' },
  { id: 'pro_sizes', label: 'Размеры', price: '150 ⭐' },
  { id: 'all', label: 'Все 6 модулей', price: 'ALL' },
]

// Палитра Cordwaine Atelier (сдержанные, контрастные, благородные тона)
const CHART_PALETTE = [
  '#C9A86A', // Бронзовое золото (Telegram / primary)
  '#60A5FA', // Стальной синий (Web)
  '#34D399', // Изумруд (PRO / Revenue)
  '#A78BFA', // Сливовый
  '#F59E0B', // Янтарь
  '#E05A6D', // Рубин
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

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU')
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

  const periodTotals = useMemo(() => {
    let tg = 0
    let web = 0
    for (let i = 0; i < seriesData.length; i++) {
      tg += seriesData[i].tg_users
      web += seriesData[i].web_users
    }
    return { tg, web }
  }, [seriesData])

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
          smooth: 0.35,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: false,
          emphasis: { focus: 'series', scale: true },
          lineStyle: { width: 2.5, color: '#C9A86A' },
          itemStyle: { color: '#C9A86A', borderColor: '#141413', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(201, 168, 106, 0.34)' },
              { offset: 1, color: 'rgba(201, 168, 106, 0.01)' },
            ]),
          },
        })
      } else {
        series.push({
          name: 'Telegram',
          type: 'bar',
          barMaxWidth: 16,
          data: tgData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#DFC086' },
              { offset: 1, color: '#8F6C36' },
            ]),
            borderRadius: [5, 5, 0, 0],
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
          smooth: 0.35,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: false,
          emphasis: { focus: 'series', scale: true },
          lineStyle: { width: 2.5, color: '#60A5FA' },
          itemStyle: { color: '#60A5FA', borderColor: '#141413', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(96, 165, 250, 0.28)' },
              { offset: 1, color: 'rgba(96, 165, 250, 0.01)' },
            ]),
          },
        })
      } else {
        series.push({
          name: 'Web',
          type: 'bar',
          barMaxWidth: 16,
          data: webData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#93C5FD' },
              { offset: 1, color: '#2563EB' },
            ]),
            borderRadius: [5, 5, 0, 0],
          },
        })
      }
    }

    return {
      animationDuration: 280,
      grid: { top: 18, right: 14, bottom: 28, left: 36 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(20, 20, 19, 0.96)',
        borderColor: 'rgba(244, 240, 232, 0.14)',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: '#F5F1EB',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
        axisPointer: {
          type: chartKind === 'line' ? 'line' : 'shadow',
          lineStyle: { color: 'rgba(201, 168, 106, 0.4)', type: 'dashed' },
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: chartKind === 'bar',
        axisLine: { lineStyle: { color: 'rgba(244, 240, 232, 0.1)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#9A948A',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          interval: 2,
          margin: 10,
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(244, 240, 232, 0.06)' } },
        axisLabel: {
          color: '#8C867C',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
      },
      series,
    }
  }, [seriesData, sourceFilter, chartKind])

  return (
    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
            Динамика активности
          </h3>
          <p className="text-[12px] text-[#8C867C] mt-0.5 font-mono">
            14 дней · TG {periodTotals.tg} · Web {periodTotals.web}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] p-1">
            {(
              [
                ['all', 'Все', 'text-[#F5F1EB]'],
                ['tg', 'TG', 'text-[#C9A86A]'],
                ['web', 'Web', 'text-[#60A5FA]'],
              ] as const
            ).map(([id, label, activeColor]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSourceFilter(id)}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${
                  sourceFilter === id
                    ? `bg-[#22211F] font-semibold ${activeColor}`
                    : 'text-[#8C867C] hover:text-[#D4CFC5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] p-1">
            {(
              [
                ['line', 'Кривая'],
                ['bar', 'Столбцы'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartKind(k)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${
                  chartKind === k
                    ? 'bg-[#22211F] text-[#F5F1EB] font-semibold'
                    : 'text-[#8C867C] hover:text-[#D4CFC5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <EChartCanvas option={option} height={220} />
    </div>
  )
}

function DonutCard({
  title,
  subtitle,
  centerValue,
  items,
}: {
  title: string
  subtitle?: string
  centerValue: string
  items: { name: string; value: number; color: string }[]
}) {
  const total = items.reduce((acc, it) => acc + it.value, 0)

  const option = useMemo<AdminECOption>(() => {
    const nonZero = items.filter((i) => i.value > 0)
    const data = nonZero.length
      ? nonZero.map((i) => ({
          name: i.name,
          value: i.value,
          itemStyle: { color: i.color },
        }))
      : [{ name: 'Нет данных', value: 1, itemStyle: { color: 'rgba(244,240,232,0.08)' } }]

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(20, 20, 19, 0.96)',
        borderColor: 'rgba(244, 240, 232, 0.14)',
        borderWidth: 1,
        padding: [8, 10],
        textStyle: {
          color: '#F5F1EB',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
        formatter: '{b}: <b>{c}</b> ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['62%', '86%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#141413', borderWidth: 2, borderRadius: 5 },
          label: { show: false },
          data,
        },
      ],
    }
  }, [items])

  return (
    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-[13.5px] font-semibold text-[#F5F1EB]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[#8C867C] mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative">
        <EChartCanvas option={option} height={140} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[15px] font-bold text-[#F5F1EB] tabular-nums">
            {centerValue}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-[#F4F0E8]/[0.06]">
        {items.slice(0, 6).map((it) => {
          const pct = total > 0 ? Math.round((it.value / total) * 100) : 0
          return (
            <div key={it.name} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-2 min-w-0 text-[#CFC9BE]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: it.color }}
                />
                <span className="truncate">{it.name}</span>
              </span>
              <span className="font-mono text-[12px] font-semibold text-[#F5F1EB] shrink-0 tabular-nums">
                {formatNumber(it.value)}{' '}
                <span className="text-[#8C867C] font-normal">({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PagesBarChart({ pages }: { pages: PageStat[] }) {
  const top = useMemo(() => pages.slice(0, 10).reverse(), [pages])

  const option = useMemo<AdminECOption>(
    () => ({
      animationDuration: 260,
      grid: { top: 10, right: 20, bottom: 26, left: 92 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(20, 20, 19, 0.96)',
        borderColor: 'rgba(244, 240, 232, 0.14)',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: '#F5F1EB',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(244, 240, 232, 0.06)' } },
        axisLabel: {
          color: '#8C867C',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'category',
        data: top.map((p) => p.page),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#E5DFD5',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
      },
      series: [
        {
          name: 'Telegram уник.',
          type: 'bar',
          stack: 'u',
          barMaxWidth: 18,
          data: top.map((p) => p.tg_users),
          itemStyle: { color: '#C9A86A' },
        },
        {
          name: 'Web уник.',
          type: 'bar',
          stack: 'u',
          barMaxWidth: 18,
          data: top.map((p) => p.web_users),
          itemStyle: { color: '#60A5FA', borderRadius: [0, 5, 5, 0] },
        },
      ],
    }),
    [top]
  )

  return (
    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
            Рейтинг разделов
          </h3>
          <p className="text-[12px] text-[#8C867C] mt-0.5">
            Уникальные посетители по экранам (Telegram + Web)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11.5px] font-mono">
          <span className="inline-flex items-center gap-1.5 text-[#C9A86A]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#C9A86A]" /> TG
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#60A5FA]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#60A5FA]" /> Web
          </span>
        </div>
      </div>

      {top.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#8C867C]">
          Нет данных за выбранный период
        </div>
      ) : (
        <EChartCanvas option={option} height={Math.max(165, top.length * 34)} />
      )}
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
  const [productMenuOpen, setProductMenuOpen] = useState(false)
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
          setError('Не удалось загрузить статистику из Neon')
          setLoading(false)
          return
        }
        const data = (await res.json()) as StatsPayload
        setStats(data)
      } catch {
        setError('Ошибка сети при обращении к серверу')
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
    { id: 'pages', label: 'Разделы', count: stats?.topPages.length },
    { id: 'crm', label: 'PRO · CRM', count: stats?.summary.total_pro },
    { id: 'users', label: 'Люди', count: stats?.users.length },
  ]

  const periodItems: { d: PeriodDays; label: string }[] = [
    { d: 1, label: '24ч' },
    { d: 7, label: '7д' },
    { d: 30, label: '30д' },
    { d: 3650, label: 'Всё' },
  ]

  return (
    <>
      {/* Скрытая кнопка входа в админку (видна только авторизованному админу) */}
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          void loadStats(days, hideAdmin)
        }}
        title="Cordwaine Admin Analytics"
        className="fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-[#141413]/90 text-[#C9A86A] border border-[#C9A86A]/45 flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#1E1D1A] transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-3xl lg:max-w-[1220px] h-[94dvh] md:h-[88vh] flex flex-col lg:flex-row rounded-t-3xl md:rounded-2xl bg-[#0B0B0C] text-[#F5F1EB] border border-[#F4F0E8]/[0.1] overflow-hidden shadow-2xl"
          >
            {/* === ДЕСКТОПНЫЙ САЙДБАР (LG+) === */}
            <aside className="hidden lg:flex lg:w-[248px] shrink-0 flex-col justify-between bg-[#10100F] border-r border-[#F4F0E8]/[0.08] p-5">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#C9A86A]">
                      CORDWAINE
                    </span>
                  </div>
                  <h2 className="text-[18px] font-semibold tracking-tight text-[#F5F1EB] mt-1">
                    Панель владельца
                  </h2>
                  <p className="text-[12px] text-[#8C867C] mt-0.5">
                    Аналитика Telegram &amp; Web
                  </p>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = tab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-[13.5px] font-medium cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#C9A86A]/15 text-[#F5F1EB] border border-[#C9A86A]/35'
                            : 'text-[#9A948A] hover:bg-white/[0.04] hover:text-[#F5F1EB] border border-transparent'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                          <span
                            className={`font-mono text-[11.5px] px-2 py-0.5 rounded-md ${
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

              <div className="space-y-3 pt-4 border-t border-[#F4F0E8]/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    const next = !hideAdmin
                    setHideAdmin(next)
                    void loadStats(days, next)
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-[12px] font-medium border cursor-pointer text-left transition-colors ${
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
                  Закрыть панель
                </button>
              </div>
            </aside>

            {/* === ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ === */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Верхняя шапка */}
              <header className="px-4 sm:px-6 pt-4 pb-3.5 bg-[#10100F] border-b border-[#F4F0E8]/[0.08] shrink-0 space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 lg:hidden">
                      <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#C9A86A] truncate">
                        CORDWAINE · ANALYTICS
                      </span>
                    </div>
                    <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-[#F5F1EB] leading-snug">
                      {navItems.find((n) => n.id === tab)?.label || 'Панель владельца'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void loadStats(days, hideAdmin)}
                      disabled={loading}
                      className="h-9 px-3.5 rounded-xl text-[12.5px] font-medium border border-[#C9A86A]/35 bg-[#C9A86A]/10 text-[#E5C992] cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Загрузка…' : 'Обновить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Закрыть"
                      className="lg:hidden w-9 h-9 rounded-xl border border-[#F4F0E8]/[0.12] bg-[#141413] text-[#B5AFA4] flex items-center justify-center cursor-pointer text-[14px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Навигация для смартфона и планшета (< LG) */}
                <div className="lg:hidden grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08]">
                  {navItems.map((item) => {
                    const active = tab === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`py-2 px-1 rounded-lg text-[12.5px] font-semibold cursor-pointer truncate transition-colors ${
                          active
                            ? 'bg-[#C9A86A] text-[#0B0B0C]'
                            : 'text-[#9A948A]'
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>

                {/* Строка фильтров: период + без моих визитов */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] p-1">
                    {periodItems.map((p) => (
                      <button
                        key={p.d}
                        type="button"
                        onClick={() => {
                          setDays(p.d)
                          void loadStats(p.d, hideAdmin)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-mono cursor-pointer transition-colors ${
                          days === p.d
                            ? 'bg-[#22211F] text-[#F5F1EB] font-semibold'
                            : 'text-[#8C867C]'
                        }`}
                      >
                        {p.label}
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
                    className={`lg:hidden px-3 py-1.5 rounded-xl text-[12px] font-medium border cursor-pointer transition-colors ${
                      hideAdmin
                        ? 'border-[#C9A86A]/45 bg-[#C9A86A]/12 text-[#E5C992]'
                        : 'border-[#F4F0E8]/[0.1] bg-[#141413] text-[#9A948A]'
                    }`}
                  >
                    {hideAdmin ? '✓ Без моих визитов' : 'С моими визитами'}
                  </button>
                </div>
              </header>

              {/* Скроллируемое тело дашборда */}
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

                {/* === ВКЛАДКА 1: ОБЗОР === */}
                {stats && tab === 'overview' && (
                  <div className="space-y-5">
                    {/* 4 KPI карточки: 2×2 на мобильном, 4 в ряд на планшете/ПК */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="text-[12px] text-[#9A948A] font-medium">Telegram уник.</div>
                        <div className="mt-2 font-mono text-[26px] leading-none font-bold text-[#C9A86A] tabular-nums">
                          {formatNumber(stats.summary.tg_users)}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#7D776E] font-mono">
                          Событий: {formatNumber(stats.summary.total_events)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4">
                        <div className="text-[12px] text-[#9A948A] font-medium">Браузер (Web)</div>
                        <div className="mt-2 font-mono text-[26px] leading-none font-bold text-[#60A5FA] tabular-nums">
                          {formatNumber(stats.summary.web_users)}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#7D776E] font-mono">
                          Возвраты 30д: {stats.summary.retention_pct}%
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#34D399]/25 p-4">
                        <div className="text-[12px] text-[#8CE6C0] font-medium">PRO-доступы</div>
                        <div className="mt-2 font-mono text-[26px] leading-none font-bold text-[#34D399] tabular-nums">
                          {formatNumber(stats.summary.total_pro)}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#8C867C] font-mono">
                          {formatNumber(stats.summary.total_stars)} ⭐
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#141413] border border-[#34D399]/25 p-4">
                        <div className="text-[12px] text-[#8CE6C0] font-medium">Чистыми (оценка)</div>
                        <div className="mt-2 font-mono text-[26px] leading-none font-bold text-[#F5F1EB] tabular-nums">
                          ${stats.summary.total_net_usd}
                        </div>
                        <div className="mt-2 text-[11.5px] text-[#7D776E] font-mono">
                          ~$0.0123 / ⭐
                        </div>
                      </div>
                    </div>

                    {/* Главная сетка графиков */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-8">
                        <AdminActivityChart daily={stats.daily} />
                      </div>
                      <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                        <DonutCard
                          title="Каналы трафика"
                          centerValue={formatNumber(
                            stats.summary.tg_users + stats.summary.web_users
                          )}
                          items={[
                            { name: 'Telegram', value: stats.summary.tg_users, color: '#C9A86A' },
                            { name: 'Web', value: stats.summary.web_users, color: '#60A5FA' },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Вторая строка: Языки + Платформы */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DonutCard
                        title="Языки аудитории"
                        centerValue={formatNumber(
                          stats.langs.reduce((a, b) => a + b.users, 0)
                        )}
                        items={stats.langs.map((l, idx) => ({
                          name: (l.lang || 'other').toUpperCase(),
                          value: l.users,
                          color: CHART_PALETTE[idx % CHART_PALETTE.length],
                        }))}
                      />

                      <DonutCard
                        title="Платформы устройств"
                        centerValue={formatNumber(
                          stats.platforms.reduce((a, b) => a + b.users, 0)
                        )}
                        items={stats.platforms.map((p, idx) => ({
                          name: p.platform || 'web',
                          value: p.users,
                          color: CHART_PALETTE[(idx + 1) % CHART_PALETTE.length],
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* === ВКЛАДКА 2: РАЗДЕЛЫ И СОБЫТИЯ === */}
                {stats && tab === 'pages' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7">
                      <PagesBarChart pages={stats.topPages} />
                    </div>

                    <div className="lg:col-span-5 rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-3">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                          События и воронка
                        </h3>
                        <p className="text-[12px] text-[#8C867C] mt-0.5">
                          Уникальные пользователи и общее число срабатываний
                        </p>
                      </div>

                      {stats.events.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[#8C867C]">
                          Нет событий за период
                        </div>
                      ) : (
                        <div className="divide-y divide-[#F4F0E8]/[0.06]">
                          {stats.events.map((ev) => (
                            <div
                              key={ev.event}
                              className="py-3 flex items-center justify-between gap-3"
                            >
                              <span className="font-mono text-[13px] text-[#F5F1EB] truncate">
                                {ev.event}
                              </span>
                              <span className="font-mono text-[12.5px] shrink-0 tabular-nums">
                                <span className="text-[#C9A86A] font-semibold">
                                  {formatNumber(ev.unique_users)} чел
                                </span>
                                <span className="text-[#7D776E]"> · {formatNumber(ev.total)}×</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* === ВКЛАДКА 3: PRO · CRM И БЛОКИРОВКИ === */}
                {stats && tab === 'crm' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Левая колонка: Управление PRO и Бан */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="rounded-2xl bg-[#141413] border border-[#C9A86A]/30 p-4 sm:p-5 space-y-4">
                        <div>
                          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                            Управление PRO-доступом
                          </h3>
                          <p className="text-[12px] text-[#8C867C] mt-0.5">
                            Выдача или снятие модулей напрямую в Neon
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
                              className="w-full h-11 px-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.14] font-mono text-[13.5px] text-[#F5F1EB] placeholder:text-[#6E6860] focus:outline-none focus:border-[#C9A86A]"
                            />
                          </label>

                          {/* Кастомный селектор модуля (полностью читаем на Android/iOS) */}
                          <div className="space-y-1.5">
                            <span className="text-[12px] text-[#B5AFA4] font-medium">
                              Модуль PRO
                            </span>
                            <button
                              type="button"
                              onClick={() => setProductMenuOpen((v) => !v)}
                              className="w-full h-11 px-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.14] flex items-center justify-between text-[13.5px] text-[#F5F1EB] cursor-pointer hover:border-[#C9A86A]/50"
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
                              <div className="rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.14] divide-y divide-[#F4F0E8]/[0.06] overflow-hidden">
                                {PRODUCT_OPTIONS.map((opt) => {
                                  const selected = opt.id === crmProductId
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        setCrmProductId(opt.id)
                                        setProductMenuOpen(false)
                                      }}
                                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-[13px] cursor-pointer transition-colors ${
                                        selected
                                          ? 'bg-[#C9A86A]/18 text-[#F5F1EB] font-semibold'
                                          : 'text-[#CFC9BE] hover:bg-white/[0.04]'
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                      <span className="font-mono text-[12px] text-[#C9A86A]">
                                        {opt.price}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() => void handleCrmAction(false)}
                              className="h-11 rounded-xl bg-[#C9A86A] text-[#0B0B0C] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40 hover:bg-[#D8B97D] transition-colors"
                            >
                              {crmBusy ? 'Выполнение…' : 'Выдать PRO'}
                            </button>
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() => void handleCrmAction(true)}
                              className="h-11 rounded-xl border border-[#F4F0E8]/[0.18] bg-[#1C1B19] text-[#F5F1EB] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40 hover:bg-[#262522] transition-colors"
                            >
                              Забрать PRO
                            </button>
                          </div>
                        </div>

                        {/* Блокировка */}
                        <div className="pt-4 border-t border-[#F4F0E8]/[0.08] space-y-3">
                          <div>
                            <h4 className="text-[13.5px] font-semibold text-[#F4A3AE]">
                              Блокировка пользователя
                            </h4>
                            <p className="text-[12px] text-[#8C867C] mt-0.5">
                              Мгновенно закрывает вход по указанному ID
                            </p>
                          </div>

                          <input
                            type="text"
                            value={banReasonInput}
                            onChange={(e) => setBanReasonInput(e.target.value)}
                            placeholder="Причина блокировки (необязательно)"
                            className="w-full h-11 px-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.14] text-[13px] text-[#F5F1EB] placeholder:text-[#6E6860] focus:outline-none focus:border-[#E05A6D]"
                          />

                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() => void handleBanAction(crmUserId, false)}
                              className="h-11 rounded-xl bg-[#C83E52] text-[#F5F1EB] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40 hover:bg-[#D94B60] transition-colors"
                            >
                              Заблокировать
                            </button>
                            <button
                              type="button"
                              disabled={crmBusy || !crmUserId}
                              onClick={() => void handleBanAction(crmUserId, true)}
                              className="h-11 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-[#8CE6C0] font-semibold text-[13.5px] cursor-pointer disabled:opacity-40 hover:bg-[#34D399]/20 transition-colors"
                            >
                              Разблокировать
                            </button>
                          </div>
                        </div>

                        {crmMessage && (
                          <div className="px-3.5 py-2.5 rounded-xl bg-[#0B0B0C] border border-[#C9A86A]/35 text-[12.5px] font-mono text-[#E5C992]">
                            {crmMessage}
                          </div>
                        )}
                      </div>

                      {/* Список заблокированных */}
                      <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                            Заблокированные пользователи
                          </h3>
                          <span className="font-mono text-[12px] px-2.5 py-0.5 rounded-lg bg-white/[0.06] text-[#B5AFA4]">
                            {stats.bannedUsers.length}
                          </span>
                        </div>

                        {stats.bannedUsers.length === 0 ? (
                          <div className="py-4 text-[13px] text-[#7D776E]">
                            Заблокированных пользователей нет
                          </div>
                        ) : (
                          <div className="divide-y divide-[#F4F0E8]/[0.06]">
                            {stats.bannedUsers.map((b) => (
                              <div
                                key={b.user_id}
                                className="py-3 flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="font-mono text-[13px] font-semibold text-[#F4A3AE]">
                                    #{b.user_id}
                                  </div>
                                  <div className="text-[12px] text-[#8C867C] truncate mt-0.5">
                                    {b.reason || 'Без причины'} · {formatTime(b.created_at)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={crmBusy}
                                  onClick={() => void handleBanAction(b.user_id, true)}
                                  className="px-3 py-1.5 rounded-xl border border-[#34D399]/40 bg-[#34D399]/10 text-[#8CE6C0] text-[12px] font-medium cursor-pointer shrink-0"
                                >
                                  Разбанить
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Правая колонка: Выручка по PRO-модулям */}
                    <div className="lg:col-span-5">
                      <DonutCard
                        title="Выручка по PRO-модулям"
                        subtitle={`Всего ${formatNumber(stats.summary.total_pro)} активаций · ~$${stats.summary.total_net_usd}`}
                        centerValue={`${formatNumber(stats.summary.total_stars)} ⭐`}
                        items={stats.proBreakdown.map((r, idx) => ({
                          name: `${r.product_id} (${r.count})`,
                          value: r.stars,
                          color: CHART_PALETTE[idx % CHART_PALETTE.length],
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* === ВКЛАДКА 4: ЛЮДИ === */}
                {stats && tab === 'users' && (
                  <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] overflow-hidden">
                    <div className="px-4 sm:px-5 py-3.5 border-b border-[#F4F0E8]/[0.08] flex items-center justify-between">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
                          Уникальные пользователи
                        </h3>
                        <p className="text-[12px] text-[#8C867C] mt-0.5">
                          Нажмите на строку, чтобы открыть историю действий и PRO-статус
                        </p>
                      </div>
                      <span className="font-mono text-[12px] px-2.5 py-1 rounded-lg bg-white/[0.06] text-[#B5AFA4]">
                        {stats.users.length}
                      </span>
                    </div>

                    {stats.users.length === 0 ? (
                      <div className="py-12 text-center text-[13.5px] text-[#8C867C]">
                        Пока нет зарегистрированных визитов
                      </div>
                    ) : (
                      <div className="divide-y divide-[#F4F0E8]/[0.06]">
                        {stats.users.map((u) => {
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
                                        <span className="text-[12.5px] font-mono text-[#C9A86A] truncate">
                                          @{u.username}
                                        </span>
                                      ) : (
                                        <span className="text-[12px] font-mono text-[#8C867C] truncate">
                                          #{u.user_id}
                                        </span>
                                      )}
                                      {u.pro_count > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-[#34D399]/15 text-[#8CE6C0] font-mono text-[11px] font-semibold">
                                          PRO ×{u.pro_count}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[12px] text-[#8C867C] mt-0.5 truncate">
                                      {u.last_page || '—'} · {u.platform || 'web'} · {u.events_count} соб.
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="font-mono text-[12px] text-[#B5AFA4] tabular-nums">
                                    {formatTime(u.last_seen)}
                                  </div>
                                  <div className="text-[11px] text-[#7D776E] mt-0.5">
                                    {isOpen ? 'Свернуть ▲' : 'Детали ▼'}
                                  </div>
                                </div>
                              </button>

                              {isOpen && (
                                <div className="mt-3 p-3.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] space-y-3">
                                  {userDetailLoading ? (
                                    <div className="text-[12.5px] text-[#8C867C]">
                                      Загрузка пути пользователя…
                                    </div>
                                  ) : userDetail ? (
                                    <>
                                      <div className="flex items-center justify-between gap-3 flex-wrap pb-2.5 border-b border-[#F4F0E8]/[0.06]">
                                        <div className="text-[12.5px] font-mono text-[#CFC9BE]">
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
                                          Открыть в CRM / Бан →
                                        </button>
                                      </div>

                                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {userDetail.events.map((ev, i) => (
                                          <div
                                            key={`${ev.created_at}-${i}`}
                                            className="flex items-center justify-between gap-2 font-mono text-[12px] text-[#B5AFA4]"
                                          >
                                            <span className="truncate">
                                              <span className="text-[#F5F1EB]">{ev.event}</span>
                                              <span className="text-[#7D776E]"> · {ev.page || '—'}</span>
                                            </span>
                                            <span className="text-[#7D776E] shrink-0 tabular-nums">
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
