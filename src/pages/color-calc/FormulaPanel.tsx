import { useEffect, useId, useRef, useState, type MutableRefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { getPigmentLore } from '../../data/pigmentLore'
import type { PaintPart } from '../../hooks/usePaintMix'
import type { IlluminantType } from '../../utils/colorScience'
import { PigmentSelector } from '../../components/PigmentSelector'
import { SpectralSparkline } from './SpectralChart'
import type { ColorCalcDict } from './i18n'
import { SUBSTRATE_PRESETS, type SubstratePresetId } from './substrate'
import { hapticConfirm, hapticSelect, hapticTap } from './haptics'

export interface LayerSwatchItem {
  short: string
  label: string
  hex: string
}

type AmountInputMap = Map<string, HTMLInputElement>
type NumberRecord = Record<string, number>
type LabColor = { L: number; a: number; b: number }

interface FormulaPanelProps {
  lang: Lang
  dict: ColorCalcDict
  pigments: Pigment[]
  loading: boolean
  loadError: boolean
  onRetryLoad: () => void
  paints: PaintPart[]
  amountRefs: MutableRefObject<AmountInputMap>
  totalAmount: number
  onAddPaint: () => void
  onRemovePaint: (id: string) => void
  onUpdatePaint: (id: string, field: keyof PaintPart, value: string) => void
  onClearAmounts: () => void
  isWet: boolean
  onToggleWet: () => void
  illuminant: IlluminantType
  onIlluminantChange: (ill: IlluminantType) => void
  substrateId: SubstratePresetId | 'custom'
  customSubstrateHex: string
  onSelectSubstrate: (id: SubstratePresetId) => void
  onCustomSubstrateChange: (hex: string) => void
  layerSwatches: LayerSwatchItem[] | null
  selectedCoatIdx: number
  onSelectCoat: (idx: number) => void
  displayHex: string | null
  activeLab: LabColor | null
  activeTarget: string | null
  onClearTarget: () => void
  liveDeltaE: number | null
  copied: boolean
  onCopyHex: () => void
  isAutoAdjusting: boolean
  onAutoAdjust: () => void
  onInspectPigment: (id: string) => void
  onOpenGuide: () => void
}

const ILLUMINANT_ORDER: IlluminantType[] = ['D65', 'A', 'cool', 'twilight']

const SUBSTRATE_COPY: Record<
  Lang,
  { title: string; custom: string; raw: string; dryShort: string; wetShort: string; fullShort: string }
> = {
  ru: {
    title: 'Исходная кожа',
    custom: 'Своя',
    raw: 'Кожа до',
    dryShort: 'Сухая',
    wetShort: 'Мокрая',
    fullShort: 'Полн. ∞',
  },
  uk: {
    title: 'Вихідна шкіра',
    custom: 'Своя',
    raw: 'Шкіра до',
    dryShort: 'Суха',
    wetShort: 'Мокра',
    fullShort: 'Повн. ∞',
  },
  de: {
    title: 'Grundleder',
    custom: 'Eigene',
    raw: 'Vorher',
    dryShort: 'Trocken',
    wetShort: 'Nass',
    fullShort: 'Voll ∞',
  },
}

const ILLUMINANT_GLOW: Record<IlluminantType, string> = {
  D65: 'radial-gradient(ellipse at 26% 18%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 48%, rgba(0,0,0,0.18) 100%)',
  A: 'radial-gradient(ellipse at 26% 18%, rgba(255,222,168,0.26) 0%, rgba(255,198,120,0.04) 50%, rgba(20,10,0,0.22) 100%)',
  cool: 'radial-gradient(ellipse at 26% 18%, rgba(240,248,255,0.22) 0%, rgba(220,236,255,0.03) 48%, rgba(0,8,20,0.18) 100%)',
  twilight: 'radial-gradient(ellipse at 26% 18%, rgba(186,214,255,0.24) 0%, rgba(130,170,255,0.04) 50%, rgba(4,10,28,0.26) 100%)',
}

const MAX_MANUAL_ML = 1000
const SLIDER_TICKS = [
  { ml: 0, pct: 0, label: '0' },
  { ml: 5, pct: 35, label: '5' },
  { ml: 30, pct: 70, label: '30' },
  { ml: 100, pct: 100, label: '100' },
] as const

function mlToSliderPos(ml: number): number {
  if (!Number.isFinite(ml) || ml <= 0) return 0
  if (ml <= 5) return Math.round((ml / 5) * 350)
  if (ml <= 30) return Math.round(350 + ((ml - 5) / 25) * 350)
  if (ml <= 100) return Math.round(700 + ((ml - 30) / 70) * 300)
  return 1000
}

function sliderPosToMl(pos: number): number {
  if (!Number.isFinite(pos) || pos <= 0) return 0
  if (pos <= 350) return Math.round((pos / 350) * 5 * 10) / 10
  if (pos <= 700) return Math.round((5 + ((pos - 350) / 350) * 25) * 2) / 2
  return Math.round(30 + ((pos - 700) / 300) * 70)
}

function getMicroStep(currentMl: number, deltaDir: -1 | 1): number {
  if (deltaDir < 0) {
    if (currentMl <= 5) return 0.1
    if (currentMl <= 30) return 0.5
    return 1
  }
  if (currentMl < 5) return 0.1
  if (currentMl < 30) return 0.5
  return 1
}

function formatMlValue(ml: number): string {
  if (!Number.isFinite(ml) || ml <= 0) return ''
  return String(Math.round(ml * 10) / 10)
}

export function FormulaPanel({
  lang,
  dict,
  pigments,
  loading,
  loadError,
  onRetryLoad,
  paints,
  amountRefs,
  totalAmount,
  onAddPaint,
  onRemovePaint,
  onUpdatePaint,
  onClearAmounts,
  isWet,
  onToggleWet,
  illuminant,
  onIlluminantChange,
  substrateId,
  customSubstrateHex,
  onSelectSubstrate,
  onCustomSubstrateChange,
  layerSwatches,
  selectedCoatIdx,
  onSelectCoat,
  displayHex,
  activeLab,
  activeTarget,
  onClearTarget,
  liveDeltaE,
  copied,
  onCopyHex,
  isAutoAdjusting,
  onAutoAdjust,
  onInspectPigment,
  onOpenGuide,
}: FormulaPanelProps) {
  const grainFilterId = useId().replace(/:/g, '')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [showStickySwatch, setShowStickySwatch] = useState(false)
  const [splitPct, setSplitPct] = useState(28)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)

  const swatchAnchorRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const lastTickTimeRef = useRef<number>(0)
  const lastValuesRef = useRef<NumberRecord>({})
  const splitSnappedRef = useRef<boolean>(false)

  const activeCoat = layerSwatches ? layerSwatches[selectedCoatIdx] || layerSwatches[3] : null
  const squareColor = displayHex || '#1E1B19'
  const activeIllInfo = dict.illuminants[illuminant]
  const subCopy = SUBSTRATE_COPY[lang] || SUBSTRATE_COPY.ru

  const rawSubstrateHex =
    substrateId === 'custom'
      ? customSubstrateHex
      : SUBSTRATE_PRESETS.find((p) => p.id === substrateId)?.fallbackHex || '#D4BE9E'

  const hasComparisonCurtain = Boolean(activeTarget) || Boolean(layerSwatches && displayHex)
  const leftCompareHex = activeTarget || rawSubstrateHex
  const leftCompareLabel = activeTarget ? `${dict.target} · ${activeTarget}` : subCopy.raw

  useEffect(() => {
    setSplitPct(activeTarget ? 50 : 28)
  }, [activeTarget])

  // Отслеживаем уход главной выкраски за верхнюю границу экрана
  useEffect(() => {
    const el = swatchAnchorRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setShowStickySwatch(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0.08 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const updateSplitFromClientX = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const raw = ((clientX - rect.left) / rect.width) * 100
    const clamped = Math.max(8, Math.min(92, Math.round(raw)))
    setSplitPct(clamped)

    const nearCenter = Math.abs(clamped - 50) <= 2
    if (nearCenter && !splitSnappedRef.current) {
      splitSnappedRef.current = true
      hapticSelect()
    } else if (!nearCenter) {
      splitSnappedRef.current = false
    }
  }

  const handleSliderChange = (paintId: string, rawPos: number) => {
    const nextMl = sliderPosToMl(rawPos)
    const prevMl = lastValuesRef.current[paintId] ?? -1

    if (nextMl !== prevMl) {
      lastValuesRef.current[paintId] = nextMl
      onUpdatePaint(paintId, 'amount', formatMlValue(nextMl))

      const now = Date.now()
      const hitDetent =
        nextMl === 0 ||
        nextMl === 5 ||
        nextMl === 30 ||
        nextMl === 100 ||
        (prevMl >= 0 &&
          ((prevMl < 5 && nextMl >= 5) ||
            (prevMl > 5 && nextMl <= 5) ||
            (prevMl < 30 && nextMl >= 30) ||
            (prevMl > 30 && nextMl <= 30)))

      if (hitDetent) {
        hapticConfirm()
        lastTickTimeRef.current = now
      } else if (now - lastTickTimeRef.current >= 42) {
        hapticSelect()
        lastTickTimeRef.current = now
      }
    }
  }

  const handleStep = (paintId: string, currentMl: number, dir: -1 | 1) => {
    const step = getMicroStep(currentMl, dir)
    const nextMl = Math.max(0, Math.min(MAX_MANUAL_ML, Math.round((currentMl + dir * step) * 10) / 10))
    lastValuesRef.current[paintId] = nextMl
    onUpdatePaint(paintId, 'amount', formatMlValue(nextMl))
    hapticTap()
  }

  const activeSegments = paints
    .map((p) => {
      const val = parseFloat(p.amount) || 0
      const pig = pigments.find((item) => item.id === p.pigmentId)
      return {
        id: p.id,
        pct: totalAmount > 0 ? (val / totalAmount) * 100 : 0,
        hex: pig?.hex || '#C9A86A',
      }
    })
    .filter((s) => s.pct > 0)

  return (
    <div className="flex flex-col gap-4 relative">
      {/* SVG-фильтр для живой фактуры натуральной кожи */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={grainFilterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.72"
              numOctaves="3"
              seed="7"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.24" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* ПЛАВАЮЩАЯ FIXED-ПЛАШКА ОТТЕНКА (не зависит от overflow-hidden) */}
      <AnimatePresence>
        {showStickySwatch && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.18 }}
            className="fixed left-3.5 right-3.5 z-40 max-w-[640px] mx-auto px-3 py-2 rounded-2xl border flex items-center justify-between gap-2.5 backdrop-blur-xl shadow-xl"
            style={{
              top: 'calc(10px + env(safe-area-inset-top, 0px))',
              background: 'color-mix(in srgb, var(--color-surface, #141416) 90%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-accent, #C9A86A) 42%, transparent)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-10 h-10 rounded-xl shrink-0 relative overflow-hidden border border-black/25 transition-colors duration-200"
                style={{ backgroundColor: squareColor }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: ILLUMINANT_GLOW[illuminant] }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-[18px] leading-none tabular-nums">
                    {displayHex || '#------'}
                  </span>
                  {liveDeltaE !== null && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.62)',
                        color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                      }}
                    >
                      ΔE {liveDeltaE.toFixed(1)}
                    </span>
                  )}
                </div>
                <span className="block text-[10px] font-sans opacity-65 truncate mt-0.5">
                  {activeCoat ? (activeCoat.short === '∞' ? subCopy.fullShort : activeCoat.label) : dict.mix} ·{' '}
                  {isWet ? subCopy.wetShort : subCopy.dryShort} ·{' '}
                  {totalAmount >= 1000
                    ? `${(totalAmount / 1000).toFixed(2)} ${dict.l}`
                    : `${totalAmount.toFixed(1)} ${dict.ml}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCopyHex}
              disabled={!displayHex}
              className="h-8 px-3 rounded-full text-[10px] font-sans uppercase tracking-[0.1em] font-semibold border shrink-0 cursor-pointer disabled:opacity-30"
              style={{
                borderColor: 'var(--color-accent, #C9A86A)',
                background: copied ? 'var(--color-accent, #C9A86A)' : 'transparent',
                color: copied ? 'var(--color-bg, #0B0B0C)' : 'var(--color-accent, #C9A86A)',
              }}
            >
              {copied ? dict.copied : dict.copy}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ЖИВАЯ КАРТА ОТТЕНКА */}
      <section
        ref={swatchAnchorRef}
        className="rounded-3xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div
          className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-sans uppercase tracking-[0.16em] opacity-75 font-semibold">
              {dict.result}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowNotes((v) => !v)
                hapticTap()
              }}
              className="w-5 h-5 rounded-full text-[11px] flex items-center justify-center border cursor-pointer transition-colors"
              style={{
                borderColor: showNotes
                  ? 'var(--color-accent, #C9A86A)'
                  : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 18%, transparent)',
                color: showNotes ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
                background: showNotes
                  ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 14%, transparent)'
                  : 'transparent',
              }}
              title={dict.guideBtn}
              aria-label="Info"
            >
              i
            </button>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-[10.5px] font-sans underline cursor-pointer bg-transparent border-none p-0 opacity-85"
              style={{ color: 'var(--color-accent, #C9A86A)' }}
            >
              {dict.guideBtn}
            </button>
            {activeTarget && (
              <button
                type="button"
                onClick={onClearTarget}
                className="text-[9.5px] font-sans uppercase tracking-[0.08em] px-2 py-0.5 rounded-full border cursor-pointer"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-danger, #f87171) 45%, transparent)',
                  color: 'var(--color-danger, #f87171)',
                }}
              >
                ✕ {dict.reset}
              </button>
            )}
          </div>

          {/* Явный 2-позиционный тумблер: Сухая | Мокрая */}
          <div
            className="inline-flex p-0.5 rounded-full border"
            style={{
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (isWet) onToggleWet()
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-sans uppercase tracking-[0.06em] font-semibold transition-colors cursor-pointer"
              style={{
                background: !isWet ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                color: !isWet ? 'var(--color-bg, #0B0B0C)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 65%, transparent)',
              }}
            >
              {subCopy.dryShort}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isWet) onToggleWet()
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-sans uppercase tracking-[0.06em] font-semibold transition-colors cursor-pointer"
              style={{
                background: isWet ? 'var(--color-accent, #C9A86A)' : 'transparent',
                color: isWet ? 'var(--color-bg, #0B0B0C)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 65%, transparent)',
              }}
            >
              {subCopy.wetShort}
            </button>
          </div>
        </div>

        {showNotes && (
          <div
            className="px-4 py-2.5 text-[11px] font-sans opacity-80 border-b flex flex-col gap-1"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
            }}
          >
            <span>{isWet ? dict.wetExplain : dict.dryExplain}</span>
            {layerSwatches && (
              <span className="opacity-85">{dict.coatExplanations[selectedCoatIdx]}</span>
            )}
          </div>
        )}

        {/* ИНТЕРАКТИВНЫЙ ЖИВОЙ ОБРАЗЕЦ КОЖИ СО ШТОРКОЙ «ДО / ПОСЛЕ» */}
        <div className="p-3">
          <div
            ref={stageRef}
            onPointerDown={(e) => {
              if (!hasComparisonCurtain) return
              e.currentTarget.setPointerCapture(e.pointerId)
              setIsDraggingSplit(true)
              hapticTap()
              updateSplitFromClientX(e.clientX)
            }}
            onPointerMove={(e) => {
              if (!isDraggingSplit || !hasComparisonCurtain) return
              updateSplitFromClientX(e.clientX)
            }}
            onPointerUp={() => setIsDraggingSplit(false)}
            onPointerCancel={() => setIsDraggingSplit(false)}
            className="relative w-full overflow-hidden rounded-2xl select-none touch-none shadow-inner"
            style={{
              height: 176,
              cursor: hasComparisonCurtain ? 'ew-resize' : 'default',
            }}
          >
            <div
              className="absolute inset-0 transition-colors duration-300"
              style={{ backgroundColor: squareColor }}
            />

            {hasComparisonCurtain && (
              <div
                className="absolute inset-0 transition-colors duration-300"
                style={{
                  backgroundColor: leftCompareHex,
                  clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
                }}
              />
            )}

            <div
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{
                filter: `url(#${grainFilterId})`,
                opacity: isWet ? 0.55 : 0.78,
              }}
            />

            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{ background: ILLUMINANT_GLOW[illuminant] }}
            />

            {isWet && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  background:
                    'linear-gradient(125deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 28%, rgba(255,255,255,0) 52%, rgba(0,0,0,0.14) 100%)',
                }}
              />
            )}

            {hasComparisonCurtain && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20"
                style={{ left: `${splitPct}%` }}
              >
                <div
                  className="w-[1.5px] h-full -translate-x-1/2"
                  style={{
                    background: 'rgba(255,255,255,0.75)',
                    boxShadow: '0 0 8px rgba(0,0,0,0.45)',
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-transform duration-150"
                  style={{
                    transform: `translate(-50%, -50%) scale(${isDraggingSplit ? 1.15 : 1})`,
                    background: 'rgba(18,18,20,0.68)',
                    borderColor: 'rgba(255,255,255,0.65)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
                  </svg>
                </div>
              </div>
            )}

            <div className="relative z-10 p-3 flex items-center justify-between w-full gap-2 pointer-events-none">
              <span
                className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono uppercase tracking-[0.1em] text-white backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.48)' }}
              >
                {activeIllInfo.short} · {activeIllInfo.temp}
              </span>

              {liveDeltaE !== null && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-[0.06em] backdrop-blur-sm whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.62)',
                    color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                  }}
                >
                  ΔE₀₀ {liveDeltaE.toFixed(1)}
                </span>
              )}
            </div>

            <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-end justify-between gap-2 pointer-events-none">
              {hasComparisonCurtain ? (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.12em] font-mono text-white backdrop-blur-sm truncate max-w-[44%]"
                  style={{ backgroundColor: 'rgba(0,0,0,0.48)' }}
                >
                  {leftCompareLabel}
                </span>
              ) : (
                <span />
              )}

              <span
                className="px-2.5 py-0.5 rounded-full text-[9.5px] uppercase tracking-[0.12em] font-mono text-white backdrop-blur-sm whitespace-nowrap"
                style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}
              >
                {activeCoat ? (activeCoat.short === '∞' ? subCopy.fullShort : activeCoat.label) : dict.mix} ·{' '}
                {displayHex || 'UNMIXED'}
              </span>
            </div>
          </div>
        </div>

        {/* Освещение */}
        <div
          className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-t"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <span className="text-[10px] font-sans uppercase tracking-[0.14em] opacity-55 font-semibold">
            {dict.illuminantLabel}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {ILLUMINANT_ORDER.map((ill) => {
              const active = illuminant === ill
              const info = dict.illuminants[ill]
              return (
                <button
                  key={ill}
                  type="button"
                  onClick={() => onIlluminantChange(ill)}
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-sans font-medium border transition-colors cursor-pointer"
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
                  title={`${info.label} (${info.temp})`}
                >
                  {info.short}
                </button>
              )
            })}
          </div>
        </div>

        {/* Исходная кожа + 4 слоя нанесения */}
        {layerSwatches && (
          <div
            className="px-3.5 py-2.5 border-t flex flex-col gap-2"
            style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-sans uppercase tracking-[0.12em] opacity-55 font-semibold mr-1">
                {subCopy.title}:
              </span>
              {SUBSTRATE_PRESETS.map((preset) => {
                const active = substrateId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectSubstrate(preset.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-sans font-medium border transition-colors cursor-pointer"
                    style={{
                      borderColor: active
                        ? 'var(--color-accent, #C9A86A)'
                        : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
                      background: active
                        ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                        : 'transparent',
                      color: active
                        ? 'var(--color-accent, #C9A86A)'
                        : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 75%, transparent)',
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/25"
                      style={{ backgroundColor: preset.fallbackHex }}
                    />
                    <span>{preset.label[lang]}</span>
                  </button>
                )
              })}

              <label
                className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-sans font-medium border transition-colors cursor-pointer overflow-hidden"
                style={{
                  borderColor:
                    substrateId === 'custom'
                      ? 'var(--color-accent, #C9A86A)'
                      : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 18%, transparent)',
                  background:
                    substrateId === 'custom'
                      ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                      : 'transparent',
                  color:
                    substrateId === 'custom'
                      ? 'var(--color-accent, #C9A86A)'
                      : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 75%, transparent)',
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/25"
                  style={{ backgroundColor: customSubstrateHex }}
                />
                <span>+ {subCopy.custom}</span>
                <input
                  type="color"
                  value={customSubstrateHex}
                  onChange={(e) => onCustomSubstrateChange(e.target.value.toUpperCase())}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  aria-label={subCopy.custom}
                />
              </label>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {layerSwatches.map((ls, idx) => {
                const isSelectedCoat = selectedCoatIdx === idx
                const displayLabel = ls.short === '∞' ? subCopy.fullShort : ls.label
                return (
                  <button
                    key={ls.short}
                    type="button"
                    onClick={() => onSelectCoat(idx)}
                    className="flex items-center justify-center gap-1 py-2 px-1 rounded-2xl border transition-colors cursor-pointer min-w-0"
                    style={{
                      borderColor: isSelectedCoat
                        ? 'var(--color-accent, #C9A86A)'
                        : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
                      background: isSelectedCoat
                        ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 15%, transparent)'
                        : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: ls.hex,
                        border: '1px solid rgba(0,0,0,0.25)',
                      }}
                    />
                    <span
                      className="text-[9.5px] font-sans whitespace-nowrap"
                      style={{
                        fontWeight: isSelectedCoat ? 600 : 500,
                        opacity: isSelectedCoat ? 1 : 0.72,
                        color: 'var(--color-ink, #F4F0E8)',
                      }}
                    >
                      {displayLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Технический подвал HEX / CIELAB / Объём */}
        <div
          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <div className="flex flex-col">
            <span className="text-[9.5px] font-sans uppercase tracking-[0.16em] opacity-50">
              HEX / CIELAB {activeCoat ? `· ${activeCoat.short === '∞' ? subCopy.fullShort : activeCoat.label}` : ''}
            </span>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="font-serif text-[25px] leading-none tracking-tight tabular-nums">
                {displayHex || '#------'}
              </span>
              {activeLab && (
                <span className="font-mono text-[10.5px] opacity-60 tabular-nums">
                  L*{activeLab.L.toFixed(0)} a*{activeLab.a.toFixed(0)} b*{activeLab.b.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[9.5px] font-sans uppercase tracking-[0.14em] opacity-50">
                {dict.totalVolume}
              </span>
              <span className="font-serif text-[19px] leading-tight tabular-nums">
                {totalAmount >= 1000
                  ? `${(totalAmount / 1000).toFixed(2)} ${dict.l}`
                  : `${totalAmount.toFixed(1)} ${dict.ml}`}
              </span>
            </div>

            <button
              type="button"
              onClick={onCopyHex}
              disabled={!displayHex}
              className="h-9 px-4 rounded-full text-[10.5px] font-sans uppercase tracking-[0.12em] font-semibold border transition-colors disabled:opacity-30 cursor-pointer"
              style={{
                borderColor: 'var(--color-accent, #C9A86A)',
                background: copied ? 'var(--color-accent, #C9A86A)' : 'transparent',
                color: copied ? 'var(--color-bg, #0B0B0C)' : 'var(--color-accent, #C9A86A)',
              }}
            >
              {copied ? dict.copied : dict.copy}
            </button>
          </div>
        </div>

        {liveDeltaE !== null && (
          <div
            className="px-4 py-2 text-[11px] font-sans border-t"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
            }}
          >
            <span className="opacity-80">
              {liveDeltaE <= 2
                ? dict.ciePerfect
                : liveDeltaE <= 5
                ? dict.cieAcceptable
                : dict.cieBad}
            </span>
          </div>
        )}
      </section>

      {/* ПРОПОРЦИИ КОМПОНЕНТОВ */}
      <section
        className="rounded-3xl border p-4"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block border border-black/20 transition-colors duration-200"
              style={{ backgroundColor: squareColor }}
            />
            <h2 className="text-[11px] font-sans uppercase tracking-[0.18em] font-semibold opacity-80">
              {dict.mixComposition}
            </h2>
          </div>

          {totalAmount > 0 && (
            <button
              type="button"
              onClick={onClearAmounts}
              className="text-[11px] font-sans font-medium opacity-75 hover:opacity-100 cursor-pointer"
              style={{ color: 'var(--color-danger, #f87171)' }}
            >
              {dict.clear}
            </button>
          )}
        </div>

        {/* Живая полоса пропорций («мерный стакан») */}
        <div
          className="w-full h-2 rounded-full overflow-hidden flex mb-3.5 border"
          style={{
            background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
          }}
        >
          {activeSegments.map((seg) => (
            <div
              key={seg.id}
              className="h-full transition-[width] duration-200"
              style={{
                width: `${seg.pct}%`,
                backgroundColor: seg.hex,
              }}
            />
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-[12px] font-sans uppercase tracking-[0.18em] opacity-45">
            {dict.loading}
          </div>
        ) : loadError ? (
          <div className="py-6 flex flex-col items-center gap-3">
            <p className="text-[12px]" style={{ color: 'var(--color-danger, #f87171)' }}>
              {dict.loadError}
            </p>
            <button
              type="button"
              onClick={onRetryLoad}
              className="px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.14em] border cursor-pointer"
              style={{ borderColor: 'var(--color-accent, #C9A86A)', color: 'var(--color-accent, #C9A86A)' }}
            >
              {dict.retry}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {paints.map((paint, idx) => {
              const currentAmount = parseFloat(paint.amount) || 0
              const sliderPos = mlToSliderPos(currentAmount)
              const fillPct = sliderPos / 10
              const isDragging = draggingId === paint.id
              const pct = totalAmount > 0 ? Math.round((currentAmount / totalAmount) * 100) : 0
              const selectedPigment = pigments.find((p) => p.id === paint.pigmentId)
              const lore = getPigmentLore(selectedPigment, lang)

              return (
                <div
                  key={paint.id}
                  className="p-3 rounded-2xl border overflow-hidden transition-colors"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                    borderColor: isDragging
                      ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 45%, transparent)'
                      : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-serif text-[13px] opacity-45 w-[18px] shrink-0">
                      0{idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <PigmentSelector
                        pigments={pigments}
                        value={paint.pigmentId}
                        onChange={(newId) => onUpdatePaint(paint.id, 'pigmentId', newId)}
                        lang={lang}
                        onInspect={onInspectPigment}
                      />
                    </div>

                    <div className="hidden sm:flex items-center px-1 shrink-0">
                      <SpectralSparkline
                        spectrum={selectedPigment?.spectrum}
                        strokeColor={selectedPigment?.hex || '#C9A86A'}
                        width={54}
                        height={24}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemovePaint(paint.id)}
                      disabled={paints.length <= 1}
                      className="w-7 h-7 rounded-full flex items-center justify-center opacity-45 hover:opacity-100 disabled:opacity-15 shrink-0 cursor-pointer"
                      aria-label="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Дозирование: анимированная шкала 0–100 мл + микрошаг − / + */}
                  <div className="pl-[26px] pr-0.5 mt-3 w-full">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStep(paint.id, currentAmount, -1)}
                          disabled={currentAmount <= 0}
                          className="w-6 h-6 rounded-full border flex items-center justify-center text-[13px] leading-none font-mono transition-colors disabled:opacity-25 cursor-pointer"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 16%, transparent)',
                            color: 'var(--color-ink, #F4F0E8)',
                          }}
                          aria-label="Decrease"
                        >
                          −
                        </button>

                        <div className="flex items-baseline gap-1 px-1">
                          <input
                            ref={(el) => {
                              if (el) amountRefs.current.set(paint.id, el)
                              else amountRefs.current.delete(paint.id)
                            }}
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="done"
                            value={paint.amount}
                            onChange={(e) => {
                              let val = e.target.value.replace(',', '.')
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                const num = parseFloat(val)
                                if (!isNaN(num) && num > MAX_MANUAL_ML) val = String(MAX_MANUAL_ML)
                                onUpdatePaint(paint.id, 'amount', val)
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.replace(',', '.')
                              if (val === '.' || val === '') onUpdatePaint(paint.id, 'amount', '')
                              else {
                                const num = parseFloat(val)
                                if (!isNaN(num)) {
                                  const clamped = Math.max(0, Math.min(num, MAX_MANUAL_ML))
                                  onUpdatePaint(paint.id, 'amount', formatMlValue(clamped))
                                }
                              }
                            }}
                            className="bg-transparent border-b border-transparent focus:border-current text-right font-mono text-[15px] font-semibold focus:outline-none p-0 w-[48px] tabular-nums"
                            placeholder="0.0"
                            style={{ color: 'var(--color-ink, #F4F0E8)' }}
                          />
                          <span className="text-[11px] font-sans opacity-55">{dict.ml}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStep(paint.id, currentAmount, 1)}
                          disabled={currentAmount >= MAX_MANUAL_ML}
                          className="w-6 h-6 rounded-full border flex items-center justify-center text-[13px] leading-none font-mono transition-colors disabled:opacity-25 cursor-pointer"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 16%, transparent)',
                            color: 'var(--color-ink, #F4F0E8)',
                          }}
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>

                      <span
                        className="font-mono text-[11.5px] font-semibold tabular-nums transition-colors"
                        style={{
                          color: isDragging ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
                          opacity: isDragging ? 1 : 0.62,
                        }}
                      >
                        {pct}%
                      </span>
                    </div>

                    <div className="relative h-7 flex items-center select-none touch-none">
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden relative"
                        style={{
                          background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-75"
                          style={{
                            width: `${fillPct}%`,
                            background: 'var(--color-accent, #C9A86A)',
                          }}
                        />
                      </div>

                      {SLIDER_TICKS.map((tick) => {
                        const passed = fillPct >= tick.pct - 0.5
                        return (
                          <span
                            key={tick.ml}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full pointer-events-none transition-colors duration-150"
                            style={{
                              left: `${tick.pct}%`,
                              background: passed
                                ? 'var(--color-accent, #C9A86A)'
                                : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 24%, transparent)',
                            }}
                          />
                        )
                      })}

                      <span
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-transform duration-150"
                        style={{
                          left: `${fillPct}%`,
                          width: 18,
                          height: 18,
                          transform: `translate(-50%, -50%) scale(${isDragging ? 1.18 : 1})`,
                          background: 'var(--color-accent, #C9A86A)',
                          border: '2px solid var(--color-surface, #141416)',
                          boxShadow: isDragging
                            ? '0 0 0 6px color-mix(in srgb, var(--color-accent, #C9A86A) 24%, transparent)'
                            : '0 1px 4px rgba(0,0,0,0.35)',
                        }}
                      />

                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={1}
                        value={sliderPos}
                        onPointerDown={() => {
                          setDraggingId(paint.id)
                          hapticTap()
                        }}
                        onPointerUp={() => setDraggingId(null)}
                        onPointerCancel={() => setDraggingId(null)}
                        onBlur={() => setDraggingId(null)}
                        onChange={(e) => handleSliderChange(paint.id, Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
                        aria-label={`${selectedPigment?.name?.[lang] || paint.pigmentId} ${dict.ml}`}
                      />
                    </div>

                    <div className="relative h-4 mt-0.5 text-[9.5px] font-mono tabular-nums select-none">
                      {SLIDER_TICKS.map((tick) => {
                        const isNear =
                          (tick.ml === 0 && currentAmount === 0) ||
                          (tick.ml === 5 && currentAmount >= 4.5 && currentAmount <= 5.5) ||
                          (tick.ml === 30 && currentAmount >= 28 && currentAmount <= 32) ||
                          (tick.ml === 100 && currentAmount >= 98)
                        const alignStyle =
                          tick.pct === 0
                            ? { left: '0%', transform: 'translateX(0%)' }
                            : tick.pct === 100
                            ? { left: '100%', transform: 'translateX(-100%)' }
                            : { left: `${tick.pct}%`, transform: 'translateX(-50%)' }
                        return (
                          <span
                            key={tick.ml}
                            className="absolute top-0 whitespace-nowrap transition-colors duration-150"
                            style={{
                              ...alignStyle,
                              color: isNear
                                ? 'var(--color-accent, #C9A86A)'
                                : 'var(--color-ink, #F4F0E8)',
                              opacity: isNear ? 1 : 0.42,
                              fontWeight: isNear ? 600 : 400,
                            }}
                          >
                            {tick.label}
                            {tick.ml === 100 ? ` ${dict.ml}` : ''}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between gap-2 pl-[26px] mt-2.5 pt-2 border-t text-[11px]"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 7%, transparent)' }}
                  >
                    <button
                      type="button"
                      onClick={onOpenGuide}
                      className="opacity-70 truncate min-w-0 flex-1 text-left bg-transparent border-none p-0 text-inherit cursor-pointer"
                      title={dict.opacityDesc[lore.opacity]}
                    >
                      <span className="underline decoration-dotted">
                        {dict.opacityLabels[lore.opacity]}
                      </span>
                      {' · '}
                      <span>{lore.whereToBuy.leatherBrands[0]}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onInspectPigment(paint.pigmentId)}
                      className="shrink-0 font-semibold underline whitespace-nowrap text-[11px] bg-transparent border-none p-0 cursor-pointer"
                      style={{ color: 'var(--color-accent, #C9A86A)' }}
                    >
                      ⓘ {dict.pigmentInfoBtn}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
          <button
            type="button"
            onClick={onAddPaint}
            disabled={loading || loadError}
            className="flex-1 py-3 rounded-full text-[11.5px] font-sans uppercase tracking-[0.14em] font-semibold border transition-opacity disabled:opacity-40 cursor-pointer"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 22%, transparent)',
              color: 'var(--color-ink, #F4F0E8)',
            }}
          >
            {dict.addPigment}
          </button>

          {activeTarget && paints.some((p) => p.pigmentId !== 'acrylic_binder') && (
            <button
              type="button"
              onClick={onAutoAdjust}
              disabled={isAutoAdjusting || loading}
              className="flex-1 py-3 rounded-full text-[11.5px] font-sans uppercase tracking-[0.14em] font-semibold transition-opacity disabled:opacity-40 cursor-pointer"
              style={{
                background: 'var(--color-accent, #C9A86A)',
                color: 'var(--color-bg, #0B0B0C)',
              }}
            >
              {isAutoAdjusting ? dict.adjusting : dict.autoAdjust}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
