import { useState, useMemo, useRef, useEffect } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, type LineSeriesOption } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
  type DataZoomComponentOption,
  type MarkPointComponentOption,
  type MarkLineComponentOption,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  WL_START,
  WL_STEP,
  SPECTRUM_LEN,
  ILLUMINANTS,
  measuredToInternalR,
  type IlluminantId,
  type SpectrumPoint,
} from '../../utils/colorScience'
import type { ColorCalcDict } from './i18n'
import { hapticSelect, hapticTap } from './haptics'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  CanvasRenderer,
])

type ECOption = echarts.ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | MarkPointComponentOption
  | MarkLineComponentOption
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

const WL_END = WL_START + (SPECTRUM_LEN - 1) * WL_STEP // 780

const BAND_ZOOM_RANGES: Record<BandZoomId, [number, number]> = {
  full: [WL_START, WL_END],
  blue: [380, 500],
  green: [490, 610],
  red: [590, 780],
}

const ILLUMINANT_META: Record<
  IlluminantId,
  { short: string; kelvin: string; color: string }
> = {
  D65: { short: 'D65', kelvin: '6500K', color: '#3b82f6' },
  A: { short: 'A', kelvin: '2856K', color: '#d97706' },
  cool: { short: '4200K', kelvin: '4200K', color: '#0ea5e9' },
  twilight: { short: '9000K', kelvin: '9000K', color: '#6366f1' },
}

export function wavelengthToHex(wl: number): string {
  let r = 0
  let g = 0
  let b = 0
  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380)
    b = 1
  } else if (wl >= 440 && wl < 490) {
    g = (wl - 440) / (490 - 440)
    b = 1
  } else if (wl >= 490 && wl < 510) {
    g = 1
    b = -(wl - 510) / (510 - 490)
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510)
    g = 1
  } else if (wl >= 580 && wl < 645) {
    r = 1
    g = -(wl - 645) / (645 - 580)
  } else if (wl >= 645 && wl <= 780) {
    r = 1
  }

  let factor = 1
  if (wl >= 380 && wl < 420) {
    factor = 0.35 + (0.65 * (wl - 380)) / (420 - 380)
  } else if (wl > 700 && wl <= 780) {
    factor = 0.35 + (0.65 * (780 - wl)) / (780 - 700)
  }

  const toHex = (c: number) =>
    Math.round(Math.max(0, Math.min(1, c * factor)) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function getWavelengthBandName(wl: number, lang: 'ru' | 'uk' | 'de'): string {
  const bands = {
    ru: ['УФ/Фиолет', 'Синий', 'Голубой', 'Зелёный', 'Жёлтый', 'Оранжевый', 'Красный'],
    uk: ['УФ/Фіолет', 'Синій', 'Блакитний', 'Зелений', 'Жовтий', 'Помаранчевий', 'Червоний'],
    de: ['Violett', 'Blau', 'Cyan', 'Grün', 'Gelb', 'Orange', 'Rot'],
  }[lang]
  if (wl < 435) return bands[0]
  if (wl < 485) return bands[1]
  if (wl < 510) return bands[2]
  if (wl < 565) return bands[3]
  if (wl < 595) return bands[4]
  if (wl < 630) return bands[5]
  return bands[6]
}

export function reflectanceToKS(rPct: number): number {
  const rInt = measuredToInternalR(rPct / 100)
  const ks = ((1 - rInt) * (1 - rInt)) / (2 * rInt)
  return Math.min(ks, 40)
}

export function analyzeSpectrum(spectrum: SpectrumPoint[]): SpectrumSummary {
  if (!spectrum.length) {
    return {
      peakWl: 550,
      peakReflectance: 0,
      minWl: 550,
      minReflectance: 0,
      meanReflectance: 0,
    }
  }
  let peakWl = spectrum[0].wavelength
  let peakReflectance = -Infinity
  let minWl = spectrum[0].wavelength
  let minReflectance = Infinity
  let sum = 0

  for (let i = 0; i < spectrum.length; i++) {
    const p = spectrum[i]
    sum += p.reflectance
    if (p.reflectance > peakReflectance) {
      peakReflectance = p.reflectance
      peakWl = p.wavelength
    }
    if (p.reflectance < minReflectance) {
      minReflectance = p.reflectance
      minWl = p.wavelength
    }
  }

  return {
    peakWl,
    peakReflectance: Math.round(peakReflectance * 10) / 10,
    minWl,
    minReflectance: Math.round(minReflectance * 10) / 10,
    meanReflectance: Math.round((sum / spectrum.length) * 10) / 10,
  }
}

function getNormalizedSpd(illuminant: IlluminantId): number[] {
  const raw = ILLUMINANTS[illuminant] || ILLUMINANTS.D65
  let maxVal = 0
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] > maxVal) maxVal = raw[i]
  }
  const out: number[] = new Array(SPECTRUM_LEN)
  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const v = raw[i] ?? 0
    out[i] = maxVal > 0 ? Number(((v / maxVal) * 100).toFixed(1)) : 0
  }
  return out
}

interface SpectralChartProps {
  lang: 'ru' | 'uk' | 'de'
  dict: ColorCalcDict
  series: SpectralSeries[]
  height?: number
  illuminant?: IlluminantId
  substrateSpectrum?: SpectrumPoint[]
  substrateLabel?: string
  theme?: 'light' | 'dark'
}

export function SpectralChart({
  lang,
  dict,
  series,
  height = 290,
  illuminant = 'D65',
  substrateSpectrum,
  substrateLabel,
  theme = 'light',
}: SpectralChartProps) {
  const [mode, setMode] = useState<SpectralChartMode>('reflectance')
  const [band, setBand] = useState<BandZoomId>('full')
  const [showIlluminant, setShowIlluminant] = useState(true)
  const [showSubstrate, setShowSubstrate] = useState(true)
  const [showComponents, setShowComponents] = useState(true)

  const chartElRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  const isDark = theme === 'dark'
  const illumMeta = ILLUMINANT_META[illuminant] || ILLUMINANT_META.D65

  const primary = useMemo(
    () => series.find((s) => s.isPrimary) || series[0],
    [series]
  )

  const componentSeries = useMemo(
    () => series.filter((s) => !s.isPrimary && s.id !== primary?.id),
    [series, primary]
  )

  const summary = useMemo(
    () => (primary ? analyzeSpectrum(primary.spectrum) : null),
    [primary]
  )

  const wavelengths = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < SPECTRUM_LEN; i++) {
      arr.push(WL_START + i * WL_STEP)
    }
    return arr
  }, [])

  const spdValues = useMemo(() => getNormalizedSpd(illuminant), [illuminant])

  const localLabels = useMemo(() => {
    const map = {
      ru: {
        illuminantToggle: `Свет ${illumMeta.short}`,
        substrateToggle: substrateLabel || 'Кожа-подложка',
        componentsToggle: 'Пигменты',
        spdLegend: `Источник ${illumMeta.short} (${illumMeta.kelvin})`,
        substrateLegend: substrateLabel || 'Кожа-подложка',
        peakLabel: 'Пик отражения',
        absLabel: 'Поглощение',
        meanLabel: 'Среднее R',
        lightLabel: 'Освещение',
        deltaVsLeather: 'Δ к коже',
        spdAxis: 'SPD %',
        hint: 'Проведите по графику для точного замера λ (380–780 нм)',
      },
      uk: {
        illuminantToggle: `Світло ${illumMeta.short}`,
        substrateToggle: substrateLabel || 'Шкіра-підкладка',
        componentsToggle: 'Пігменти',
        spdLegend: `Джерело ${illumMeta.short} (${illumMeta.kelvin})`,
        substrateLegend: substrateLabel || 'Шкіра-підкладка',
        peakLabel: 'Пік відбиття',
        absLabel: 'Поглинання',
        meanLabel: 'Середнє R',
        lightLabel: 'Освітлення',
        deltaVsLeather: 'Δ до шкіри',
        spdAxis: 'SPD %',
        hint: 'Проведіть по графіку для точного виміру λ (380–780 нм)',
      },
      de: {
        illuminantToggle: `Licht ${illumMeta.short}`,
        substrateToggle: substrateLabel || 'Leder-Substrat',
        componentsToggle: 'Pigmente',
        spdLegend: `Lichtart ${illumMeta.short} (${illumMeta.kelvin})`,
        substrateLegend: substrateLabel || 'Leder-Substrat',
        peakLabel: 'Reflex-Peak',
        absLabel: 'Absorption',
        meanLabel: 'Mittel R',
        lightLabel: 'Lichtart',
        deltaVsLeather: 'Δ zu Leder',
        spdAxis: 'SPD %',
        hint: 'Über die Kurve fahren für exakte λ-Messung (380–780 nm)',
      },
    }
    return map[lang]
  }, [lang, illumMeta.short, illumMeta.kelvin, substrateLabel])

  const option = useMemo<ECOption>(() => {
    const [zoomMin, zoomMax] = BAND_ZOOM_RANGES[band]
    const startIdx = Math.max(0, Math.round((zoomMin - WL_START) / WL_STEP))
    const endIdx = Math.min(
      SPECTRUM_LEN - 1,
      Math.round((zoomMax - WL_START) / WL_STEP)
    )

    const axisText = isDark ? '#9a968e' : '#736f68'
    const axisLine = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(20,20,19,0.14)'
    const splitLine = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(20,20,19,0.06)'
    const tooltipBg = isDark ? 'rgba(18,18,17,0.96)' : 'rgba(255,255,255,0.97)'
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,20,19,0.12)'
    const tooltipText = isDark ? '#f5f3ee' : '#141413'
    const substrateLineColor = isDark ? 'rgba(245,243,238,0.52)' : 'rgba(20,20,19,0.48)'

    const echartsSeries: LineSeriesOption[] = []

    // 1. Optional Illuminant SPD curve (background reference on right Y-axis)
    if (showIlluminant) {
      echartsSeries.push({
        id: '__illuminant_spd__',
        name: localLabels.spdLegend,
        type: 'line',
        yAxisIndex: 1,
        data: spdValues,
        smooth: 0.25,
        showSymbol: false,
        z: 1,
        lineStyle: {
          width: 1.5,
          type: 'dotted',
          color: illumMeta.color,
          opacity: isDark ? 0.72 : 0.65,
        },
        itemStyle: { color: illumMeta.color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${illumMeta.color}22` },
            { offset: 1, color: `${illumMeta.color}02` },
          ]),
        },
      })
    }

    // 2. Optional Substrate (Leather) dashed reference curve
    if (showSubstrate && substrateSpectrum && substrateSpectrum.length > 0) {
      const subData = substrateSpectrum.map((p) =>
        mode === 'reflectance'
          ? Number(p.reflectance.toFixed(1))
          : Number(reflectanceToKS(p.reflectance).toFixed(2))
      )
      echartsSeries.push({
        id: '__substrate_ref__',
        name: localLabels.substrateLegend,
        type: 'line',
        yAxisIndex: 0,
        data: subData,
        smooth: 0.28,
        showSymbol: false,
        z: 2,
        lineStyle: {
          width: 1.75,
          type: [5, 4],
          color: substrateLineColor,
        },
        itemStyle: { color: substrateLineColor },
      })
    }

    // 3. Optional Individual Component Curves
    if (showComponents) {
      for (let i = 0; i < componentSeries.length; i++) {
        const s = componentSeries[i]
        const data = s.spectrum.map((p) =>
          mode === 'reflectance'
            ? Number(p.reflectance.toFixed(1))
            : Number(reflectanceToKS(p.reflectance).toFixed(2))
        )
        echartsSeries.push({
          id: s.id,
          name: s.label,
          type: 'line',
          yAxisIndex: 0,
          data,
          smooth: 0.28,
          showSymbol: false,
          z: 3,
          lineStyle: {
            width: 1.35,
            type: 'dashed',
            color: s.color,
            opacity: isDark ? 0.7 : 0.62,
          },
          itemStyle: { color: s.color },
        })
      }
    }

    // 4. Primary Mix Curve (top z-layer with Peak/Min markers)
    if (primary) {
      const primaryData = primary.spectrum.map((p) =>
        mode === 'reflectance'
          ? Number(p.reflectance.toFixed(1))
          : Number(reflectanceToKS(p.reflectance).toFixed(2))
      )

      const primaryStroke =
        isDark && primary.color.toLowerCase() === '#141413'
          ? '#e5e0d8'
          : primary.color

      const peakIdx = summary
        ? Math.max(0, Math.round((summary.peakWl - WL_START) / WL_STEP))
        : 0
      const minIdx = summary
        ? Math.max(0, Math.round((summary.minWl - WL_START) / WL_STEP))
        : 0

      echartsSeries.push({
        id: primary.id,
        name: primary.label,
        type: 'line',
        yAxisIndex: 0,
        data: primaryData,
        smooth: 0.28,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 7,
        z: 5,
        lineStyle: {
          width: 3,
          color: primaryStroke,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(20,20,19,0.12)',
          shadowBlur: 6,
          shadowOffsetY: 2,
        },
        itemStyle: {
          color: primaryStroke,
          borderColor: isDark ? '#141413' : '#ffffff',
          borderWidth: 1.5,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${primaryStroke}2e` },
            { offset: 1, color: `${primaryStroke}03` },
          ]),
        },
        markPoint:
          summary && band === 'full'
            ? {
                symbol: 'circle',
                symbolSize: 8,
                label: {
                  show: true,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: [2, 5],
                  borderRadius: 4,
                  backgroundColor: isDark
                    ? 'rgba(20,20,19,0.88)'
                    : 'rgba(255,255,255,0.92)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(20,20,19,0.14)',
                  borderWidth: 1,
                  color: tooltipText,
                },
                data: [
                  {
                    name: 'max',
                    coord: [peakIdx, primaryData[peakIdx]],
                    label: {
                      position: 'top',
                      formatter: () => `▲ ${summary.peakWl}`,
                    },
                    itemStyle: { color: wavelengthToHex(summary.peakWl) },
                  },
                  {
                    name: 'min',
                    coord: [minIdx, primaryData[minIdx]],
                    label: {
                      position: 'bottom',
                      formatter: () => `▼ ${summary.minWl}`,
                    },
                    itemStyle: { color: wavelengthToHex(summary.minWl) },
                  },
                ],
              }
            : undefined,
      })
    }

    return {
      animationDuration: 260,
      animationEasing: 'cubicOut',
      grid: {
        top: 22,
        right: showIlluminant ? 38 : 14,
        bottom: 32,
        left: 42,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: [10, 12],
        textStyle: {
          color: tooltipText,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: isDark ? 'rgba(245,243,238,0.3)' : 'rgba(20,20,19,0.28)',
            width: 1,
            type: 'dashed',
          },
        },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params]
          if (!items.length) return ''
          const first = items[0] as { axisValue?: string | number }
          const wl = Number(first.axisValue ?? 550)
          const wlHex = wavelengthToHex(wl)
          const bandName = getWavelengthBandName(wl, lang)
          const unit = mode === 'reflectance' ? '%' : ' K/S'

          let primaryVal: number | null = null
          let subVal: number | null = null

          const rows = items
            .map((raw) => {
              const it = raw as {
                seriesId?: string
                seriesName?: string
                value?: number
                color?: string
              }
              const val = typeof it.value === 'number' ? it.value : Number(it.value ?? 0)
              if (it.seriesId === primary?.id) primaryVal = val
              if (it.seriesId === '__substrate_ref__') subVal = val
              const isSpd = it.seriesId === '__illuminant_spd__'
              const rowUnit = isSpd ? '% SPD' : unit
              return `<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:3px;">
                <span style="display:inline-flex;align-items:center;gap:6px;max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  <span style="width:7px;height:7px;border-radius:50%;background:${it.color || '#888'};flex-shrink:0;"></span>
                  <span>${it.seriesName || ''}</span>
                </span>
                <span style="font-weight:700;">${val}${rowUnit}</span>
              </div>`
            })
            .join('')

          let deltaHtml = ''
          if (
            mode === 'reflectance' &&
            primaryVal !== null &&
            subVal !== null
          ) {
            const diff = Number((primaryVal - subVal).toFixed(1))
            const sign = diff > 0 ? '+' : ''
            deltaHtml = `<div style="margin-top:6px;padding-top:5px;border-top:1px solid ${tooltipBorder};display:flex;justify-content:space-between;font-size:10px;opacity:0.8;">
              <span>${localLabels.deltaVsLeather}</span>
              <span style="font-weight:700;">${sign}${diff}%</span>
            </div>`
          }

          return `<div style="min-width:175px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid ${tooltipBorder};">
              <span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">
                <span style="width:9px;height:9px;border-radius:3px;background:${wlHex};"></span>
                <span>${wl} нм</span>
              </span>
              <span style="font-size:10px;opacity:0.7;">${bandName}</span>
            </div>
            ${rows}
            ${deltaHtml}
          </div>`
        },
      },
      dataZoom: [
        {
          type: 'inside',
          startValue: startIdx,
          endValue: endIdx,
          zoomOnMouseWheel: false,
          moveOnMouseMove: false,
          moveOnMouseWheel: false,
        },
      ],
      xAxis: {
        type: 'category',
        data: wavelengths,
        boundaryGap: false,
        axisLine: { lineStyle: { color: axisLine } },
        axisTick: { show: false },
        axisLabel: {
          color: axisText,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10.5,
          interval: 9,
          formatter: (val: string) => `${val}`,
        },
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: mode === 'reflectance' ? 100 : undefined,
          splitNumber: 4,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: splitLine } },
          axisLabel: {
            color: axisText,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10.5,
            formatter: (v: number) =>
              mode === 'reflectance' ? `${v}%` : `${v}`,
          },
        },
        {
          type: 'value',
          min: 0,
          max: 100,
          show: showIlluminant,
          splitNumber: 4,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: illumMeta.color,
            opacity: 0.75,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9.5,
            formatter: (v: number) => (v === 100 || v === 50 ? `${v}` : ''),
          },
        },
      ],
      series: echartsSeries,
    }
  }, [
    band,
    mode,
    wavelengths,
    spdValues,
    showIlluminant,
    showSubstrate,
    showComponents,
    substrateSpectrum,
    componentSeries,
    primary,
    summary,
    isDark,
    lang,
    illumMeta.color,
    localLabels.spdLegend,
    localLabels.substrateLegend,
    localLabels.deltaVsLeather,
  ])

  useEffect(() => {
    const el = chartElRef.current
    if (!el) return
    const instance = echarts.init(el, undefined, {
      renderer: 'canvas',
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
    chartInstanceRef.current = instance

    const ro = new ResizeObserver(() => {
      instance.resize()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      instance.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const instance = chartInstanceRef.current
    if (!instance) return
    instance.setOption(option, { notMerge: true })
  }, [option])

  const bands: { id: BandZoomId; label: string }[] = [
    { id: 'full', label: dict.bandFull },
    { id: 'blue', label: dict.bandBlue },
    { id: 'green', label: dict.bandGreen },
    { id: 'red', label: dict.bandRed },
  ]

  const hasSubstrate = Boolean(substrateSpectrum && substrateSpectrum.length > 0)
  const hasComponents = componentSeries.length > 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#141413]/10 dark:border-white/10 bg-white dark:bg-[#141413] p-4 sm:p-5">
        {/* Top Bar: Title + R(λ)/K/S(λ) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#141413] dark:text-[#f5f3ee]">
              {dict.spectralTitle}
            </h3>
            <p className="text-[11.5px] text-[#736f68] dark:text-[#9a968e] mt-0.5">
              380–780 нм · 5 нм · Kubelka–Munk &amp; Saunderson
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-[#f3f0ea] dark:bg-white/[0.06] p-1 border border-[#141413]/8 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                hapticSelect()
                setMode('reflectance')
              }}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors ${
                mode === 'reflectance'
                  ? 'bg-[#141413] text-[#faf8f4] dark:bg-[#f5f3ee] dark:text-[#141413]'
                  : 'text-[#6c6861] dark:text-[#a19d94]'
              }`}
            >
              R(λ) %
            </button>
            <button
              type="button"
              onClick={() => {
                hapticSelect()
                setMode('ks')
              }}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors ${
                mode === 'ks'
                  ? 'bg-[#141413] text-[#faf8f4] dark:bg-[#f5f3ee] dark:text-[#141413]'
                  : 'text-[#6c6861] dark:text-[#a19d94]'
              }`}
            >
              K/S(λ)
            </button>
          </div>
        </div>

        {/* Overlay Reference Toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowIlluminant((v) => !v)
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border transition-colors ${
              showIlluminant
                ? 'border-[#141413]/20 dark:border-white/25 bg-[#faf8f4] dark:bg-white/[0.08] text-[#141413] dark:text-[#f5f3ee]'
                : 'border-[#141413]/8 dark:border-white/8 text-[#8a857d] dark:text-[#7c7870]'
            }`}
          >
            <span
              className="w-2.5 h-0.5 rounded-full"
              style={{
                backgroundColor: showIlluminant ? illumMeta.color : 'currentColor',
              }}
            />
            <span>{localLabels.illuminantToggle}</span>
          </button>

          {hasSubstrate && (
            <button
              type="button"
              onClick={() => {
                hapticTap()
                setShowSubstrate((v) => !v)
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border transition-colors ${
                showSubstrate
                  ? 'border-[#141413]/20 dark:border-white/25 bg-[#faf8f4] dark:bg-white/[0.08] text-[#141413] dark:text-[#f5f3ee]'
                  : 'border-[#141413]/8 dark:border-white/8 text-[#8a857d] dark:text-[#7c7870]'
              }`}
            >
              <span className="w-3 border-t-2 border-dashed border-current opacity-70" />
              <span>{localLabels.substrateToggle}</span>
            </button>
          )}

          {hasComponents && (
            <button
              type="button"
              onClick={() => {
                hapticTap()
                setShowComponents((v) => !v)
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border transition-colors ${
                showComponents
                  ? 'border-[#141413]/20 dark:border-white/25 bg-[#faf8f4] dark:bg-white/[0.08] text-[#141413] dark:text-[#f5f3ee]'
                  : 'border-[#141413]/8 dark:border-white/8 text-[#8a857d] dark:text-[#7c7870]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#9a723c]" />
              <span>
                {localLabels.componentsToggle} ({componentSeries.length})
              </span>
            </button>
          )}
        </div>

        {/* Chart Canvas */}
        <div
          ref={chartElRef}
          style={{ height: `${height}px`, width: '100%', touchAction: 'pan-y' }}
          className="select-none"
        />

        {/* Visible Spectrum Reference Bar (380-780 nm aligned with plot) */}
        <div
          className="mt-0.5 mb-3"
          style={{
            paddingLeft: '42px',
            paddingRight: showIlluminant ? '38px' : '14px',
          }}
        >
          <div
            className="h-1.5 w-full rounded-full opacity-85"
            style={{
              background:
                'linear-gradient(90deg, #4b0082 0%, #2563eb 18%, #06b6d4 32%, #16a34a 45%, #eab308 58%, #f97316 68%, #dc2626 82%, #7f1d1d 100%)',
            }}
          />
        </div>

        {/* Band Zoom Strip */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#f3f0ea] dark:bg-white/[0.05] border border-[#141413]/8 dark:border-white/10">
          {bands.map((b) => {
            const active = band === b.id
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  hapticTap()
                  setBand(b.id)
                }}
                className={`py-2 rounded-lg text-[11.5px] font-medium transition-colors ${
                  active
                    ? 'bg-white dark:bg-[#232220] text-[#141413] dark:text-[#f5f3ee] shadow-xs'
                    : 'text-[#6c6861] dark:text-[#9a968e]'
                }`}
              >
                {b.label}
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-[#8a857d] dark:text-[#7c7870] mt-2.5 text-center">
          {localLabels.hint}
        </p>

        {/* Laboratory Readout Strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-[#141413]/8 dark:border-white/10">
            <div className="rounded-xl bg-[#faf8f4] dark:bg-white/[0.04] px-3 py-2.5 border border-[#141413]/6 dark:border-white/8">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-[#7c7870] dark:text-[#9a968e]">
                {localLabels.peakLabel}
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold text-[#141413] dark:text-[#f5f3ee]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: wavelengthToHex(summary.peakWl) }}
                />
                <span>{summary.peakWl} нм</span>
                <span className="text-[11px] font-normal text-[#7c7870]">
                  {summary.peakReflectance}%
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#faf8f4] dark:bg-white/[0.04] px-3 py-2.5 border border-[#141413]/6 dark:border-white/8">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-[#7c7870] dark:text-[#9a968e]">
                {localLabels.absLabel}
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold text-[#141413] dark:text-[#f5f3ee]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: wavelengthToHex(summary.minWl) }}
                />
                <span>{summary.minWl} нм</span>
                <span className="text-[11px] font-normal text-[#7c7870]">
                  {summary.minReflectance}%
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#faf8f4] dark:bg-white/[0.04] px-3 py-2.5 border border-[#141413]/6 dark:border-white/8">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-[#7c7870] dark:text-[#9a968e]">
                {localLabels.meanLabel}
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold text-[#141413] dark:text-[#f5f3ee]">
                {summary.meanReflectance}%
              </div>
            </div>

            <div className="rounded-xl bg-[#faf8f4] dark:bg-white/[0.04] px-3 py-2.5 border border-[#141413]/6 dark:border-white/8">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-[#7c7870] dark:text-[#9a968e]">
                {localLabels.lightLabel}
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold text-[#141413] dark:text-[#f5f3ee]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: illumMeta.color }}
                />
                <span>
                  {illumMeta.short} · {illumMeta.kelvin}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SpectralSparklineProps {
  spectrum: SpectrumPoint[]
  color: string
  width?: number
  height?: number
  className?: string
}

export function SpectralSparkline({
  spectrum,
  color,
  width = 56,
  height = 22,
  className = '',
}: SpectralSparklineProps) {
  const path = useMemo(() => {
    if (!spectrum || spectrum.length < 2) return ''
    const step = Math.max(1, Math.floor(spectrum.length / 24))
    const pts: string[] = []
    for (let i = 0; i < spectrum.length; i += step) {
      const x = (i / (spectrum.length - 1)) * width
      const y = height - (Math.max(0, Math.min(100, spectrum[i].reflectance)) / 100) * (height - 4) - 2
      pts.push(`${pts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }
    const last = spectrum[spectrum.length - 1]
    const ly = height - (Math.max(0, Math.min(100, last.reflectance)) / 100) * (height - 4) - 2
    pts.push(`L${width.toFixed(1)},${ly.toFixed(1)}`)
    return pts.join(' ')
  }, [spectrum, width, height])

  if (!path) return null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rounded-md bg-[#f3f0ea] dark:bg-white/[0.06] border border-[#141413]/10 dark:border-white/10 shrink-0 ${className}`}
      aria-hidden="true"
    >
      <line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeDasharray="2 2"
        strokeWidth={0.75}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
