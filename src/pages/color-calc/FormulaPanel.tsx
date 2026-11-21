import { useEffect, useRef, useState, type MutableRefObject } from 'react'
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

interface SliderGestureState {
  paintId: string
  pointerId: number
  startX: number
  startY: number
  rectLeft: number
  rectWidth: number
  locked: 'none' | 'horizontal' | 'vertical'
}

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
  onScaleToVolume: (targetMl: number) => void
  isWet: boolean
  onToggleWet: () => void
  illuminant: IlluminantType
  onIlluminantChange: (ill: IlluminantType) => void
  substrateId: SubstratePresetId | 'custom'
  customSubstrateHex: string
  substrateDisplayHex?: string
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
const BATCH_PRESETS = [10, 20, 25, 50, 100] as const

const SUBSTRATE_COPY: Record<
  Lang,
  {
    title: string
    custom: string
    raw: string
    dryShort: string
    wetShort: string
    fullShort: string
    batchLabel: string
    batchLimit: string
    copyRecipe: string
  }
> = {
  ru: {
    title: 'Кожа-подложка',
    custom: 'Своя',
    raw: 'Кожа до',
    dryShort: 'Сухая',
    wetShort: 'Мокрая',
    fullShort: 'Полн. ∞',
    batchLabel: 'Объём партии',
    batchLimit: 'до 1000 мл',
    copyRecipe: 'Рецепт',
  },
  uk: {
    title: 'Шкіра-підкладка',
    custom: 'Своя',
    raw: 'Шкіра до',
    dryShort: 'Суха',
    wetShort: 'Мокра',
    fullShort: 'Повн. ∞',
    batchLabel: 'Обʼєм партії',
    batchLimit: 'до 1000 мл',
    copyRecipe: 'Рецепт',
  },
  de: {
    title: 'Grundleder',
    custom: 'Eigene',
    raw: 'Vorher',
    dryShort: 'Trocken',
    wetShort: 'Nass',
    fullShort: 'Voll ∞',
    batchLabel: 'Zielmenge',
    batchLimit: 'bis 1000 ml',
    copyRecipe: 'Rezept',
  },
}

const ILLUMINANT_GLOW: Record<IlluminantType, string> = {
  D65: 'radial-gradient(ellipse at 26% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.16) 100%)',
  A: 'radial-gradient(ellipse at 26% 18%, rgba(255,222,168,0.22) 0%, rgba(255,198,120,0.03) 50%, rgba(20,10,0,0.2) 100%)',
  cool: 'radial-gradient(ellipse at 26% 18%, rgba(240,248,255,0.18) 0%, rgba(220,236,255,0.02) 50%, rgba(0,8,20,0.16) 100%)',
  twilight: 'radial-gradient(ellipse at 26% 18%, rgba(186,214,255,0.2) 0%, rgba(130,170,255,0.03) 50%, rgba(4,10,28,0.22) 100%)',
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
  onScaleToVolume,
  isWet,
  onToggleWet,
  illuminant,
  onIlluminantChange,
  substrateId,
  customSubstrateHex,
  substrateDisplayHex,
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
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [showStickySwatch, setShowStickySwatch] = useState(false)
  const [splitPct, setSplitPct] = useState(28)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
  const [customBatchMl, setCustomBatchMl] = useState('')

  const stageRef = useRef<HTMLDivElement | null>(null)
  const lastTickTimeRef = useRef<number>(0)
  const lastValuesRef = useRef<NumberRecord>({})
  const splitSnappedRef = useRef<boolean>(false)
  const sliderGestureRef = useRef<SliderGestureState | null>(null)

  const activeCoat = layerSwatches ? layerSwatches[selectedCoatIdx] || layerSwatches[3] : null
  const squareColor = displayHex || '#1E1B19'
  const activeIllInfo = dict.illuminants[illuminant]
  const subCopy = SUBSTRATE_COPY[lang] || SUBSTRATE_COPY.ru
  const hairline = 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)'

  const rawSubstrateHex =
    substrateDisplayHex ||
    (substrateId === 'custom'
      ? customSubstrateHex
      : SUBSTRATE_PRESETS.find((p) => p.id === substrateId)?.fallbackHex || '#D4BE9E')

  const hasComparisonCurtain = Boolean(activeTarget) || Boolean(layerSwatches && displayHex)
  const leftCompareHex = activeTarget || rawSubstrateHex
  const leftCompareLabel = activeTarget ? `${dict.target} · ${activeTarget}` : subCopy.raw

  useEffect(() => {
    setSplitPct(activeTarget ? 50 : 28)
  }, [activeTarget])

  // Плавающая плашка появляется СРАЗУ, как только сам образец цвета (stageRef) скрывается сверху
  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setShowStickySwatch(!entry.isIntersecting && entry.boundingClientRect.bottom <= 48)
      },
      { threshold: 0.05 }
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
      } else if (now - lastTickTimeRef.current >= 55) {
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

  const applyCustomBatch = () => {
    const num = parseFloat(customBatchMl.replace(',', '.'))
    if (!Number.isFinite(num) || num <= 0) return
    onScaleToVolume(Math.max(1, Math.min(MAX_MANUAL_ML, num)))
    setCustomBatchMl('')
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
    <div className="flex flex-col gap-6 relative">
      {/* ПЛАВАЮЩАЯ FIXED-ПЛАШКА (лёгкая, без backdrop-blur — мгновенная на Android) */}
      <AnimatePresence>
        {showStickySwatch && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.14 }}
            className="fixed left-4 right-4 z-40 max-w-[680px] mx-auto px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-3 shadow-lg"
            style={{
              top: 'calc(10px + env(safe-area-inset-top, 0px))',
              background: 'var(--color-surface, #141416)',
              borderColor: 'color-mix(in srgb, var(--color-accent, #C9A86A) 38%, transparent)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl shrink-0 relative overflow-hidden border border-black/20"
                style={{ backgroundColor: squareColor }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: ILLUMINANT_GLOW[illuminant] }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[20px] leading-none tabular-nums">
                    {displayHex || '#------'}
                  </span>
                  {liveDeltaE !== null && (
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.68)',
                        color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                      }}
                    >
                      ΔE {liveDeltaE.toFixed(1)}
                    </span>
                  )}
                </div>
                <span className="block text-[12px] font-sans opacity-65 truncate mt-0.5 tabular-nums">
                  {activeCoat ? (activeCoat.short === '∞' ? subCopy.fullShort : activeCoat.label) : dict.mix} ·{' '}
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
              className="h-9 px-3.5 rounded-xl text-[12px] font-sans font-semibold border shrink-0 cursor-pointer disabled:opacity-30"
              style={{
                borderColor: 'var(--color-accent, #C9A86A)',
                background: copied ? 'var(--color-accent, #C9A86A)' : 'transparent',
                color: copied ? 'var(--color-bg, #0B0B0C)' : 'var(--color-accent, #C9A86A)',
              }}
            >
              {copied ? dict.copied : subCopy.copyRecipe}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* СЦЕНА ВЫКРАСКИ КОЖИ */}
      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: hairline,
        }}
      >
        <div
          className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b"
          style={{ borderColor: hairline }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-sans uppercase tracking-[0.12em] font-semibold opacity-80">
              {dict.result}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowNotes((v) => !v)
                hapticTap()
              }}
              className="w-6 h-6 rounded-full text-[12px] font-serif italic flex items-center justify-center border cursor-pointer"
              style={{
                borderColor: showNotes ? 'var(--color-accent, #C9A86A)' : hairline,
                color: showNotes ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
              }}
              aria-label="Info"
            >
              i
            </button>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-[12px] font-sans underline underline-offset-4 cursor-pointer bg-transparent border-none p-0 opacity-85"
              style={{ color: 'var(--color-accent, #C9A86A)' }}
            >
              {dict.guideBtn}
            </button>
            {activeTarget && (
              <button
                type="button"
                onClick={onClearTarget}
                className="text-[12px] font-sans font-medium px-2 py-0.5 rounded-md cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--color-danger, #f87171)' }}
              >
                ✕ {dict.reset}
              </button>
            )}
          </div>

          <div
            className="inline-flex p-0.5 rounded-xl border"
            style={{
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
              borderColor: hairline,
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (isWet) onToggleWet()
              }}
              className="px-3 py-1 rounded-lg text-[12px] font-sans font-medium cursor-pointer"
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
              className="px-3 py-1 rounded-lg text-[12px] font-sans font-medium cursor-pointer"
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
            className="px-5 py-3 text-[13px] leading-relaxed font-sans opacity-80 border-b flex flex-col gap-1.5"
            style={{
              borderColor: hairline,
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 2.5%, transparent)',
            }}
          >
            <span>{isWet ? dict.wetExplain : dict.dryExplain}</span>
            {layerSwatches && (
              <span className="opacity-85">{dict.coatExplanations[selectedCoatIdx]}</span>
            )}
          </div>
        )}

        {/* ГЛАВНАЯ ВЫКРАСКА (без тяжёлого CPU feTurbulence — 60fps на Android) */}
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
          className="relative w-full overflow-hidden select-none touch-none"
          style={{
            height: 200,
            cursor: hasComparisonCurtain ? 'ew-resize' : 'default',
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: squareColor }} />

          {hasComparisonCurtain && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: leftCompareHex,
                clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
              }}
            />
          )}

          {/* Лёгкая GPU-текстура кожи без CPU-тормозов */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: isWet ? 0.08 : 0.14,
              backgroundImage:
                'radial-gradient(rgba(0,0,0,0.45) 0.75px, transparent 0.75px), radial-gradient(rgba(255,255,255,0.28) 0.65px, transparent 0.65px)',
              backgroundSize: '7px 7px',
              backgroundPosition: '0 0, 3.5px 3.5px',
            }}
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: ILLUMINANT_GLOW[illuminant] }}
          />

          {isWet && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(125deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0) 52%, rgba(0,0,0,0.12) 100%)',
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
                style={{ background: 'rgba(255,255,255,0.82)' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center border"
                style={{
                  transform: `translate(-50%, -50%) scale(${isDraggingSplit ? 1.1 : 1})`,
                  background: 'rgba(18,18,20,0.78)',
                  borderColor: 'rgba(255,255,255,0.7)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
                </svg>
              </div>
            </div>
          )}

          <div className="relative z-10 p-3.5 flex items-center justify-between w-full gap-2 pointer-events-none">
            <span
              className="px-2.5 py-1 rounded-md text-[11px] font-mono tracking-[0.04em] text-white"
              style={{ backgroundColor: 'rgba(0,0,0,0.54)' }}
            >
              {activeIllInfo.short} · {activeIllInfo.temp}
            </span>

            {liveDeltaE !== null && (
              <span
                className="px-2.5 py-1 rounded-md text-[12px] font-mono font-semibold whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.68)',
                  color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                }}
              >
                ΔE₀₀ {liveDeltaE.toFixed(1)}
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-3.5 right-3.5 z-10 flex items-end justify-between gap-2 pointer-events-none">
            {hasComparisonCurtain ? (
              <span
                className="px-2.5 py-1 rounded-md text-[11px] font-mono text-white truncate max-w-[46%]"
                style={{ backgroundColor: 'rgba(0,0,0,0.54)' }}
              >
                {leftCompareLabel}
              </span>
            ) : (
              <span />
            )}

            <span
              className="px-2.5 py-1 rounded-md text-[11px] font-mono text-white whitespace-nowrap"
              style={{ backgroundColor: 'rgba(0,0,0,0.58)' }}
            >
              {activeCoat ? (activeCoat.short === '∞' ? subCopy.fullShort : activeCoat.label) : dict.mix} ·{' '}
              {displayHex || 'UNMIXED'}
            </span>
          </div>
        </div>

        {/* ГЛАВНЫЕ ЦИФРЫ (только цвет HEX + CIELAB + Скопировать рецепт, без лишнего объёма здесь) */}
        <div
          className="px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b"
          style={{ borderColor: hairline }}
        >
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-[32px] leading-none tracking-tight tabular-nums">
                {displayHex || '#------'}
              </span>
              {activeLab && (
                <span className="font-mono text-[12px] opacity-60 tabular-nums">
                  L*{activeLab.L.toFixed(0)} a*{activeLab.a.toFixed(0)} b*{activeLab.b.toFixed(0)}
                </span>
              )}
            </div>
            {liveDeltaE !== null && (
              <p className="text-[12px] font-sans opacity-70 mt-1">
                {liveDeltaE <= 2
                  ? dict.ciePerfect
                  : liveDeltaE <= 5
                  ? dict.cieAcceptable
                  : dict.cieBad}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onCopyHex}
            disabled={!displayHex}
            className="h-10 px-4 rounded-xl text-[12.5px] font-sans font-semibold border disabled:opacity-30 cursor-pointer"
            style={{
              borderColor: 'var(--color-accent, #C9A86A)',
              background: copied ? 'var(--color-accent, #C9A86A)' : 'transparent',
              color: copied ? 'var(--color-bg, #0B0B0C)' : 'var(--color-accent, #C9A86A)',
            }}
          >
            {copied ? dict.copied : `${dict.copy} · ${subCopy.copyRecipe}`}
          </button>
        </div>

        {/* ШКАЛА ОСВЕЩЕНИЯ */}
        <div
          className="grid grid-cols-4 border-b divide-x"
          style={{ borderColor: hairline }}
        >
          {ILLUMINANT_ORDER.map((ill) => {
            const active = illuminant === ill
            const info = dict.illuminants[ill]
            return (
              <button
                key={ill}
                type="button"
                onClick={() => onIlluminantChange(ill)}
                className="py-2.5 px-1 text-[12px] font-sans font-medium cursor-pointer text-center"
                style={{
                  borderColor: hairline,
                  background: active
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 14%, transparent)'
                    : 'transparent',
                  color: active ? 'var(--color-accent, #C9A86A)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 68%, transparent)',
                }}
                title={`${info.label} (${info.temp})`}
              >
                {info.short}
              </button>
            )
          })}
        </div>

        {/* ПОДЛОЖКА КОЖИ + 4 СЛОЯ */}
        {layerSwatches && (
          <div className="flex flex-col">
            <div
              className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap border-b"
              style={{ borderColor: hairline }}
            >
              <span className="text-[12px] font-sans opacity-60">{subCopy.title}</span>

              <div className="flex items-center gap-3 flex-wrap">
                {SUBSTRATE_PRESETS.map((preset) => {
                  const active = substrateId === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectSubstrate(preset.id)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-sans cursor-pointer bg-transparent border-none p-0"
                      style={{
                        color: active ? 'var(--color-ink, #F4F0E8)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 62%, transparent)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{
                          backgroundColor: preset.fallbackHex,
                          boxShadow: active
                            ? '0 0 0 2px var(--color-surface, #141416), 0 0 0 3.5px var(--color-accent, #C9A86A)'
                            : 'inset 0 0 0 1px rgba(0,0,0,0.25)',
                        }}
                      />
                      <span>{preset.label[lang]}</span>
                    </button>
                  )
                })}

                <label
                  className="relative inline-flex items-center gap-1.5 text-[12px] font-sans cursor-pointer"
                  style={{
                    color: substrateId === 'custom' ? 'var(--color-accent, #C9A86A)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 62%, transparent)',
                    fontWeight: substrateId === 'custom' ? 600 : 400,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{
                      backgroundColor: customSubstrateHex,
                      boxShadow:
                        substrateId === 'custom'
                          ? '0 0 0 2px var(--color-surface, #141416), 0 0 0 3.5px var(--color-accent, #C9A86A)'
                          : 'inset 0 0 0 1px rgba(0,0,0,0.25)',
                    }}
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
            </div>

            <div className="grid grid-cols-4 divide-x" style={{ borderColor: hairline }}>
              {layerSwatches.map((ls, idx) => {
                const isSelectedCoat = selectedCoatIdx === idx
                const displayLabel = ls.short === '∞' ? subCopy.fullShort : ls.label
                return (
                  <button
                    key={ls.short}
                    type="button"
                    onClick={() => onSelectCoat(idx)}
                    className="relative pt-3 pb-2.5 px-1 text-center cursor-pointer"
                    style={{
                      borderColor: hairline,
                      background: isSelectedCoat
                        ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 11%, transparent)'
                        : 'transparent',
                    }}
                  >
                    <span
                      className="block h-1.5 w-10 mx-auto rounded-full mb-1.5 border border-black/15"
                      style={{ backgroundColor: ls.hex }}
                    />
                    <span
                      className="block text-[12px] font-sans whitespace-nowrap"
                      style={{
                        fontWeight: isSelectedCoat ? 600 : 400,
                        color: isSelectedCoat
                          ? 'var(--color-accent, #C9A86A)'
                          : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 72%, transparent)',
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
      </section>

      {/* ПРОПОРЦИИ КОМПОНЕНТОВ */}
      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: hairline,
        }}
      >
        <div
          className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 border-b"
          style={{ borderColor: hairline }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block border border-black/20 shrink-0"
              style={{ backgroundColor: squareColor }}
            />
            <h2 className="text-[12px] font-sans uppercase tracking-[0.12em] font-semibold opacity-85 truncate">
              {dict.mixComposition}
            </h2>
            {totalAmount > 0 && (
              <span className="font-mono text-[13px] font-semibold tabular-nums opacity-75 shrink-0">
                ·{' '}
                {totalAmount >= 1000
                  ? `${(totalAmount / 1000).toFixed(2)} ${dict.l}`
                  : `${totalAmount.toFixed(1)} ${dict.ml}`}
              </span>
            )}
          </div>

          {totalAmount > 0 && (
            <button
              type="button"
              onClick={onClearAmounts}
              className="text-[12.5px] font-sans font-medium opacity-80 hover:opacity-100 cursor-pointer bg-transparent border-none p-0 shrink-0"
              style={{ color: 'var(--color-danger, #f87171)' }}
            >
              {dict.clear}
            </button>
          )}
        </div>

        <div className="h-1.5 w-full flex" style={{ background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 6%, transparent)' }}>
          {activeSegments.map((seg) => (
            <div
              key={seg.id}
              className="h-full"
              style={{ width: `${seg.pct}%`, backgroundColor: seg.hex }}
            />
          ))}
        </div>

        {/* Линейка масштабирования партии + кнопка копирования готового рецепта */}
        {totalAmount > 0 && (
          <div
            className="px-4 sm:px-5 py-3 border-b flex flex-col gap-2.5"
            style={{
              borderColor: hairline,
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 2%, transparent)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-sans opacity-65">
                {subCopy.batchLabel} <span className="opacity-70">({subCopy.batchLimit})</span>
              </span>
              <button
                type="button"
                onClick={onCopyHex}
                className="text-[12px] font-sans font-medium underline underline-offset-4 cursor-pointer bg-transparent border-none p-0"
                style={{ color: 'var(--color-accent, #C9A86A)' }}
              >
                {copied ? dict.copied : `${dict.copy} ${subCopy.copyRecipe.toLowerCase()}`}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {BATCH_PRESETS.map((vol) => {
                const isCurrent = Math.abs(totalAmount - vol) < 0.2
                return (
                  <button
                    key={vol}
                    type="button"
                    onClick={() => onScaleToVolume(vol)}
                    className="h-8 px-2.5 rounded-lg text-[12px] font-mono font-medium cursor-pointer tabular-nums"
                    style={{
                      background: isCurrent
                        ? 'var(--color-accent, #C9A86A)'
                        : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 6%, transparent)',
                      color: isCurrent ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                    }}
                  >
                    {vol}
                  </button>
                )
              })}

              <div
                className="inline-flex items-center h-8 rounded-lg border pl-2.5 pr-1 ml-auto"
                style={{ borderColor: hairline }}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  maxLength={6}
                  value={customBatchMl}
                  onChange={(e) => {
                    let v = e.target.value.replace(',', '.')
                    if (v === '' || /^\d*\.?\d*$/.test(v)) {
                      const num = parseFloat(v)
                      if (!isNaN(num) && num > MAX_MANUAL_ML) v = String(MAX_MANUAL_ML)
                      setCustomBatchMl(v)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustomBatch()
                  }}
                  placeholder="1–1000"
                  className="w-14 bg-transparent text-[12px] font-mono focus:outline-none tabular-nums"
                  style={{ color: 'var(--color-ink, #F4F0E8)' }}
                />
                <button
                  type="button"
                  onClick={applyCustomBatch}
                  disabled={!customBatchMl}
                  className="h-6 px-2 rounded-md text-[11px] font-sans font-semibold cursor-pointer disabled:opacity-30"
                  style={{
                    background: 'var(--color-accent, #C9A86A)',
                    color: 'var(--color-bg, #0B0B0C)',
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[13px] font-sans opacity-50">
            {dict.loading}
          </div>
        ) : loadError ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <p className="text-[13px]" style={{ color: 'var(--color-danger, #f87171)' }}>
              {dict.loadError}
            </p>
            <button
              type="button"
              onClick={onRetryLoad}
              className="h-10 px-5 rounded-xl text-[13px] font-sans font-medium border cursor-pointer"
              style={{ borderColor: 'var(--color-accent, #C9A86A)', color: 'var(--color-accent, #C9A86A)' }}
            >
              {dict.retry}
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: hairline }}>
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
                  className="px-4 sm:px-5 py-4"
                  style={{
                    borderColor: hairline,
                    background: isDragging
                      ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 4%, transparent)'
                      : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    <span className="font-serif text-[15px] opacity-45 w-5 shrink-0 tabular-nums">
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
                        width={56}
                        height={24}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemovePaint(paint.id)}
                      disabled={paints.length <= 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-45 hover:opacity-100 disabled:opacity-15 shrink-0 cursor-pointer"
                      aria-label="Remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Дозирование: scroll-safe ползунок (touch-action: pan-y) */}
                  <div className="pl-7 mt-3.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStep(paint.id, currentAmount, -1)}
                          disabled={currentAmount <= 0}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center text-[16px] leading-none font-mono disabled:opacity-25 cursor-pointer"
                          style={{ borderColor: hairline, color: 'var(--color-ink, #F4F0E8)' }}
                          aria-label="Decrease"
                        >
                          −
                        </button>

                        <div className="flex items-baseline gap-1 px-1.5">
                          <input
                            ref={(el) => {
                              if (el) amountRefs.current.set(paint.id, el)
                              else amountRefs.current.delete(paint.id)
                            }}
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="done"
                            maxLength={6}
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
                            className="bg-transparent border-b border-transparent focus:border-current text-right font-mono text-[16px] font-semibold focus:outline-none p-0 w-[54px] tabular-nums"
                            placeholder="0.0"
                            style={{ color: 'var(--color-ink, #F4F0E8)' }}
                          />
                          <span className="text-[12px] font-sans opacity-55">{dict.ml}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStep(paint.id, currentAmount, 1)}
                          disabled={currentAmount >= MAX_MANUAL_ML}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center text-[16px] leading-none font-mono disabled:opacity-25 cursor-pointer"
                          style={{ borderColor: hairline, color: 'var(--color-ink, #F4F0E8)' }}
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>

                      <span
                        className="font-mono text-[13px] font-semibold tabular-nums"
                        style={{
                          color: isDragging ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
                          opacity: isDragging ? 1 : 0.65,
                        }}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Защищённый от вертикального скролла трек ползунка */}
                    <div
                      onPointerDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        sliderGestureRef.current = {
                          paintId: paint.id,
                          pointerId: e.pointerId,
                          startX: e.clientX,
                          startY: e.clientY,
                          rectLeft: rect.left,
                          rectWidth: Math.max(1, rect.width),
                          locked: 'none',
                        }
                      }}
                      onPointerMove={(e) => {
                        const g = sliderGestureRef.current
                        if (!g || g.paintId !== paint.id || g.pointerId !== e.pointerId) return
                        if (g.locked === 'vertical') return

                        const dx = e.clientX - g.startX
                        const dy = e.clientY - g.startY
                        if (g.locked === 'none') {
                          if (Math.hypot(dx, dy) < 7) return
                          if (Math.abs(dy) > Math.abs(dx) * 1.15) {
                            g.locked = 'vertical'
                            return
                          }
                          g.locked = 'horizontal'
                          try {
                            e.currentTarget.setPointerCapture(e.pointerId)
                          } catch {
                            // ignore
                          }
                          setDraggingId(paint.id)
                        }

                        const pos = Math.max(
                          0,
                          Math.min(1000, ((e.clientX - g.rectLeft) / g.rectWidth) * 1000)
                        )
                        handleSliderChange(paint.id, pos)
                      }}
                      onPointerUp={(e) => {
                        const g = sliderGestureRef.current
                        if (g && g.paintId === paint.id && g.pointerId === e.pointerId) {
                          if (g.locked === 'none') {
                            const pos = Math.max(
                              0,
                              Math.min(1000, ((e.clientX - g.rectLeft) / g.rectWidth) * 1000)
                            )
                            handleSliderChange(paint.id, pos)
                            hapticTap()
                          }
                          sliderGestureRef.current = null
                        }
                        setDraggingId(null)
                      }}
                      onPointerCancel={() => {
                        sliderGestureRef.current = null
                        setDraggingId(null)
                      }}
                      className="relative h-8 flex items-center select-none cursor-pointer"
                      style={{ touchAction: 'pan-y' }}
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, Math.round(currentAmount))}
                      aria-label={`${selectedPigment?.name?.[lang] || paint.pigmentId} ${dict.ml}`}
                    >
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden relative pointer-events-none"
                        style={{ background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${fillPct}%`, background: 'var(--color-accent, #C9A86A)' }}
                        />
                      </div>

                      {SLIDER_TICKS.map((tick) => {
                        const passed = fillPct >= tick.pct - 0.5
                        return (
                          <span
                            key={tick.ml}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full pointer-events-none"
                            style={{
                              left: `${tick.pct}%`,
                              background: passed
                                ? 'var(--color-accent, #C9A86A)'
                                : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 26%, transparent)',
                            }}
                          />
                        )
                      })}

                      <span
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                        style={{
                          left: `${fillPct}%`,
                          width: 20,
                          height: 20,
                          transform: `translate(-50%, -50%) scale(${isDragging ? 1.15 : 1})`,
                          background: 'var(--color-accent, #C9A86A)',
                          border: '2px solid var(--color-surface, #141416)',
                          boxShadow: isDragging
                            ? '0 0 0 5px color-mix(in srgb, var(--color-accent, #C9A86A) 22%, transparent)'
                            : '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                      />
                    </div>

                    <div className="relative h-4 mt-1 text-[11px] font-mono tabular-nums select-none">
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
                            className="absolute top-0 whitespace-nowrap"
                            style={{
                              ...alignStyle,
                              color: isNear ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
                              opacity: isNear ? 1 : 0.45,
                              fontWeight: isNear ? 600 : 400,
                            }}
                          >
                            {tick.label}
                            {tick.ml === 100 ? ` ${dict.ml}` : ''}
                          </span>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 text-[12px]">
                      <button
                        type="button"
                        onClick={onOpenGuide}
                        className="opacity-65 truncate min-w-0 flex-1 text-left bg-transparent border-none p-0 text-inherit cursor-pointer"
                        title={dict.opacityDesc[lore.opacity]}
                      >
                        <span className="underline decoration-dotted underline-offset-4">
                          {dict.opacityLabels[lore.opacity]}
                        </span>
                        {' · '}
                        <span>{lore.whereToBuy.leatherBrands[0]}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectPigment(paint.pigmentId)}
                        className="shrink-0 font-medium underline underline-offset-4 whitespace-nowrap bg-transparent border-none p-0 cursor-pointer"
                        style={{ color: 'var(--color-accent, #C9A86A)' }}
                      >
                        {dict.pigmentInfoBtn}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div
          className="px-4 sm:px-5 py-4 border-t flex flex-col sm:flex-row gap-2.5"
          style={{ borderColor: hairline }}
        >
          <button
            type="button"
            onClick={onAddPaint}
            disabled={loading || loadError}
            className="flex-1 h-11 rounded-xl text-[13px] font-sans font-medium border disabled:opacity-40 cursor-pointer"
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
              className="flex-1 h-11 rounded-xl text-[13px] font-sans font-semibold disabled:opacity-40 cursor-pointer"
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
