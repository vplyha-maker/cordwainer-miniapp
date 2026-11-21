import { useState, useMemo, useRef, type PointerEvent } from 'react'
import { WL_START, WL_STEP, SPECTRUM_LEN, type SpectrumPoint } from '../../utils/colorScience'
import type { ColorCalcDict } from './i18n'
import { hapticSelect } from './haptics'

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
const WL_END = WL_START + (SPECTRUM_LEN - 1) * WL_STEP

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

const VB_W = 560
const VB_H = 232
const PAD_L = 44
const PAD_R = 14
const PAD_T = 16
const PAD_B = 36
const PLOT_W = VB_W - PAD_L - PAD_R
const PLOT_H = VB_H - PAD_T - PAD_B

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
  const [showComponents, setShowComponents] = useState(true)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const range = BAND_ZOOM_RANGES[zoom]

  const visiblePrimary = useMemo(() => {
    if (!primarySpectrum) return null
    return primarySpectrum.filter((pt) => pt.wavelength >= range.min && pt.wavelength <= range.max)
  }, [primarySpectrum, range])

  const summary = useMemo(
    () => (visiblePrimary ? getSpectrumSummary(visiblePrimary) : null),
    [visiblePrimary]
  )

  const activeComponents = useMemo(() => {
    if (!showComponents) return []
    return componentSeries
      .map((s) => ({
        ...s,
        spectrum: s.spectrum.filter((pt) => pt.wavelength >= range.min && pt.wavelength <= range.max),
      }))
      .filter((s) => s.spectrum.length > 1)
  }, [showComponents, componentSeries, range])

  const ksMax = useMemo(() => {
    if (mode !== 'ks') return 100
    let maxVal = 2
    const inspect = (spec: SpectrumPoint[]) => {
      for (let i = 0; i < spec.length; i++) {
        const v = reflectanceToKS(spec[i].reflectance)
        if (v > maxVal) maxVal = v
      }
    }
    if (visiblePrimary) inspect(visiblePrimary)
    activeComponents.forEach((s) => inspect(s.spectrum))
    return Math.min(35, Math.ceil(maxVal * 1.1))
  }, [mode, visiblePrimary, activeComponents])

  const yMax = mode === 'reflectance' ? 100 : ksMax

  const mapX = (wl: number) =>
    PAD_L + ((wl - range.min) / Math.max(1, range.max - range.min)) * PLOT_W

  const mapY = (val: number) => {
    const clamped = Math.max(0, Math.min(yMax, val))
    return PAD_T + PLOT_H * (1 - clamped / yMax)
  }

  const buildPath = (spec: SpectrumPoint[]) => {
    if (spec.length < 2) return ''
    const parts: string[] = []
    for (let i = 0; i < spec.length; i++) {
      const pt = spec[i]
      const yVal = mode === 'reflectance' ? pt.reflectance : reflectanceToKS(pt.reflectance)
      parts.push(`${i === 0 ? 'M' : 'L'}${mapX(pt.wavelength).toFixed(1)},${mapY(yVal).toFixed(1)}`)
    }
    return parts.join(' ')
  }

  const primaryLinePath = useMemo(
    () => (visiblePrimary ? buildPath(visiblePrimary) : ''),
    [visiblePrimary, mode, yMax, range]
  )

  const primaryAreaPath = useMemo(() => {
    if (!primaryLinePath || !visiblePrimary || visiblePrimary.length < 2) return ''
    const firstX = mapX(visiblePrimary[0].wavelength).toFixed(1)
    const lastX = mapX(visiblePrimary[visiblePrimary.length - 1].wavelength).toFixed(1)
    const baseY = (PAD_T + PLOT_H).toFixed(1)
    return `${primaryLinePath} L${lastX},${baseY} L${firstX},${baseY} Z`
  }, [primaryLinePath, visiblePrimary, range])

  const handlePointer = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || !visiblePrimary || visiblePrimary.length === 0) return
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return
    const vbX = ((e.clientX - rect.left) / rect.width) * VB_W
    const ratio = Math.max(0, Math.min(1, (vbX - PAD_L) / PLOT_W))
    const idx = Math.round(ratio * (visiblePrimary.length - 1))
    setHoverIdx(idx)
  }

  const hoveredPoint =
    visiblePrimary && hoverIdx !== null
      ? sampleSeriesAtIndex(visiblePrimary, hoverIdx)
      : null

  const hoveredYVal = hoveredPoint
    ? mode === 'reflectance'
      ? hoveredPoint.reflectance
      : reflectanceToKS(hoveredPoint.reflectance)
    : null

  const yTicks =
    mode === 'reflectance'
      ? [0, 25, 50, 75, 100]
      : [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax]

  const xTicks = useMemo(() => {
    const step = range.max - range.min > 250 ? 80 : 30
    const ticks: number[] = []
    for (let wl = range.min; wl <= range.max; wl += step) ticks.push(wl)
    if (ticks[ticks.length - 1] !== range.max) ticks.push(range.max)
    return ticks
  }, [range])

  return (
    <section
      className="rounded-3xl border overflow-hidden"
      style={{
        background: 'var(--color-surface, #141416)',
        borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
      }}
    >
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
              {dict.spectralSubtitle}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['reflectance', 'ks'] as const).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setMode(m)
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
                {m === 'reflectance' ? dict.modeReflectance : dict.modeKS}
              </button>
            )
          })}

          {componentSeries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                hapticSelect()
                setShowComponents((v) => !v)
              }}
              className="px-3 py-1 rounded-full text-[10.5px] font-sans border transition-colors cursor-pointer"
              style={{
                borderColor: showComponents
                  ? 'color-mix(in srgb, var(--color-ink, #F4F0E8) 32%, transparent)'
                  : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
                background: showComponents
                  ? 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)'
                  : 'transparent',
                color: 'var(--color-ink, #F4F0E8)',
                opacity: showComponents ? 0.95 : 0.55,
              }}
            >
              {dict.showComponents}
            </button>
          )}
        </div>
      </div>

      {/* Band Zoom */}
      <div
        className="px-4 py-2 flex items-center justify-between gap-2 border-b"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
          background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 2%, transparent)',
        }}
      >
        <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] opacity-55">
          BAND ZOOM (nm)
        </span>
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
                  setHoverIdx(null)
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

      <div className="p-3.5 sm:p-4">
        {!visiblePrimary || visiblePrimary.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12px] font-sans opacity-60">
            {dict.noSpectrumHint}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px] font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="truncate opacity-85">{primaryLabel}</span>
              </div>

              {hoveredPoint && hoveredYVal !== null ? (
                <div
                  className="px-2.5 py-0.5 rounded-full border text-[10.5px]"
                  style={{
                    borderColor: 'var(--color-accent, #C9A86A)',
                    background: 'color-mix(in srgb, var(--color-accent, #C9A86A) 14%, transparent)',
                    color: 'var(--color-ink, #F4F0E8)',
                  }}
                >
                  {hoveredPoint.wavelength} nm · R {hoveredPoint.reflectance.toFixed(1)}% · K/S{' '}
                  {reflectanceToKS(hoveredPoint.reflectance).toFixed(2)}
                </div>
              ) : (
                summary && (
                  <div className="flex items-center gap-3 opacity-65 text-[10px]">
                    <span>
                      {dict.peakWl}: {summary.peakWl} nm ({summary.peakReflectance.toFixed(0)}%)
                    </span>
                    <span>
                      {dict.meanRefl}: {summary.meanReflectance.toFixed(0)}%
                    </span>
                  </div>
                )
              )}
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="w-full h-auto select-none touch-none block"
              role="img"
              aria-label={dict.spectralTitle}
              onPointerDown={handlePointer}
              onPointerMove={(e) => {
                if (e.pointerType === 'mouse' || e.buttons > 0) handlePointer(e)
              }}
              onPointerLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="cordwaine-vis-bar" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4B0082" />
                  <stop offset="14%" stopColor="#2A4BFF" />
                  <stop offset="28%" stopColor="#00C4FF" />
                  <stop offset="44%" stopColor="#19D25B" />
                  <stop offset="56%" stopColor="#E6E100" />
                  <stop offset="68%" stopColor="#FF7A00" />
                  <stop offset="84%" stopColor="#E01B1B" />
                  <stop offset="100%" stopColor="#5C0000" />
                </linearGradient>

                <linearGradient id="cordwaine-area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {yTicks.map((tick) => {
                const y = mapY(tick)
                return (
                  <g key={tick}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={VB_W - PAD_R}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PAD_L - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill="currentColor"
                      fillOpacity="0.52"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {mode === 'reflectance' ? `${tick}%` : tick}
                    </text>
                  </g>
                )
              })}

              {xTicks.map((wl) => {
                const x = mapX(wl)
                return (
                  <g key={wl}>
                    <line
                      x1={x}
                      y1={PAD_T}
                      x2={x}
                      y2={PAD_T + PLOT_H}
                      stroke="currentColor"
                      strokeOpacity="0.07"
                    />
                    <text
                      x={x}
                      y={VB_H - 4}
                      textAnchor="middle"
                      fill="currentColor"
                      fillOpacity="0.54"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {wl} nm
                    </text>
                  </g>
                )
              })}

              <rect
                x={PAD_L}
                y={PAD_T + PLOT_H + 6}
                width={PLOT_W}
                height={5}
                rx={2.5}
                fill="url(#cordwaine-vis-bar)"
                opacity="0.88"
              />

              {activeComponents.map((series) => (
                <path
                  key={series.id}
                  d={buildPath(series.spectrum)}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="1.35"
                  strokeOpacity="0.62"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {primaryAreaPath && <path d={primaryAreaPath} fill="url(#cordwaine-area-fill)" />}
              {primaryLinePath && (
                <path
                  d={primaryLinePath}
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {hoveredPoint && hoveredYVal !== null && (
                <g>
                  <line
                    x1={mapX(hoveredPoint.wavelength)}
                    y1={PAD_T}
                    x2={mapX(hoveredPoint.wavelength)}
                    y2={PAD_T + PLOT_H}
                    stroke="#C9A86A"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={mapX(hoveredPoint.wavelength)}
                    cy={mapY(hoveredYVal)}
                    r="4.5"
                    fill="#C9A86A"
                    stroke="#141210"
                    strokeWidth="1.5"
                  />
                </g>
              )}
            </svg>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {activeComponents.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 text-[10px] opacity-75">
                    <span
                      className="w-2.5 h-0.5 inline-block"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate max-w-[130px]">{s.label}</span>
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-sans opacity-50">{dict.touchChartHint}</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
