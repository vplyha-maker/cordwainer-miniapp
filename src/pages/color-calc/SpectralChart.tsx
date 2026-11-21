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
  type IlluminantType,
  type SpectrumPoint,
} from '../../utils/colorScience'
import type { Lang } from '../../App'
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

const K1_FORS_IN = 0.034
const K2_INTERNAL = 0.42
const WL_END = WL_START + (SPECTRUM_LEN - 1) * WL_STEP // 780

const BAND_ZOOM_RANGES: Record<BandZoomId, [number, number]> = {
  full: [WL_START, WL_END],
  blue: [380, 500],
  green: [490, 610],
  red: [590, 780],
}

const ILLUMINANT_META: Record<
  IlluminantType,
  { short: string; kelvin: number; color: string }
> = {
  D65: { short: 'D65', kelvin: 6500, color: '#3b82f6' },
  A: { short: 'Бутик', kelvin: 2856, color: '#d97706' },
  cool: { short: 'Студия', kelvin: 4200, color: '#0ea5e9' },
  twilight: { short: 'Сумерки', kelvin: 9000, color: '#6366f1' },
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

function getWavelengthBandName(wl: number, lang: Lang): string {
  const bands = {
    ru: ['Фиолет', 'Синий', 'Голубой', 'Зелёный', 'Жёлтый', 'Оранжевый', 'Красный'],
    uk: ['Фіолет', 'Синій', 'Блакитний', 'Зелений', 'Жовтий', 'Помаранчевий', 'Червоний'],
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

function computeNormalizedSpd(kelvin: number): number[] {
  const c2 = 1.438776877e-2
  const raw: number[] = new Array(SPECTRUM_LEN)
  let maxVal = 0
  for (let i = 0; i < SPECTRUM_LEN; i++) {
    const wlNm = WL_START + i * WL_STEP
    const wlM = wlNm * 1e-9
    const denom = Math.pow(wlM, 5) * (Math.exp(c2 / (wlM * kelvin)) - 1)
    const val = denom > 0 ? 1 / denom : 0
    raw[i] = val
    if (val > maxVal) maxVal = val
  }
  return raw.map((v) => (maxVal > 0 ? Number(((v / maxVal) * 100).toFixed(1)) : 0))
}

export function reflectanceToKS(rPct: number): number {
  const rMeas = Math.max(0, Math.min(1, rPct / 100))
  const denom = 1 - K1_FORS_IN - K2_INTERNAL + K2_INTERNAL * rMeas
  const rInt = Math.max(0.0004, Math.min(0.999, (rMeas - K1_FORS_IN) / denom))
  const ks = ((1 - rInt) * (1 - rInt)) / (2 * rInt)
  return Math.min(ks, 40)
}

export function getSpectrumSummary(spectrum: SpectrumPoint[]): SpectrumSummary {
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

export function sampleSeriesAtIndex(
  series: SpectralSeries[],
  index: number,
  mode: SpectralChartMode = 'reflectance'
) {
  const clampedIdx = Math.max(0, Math.min(SPECTRUM_LEN - 1, Math.round(index)))
  const wavelength = WL_START + clampedIdx * WL_STEP
  const values = series.map((s) => {
    const pt = s.spectrum[clampedIdx]
    const r = pt ? pt.reflectance : 0
    const value =
      mode === 'reflectance'
        ? Math.round(r * 10) / 10
        : Math.round(reflectanceToKS(r) * 100) / 100
    return {
      id: s.id,
      label: s.label,
      color: s.color,
      value,
      isPrimary: s.isPrimary,
    }
  })
  return { wavelength, values }
}

interface SpectralChartProps {
  primarySpectrum: SpectrumPoint[] | null
  primaryColor: string
  primaryLabel: string
  componentSeries: SpectralSeries[]
  dict: ColorCalcDict
  lang?: Lang
  illuminant?: IlluminantType
  substrateSpectrum?: SpectrumPoint[] | null
  substrateLabel?: string
  isDark?: boolean
  height?: number
}

export function SpectralChart({
  primarySpectrum,
  primaryColor,
  primaryLabel,
  componentSeries,
  lang = 'ru',
  illuminant = 'D65',
  substrateSpectrum = null,
  substrateLabel,
  isDark = false,
  height = 290,
}: SpectralChartProps) {
  const [mode, setMode] = useState<SpectralChartMode>('reflectance')
  const [band, setBand] = useState<BandZoomId>('full')
  const [showIlluminant, setShowIlluminant] = useState(true)
  const [showSubstrate, setShowSubstrate] = useState(true)
  const [showComponents, setShowComponents] = useState(true)

  const chartElRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  const illumMeta = ILLUMINANT_META[illuminant] || ILLUMINANT_META.D65

  const summary = useMemo(
    () => (primarySpectrum && primarySpectrum.length ? getSpectrumSummary(primarySpectrum) : null),
    [primarySpectrum]
  )

  const wavelengths = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < SPECTRUM_LEN; i++) {
      arr.push(WL_START + i * WL_STEP)
    }
    return arr
  }, [])

  const spdValues = useMemo(
    () => computeNormalizedSpd(illumMeta.kelvin),
    [illumMeta.kelvin]
  )

  const ui = useMemo(() => {
    const map = {
      ru: {
        title: 'Спектральный анализ',
        subtitle: '380–780 нм · 5 нм · Kubelka–Munk & Saunderson',
        illuminantToggle: `Свет ${illumMeta.kelvin}K`,
        substrateToggle: substrateLabel || 'Кожа-подложка',
        componentsToggle: 'Пигменты',
        spdLegend: `Источник ${illumMeta.short} (${illumMeta.kelvin}K)`,
        substrateLegend: substrateLabel || 'Кожа-подложка',
        bands: { full: '380–780', blue: 'Синий', green: 'Зелёный', red: 'Красный' },
        peakLabel: 'Пик отражения',
        absLabel: 'Поглощение',
        meanLabel: 'Среднее R',
        lightLabel: 'Освещение',
        deltaVsLeather: 'Δ к коже',
        empty: 'Добавьте пигменты во вкладке «Формула», чтобы увидеть кривую отражения R(λ)',
        hint: 'Проведите пальцем по графику для точного замера λ',
      },
      uk: {
        title: 'Спектральний аналіз',
        subtitle: '380–780 нм · 5 нм · Kubelka–Munk & Saunderson',
        illuminantToggle: `Світло ${illumMeta.kelvin}K`,
        substrateToggle: substrateLabel || 'Шкіра-підкладка',
        componentsToggle: 'Пігменти',
        spdLegend: `Джерело ${illumMeta.short} (${illumMeta.kelvin}K)`,
        substrateLegend: substrateLabel || 'Шкіра-підкладка',
        bands: { full: '380–780', blue: 'Синій', green: 'Зелений', red: 'Червоний' },
        peakLabel: 'Пік відбиття',
        absLabel: 'Поглинання',
        meanLabel: 'Середнє R',
        lightLabel: 'Освітлення',
        deltaVsLeather: 'Δ до шкіри',
        empty: 'Додайте пігменти у вкладці «Формула», щоб побачити криву відбиття R(λ)',
        hint: 'Проведіть пальцем по графіку для точного виміру λ',
      },
      de: {
        title: 'Spektralanalyse',
        subtitle: '380–780 nm · 5 nm · Kubelka–Munk & Saunderson',
        illuminantToggle: `Licht ${illumMeta.kelvin}K`,
        substrateToggle: substrateLabel || 'Leder-Substrat',
        componentsToggle: 'Pigmente',
        spdLegend: `Lichtart ${illumMeta.short} (${illumMeta.kelvin}K)`,
        substrateLegend: substrateLabel || 'Leder-Substrat',
        bands: { full: '380–780', blue: 'Blau', green: 'Grün', red: 'Rot' },
        peakLabel: 'Reflex-Peak',
        absLabel: 'Absorption',
        meanLabel: 'Mittel R',
        lightLabel: 'Lichtart',
        deltaVsLeather: 'Δ zu Leder',
        empty: 'Fügen Sie Pigmente hinzu, um die Reflexionskurve R(λ) zu sehen',
        hint: 'Über die Kurve fahren für exakte λ-Messung',
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

    if (showIlluminant) {
      echartsSeries.push({
        id: '__illuminant_spd__',
        name: ui.spdLegend,
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
          opacity: isDark ? 0.75 : 0.65,
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

    if (showSubstrate && substrateSpectrum && substrateSpectrum.length > 0) {
      const subData = substrateSpectrum.map((p) =>
        mode === 'reflectance'
          ? Number(p.reflectance.toFixed(1))
          : Number(reflectanceToKS(p.reflectance).toFixed(2))
      )
      echartsSeries.push({
        id: '__substrate_ref__',
        name: ui.substrateLegend,
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
            opacity: isDark ? 0.72 : 0.62,
          },
          itemStyle: { color: s.color },
        })
      }
    }

    if (primarySpectrum && primarySpectrum.length > 0) {
      const primaryData = primarySpectrum.map((p) =>
        mode === 'reflectance'
          ? Number(p.reflectance.toFixed(1))
          : Number(reflectanceToKS(p.reflectance).toFixed(2))
      )

      const primaryStroke =
        isDark && primaryColor.toLowerCase() === '#141413'
          ? '#e5e0d8'
          : primaryColor

      const peakIdx = summary
        ? Math.max(0, Math.round((summary.peakWl - WL_START) / WL_STEP))
        : 0
      const minIdx = summary
        ? Math.max(0, Math.round((summary.minWl - WL_START) / WL_STEP))
        : 0

      echartsSeries.push({
        id: '__primary_mix__',
        name: primaryLabel,
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
                    ? 'rgba(20,20,19,0.9)'
                    : 'rgba(255,255,255,0.94)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.16)'
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
      animationDuration: 240,
      animationEasing: 'cubicOut',
      grid: {
        top: 22,
        right: showIlluminant ? 36 : 14,
        bottom: 30,
        left: 40,
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
              if (it.seriesId === '__primary_mix__') primaryVal = val
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
          if (mode === 'reflectance' && primaryVal !== null && subVal !== null) {
            const diff = Number((primaryVal - subVal).toFixed(1))
            const sign = diff > 0 ? '+' : ''
            deltaHtml = `<div style="margin-top:6px;padding-top:5px;border-top:1px solid ${tooltipBorder};display:flex;justify-content:space-between;font-size:10px;opacity:0.82;">
              <span>${ui.deltaVsLeather}</span>
              <span style="font-weight:700;">${sign}${diff}%</span>
            </div>`
          }

          return `<div style="min-width:175px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid ${tooltipBorder};">
              <span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">
                <span style="width:9px;height:9px;border-radius:3px;background:${wlHex};"></span>
                <span>${wl} нм</span>
              </span>
              <span style="font-size:10px;opacity:0.72;">${bandName}</span>
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
    primarySpectrum,
    primaryColor,
    primaryLabel,
    summary,
    isDark,
    lang,
    illumMeta.color,
    ui.spdLegend,
    ui.substrateLegend,
    ui.deltaVsLeather,
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

  const cardBg = isDark ? '#141413' : '#ffffff'
  const softBg = isDark ? 'rgba(255,255,255,0.05)' : '#f3f0ea'
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,20,19,0.1)'
  const ink = isDark ? '#f5f3ee' : '#141413'
  const muted = isDark ? '#9a968e' : '#736f68'

  const bands: { id: BandZoomId; label: string }[] = [
    { id: 'full', label: ui.bands.full },
    { id: 'blue', label: ui.bands.blue },
    { id: 'green', label: ui.bands.green },
    { id: 'red', label: ui.bands.red },
  ]

  const hasSubstrate = Boolean(substrateSpectrum && substrateSpectrum.length > 0)
  const hasComponents = componentSeries.length > 0

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{ backgroundColor: cardBg, borderColor: border, color: ink }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em]">
            {ui.title}
          </h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: muted }}>
            {ui.subtitle}
          </p>
        </div>

        <div
          className="inline-flex rounded-xl p-1 border"
          style={{ backgroundColor: softBg, borderColor: border }}
        >
          <button
            type="button"
            onClick={() => {
              hapticSelect()
              setMode('reflectance')
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer"
            style={{
              backgroundColor:
                mode === 'reflectance'
                  ? isDark
                    ? '#f5f3ee'
                    : '#141413'
                  : 'transparent',
              color:
                mode === 'reflectance'
                  ? isDark
                    ? '#141413'
                    : '#faf8f4'
                  : muted,
            }}
          >
            R(λ) %
          </button>
          <button
            type="button"
            onClick={() => {
              hapticSelect()
              setMode('ks')
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer"
            style={{
              backgroundColor:
                mode === 'ks'
                  ? isDark
                    ? '#f5f3ee'
                    : '#141413'
                  : 'transparent',
              color:
                mode === 'ks'
                  ? isDark
                    ? '#141413'
                    : '#faf8f4'
                  : muted,
            }}
          >
            K/S(λ)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            hapticTap()
            setShowIlluminant((v) => !v)
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border cursor-pointer"
          style={{
            borderColor: showIlluminant ? 'rgba(154,114,60,0.45)' : border,
            backgroundColor: showIlluminant ? softBg : 'transparent',
            color: showIlluminant ? ink : muted,
          }}
        >
          <span
            className="w-2.5 h-0.5 rounded-full"
            style={{ backgroundColor: showIlluminant ? illumMeta.color : muted }}
          />
          <span>{ui.illuminantToggle}</span>
        </button>

        {hasSubstrate && (
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowSubstrate((v) => !v)
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border cursor-pointer"
            style={{
              borderColor: showSubstrate ? 'rgba(154,114,60,0.45)' : border,
              backgroundColor: showSubstrate ? softBg : 'transparent',
              color: showSubstrate ? ink : muted,
            }}
          >
            <span className="w-3 border-t-2 border-dashed border-current opacity-70" />
            <span>{ui.substrateToggle}</span>
          </button>
        )}

        {hasComponents && (
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setShowComponents((v) => !v)
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium border cursor-pointer"
            style={{
              borderColor: showComponents ? 'rgba(154,114,60,0.45)' : border,
              backgroundColor: showComponents ? softBg : 'transparent',
              color: showComponents ? ink : muted,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#9a723c' }}
            />
            <span>
              {ui.componentsToggle} ({componentSeries.length})
            </span>
          </button>
        )}
      </div>

      <div
        ref={chartElRef}
        style={{ height: `${height}px`, width: '100%', touchAction: 'pan-y' }}
        className="select-none"
      />

      <div
        className="mt-0.5 mb-3"
        style={{
          paddingLeft: '40px',
          paddingRight: showIlluminant ? '36px' : '14px',
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

      <div
        className="grid grid-cols-4 gap-1.5 p-1 rounded-xl border"
        style={{ backgroundColor: softBg, borderColor: border }}
      >
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
              className="py-2 rounded-lg text-[11.5px] font-medium cursor-pointer"
              style={{
                backgroundColor: active
                  ? isDark
                    ? '#232220'
                    : '#ffffff'
                  : 'transparent',
                color: active ? ink : muted,
              }}
            >
              {b.label}
            </button>
          )
        })}
      </div>

      <p className="text-[11px] mt-2.5 text-center" style={{ color: muted }}>
        {primarySpectrum && primarySpectrum.length ? ui.hint : ui.empty}
      </p>

      {summary && (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t"
          style={{ borderColor: border }}
        >
          <div
            className="rounded-xl px-3 py-2.5 border"
            style={{ backgroundColor: softBg, borderColor: border }}
          >
            <div
              className="text-[10.5px] uppercase tracking-[0.08em]"
              style={{ color: muted }}
            >
              {ui.peakLabel}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: wavelengthToHex(summary.peakWl) }}
              />
              <span>{summary.peakWl} нм</span>
              <span className="text-[11px] font-normal" style={{ color: muted }}>
                {summary.peakReflectance}%
              </span>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 border"
            style={{ backgroundColor: softBg, borderColor: border }}
          >
            <div
              className="text-[10.5px] uppercase tracking-[0.08em]"
              style={{ color: muted }}
            >
              {ui.absLabel}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: wavelengthToHex(summary.minWl) }}
              />
              <span>{summary.minWl} нм</span>
              <span className="text-[11px] font-normal" style={{ color: muted }}>
                {summary.minReflectance}%
              </span>
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 border"
            style={{ backgroundColor: softBg, borderColor: border }}
          >
            <div
              className="text-[10.5px] uppercase tracking-[0.08em]"
              style={{ color: muted }}
            >
              {ui.meanLabel}
            </div>
            <div className="mt-1 font-mono text-[13px] font-semibold">
              {summary.meanReflectance}%
            </div>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 border"
            style={{ backgroundColor: softBg, borderColor: border }}
          >
            <div
              className="text-[10.5px] uppercase tracking-[0.08em]"
              style={{ color: muted }}
            >
              {ui.lightLabel}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: illumMeta.color }}
              />
              <span>
                {illumMeta.short} · {illumMeta.kelvin}K
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SpectralSparklineProps {
  spectrum?: SpectrumPoint[] | null
  color?: string
  width?: number
  height?: number
  className?: string
}

export function SpectralSparkline({
  spectrum,
  color = '#9a723c',
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
      const y =
        height -
        (Math.max(0, Math.min(100, spectrum[i].reflectance)) / 100) * (height - 4) -
        2
      pts.push(`${pts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }
    const last = spectrum[spectrum.length - 1]
    const ly =
      height -
      (Math.max(0, Math.min(100, last.reflectance)) / 100) * (height - 4) -
      2
    pts.push(`L${width.toFixed(1)},${ly.toFixed(1)}`)
    return pts.join(' ')
  }, [spectrum, width, height])

  if (!path) return null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rounded-md bg-black/[0.04] border border-black/10 shrink-0 ${className}`}
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
