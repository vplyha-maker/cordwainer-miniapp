import { useState, useMemo, useRef, useEffect } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, type LineSeriesOption } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
  type DataZoomComponentOption,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { WL_START, WL_STEP, SPECTRUM_LEN, type SpectrumPoint } from '../../utils/colorScience'
import type { ColorCalcDict } from './i18n'
import { hapticSelect, hapticTap } from './haptics'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
])

type ECOption = echarts.ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
>

export type SpectralChartMode = 'reflectance' | 'ks'
export type BandZoomId = 'full' | 'blue' | 'green' | 'red'

export interface SpectralSeries {
  id: string
  label: string
  color: string
  spectrum: SpectrumPoint[]
  isPrimary?: boolean
}

export interface SpectrumSummary {
  peakWl: number
  peakReflectance: number
  minWl: number
  minReflectance: number
  meanReflectance: number
}

const K1_SURFACE = 0.0365
const K2_INTERNAL = 0.42
const WL_END = WL_START + (SPECTRUM_LEN - 1) * WL_STEP // 780 nm

const BAND_ZOOM_RANGES: Record<BandZoomId, { label: string; min: number; max: number }> = {
  full: { label: '380–780', min: 380, max: 780 },
  blue: { label: '380–520', min: 380, max: 520 },
  green: { label: '500–620', min: 500, max: 620 },
  red: { label: '600–780', min: 600, max: 780 },
}

const ZOOM_ORDER: BandZoomId[] = ['full', 'blue', 'green', 'red']

export function reflectanceToKS(reflectancePercent: number): number {
  const rMeas = Math.max(0.0008, Math.min(0.999, reflectancePercent * 0.01))
  const rClean = Math.max(0.0008, rMeas - K1_SURFACE * (1 - 0.5 * rMeas))
  const denom = Math.max(0.05, 1 - K1_SURFACE - K2_INTERNAL * (1 - rClean))
  const rInt = Math.max(0.0008, Math.min(0.996, rClean / denom))
  return ((1 - rInt) * (1 - rInt)) / (2 * rInt)
}

export function getSpectrumSummary(spectrum: SpectrumPoint[]): SpectrumSummary | null {
  if (!spectrum || spectrum.length === 0) return null
  let peakWl = spectrum[0].wavelength
  let peakReflectance = -Infinity
  let minWl = spectrum[0].wavelength
  let minReflectance = Infinity
  let sum = 0

  for (let i = 0; i < spectrum.length; i++) {
    const pt = spectrum[i]
    sum += pt.reflectance
    if (pt.reflectance > peakReflectance) {
      peakReflectance = pt.reflectance
      peakWl = pt.wavelength
    }
    if (pt.reflectance < minReflectance) {
      minReflectance = pt.reflectance
      minWl = pt.wavelength
    }
  }

  return {
    peakWl,
    peakReflectance,
    minWl,
    minReflectance,
    meanReflectance: sum / spectrum.length,
  }
}

export function sampleSeriesAtIndex(spectrum: SpectrumPoint[], idx: number): SpectrumPoint | null {
  if (!spectrum || spectrum.length === 0) return null
  const clamped = Math.max(0, Math.min(spectrum.length - 1, idx))
  return spectrum[clamped]
}

interface SpectralSparklineProps {
  spectrum?: SpectrumPoint[]
  strokeColor?: string
  width?: number
  height?: number
}

export function SpectralSparkline({
  spectrum,
  strokeColor = '#C9A86A',
  width = 64,
  height = 24,
}: SpectralSparklineProps) {
  const path = useMemo(() => {
    if (!spectrum || spectrum.length < 2) return ''
    const padY = 2
    const innerH = height - padY * 2
    const step = Math.max(1, Math.floor(spectrum.length / 28))
    const coords: string[] = []

    for (let i = 0; i < spectrum.length; i += step) {
      const pt = spectrum[i]
      const x = ((pt.wavelength - WL_START) / (WL_END - WL_START)) * width
      const clampedR = Math.max(0, Math.min(100, pt.reflectance))
      const y = padY + innerH * (1 - clampedR / 100)
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    const last = spectrum[spectrum.length - 1]
    const lastX = ((last.wavelength - WL_START) / (WL_END - WL_START)) * width
    const lastY = padY + innerH * (1 - Math.max(0, Math.min(100, last.reflectance)) / 100)
    coords.push(`${lastX.toFixed(1)},${lastY.toFixed(1)}`)

    return 'M' + coords.join(' L')
  }, [spectrum, width, height])

  if (!path) {
    return (
      <div
        style={{
          width,
          height,
          opacity: 0.25,
          borderBottom: '1px dashed currentColor',
        }}
      />
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface SpectralChartProps {
  primarySpectrum: SpectrumPoint[] | null
  primaryColor: string
  primaryLabel: string
  componentSeries?: SpectralSeries[]
  dict: ColorCalcDict
  compact?: boolean
}

interface TooltipItemShape {
  seriesName?: string
  color?: string
  value?: [number, number]
}

export function SpectralChart({
  primarySpectrum,
  primaryColor,
  primaryLabel,
  componentSeries = [],
  dict,
  compact = false,
}: SpectralChartProps) {
  const [mode, setMode] = useState<SpectralChartMode>('reflectance')
  const [zoom, setZoom] = useState<BandZoomId>('full')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : true
  )

  const chartHostRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  const summary = useMemo(
    () => (primarySpectrum ? getSpectrumSummary(primarySpectrum) : null),
    [primarySpectrum]
  )

  const option = useMemo<ECOption | null>(() => {
    if (!primarySpectrum || primarySpectrum.length === 0) return null

    const range = BAND_ZOOM_RANGES[zoom]
    const inkMuted = isDark ? 'rgba(244, 240, 232, 0.56)' : 'rgba(24, 23, 21, 0.58)'
    const gridLine = isDark ? 'rgba(244, 240, 232, 0.09)' : 'rgba(24, 23, 21, 0.09)'
    const tooltipBg = isDark ? 'rgba(20, 20, 22, 0.96)' : 'rgba(247, 244, 238, 0.97)'
    const tooltipBorder = isDark ? 'rgba(201, 168, 106, 0.45)' : 'rgba(154, 107, 47, 0.45)'
    const tooltipInk = isDark ? '#F4F0E8' : '#181715'
    const accentHex = isDark ? '#C9A86A' : '#9A6B2F'

    const toXY = (spec: SpectrumPoint[]): [number, number][] =>
      spec.map((pt) => [
        pt.wavelength,
        mode === 'reflectance'
          ? Number(pt.reflectance.toFixed(2))
          : Number(reflectanceToKS(pt.reflectance).toFixed(3)),
      ])

    const series: LineSeriesOption[] = [
      {
        name: primaryLabel,
        type: 'line',
        showSymbol: false,
        smooth: 0.12,
        z: 10,
        lineStyle: {
          width: 2.5,
          color: primaryColor,
        },
        itemStyle: {
          color: primaryColor,
        },
        areaStyle: {
          opacity: 0.16,
          color: primaryColor,
        },
        data: toXY(primarySpectrum),
      },
      ...componentSeries
        .filter((s) => s.spectrum.length > 1)
        .map<LineSeriesOption>((s) => ({
          name: s.label,
          type: 'line',
          showSymbol: false,
          smooth: 0.12,
          z: 5,
          lineStyle: {
            width: 1.5,
            type: 'dashed',
            color: s.color,
            opacity: 0.78,
          },
          itemStyle: {
            color: s.color,
          },
          data: toXY(s.spectrum),
        })),
    ]

    return {
      animation: true,
      animationDuration: 220,
      animationDurationUpdate: 160,
      backgroundColor: 'transparent',
      grid: {
        left: 44,
        right: 16,
        top: 18,
        bottom: componentSeries.length > 0 ? 78 : 54,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: [8, 10],
        textStyle: {
          color: tooltipInk,
          fontSize: 11,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: accentHex, width: 1, type: 'dashed' },
          crossStyle: { color: accentHex, width: 1, type: 'dashed' },
          label: {
            backgroundColor: accentHex,
            color: isDark ? '#0B0B0C' : '#F7F4EE',
            fontSize: 10,
            formatter: (params) => {
              const v = Number(params.value)
              if (params.axisDimension === 'x') return `${Math.round(v)} nm`
              return mode === 'reflectance' ? `${v.toFixed(1)}%` : v.toFixed(2)
            },
          },
        },
        formatter: (rawParams: unknown) => {
          const items = (Array.isArray(rawParams) ? rawParams : [rawParams]) as TooltipItemShape[]
          if (!items.length || !items[0]?.value) return ''
          const wl = Math.round(items[0].value[0])
          const rows = items.map((it) => {
            const val = it.value ? it.value[1] : 0
            const unit = mode === 'reflectance' ? `${val.toFixed(1)}%` : `K/S ${val.toFixed(2)}`
            const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${it.color || accentHex};margin-right:6px;"></span>`
            return `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:3px;"><span>${dot}${it.seriesName || ''}</span><strong>${unit}</strong></div>`
          })
          return `<div style="font-weight:700;color:${accentHex};margin-bottom:4px;">λ = ${wl} nm</div>${rows.join('')}`
        },
      },
      legend: {
        show: componentSeries.length > 0,
        bottom: 28,
        left: 10,
        right: 10,
        type: 'scroll',
        itemWidth: 12,
        itemHeight: 8,
        textStyle: {
          color: inkMuted,
          fontSize: 10.5,
        },
        pageIconColor: accentHex,
        pageTextStyle: { color: inkMuted, fontSize: 10 },
      },
      xAxis: {
        type: 'value',
        min: WL_START,
        max: WL_END,
        interval: 40,
        axisLine: { lineStyle: { color: gridLine } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: gridLine } },
        axisLabel: {
          color: inkMuted,
          fontSize: 10,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          formatter: '{value}',
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: mode === 'reflectance' ? 100 : undefined,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: gridLine, type: 'dashed' } },
        axisLabel: {
          color: inkMuted,
          fontSize: 10,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          formatter: mode === 'reflectance' ? '{value}%' : '{value}',
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          startValue: range.min,
          endValue: range.max,
          filterMode: 'none',
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          startValue: range.min,
          endValue: range.max,
          height: 16,
          bottom: 4,
          borderColor: gridLine,
          backgroundColor: 'transparent',
          fillerColor: isDark ? 'rgba(201, 168, 106, 0.18)' : 'rgba(154, 107, 47, 0.16)',
          handleStyle: { color: accentHex, borderColor: accentHex },
          textStyle: { color: inkMuted, fontSize: 9 },
          showDetail: false,
          filterMode: 'none',
        },
      ],
      series,
    }
  }, [primarySpectrum, primaryColor, primaryLabel, componentSeries, mode, zoom, isDark])

  // Инициализация и обновление инстанса ECharts без лишних пересозданий
  useEffect(() => {
    const host = chartHostRef.current
    if (!host || !option) return

    let chart = chartInstanceRef.current
    if (!chart || chart.isDisposed() || chart.getDom() !== host) {
      if (chart && !chart.isDisposed()) chart.dispose()
      chart = echarts.init(host, undefined, { renderer: 'canvas' })
      chartInstanceRef.current = chart
    }

    chart.setOption(option, { notMerge: true, lazyUpdate: true })
  }, [option, isFullscreen])

  // Адаптивный ресайз под смартфон, планшет, ПК и полноэкранный режим
  useEffect(() => {
    const host = chartHostRef.current
    if (!host) return

    const ro = new ResizeObserver(() => {
      const chart = chartInstanceRef.current
      if (chart && !chart.isDisposed()) {
        chart.resize()
      }
    })
    ro.observe(host)

    return () => {
      ro.disconnect()
    }
  }, [isFullscreen, primarySpectrum])

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
        chartInstanceRef.current.dispose()
      }
      chartInstanceRef.current = null
    }
  }, [])

  const chartCard = (
    <section
      className={
        isFullscreen
          ? 'w-full max-w-5xl rounded-3xl border overflow-hidden'
          : 'rounded-3xl border overflow-hidden'
      }
      style={{
        background: 'var(--color-surface, #141416)',
        borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
      }}
    >
      {/* Шапка: R(λ) | K/S(λ) | Полный экран */}
      <div
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] font-semibold opacity-80">
            {dict.spectralTitle}
          </div>
          {!compact && (
            <div className="text-[10px] font-mono opacity-50 mt-0.5">
              {dict.spectralSubtitle} · Apache ECharts
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'reflectance' as const, label: dict.modeReflectance },
              { id: 'ks' as const, label: 'K/S(λ)' },
            ]
          ).map((item) => {
            const active = mode === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setMode(item.id)
                }}
                className="px-3 py-1 rounded-full text-[10.5px] font-sans font-semibold border transition-colors cursor-pointer"
                style={{
                  borderColor: active
                    ? 'var(--color-accent, #C9A86A)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
                  background: active
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-accent, #C9A86A)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 72%, transparent)',
                }}
              >
                {item.label}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => {
              hapticTap()
              setIsFullscreen((v) => !v)
            }}
            aria-label={isFullscreen ? 'Close fullscreen' : 'Fullscreen'}
            className="w-7 h-7 rounded-full flex items-center justify-center border text-[12px] cursor-pointer"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 16%, transparent)',
              color: 'var(--color-ink, #F4F0E8)',
            }}
          >
            {isFullscreen ? '✕' : '⤢'}
          </button>
        </div>
      </div>

      {/* Быстрый выбор диапазона длин волн */}
      <div
        className="px-4 py-2 flex items-center justify-between gap-2 border-b"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
          background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 2%, transparent)',
        }}
      >
        <div className="flex items-center gap-3 text-[10px] font-mono opacity-65">
          {summary ? (
            <>
              <span>
                {dict.peakWl}: {summary.peakWl} nm ({summary.peakReflectance.toFixed(0)}%)
              </span>
              <span className="hidden sm:inline">
                {dict.meanRefl}: {summary.meanReflectance.toFixed(0)}%
              </span>
            </>
          ) : (
            <span>λ ZOOM (nm)</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {ZOOM_ORDER.map((zId) => {
            const active = zoom === zId
            return (
              <button
                key={zId}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setZoom(zId)
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-colors cursor-pointer"
                style={{
                  borderColor: active
                    ? 'var(--color-accent, #C9A86A)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
                  background: active
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-accent, #C9A86A)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 68%, transparent)',
                }}
              >
                {BAND_ZOOM_RANGES[zId].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Контейнер Apache ECharts + шкала видимого спектра 380–780 нм */}
      <div className="p-3 sm:p-4">
        {!primarySpectrum || primarySpectrum.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12px] font-sans opacity-60">
            {dict.noSpectrumHint}
          </div>
        ) : (
          <>
            <div
              ref={chartHostRef}
              className="w-full"
              style={{ height: isFullscreen ? 'min(66vh, 460px)' : 265 }}
            />

            {/* Визуальная шкала видимого спектра 380–780 нм */}
            <div className="mt-2 px-1">
              <div
                className="w-full h-1.5 rounded-full opacity-90"
                style={{
                  background:
                    'linear-gradient(90deg, #4B0082 0%, #2A4BFF 14%, #00C4FF 28%, #19D25B 44%, #E6E100 56%, #FF7A00 68%, #E01B1B 84%, #5C0000 100%)',
                }}
              />
              <div className="flex justify-between text-[9px] font-mono opacity-45 mt-1">
                <span>380 nm (UV-Blue)</span>
                <span>580 nm</span>
                <span>780 nm (Deep Red)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )

  if (isFullscreen) {
    return (
      <div
        onClick={() => setIsFullscreen(false)}
        className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-6"
        style={{ backgroundColor: 'rgba(11, 11, 12, 0.84)' }}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl">
          {chartCard}
        </div>
      </div>
    )
  }

  return chartCard
}
