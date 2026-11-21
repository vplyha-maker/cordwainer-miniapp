import type { MutableRefObject } from 'react'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { getPigmentLore } from '../../data/pigmentLore'
import type { PaintPart } from '../../hooks/usePaintMix'
import type { IlluminantType } from '../../utils/colorScience'
import { PigmentSelector } from '../../components/PigmentSelector'
import { SpectralSparkline } from './SpectralChart'
import type { ColorCalcDict } from './i18n'

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
  const activeCoat = layerSwatches ? layerSwatches[selectedCoatIdx] || layerSwatches[3] : null
  const squareColor = displayHex || '#1E1B19'
  const activeIllInfo = dict.illuminants[illuminant]

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

        {/* 4 слоя нанесения */}
        {layerSwatches && (
          <div
            className="px-3 py-2.5 border-t flex flex-col gap-2"
            style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
          >
            <div className="grid grid-cols-4 gap-1.5">
              {layerSwatches.map((ls, idx) => {
                const isSelectedCoat = selectedCoatIdx === idx
                return (
                  <button
                    key={ls.short}
                    type="button"
                    onClick={() => onSelectCoat(idx)}
                    className="flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-2xl border transition-colors cursor-pointer"
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
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: ls.hex,
                        border: '1px solid rgba(0,0,0,0.22)',
                      }}
                    />
                    <span
                      className="text-[10.5px] font-sans whitespace-nowrap"
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

            <div className="px-1 text-[11px] font-sans opacity-70">
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
                {totalAmount > 1000
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
              const sliderMax = Math.max(20, Math.ceil(currentAmount * 1.5))
              const pct = totalAmount > 0 ? Math.round((currentAmount / totalAmount) * 100) : 0
              const selectedPigment = pigments.find((p) => p.id === paint.pigmentId)
              const lore = getPigmentLore(selectedPigment, lang)

              return (
                <div
                  key={paint.id}
                  className="p-3 rounded-2xl border overflow-hidden"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)',
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
                        height={22}
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

                  <div className="flex items-center gap-2.5 pl-[26px] pr-0.5 mt-3 w-full">
                    <input
                      type="range"
                      min="0"
                      max={sliderMax}
                      step="0.1"
                      value={currentAmount}
                      onChange={(e) => onUpdatePaint(paint.id, 'amount', e.target.value)}
                      className="h-1.5 rounded-full appearance-none cursor-pointer flex-1 min-w-0 w-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 16%, transparent)',
                        accentColor: 'var(--color-accent, #C9A86A)',
                      }}
                    />

                    <div className="flex items-baseline gap-1 shrink-0">
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
                            if (!isNaN(num) && num > 5000) val = '5000'
                            onUpdatePaint(paint.id, 'amount', val)
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.replace(',', '.')
                          if (val === '.' || val === '') onUpdatePaint(paint.id, 'amount', '')
                          else {
                            const num = parseFloat(val)
                            if (!isNaN(num)) onUpdatePaint(paint.id, 'amount', String(Math.min(num, 5000)))
                          }
                        }}
                        className="bg-transparent border-b border-transparent focus:border-current text-right font-mono text-[15px] font-semibold focus:outline-none p-0 w-[46px]"
                        placeholder="0.0"
                        style={{ color: 'var(--color-ink, #F4F0E8)' }}
                      />
                      <span className="text-[11px] font-sans opacity-50">{dict.ml}</span>
                    </div>

                    <span className="font-mono text-[11px] opacity-60 text-right tabular-nums w-[32px] shrink-0">
                      {pct}%
                    </span>
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
