import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import {
  LineChart,
  BarChart,
  PieChart,
  FunnelChart,
  type LineSeriesOption,
  type BarSeriesOption,
  type PieSeriesOption,
  type FunnelSeriesOption,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  formatNum,
  type ChartKind,
  type ChartSourceFilter,
  type DailyRow,
  type PageStat,
} from './types'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  FunnelChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
])

type AdminECOption = echarts.ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | FunnelSeriesOption
  | GridComponentOption
  | TooltipComponentOption
>

function buildLast14Days(raw: DailyRow[]): DailyRow[] {
  const byIso = new Map<string, DailyRow>()
  for (let i = 0; i < raw.length; i++) {
    byIso.set(raw[i].day_iso, raw[i])
  }
  const out: DailyRow[] = []
  const now = new Date()
  for (let offset = 13; offset >= 0; offset--) {
    const d = new Date(now.getTime() - offset * 86400 * 1000)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const iso = `${yyyy}-${mm}-${dd}`
    const hit = byIso.get(iso)
    out.push({
      day_iso: iso,
      day_label: `${dd}.${mm}`,
      tg_users: hit ? hit.tg_users : 0,
      web_users: hit ? hit.web_users : 0,
      events: hit ? hit.events : 0,
    })
  }
  return out
}

export function EChartCanvas({
  option,
  height,
  onClickIndex,
  onReadyInstance,
}: {
  option: AdminECOption
  height: number
  onClickIndex?: (idx: number) => void
  onReadyInstance?: (inst: echarts.ECharts | null) => void
}) {
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
    onReadyInstance?.(inst)

    const ro = new ResizeObserver(() => inst.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      onReadyInstance?.(null)
      inst.dispose()
      instRef.current = null
    }
  }, [onReadyInstance])

  useEffect(() => {
    const inst = instRef.current
    if (!inst) return
    inst.setOption(option, { notMerge: true })
  }, [option])

  useEffect(() => {
    const inst = instRef.current
    if (!inst || !onClickIndex) return
    const handler = (params: { dataIndex?: number }) => {
      if (typeof params.dataIndex === 'number') {
        onClickIndex(params.dataIndex)
      }
    }
    inst.on('click', handler)
    return () => {
      inst.off('click', handler)
    }
  }, [onClickIndex])

  return (
    <div
      ref={elRef}
      style={{ height: `${height}px`, width: '100%', touchAction: 'pan-y' }}
    />
  )
}

export function ActivityStudioChart({
  daily,
  onSelectDayIso,
}: {
  daily: DailyRow[]
  onSelectDayIso?: (dayIso: string) => void
}) {
  const [sourceFilter, setSourceFilter] = useState<ChartSourceFilter>('all')
  const [chartKind, setChartKind] = useState<ChartKind>('area')
  const chartInstRef = useRef<echarts.ECharts | null>(null)

  const seriesData = useMemo(() => buildLast14Days(daily), [daily])

  const totals = useMemo(() => {
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

    const makeLine = (
      name: string,
      data: number[],
      color: string,
      fillStart: string
    ): LineSeriesOption => ({
      name,
      type: 'line',
      data,
      smooth: 0.35,
      symbol: 'circle',
      symbolSize: 7,
      showSymbol: true,
      lineStyle: { width: 2.4, color },
      itemStyle: { color, borderColor: '#141413', borderWidth: 1.5 },
      areaStyle:
        chartKind === 'area'
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: fillStart },
                { offset: 1, color: 'rgba(0,0,0,0.01)' },
              ]),
            }
          : undefined,
    })

    if (sourceFilter === 'all' || sourceFilter === 'tg') {
      if (chartKind === 'bar') {
        series.push({
          name: 'Telegram',
          type: 'bar',
          barMaxWidth: 16,
          data: tgData,
          itemStyle: { color: '#C9A86A', borderRadius: [5, 5, 0, 0] },
        })
      } else {
        series.push(makeLine('Telegram', tgData, '#C9A86A', 'rgba(201,168,106,0.34)'))
      }
    }

    if (sourceFilter === 'all' || sourceFilter === 'web') {
      if (chartKind === 'bar') {
        series.push({
          name: 'Web',
          type: 'bar',
          barMaxWidth: 16,
          data: webData,
          itemStyle: { color: '#60A5FA', borderRadius: [5, 5, 0, 0] },
        })
      } else {
        series.push(makeLine('Web', webData, '#60A5FA', 'rgba(96,165,250,0.28)'))
      }
    }

    return {
      animationDuration: 260,
      grid: { top: 18, right: 14, bottom: 28, left: 36 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(20,20,19,0.96)',
        borderColor: 'rgba(244,240,232,0.14)',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: '#F5F1EB',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: chartKind === 'bar',
        axisLine: { lineStyle: { color: 'rgba(244,240,232,0.1)' } },
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
        splitLine: { lineStyle: { color: 'rgba(244,240,232,0.06)' } },
        axisLabel: {
          color: '#8C867C',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
      },
      series,
    }
  }, [seriesData, sourceFilter, chartKind])

  const handleExportPng = () => {
    const inst = chartInstRef.current
    if (!inst) return
    const url = inst.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#141413',
    })
    const a = document.createElement('a')
    a.href = url
    a.download = `cordwaine-activity-14d.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">
            Динамика активности (14 дней)
          </h3>
          <p className="text-[12px] text-[#8C867C] mt-0.5 font-mono">
            TG {totals.tg} · Web {totals.web} · тап по точке = детали дня
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] p-0.5">
            {(
              [
                ['all', 'Все', 'text-[#F5F1EB]'],
                ['tg', 'TG', 'text-[#C9A86A]'],
                ['web', 'Web', 'text-[#60A5FA]'],
              ] as const
            ).map(([id, label, cls]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSourceFilter(id)}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium cursor-pointer ${
                  sourceFilter === id ? `bg-[#22211F] font-semibold ${cls}` : 'text-[#8C867C]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.08] p-0.5">
            {(
              [
                ['area', 'Area'],
                ['line', 'Line'],
                ['bar', 'Bar'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartKind(k)}
                className={`px-2 py-1 rounded-lg text-[11.5px] font-mono cursor-pointer ${
                  chartKind === k
                    ? 'bg-[#22211F] text-[#F5F1EB] font-semibold'
                    : 'text-[#8C867C]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPng}
            title="Скачать график PNG"
            className="px-2.5 py-1.5 rounded-xl bg-[#0B0B0C] border border-[#F4F0E8]/[0.1] text-[11.5px] font-mono text-[#C9A86A] cursor-pointer"
          >
            PNG
          </button>
        </div>
      </div>

      <EChartCanvas
        option={option}
        height={225}
        onReadyInstance={(inst) => {
          chartInstRef.current = inst
        }}
        onClickIndex={(idx) => {
          const row = seriesData[idx]
          if (row && onSelectDayIso) onSelectDayIso(row.day_iso)
        }}
      />
    </div>
  )
}

export function DonutCard({
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
        backgroundColor: 'rgba(20,20,19,0.96)',
        borderColor: 'rgba(244,240,232,0.14)',
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
        <EChartCanvas option={option} height={138} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[14.5px] font-bold text-[#F5F1EB] tabular-nums">
            {centerValue}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-[#F4F0E8]/[0.06]">
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
                {formatNum(it.value)}{' '}
                <span className="text-[#8C867C] font-normal">({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PagesBarChart({ pages }: { pages: PageStat[] }) {
  const top = useMemo(() => pages.slice(0, 10).reverse(), [pages])

  const option = useMemo<AdminECOption>(
    () => ({
      animationDuration: 260,
      grid: { top: 10, right: 20, bottom: 26, left: 92 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(20,20,19,0.96)',
        borderColor: 'rgba(244,240,232,0.14)',
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
        splitLine: { lineStyle: { color: 'rgba(244,240,232,0.06)' } },
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
          <h3 className="text-[14px] font-semibold text-[#F5F1EB]">Рейтинг разделов</h3>
          <p className="text-[12px] text-[#8C867C] mt-0.5">
            Уникальные посетители по экранам (TG + Web)
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
          Нет данных за период
        </div>
      ) : (
        <EChartCanvas option={option} height={Math.max(165, top.length * 34)} />
      )}
    </div>
  )
}

export function ConversionFunnelChart({
  steps,
}: {
  steps: { name: string; value: number }[]
}) {
  const option = useMemo<AdminECOption>(
    () => ({
      animationDuration: 260,
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(20,20,19,0.96)',
        borderColor: 'rgba(244,240,232,0.14)',
        borderWidth: 1,
        textStyle: {
          color: '#F5F1EB',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
        },
        formatter: '{b}: <b>{c}</b>',
      },
      series: [
        {
          type: 'funnel',
          left: '8%',
          right: '8%',
          top: 10,
          bottom: 10,
          minSize: '18%',
          maxSize: '100%',
          gap: 4,
          sort: 'none',
          label: {
            show: true,
            position: 'inside',
            color: '#0B0B0C',
            fontWeight: 700,
            fontSize: 11.5,
            formatter: '{b}: {c}',
          },
          itemStyle: { borderColor: '#141413', borderWidth: 1 },
          data: steps.map((s, idx) => ({
            name: s.name,
            value: s.value,
            itemStyle: {
              color: ['#C9A86A', '#60A5FA', '#A78BFA', '#34D399'][idx % 4],
            },
          })),
        },
      ],
    }),
    [steps]
  )

  return (
    <div className="rounded-2xl bg-[#141413] border border-[#F4F0E8]/[0.08] p-4 sm:p-5 space-y-2.5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#F5F1EB]">Воронка вовлечения</h3>
        <p className="text-[12px] text-[#8C867C] mt-0.5">
          Переход от входа к глубине и PRO-доступам
        </p>
      </div>
      <EChartCanvas option={option} height={195} />
    </div>
  )
}

