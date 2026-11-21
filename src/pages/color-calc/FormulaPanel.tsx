import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import type { PaintPart } from '../../hooks/usePaintMix'
import type { IlluminantId } from '../../utils/colorScience'
import { getPigmentLore } from '../../data/pigmentLore'
import { PigmentSelector } from '../../components/PigmentSelector'
import type { ColorCalcDict } from './i18n'
import { hapticSelect, hapticTap } from './haptics'

export interface SubstratePreset {
  id: string
  hex: string
  label: { ru: string; uk: string; de: string }
}

export const SUBSTRATE_PRESETS: SubstratePreset[] = [
  { id: 'crust', hex: '#d8c5a8', label: { ru: 'Краст', uk: 'Краст', de: 'Crust' } },
  { id: 'white', hex: '#f2f0eb', label: { ru: 'Белая', uk: 'Біла', de: 'Weiß' } },
  { id: 'cognac', hex: '#8b4513', label: { ru: 'Коньяк', uk: 'Коньяк', de: 'Cognac' } },
  { id: 'espresso', hex: '#3b2314', label: { ru: 'Эспрессо', uk: 'Еспресо', de: 'Espresso' } },
  { id: 'black', hex: '#1c1b1a', label: { ru: 'Чёрная', uk: 'Чорна', de: 'Schwarz' } },
]

export const MAX_ML_INPUT = 1000
const BATCH_PRESETS = [10, 20, 25, 50, 100]

type AmountInputMap = Map<string, HTMLInputElement>

function mlToSliderPos(ml: number): number {
  const v = Math.max(0, Math.min(100, ml))
  if (v <= 5) return (v / 5) * 35
  if (v <= 30) return 35 + ((v - 5) / 25) * 35
  return 70 + ((v - 30) / 70) * 30
}

function sliderPosToMl(pos: number): number {
  const p = Math.max(0, Math.min(100, pos))
  if (p <= 35) {
    return Math.round(((p / 35) * 5) * 10) / 10
  }
  if (p <= 70) {
    const raw = 5 + ((p - 35) / 35) * 25
    return Math.round(raw * 2) / 2
  }
  const raw = 30 + ((p - 70) / 30) * 70
  return Math.round(raw)
}

function formatMl(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '0.0'
  if (val < 10) return (Math.round(val * 10) / 10).toFixed(1)
  if (Math.abs(val - Math.round(val)) < 0.05) return String(Math.round(val))
  return (Math.round(val * 10) / 10).toFixed(1)
}

interface HorizontalIntentSliderProps {
  valueMl: number
  accentHex: string
  onChangeMl: (nextMl: number) => void
}

function HorizontalIntentSlider({
  valueMl,
  accentHex,
  onChangeMl,
}: HorizontalIntentSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    mode: 'pending' | 'horizontal' | 'vertical'
  } | null>(null)
  const lastEmittedRef = useRef<number>(valueMl)

  const posPct = mlToSliderPos(valueMl)

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const pct = ((clientX - rect.left) / rect.width) * 100
      const nextMl = sliderPosToMl(pct)
      if (nextMl !== lastEmittedRef.current) {
        lastEmittedRef.current = nextMl
        onChangeMl(nextMl)
      }
    },
    [onChangeMl]
  )

  return (
    <div
      ref={trackRef}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        lastEmittedRef.current = valueMl
        dragStateRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          mode: e.pointerType === 'mouse' ? 'horizontal' : 'pending',
        }
        if (e.pointerType === 'mouse') {
          e.currentTarget.setPointerCapture(e.pointerId)
          updateFromClientX(e.clientX)
        }
      }}
      onPointerMove={(e) => {
        const st = dragStateRef.current
        if (!st || st.pointerId !== e.pointerId) return
        if (st.mode === 'vertical') return

        if (st.mode === 'pending') {
          const dx = Math.abs(e.clientX - st.startX)
          const dy = Math.abs(e.clientY - st.startY)
          if (dx < 7 && dy < 7) return
          if (dy > dx) {
            st.mode = 'vertical'
            return
          }
          st.mode = 'horizontal'
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }

        if (st.mode === 'horizontal') {
          updateFromClientX(e.clientX)
        }
      }}
      onPointerUp={(e) => {
        const st = dragStateRef.current
        if (!st || st.pointerId !== e.pointerId) return
        if (st.mode === 'pending') {
          const dx = Math.abs(e.clientX - st.startX)
          const dy = Math.abs(e.clientY - st.startY)
          if (dx < 6 && dy < 6) {
            updateFromClientX(e.clientX)
            hapticTap()
          }
        }
        dragStateRef.current = null
      }}
      onPointerCancel={() => {
        dragStateRef.current = null
      }}
      className="relative h-8 flex items-center cursor-pointer select-none"
    >
      <div className="w-full h-1.5 rounded-full bg-[#e8e3da] dark:bg-white/12 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${posPct}%`,
            backgroundColor: '#9a723c',
          }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white dark:border-[#141413] shadow-sm pointer-events-none"
        style={{
          left: `${posPct}%`,
          backgroundColor: accentHex || '#9a723c',
          boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
        }}
      />
    </div>
  )
}

interface FormulaPanelProps {
  lang: Lang
  dict: ColorCalcDict
  pigments: Pigment[]
  paints: PaintPart[]
  amountRefs: MutableRefObject<AmountInputMap>
  totalAmount: number
  displayHex: string
  displayLab: { l: number; a: number; b: number } | null
  coatHexes: string[]
  isWet: boolean
  setIsWet: (v: boolean) => void
  illuminant: IlluminantId
  setIlluminant: (v: IlluminantId) => void
  coats: number
  setCoats: (v: number) => void
  substrateId: string
  substrateHex: string
  substrateDisplayHex?: string
  onSelectSubstrate: (id: string, hex: string) => void
  targetHex: string | null
  deltaE: number | null
  onClearTarget: () => void
  copied: boolean
  onCopyRecipe: () => void
  onScaleVolume: (targetMl: number) => void
  onAddPaint: () => void
  onRemovePaint: (id: string) => void
  onUpdatePaint: (id: string, field: keyof PaintPart, value: string) => void
  onResetFormula: () => void
  onInspectPigment: (pigmentId: string) => void
  onOpenGuide: (tab?: 'science' | 'guide') => void
  isLoadingPigments: boolean
}

export function FormulaPanel({
  lang,
  dict,
  pigments,
  paints,
  amountRefs,
  totalAmount,
  displayHex,
  displayLab,
  coatHexes,
  isWet,
  setIsWet,
  illuminant,
  setIlluminant,
  coats,
  setCoats,
  substrateId,
  substrateHex,
  substrateDisplayHex,
  onSelectSubstrate,
  targetHex,
  deltaE,
  onClearTarget,
  copied,
  onCopyRecipe,
  onScaleVolume,
  onAddPaint,
  onRemovePaint,
  onUpdatePaint,
  onResetFormula,
  onInspectPigment,
  onOpenGuide,
  isLoadingPigments,
}: FormulaPanelProps) {
  const [splitPct, setSplitPct] = useState(50)
  const [showFloatingSwatch, setShowFloatingSwatch] = useState(false)
  const [customBatchMl, setCustomBatchMl] = useState('')
  const stageRef = useRef<HTMLDivElement | null>(null)
  const customSubInputRef = useRef<HTMLInputElement | null>(null)

  const hasMix = totalAmount > 0 && Boolean(displayHex)
  const leftHex = targetHex || substrateDisplayHex || substrateHex
  const rightHex = hasMix ? displayHex : '#1b1a18'

  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        setShowFloatingSwatch(!entry.isIntersecting && entry.boundingClientRect.top < 40)
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const illuminantList: { id: IlluminantId; label: string; badge: string }[] = [
    { id: 'D65', label: dict.illumD65, badge: 'D65 · 6500K' },
    { id: 'A', label: dict.illumA, badge: 'Бутик · 2856K' },
    { id: 'cool', label: dict.illumCool, badge: 'Студия · 4200K' },
    { id: 'twilight', label: dict.illumTwilight, badge: 'Сумерки · 9000K' },
  ]
  const activeIllum =
    illuminantList.find((x) => x.id === illuminant) || illuminantList[0]

  const coatLabels =
    lang === 'uk'
      ? ['1 шар', '2 шари', '3 шари', 'Повн. ∞']
      : lang === 'de'
        ? ['1 Schicht', '2 Sch.', '3 Sch.', 'Voll ∞']
        : ['1 слой', '2 слоя', '3 слоя', 'Полн. ∞']

  const uiCopy =
    lang === 'uk'
      ? {
          scienceBtn: 'Методика',
          guideBtn: 'Шпаргалка',
          resetBtn: 'Скинути',
          copyRecipeBtn: 'Скопіювати · Рецепт',
          copiedBtn: 'Скопійовано',
          batchTitle: 'Об’єм партії (до 1000 мл)',
          leatherBefore: 'Шкіра до',
          targetLabel: 'Еталон',
          customLeather: '+ Своя',
          recipeShort: 'Рецепт',
          unmixed: 'Зразок · UNMIXED',
        }
      : lang === 'de'
        ? {
            scienceBtn: 'Methodik',
            guideBtn: 'Leitfaden',
            resetBtn: 'Zurücksetzen',
            copyRecipeBtn: 'Rezept kopieren',
            copiedBtn: 'Kopiert',
            batchTitle: 'Chargenmenge (bis 1000 ml)',
            leatherBefore: 'Leder vorher',
            targetLabel: 'Referenz',
            customLeather: '+ Eigene',
            recipeShort: 'Rezept',
            unmixed: 'Probe · UNMIXED',
          }
        : {
            scienceBtn: 'Методика',
            guideBtn: 'Шпаргалка',
            resetBtn: 'Сбросить',
            copyRecipeBtn: 'Скопировать · Рецепт',
            copiedBtn: 'Скопировано',
            batchTitle: 'Объём партии (до 1000 мл)',
            leatherBefore: 'Кожа до',
            targetLabel: 'Эталон',
            customLeather: '+ Своя',
            recipeShort: 'Рецепт',
            unmixed: 'Образец · UNMIXED',
          }

  const deltaVerdict =
    deltaE === null
      ? null
      : deltaE <= 2
        ? {
            text:
              lang === 'uk'
                ? 'Еталонний допуск Haute Couture (ΔE ≤ 2.0)'
                : lang === 'de'
                  ? 'Haute-Couture-Referenz (ΔE ≤ 2.0)'
                  : 'Эталонный допуск Haute Couture (ΔE ≤ 2.0)',
            cls: 'text-emerald-700 dark:text-emerald-400',
          }
        : deltaE <= 5
          ? {
              text:
                lang === 'uk'
                  ? 'Комерційний допуск (ΔE 2.0 – 5.0)'
                  : lang === 'de'
                    ? 'Kommerzielle Toleranz (ΔE 2.0 – 5.0)'
                    : 'Коммерческий допуск (ΔE 2.0 – 5.0)',
              cls: 'text-amber-700 dark:text-amber-400',
            }
          : {
              text:
                lang === 'uk'
                  ? 'Потрібне коригування тону (ΔE > 5.0)'
                  : lang === 'de'
                    ? 'Tonkorrektur erforderlich (ΔE > 5.0)'
                    : 'Требуется корректировка тона (ΔE > 5.0)',
              cls: 'text-rose-700 dark:text-rose-400',
            }

  const clampAmountInput = (raw: string): string => {
    if (raw === '') return ''
    const cleaned = raw.replace(',', '.')
    const num = parseFloat(cleaned)
    if (isNaN(num) || num < 0) return ''
    if (num > MAX_ML_INPUT) return String(MAX_ML_INPUT)
    return cleaned
  }

  const applyCustomBatch = () => {
    const val = parseFloat(customBatchMl.replace(',', '.'))
    if (isNaN(val) || val <= 0) return
    const clamped = Math.min(MAX_ML_INPUT, Math.max(1, val))
    hapticSelect()
    onScaleVolume(clamped)
    setCustomBatchMl('')
  }

  return (
    <div className="space-y-4">
      {/* Fixed Floating Live Swatch Bar */}
      {showFloatingSwatch && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[680px] rounded-2xl border border-[#141413]/14 dark:border-white/15 bg-[#faf8f4] dark:bg-[#191816] shadow-lg px-3 py-2 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl border border-[#141413]/15 dark:border-white/15 shrink-0"
              style={{ backgroundColor: rightHex }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[14px] font-semibold text-[#141413] dark:text-[#f5f3ee]">
                  {hasMix ? displayHex.toUpperCase() : '#------'}
                </span>
                {deltaE !== null && hasMix && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#141413] text-[#faf8f4] dark:bg-white/15 font-mono text-[10.5px] font-semibold">
                    ΔE {deltaE.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#736f68] dark:text-[#9a968e] truncate">
                {coatLabels[coats - 1]} · {formatMl(totalAmount)} мл
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!hasMix}
            onClick={onCopyRecipe}
            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors shrink-0 ${
              hasMix
                ? 'border-[#9a723c]/35 bg-[#f3ece0] dark:bg-[#9a723c]/20 text-[#6e4f24] dark:text-[#e6c48f]'
                : 'border-[#141413]/8 text-[#a39f97] opacity-50'
            }`}
          >
            {copied ? uiCopy.copiedBtn : uiCopy.recipeShort}
          </button>
        </div>
      )}

      {/* Swatch Stage Card */}
      <div className="rounded-2xl border border-[#141413]/10 dark:border-white/10 bg-white dark:bg-[#141413] p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#736f68] dark:text-[#9a968e]">
              {dict.swatchCardTitle}
            </span>
            <button
              type="button"
              onClick={() => {
                hapticTap()
                onOpenGuide('science')
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#9a723c]/30 bg-[#9a723c]/8 text-[11px] font-medium text-[#8a632f] dark:text-[#d9b57d]"
            >
              <span>ⓘ</span>
              <span>{uiCopy.scienceBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                hapticTap()
                onOpenGuide('guide')
              }}
              className="text-[11.5px] font-medium text-[#736f68] dark:text-[#9a968e] underline underline-offset-4 decoration-[#141413]/20 dark:decoration-white/20"
            >
              {uiCopy.guideBtn}
            </button>
          </div>

          {targetHex && (
            <button
              type="button"
              onClick={() => {
                hapticTap()
                onClearTarget()
              }}
              className="text-[11.5px] font-medium text-rose-700 dark:text-rose-400"
            >
              ✕ {dict.clearTarget}
            </button>
          )}
        </div>

        {/* Dry / Wet 2-segment toggle */}
        <div className="inline-flex rounded-xl bg-[#f3f0ea] dark:bg-white/[0.06] p-1 border border-[#141413]/8 dark:border-white/10 mb-3">
          <button
            type="button"
            onClick={() => {
              hapticSelect()
              setIsWet(false)
            }}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
              !isWet
                ? 'bg-[#141413] text-[#faf8f4] dark:bg-[#f5f3ee] dark:text-[#141413]'
                : 'text-[#6c6861] dark:text-[#9a968e]'
            }`}
          >
            {dict.dry}
          </button>
          <button
            type="button"
            onClick={() => {
              hapticSelect()
              setIsWet(true)
            }}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
              isWet
                ? 'bg-[#141413] text-[#faf8f4] dark:bg-[#f5f3ee] dark:text-[#141413]'
                : 'text-[#6c6861] dark:text-[#9a968e]'
            }`}
          >
            {dict.wet}
          </button>
        </div>

        {/* Interactive Leather Split Swatch (zero feTurbulence / zero backdrop-blur) */}
        <div
          ref={stageRef}
          style={{ touchAction: 'pan-y' }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return
            const rect = e.currentTarget.getBoundingClientRect()
            if (rect.width <= 0) return
            const pct = ((e.clientX - rect.left) / rect.width) * 100
            setSplitPct(Math.max(12, Math.min(88, pct)))
          }}
          className="relative h-48 sm:h-52 rounded-2xl overflow-hidden border border-[#141413]/12 dark:border-white/12 select-none"
        >
          {/* Right (Mixed Paint) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: rightHex,
              backgroundImage: isWet
                ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 38%, rgba(0,0,0,0.14) 100%)'
                : 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: isWet ? '100% 100%' : '6px 6px',
            }}
          />

          {/* Left (Substrate Before or Target Reference) */}
          {(hasMix || targetHex) && (
            <div
              className="absolute inset-y-0 left-0 border-r border-white/60"
              style={{
                width: `${splitPct}%`,
                backgroundColor: leftHex,
                backgroundImage:
                  'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
                backgroundSize: '6px 6px',
              }}
            />
          )}

          {/* Split Handle */}
          {(hasMix || targetHex) && (
            <div
              style={{ left: `${splitPct}%` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return
                const parent = stageRef.current
                if (!parent) return
                const rect = parent.getBoundingClientRect()
                if (rect.width <= 0) return
                const pct = ((e.clientX - rect.left) / rect.width) * 100
                setSplitPct(Math.max(12, Math.min(88, pct)))
              }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#141413]/85 text-white border border-white/50 flex items-center justify-center text-[11px] font-bold cursor-ew-resize shadow"
            >
              ‹›
            </div>
          )}

          {/* Top Left Illuminant Pill */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#141413]/75 text-[#faf8f4] font-mono text-[11px]">
            {activeIllum.badge}
          </div>

          {/* Top Right DeltaE Pill */}
          {deltaE !== null && hasMix && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#141413]/80 font-mono text-[11.5px] font-semibold text-emerald-300">
              ΔE₀₀ {deltaE.toFixed(1)}
            </div>
          )}

          {/* Bottom Left Label */}
          {(hasMix || targetHex) && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[#141413]/70 text-[#faf8f4] text-[11px] font-medium">
              {targetHex
                ? `${uiCopy.targetLabel} · ${targetHex.toUpperCase()}`
                : uiCopy.leatherBefore}
            </div>
          )}

          {/* Bottom Right Label */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-[#141413]/75 text-[#faf8f4] font-mono text-[11px]">
            {hasMix
              ? `${coatLabels[coats - 1]} · ${displayHex.toUpperCase()}`
              : uiCopy.unmixed}
          </div>
        </div>

        {/* HEX + CIELAB + Copy Recipe Row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-serif text-[28px] leading-none tracking-tight text-[#141413] dark:text-[#f5f3ee]">
                {hasMix ? displayHex.toUpperCase() : '#------'}
              </span>
              {displayLab && hasMix && (
                <span className="font-mono text-[12px] text-[#736f68] dark:text-[#9a968e]">
                  L*{Math.round(displayLab.l)} a*{Math.round(displayLab.a)} b*
                  {Math.round(displayLab.b)}
                </span>
              )}
            </div>
            {deltaVerdict && hasMix && (
              <div className={`text-[12px] font-medium mt-1 ${deltaVerdict.cls}`}>
                {deltaVerdict.text}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!hasMix}
            onClick={onCopyRecipe}
            className={`px-4 py-2.5 rounded-xl text-[12.5px] font-semibold border transition-colors ${
              hasMix
                ? copied
                  ? 'bg-[#8a632f] text-white border-[#8a632f]'
                  : 'border-[#9a723c]/40 bg-[#faf5ec] dark:bg-[#9a723c]/15 text-[#6e4f24] dark:text-[#e6c48f]'
                : 'border-[#141413]/10 text-[#a39f97] opacity-50'
            }`}
          >
            {copied ? uiCopy.copiedBtn : uiCopy.copyRecipeBtn}
          </button>
        </div>

        {/* 4-Column Illuminant Selector */}
        <div className="grid grid-cols-4 gap-1.5 p-1 mt-4 rounded-xl bg-[#f3f0ea] dark:bg-white/[0.05] border border-[#141413]/8 dark:border-white/10">
          {illuminantList.map((il) => {
            const active = illuminant === il.id
            return (
              <button
                key={il.id}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setIlluminant(il.id)
                }}
                className={`py-2 rounded-lg text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-white dark:bg-[#232220] text-[#141413] dark:text-[#f5f3ee] shadow-xs'
                    : 'text-[#6c6861] dark:text-[#9a968e]'
                }`}
              >
                {il.label}
              </button>
            )
          })}
        </div>

        {/* Leather Substrate Selector */}
        <div className="mt-4 pt-3.5 border-t border-[#141413]/8 dark:border-white/8">
          <div className="text-[11.5px] font-medium text-[#736f68] dark:text-[#9a968e] mb-2">
            {dict.substrateTitle}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SUBSTRATE_PRESETS.map((sub) => {
              const active = substrateId === sub.id
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    onSelectSubstrate(sub.id, sub.hex)
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] border transition-colors ${
                    active
                      ? 'border-[#141413] dark:border-[#f5f3ee] bg-[#faf8f4] dark:bg-white/10 text-[#141413] dark:text-[#f5f3ee] font-semibold'
                      : 'border-transparent text-[#57544e] dark:text-[#a8a39a]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-[#141413]/20 dark:border-white/20"
                    style={{ backgroundColor: sub.hex }}
                  />
                  <span>{sub.label[lang]}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => customSubInputRef.current?.click()}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] border ${
                substrateId === 'custom'
                  ? 'border-[#9a723c] text-[#8a632f] font-semibold'
                  : 'border-transparent text-[#8a632f] dark:text-[#d9b57d]'
              }`}
            >
              {uiCopy.customLeather}
            </button>
            <input
              ref={customSubInputRef}
              type="color"
              value={substrateHex}
              onChange={(e) => onSelectSubstrate('custom', e.target.value)}
              className="sr-only"
            />
          </div>
        </div>

        {/* 4-Coat Thickness Strip */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[1, 2, 3, 4].map((c, idx) => {
            const active = coats === c
            const barColor = coatHexes[idx] || displayHex || '#c9c2b6'
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  hapticSelect()
                  setCoats(c)
                }}
                className={`rounded-xl px-2 py-2.5 border text-center transition-colors ${
                  active
                    ? 'border-[#9a723c] bg-[#faf4e8] dark:bg-[#9a723c]/15 text-[#141413] dark:text-[#f5f3ee] font-semibold'
                    : 'border-[#141413]/10 dark:border-white/10 bg-[#faf8f4] dark:bg-white/[0.03] text-[#6c6861] dark:text-[#9a968e]'
                }`}
              >
                <div
                  className="h-1.5 w-8 mx-auto rounded-full mb-1.5 border border-[#141413]/10"
                  style={{ backgroundColor: barColor }}
                />
                <div className="text-[11.5px] whitespace-nowrap">
                  {coatLabels[idx]}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Proportions & Batch Card */}
      <div className="rounded-2xl border border-[#141413]/10 dark:border-white/10 bg-white dark:bg-[#141413] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#141413]/8 dark:border-white/8">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full border border-[#141413]/15 shrink-0"
              style={{ backgroundColor: rightHex }}
            />
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#141413] dark:text-[#f5f3ee] truncate">
              {dict.proportionsTitle}
            </h3>
            {hasMix && (
              <span className="font-mono text-[12px] font-semibold text-[#736f68] dark:text-[#9a968e] shrink-0">
                · {formatMl(totalAmount)} мл
              </span>
            )}
          </div>

          {(hasMix || targetHex) && (
            <button
              type="button"
              onClick={onResetFormula}
              className="text-[12px] font-medium text-rose-700 dark:text-rose-400 shrink-0"
            >
              {uiCopy.resetBtn}
            </button>
          )}
        </div>

        {/* Batch Volume Scaler */}
        {hasMix && (
          <div className="mt-3.5 pb-3.5 border-b border-[#141413]/8 dark:border-white/8">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[12px] text-[#736f68] dark:text-[#9a968e]">
                {uiCopy.batchTitle}
              </span>
              <button
                type="button"
                onClick={onCopyRecipe}
                className="text-[12px] font-semibold text-[#8a632f] dark:text-[#d9b57d]"
              >
                {copied ? uiCopy.copiedBtn : dict.copyRecipe}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {BATCH_PRESETS.map((vol) => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => {
                    hapticSelect()
                    onScaleVolume(vol)
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#141413]/12 dark:border-white/12 bg-[#faf8f4] dark:bg-white/[0.04] font-mono text-[12px] font-medium text-[#141413] dark:text-[#f5f3ee]"
                >
                  {vol}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={MAX_ML_INPUT}
                  value={customBatchMl}
                  onChange={(e) => setCustomBatchMl(clampAmountInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustomBatch()
                  }}
                  placeholder="1–1000"
                  className="w-20 px-2 py-1.5 rounded-lg border border-[#141413]/12 dark:border-white/12 bg-[#faf8f4] dark:bg-white/[0.04] font-mono text-[12px] text-center text-[#141413] dark:text-[#f5f3ee]"
                />
                <button
                  type="button"
                  onClick={applyCustomBatch}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141413]/10 dark:bg-white/10 text-[12px] font-semibold text-[#141413] dark:text-[#f5f3ee]"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paint Component Rows */}
        {isLoadingPigments ? (
          <div className="py-10 text-center text-[13px] text-[#736f68]">
            {dict.loadingArchive}
          </div>
        ) : (
          <div className="divide-y divide-[#141413]/8 dark:divide-white/8 mt-2">
            {paints.map((paint, index) => {
              const pigment = pigments.find((p) => p.id === paint.pigmentId)
              const lore = getPigmentLore(pigment, lang)
              const val = parseFloat(paint.amount) || 0
              const pct = totalAmount > 0 ? Math.round((val / totalAmount) * 100) : 0

              const stepAmount = (delta: number) => {
                const next = Math.max(
                  0,
                  Math.min(MAX_ML_INPUT, Math.round((val + delta) * 10) / 10)
                )
                hapticTap()
                onUpdatePaint(paint.id, 'amount', next === 0 ? '' : String(next))
              }

              return (
                <div key={paint.id} className="py-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11.5px] text-[#8a857d] w-5 shrink-0">
                      {String(index + 1).padStart(2, '0')}
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
                    {paints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          hapticTap()
                          onRemovePaint(paint.id)
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#736f68] dark:text-[#9a968e] hover:text-rose-600"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Stepper + Input + % */}
                  <div className="flex items-center justify-between gap-2 pl-7">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => stepAmount(val > 10 ? -1 : -0.5)}
                        className="w-8 h-8 rounded-lg bg-[#f3f0ea] dark:bg-white/[0.06] text-[15px] font-semibold text-[#141413] dark:text-[#f5f3ee]"
                      >
                        −
                      </button>
                      <div className="flex items-baseline gap-1">
                        <input
                          ref={(el) => {
                            if (el) amountRefs.current.set(paint.id, el)
                            else amountRefs.current.delete(paint.id)
                          }}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={MAX_ML_INPUT}
                          step="0.1"
                          value={paint.amount}
                          onChange={(e) =>
                            onUpdatePaint(
                              paint.id,
                              'amount',
                              clampAmountInput(e.target.value)
                            )
                          }
                          placeholder="0.0"
                          className="w-16 text-center font-mono text-[15px] font-semibold bg-transparent text-[#141413] dark:text-[#f5f3ee] focus:outline-none border-b border-transparent focus:border-[#9a723c]"
                        />
                        <span className="text-[12px] text-[#736f68]">мл</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => stepAmount(val >= 10 ? 1 : 0.5)}
                        className="w-8 h-8 rounded-lg bg-[#f3f0ea] dark:bg-white/[0.06] text-[15px] font-semibold text-[#141413] dark:text-[#f5f3ee]"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono text-[12.5px] font-semibold text-[#736f68] dark:text-[#9a968e]">
                      {pct}%
                    </span>
                  </div>

                  {/* Scroll-Safe Piecewise Slider */}
                  <div className="pl-7">
                    <HorizontalIntentSlider
                      valueMl={val}
                      accentHex={pigment?.hex || '#9a723c'}
                      onChangeMl={(nextMl) =>
                        onUpdatePaint(
                          paint.id,
                          'amount',
                          nextMl === 0 ? '' : String(nextMl)
                        )
                      }
                    />
                    <div className="flex justify-between font-mono text-[10px] text-[#8a857d] -mt-1">
                      <span>0</span>
                      <span>5</span>
                      <span>30</span>
                      <span>100 мл</span>
                    </div>
                  </div>

                  {/* Lore + Passport Row */}
                  <div className="flex items-center justify-between gap-2 pl-7 text-[11.5px] text-[#736f68] dark:text-[#9a968e]">
                    <span className="truncate">
                      {lore.opacity}
                      {lore.brandAnalogue ? ` · ${lore.brandAnalogue}` : ''}
                    </span>
                    {pigment && (
                      <button
                        type="button"
                        onClick={() => {
                          hapticTap()
                          onInspectPigment(pigment.id)
                        }}
                        className="shrink-0 font-medium text-[#8a632f] dark:text-[#d9b57d] underline underline-offset-4 decoration-[#9a723c]/35"
                      >
                        {dict.passportBtn}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            hapticTap()
            onAddPaint()
          }}
          className="mt-3 w-full py-3 rounded-xl border border-dashed border-[#141413]/20 dark:border-white/20 text-[13px] font-medium text-[#4f4c46] dark:text-[#c7c2b8] hover:border-[#9a723c]"
        >
          + {dict.addComponent}
        </button>
      </div>
    </div>
  )
}
