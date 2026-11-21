import { useRef, useState, type MutableRefObject } from 'react'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { getPigmentLore } from '../../data/pigmentLore'
import type { PaintPart } from '../../hooks/usePaintMix'
import type { IlluminantType } from '../../utils/colorScience'
import { PigmentSelector } from '../../components/PigmentSelector'
import { SpectralSparkline } from './SpectralChart'
import type { ColorCalcDict } from './i18n'
import { SUBSTRATE_PRESETS, type SubstratePresetId } from './substrate'
import { hapticSelect, hapticTap } from './haptics'

export interface LayerSwatchItem {
  short: string
  label: string
  hex: string
}

type AmountInputMap = Map<string, HTMLInputElement>
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

const SUBSTRATE_TITLES: Record<Lang, { title: string; custom: string }> = {
  ru: { title: 'Исходная кожа (подложка)', custom: 'Своя' },
  uk: { title: 'Вихідна шкіра (підкладка)', custom: 'Своя' },
  de: { title: 'Grundleder (Untergrund)', custom: 'Eigene' },
}

const MAX_MANUAL_ML = 1000
const SLIDER_TICKS = [
  { ml: 0, pct: 0, label: '0' },
  { ml: 5, pct: 35, label: '5' },
  { ml: 30, pct: 70, label: '30' },
  { ml: 100, pct: 100, label: '100' },
] as const

/** Перевод мл (0..100+) в позицию ползунка (0..1000) по кусочно-точной шкале */
function mlToSliderPos(ml: number): number {
  if (!Number.isFinite(ml) || ml <= 0) return 0
  if (ml <= 5) return Math.round((ml / 5) * 350)
  if (ml <= 30) return Math.round(350 + ((ml - 5) / 25) * 350)
  if (ml <= 100) return Math.round(700 + ((ml - 30) / 70) * 300)
  return 1000
}

/** Перевод позиции ползунка (0..1000) в мл с удобным округлением шага */
function sliderPosToMl(pos: number): number {
  if (!Number.isFinite(pos) || pos <= 0) return 0
  if (pos <= 350) {
    const raw = (pos / 350) * 5
    return Math.round(raw * 10) / 10 // шаг 0.1 мл
  }
  if (pos <= 700) {
    const raw = 5 + ((pos - 350) / 350) * 25
    return Math.round(raw * 2) / 2 // шаг 0.5 мл
  }
  const raw = 30 + ((pos - 700) / 300) * 70
  return Math.round(raw) // шаг 1 мл
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
  const rounded = Math.round(ml * 10) / 10
  return String(rounded)
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
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const lastTickTimeRef = useRef<number>(0)
  const lastValueMapRef = useRef>(new Map())

  const activeCoat = layerSwatches ? layerSwatches[selectedCoatIdx] || layerSwatches[3] : null
  const squareColor = displayHex || '#1E1B19'
  const activeIllInfo = dict.illuminants[illuminant]
  const subText = SUBSTRATE_TITLES[lang] || SUBSTRATE_TITLES.ru

  const handleSliderChange = (paintId: string, rawPos: number) => {
    const nextMl = sliderPosToMl(rawPos)
    const prevMl = lastValueMapRef.current.get(paintId) ?? -1

    if (nextMl !== prevMl) {
      lastValueMapRef.current.set(paintId, nextMl)
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
        hapticTap('medium')
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
    lastValueMapRef.current.set(paintId, nextMl)
    onUpdatePaint(paintId, 'amount', formatMlValue(nextMl))
    hapticTap('light')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* КАРТА ОТТЕНКА */}
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
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-sans uppercase tracking-[0.16em] opacity-75 font-semibold">
              {dict.result}
            </span>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-[11px] font-sans underline cursor-pointer bg-transparent border-none p-0"
              style={{ color: 'var(--color-accent, #C9A86A)' }}
            >
              ⓘ {dict.guideBtn}
            </button>
            {activeTarget && (
              <button
                type="button"
                onClick={onClearTarget}
                className="text-[10px] font-sans uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full border cursor-pointer"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-danger, #f87171) 45%, transparent)',
                  color: 'var(--color-danger, #f87171)',
                }}
              >
                ✕ {dict.reset}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleWet}
            className="text-[10.5px] font-sans tracking-[0.08em] uppercase font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer"
            style={{
              borderColor: isWet
                ? 'var(--color-accent, #C9A86A)'
                : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 16%, transparent)',
              color: isWet ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
              background: isWet
                ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 14%, transparent)'
                : 'transparent',
            }}
          >
            {isWet ? dict.wet : dict.dry}
          </button>
        </div>

        <div
          className="px-4 py-2 text-[11.5px] font-sans opacity-70 border-b"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
            background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 2%, transparent)',
          }}
        >
          {isWet ? dict.wetExplain : dict.dryExplain}
        </div>

        {/* Поле выкраски */}
        <div className="p-3">
          <div className="relative w-full flex overflow-hidden rounded-2xl" style={{ height: 152 }}>
            {activeTarget && (
              <div
                className="w-1/2 h-full relative flex flex-col justify-end p-3 border-r"
                style={{
                  backgroundColor: activeTarget,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <span
                  className="inline-block w-fit px-2.5 py-0.5 rounded-full text-[9.5px] uppercase tracking-[0.14em] font-mono text-white"
                  style={{ backgroundColor: 'rgba(0,0,0,0.54)' }}
                >
                  {dict.target} · {activeTarget}
                </span>
              </div>
            )}

            <div
              className="flex-1 h-full relative flex flex-col justify-between p-3 transition-colors duration-200"
              style={{ backgroundColor: squareColor }}
            >
              {isWet ? (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 38%, rgba(0,0,0,0.08) 100%)',
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 pointer-events-none opacity-15"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 0)',
                    backgroundSize: '6px 6px',
                  }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between w-full gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono uppercase tracking-[0.1em] text-white"
                  style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}
                >
                  {activeIllInfo.short} · {activeIllInfo.temp}
                </span>

                {liveDeltaE !== null && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-[0.06em]"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.68)',
                      color: liveDeltaE <= 2 ? '#4ade80' : liveDeltaE <= 5 ? '#facc15' : '#f87171',
                    }}
                  >
                    ΔE₀₀ {liveDeltaE.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="relative z-10 flex items-end justify-between w-full">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[9.5px] uppercase tracking-[0.14em] font-mono text-white"
                  style={{ backgroundColor: 'rgba(0,0,0,0.54)' }}
                >
                  {dict.mix} {activeCoat ? `(${activeCoat.label})` : ''} · {displayHex || 'UNMIXED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Переключатель освещения (метамеризм) */}
        <div
          className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-t"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <span className="text-[10px] font-sans uppercase tracking-[0.14em] opacity-60 font-semibold">
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

        {/* Выбор подложки (исходной кожи) + 4 слоя нанесения */}
        {layerSwatches && (
          <div
            className="px-3.5 py-3 border-t flex flex-col gap-2.5"
            style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
          >
            {/* Подложка: 5 базовых кож + своя */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-sans uppercase tracking-[0.14em] opacity-60 font-semibold px-0.5">
                {subText.title}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
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

                {/* Своя кожа (нативный выбор цвета) */}
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
                  <span>+ {subText.custom}</span>
                  <input
                    type="color"
                    value={customSubstrateHex}
                    onChange={(e) => onCustomSubstrateChange(e.target.value.toUpperCase())}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    aria-label={subText.custom}
                  />
                </label>
              </div>
            </div>

            {/* 4 слоя нанесения */}
            <div className="grid grid-cols-4 gap-1.5">
              {layerSwatches.map((ls, idx) => {
                const isSelectedCoat = selectedCoatIdx === idx
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
                      className="text-[9.5px] font-sans truncate"
                      style={{
                        fontWeight: isSelectedCoat ? 600 : 500,
                        opacity: isSelectedCoat ? 1 : 0.72,
                        color: 'var(--color-ink, #F4F0E8)',
                      }}
                    >
                      {ls.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="px-0.5 text-[11px] font-sans opacity-70">
              {dict.coatExplanations[selectedCoatIdx]}
            </div>
          </div>
        )}

        {/* Технический подвал HEX / CIELAB / Объём */}
        <div
          className="p-4 flex flex-wrap items-center justify-between gap-3 border-t"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-sans uppercase tracking-[0.16em] opacity-50">
              HEX / CIELAB {activeCoat ? `· ${activeCoat.label}` : ''}
            </span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="font-serif text-[26px] leading-none tracking-tight tabular-nums">
                {displayHex || '#------'}
              </span>
              {activeLab && (
                <span className="font-mono text-[11px] opacity-60 tabular-nums">
                  L*{activeLab.L.toFixed(0)} a*{activeLab.a.toFixed(0)} b*{activeLab.b.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-[10px] font-sans uppercase tracking-[0.14em] opacity-50">
                {dict.totalVolume}
              </span>
              <span className="font-serif text-[20px] leading-tight tabular-nums">
                {totalAmount >= 1000
                  ? `${(totalAmount / 1000).toFixed(2)} ${dict.l}`
                  : `${totalAmount.toFixed(1)} ${dict.ml}`}
              </span>
            </div>

            <button
              type="button"
              onClick={onCopyHex}
              disabled={!displayHex}
              className="h-9 px-4 rounded-full text-[11px] font-sans uppercase tracking-[0.12em] font-semibold border transition-colors disabled:opacity-30 cursor-pointer"
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
            className="px-4 py-2 text-[11.5px] font-sans border-t"
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
        <div
          className="flex items-center justify-between pb-3 mb-3 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block border border-black/20"
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

                    {/* Кастомная анимированная шкала */}
                    <div className="relative h-7 flex items-center select-none touch-none">
                      {/* Фон трека */}
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden relative"
                        style={{
                          background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
                        }}
                      >
                        {/* Заполнение */}
                        <div
                          className="h-full rounded-full transition-[width] duration-75"
                          style={{
                            width: `${fillPct}%`,
                            background: 'var(--color-accent, #C9A86A)',
                          }}
                        />
                      </div>

                      {/* Калибровочные риски на треке */}
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

                      {/* Анимированный бегунок */}
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

                      {/* Прозрачный нативный range поверх для идеального touch-ввода */}
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={1}
                        value={sliderPos}
                        onPointerDown={() => {
                          setDraggingId(paint.id)
                          hapticTap('light')
                        }}
                        onPointerUp={() => setDraggingId(null)}
                        onPointerCancel={() => setDraggingId(null)}
                        onBlur={() => setDraggingId(null)}
                        onChange={(e) => handleSliderChange(paint.id, Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
                        aria-label={`${selectedPigment?.name?.[lang] || paint.pigmentId} ${dict.ml}`}
                      />
                    </div>

                    {/* Подписи калибровки 0 / 5 / 30 / 100 */}
                    <div className="relative h-3.5 mt-0.5 text-[9.5px] font-mono tabular-nums select-none">
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
                            className="absolute top-0 transition-colors duration-150"
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
