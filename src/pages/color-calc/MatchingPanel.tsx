import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Lang } from '../../App'
import type { Pigment } from '../../data/pigments'
import { getPigmentLore } from '../../data/pigmentLore'
import {
  getPigmentCategory,
  type CoverageSystem,
  type RecipeResult,
} from '../../utils/calculatorLogic'
import { SpectralSparkline } from './SpectralChart'
import type { ColorCalcDict } from './i18n'

interface LeatherPreset {
  hex: string
  label: Record<Lang, string>
}

const LEATHER_PRESETS: LeatherPreset[] = [
  { hex: '#8B4513', label: { ru: 'Коньяк', uk: 'Коньяк', de: 'Cognac' } },
  { hex: '#5C1A1B', label: { ru: 'Оксблад', uk: 'Оксблад', de: 'Oxblood' } },
  { hex: '#3B2314', label: { ru: 'Эспрессо', uk: 'Еспресо', de: 'Espresso' } },
  { hex: '#B87333', label: { ru: 'Тан', uk: 'Тан', de: 'Tan' } },
  { hex: '#1B2A4A', label: { ru: 'Нэви', uk: 'Неві', de: 'Navy' } },
  { hex: '#3D4B3A', label: { ru: 'Олива', uk: 'Олива', de: 'Olive' } },
  { hex: '#2B2B2B', label: { ru: 'Графит', uk: 'Графіт', de: 'Graphit' } },
  { hex: '#D6C7B2', label: { ru: 'Краст', uk: 'Краст', de: 'Natur' } },
]

interface MatchingPanelProps {
  lang: Lang
  dict: ColorCalcDict
  pigments: Pigment[]
  loading: boolean
  targetHex: string
  onTargetHexChange: (hex: string) => void
  maxComponents: 3 | 4
  onMaxComponentsChange: (n: 3 | 4) => void
  system: CoverageSystem
  onSystemChange: (sys: CoverageSystem) => void
  inventoryIds: string[]
  onToggleInventory: (id: string) => void
  onResetInventoryDefaults: () => void
  onSelectAllInventory: () => void
  onClearInventory: () => void
  recipeLoading: boolean
  recipeError: string | null
  recipeResult: RecipeResult | null
  onRunRecipeSearch: () => void
  onSendRecipeToMix: () => void
  onInspectPigment: (id: string) => void
}

export function MatchingPanel({
  lang,
  dict,
  pigments,
  loading,
  targetHex,
  onTargetHexChange,
  maxComponents,
  onMaxComponentsChange,
  system,
  onSystemChange,
  inventoryIds,
  onToggleInventory,
  onResetInventoryDefaults,
  onSelectAllInventory,
  onClearInventory,
  recipeLoading,
  recipeError,
  recipeResult,
  onRunRecipeSearch,
  onSendRecipeToMix,
  onInspectPigment,
}: MatchingPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  const pigmentName = (p: Pigment | undefined) => {
    if (!p) return '—'
    if (lang === 'uk') return p.name.uk || p.name.ru
    if (lang === 'de') return p.name.de || p.name.ru
    return p.name.ru
  }

  const selectablePigments = useMemo(
    () => pigments.filter((p) => p.id !== 'acrylic_binder' && p.id !== 'cardboard' && p.spectrum),
    [pigments]
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    selectablePigments.forEach((p) => set.add(getPigmentCategory(p.id, lang)))
    return ['ALL', ...Array.from(set)]
  }, [selectablePigments, lang])

  const filteredInventory = useMemo(() => {
    if (activeCategory === 'ALL') return selectablePigments
    return selectablePigments.filter((p) => getPigmentCategory(p.id, lang) === activeCategory)
  }, [selectablePigments, activeCategory, lang])

  const validColorValue = /^#[0-9A-Fa-f]{6}$/.test(targetHex) ? targetHex : '#8B4513'

  return (
    <div className="flex flex-col gap-4">
      {/* ЦЕЛЕВОЙ ОБРАЗЕЦ */}
      <section
        className="rounded-3xl border p-4"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[11px] font-sans uppercase tracking-[0.18em] font-semibold opacity-80">
            {dict.targetColor}
          </h2>
          <span className="font-mono text-[10px] opacity-45">CIEDE2000 ENGINE</span>
        </div>

        <div className="flex items-stretch gap-3 mb-4">
          <label
            className="relative w-20 h-14 rounded-2xl border shrink-0 cursor-pointer block overflow-hidden"
            style={{
              backgroundColor: validColorValue,
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 18%, transparent)',
            }}
          >
            <input
              type="color"
              value={validColorValue}
              onChange={(e) => onTargetHexChange(e.target.value.toUpperCase())}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label={dict.targetColor}
            />
          </label>

          <input
            type="text"
            value={targetHex}
            onChange={(e) => {
              let v = e.target.value.trim()
              if (!v.startsWith('#')) v = '#' + v
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                onTargetHexChange(v.toUpperCase())
              }
            }}
            className="flex-1 px-4 rounded-2xl font-mono tracking-[0.15em] text-[16px] border focus:outline-none min-w-0"
            style={{
              background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
              color: 'var(--color-ink, #F4F0E8)',
            }}
            placeholder="#RRGGBB"
            maxLength={7}
          />
        </div>

        <div>
          <div className="text-[10px] font-sans uppercase tracking-[0.14em] opacity-50 mb-2">
            {dict.targetPresetsLabel}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEATHER_PRESETS.map((preset) => {
              const active = targetHex.toUpperCase() === preset.hex
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => onTargetHexChange(preset.hex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-sans font-medium border transition-colors cursor-pointer"
                  style={{
                    borderColor: active
                      ? 'var(--color-accent, #C9A86A)'
                      : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
                    background: active
                      ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                      : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                    color: 'var(--color-ink, #F4F0E8)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span>{preset.label[lang]}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ПАРАМЕТРЫ СИНТЕЗА */}
      <section
        className="rounded-3xl border p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div
          className="flex p-1 rounded-full border"
          style={{
            background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
          }}
        >
          {([3, 4] as const).map((num) => {
            const active = maxComponents === num
            return (
              <button
                key={num}
                type="button"
                onClick={() => onMaxComponentsChange(num)}
                className="flex-1 py-2 rounded-full text-[11px] font-sans uppercase tracking-[0.1em] font-semibold transition-colors cursor-pointer"
                style={{
                  background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                  color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                }}
              >
                ≤ {num} {dict.maxPigments}
              </button>
            )
          })}
        </div>

        <div
          className="flex p-1 rounded-full border"
          style={{
            background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
          }}
        >
          {(['acrylic', 'aniline'] as const).map((sys) => {
            const active = system === sys
            return (
              <button
                key={sys}
                type="button"
                onClick={() => onSystemChange(sys)}
                className="flex-1 py-2 rounded-full text-[11px] font-sans uppercase tracking-[0.08em] font-semibold transition-colors cursor-pointer"
                style={{
                  background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                  color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                }}
              >
                {sys === 'acrylic' ? dict.acrylic : dict.aniline}
              </button>
            )
          })}
        </div>
      </section>

      {/* ПАЛИТРА АТЕЛЬЕ */}
      <section
        className="rounded-3xl border p-4"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-[11px] font-sans uppercase tracking-[0.18em] font-semibold opacity-80">
            {dict.inventory} ({inventoryIds.length})
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onResetInventoryDefaults}
              className="text-[10.5px] font-sans font-medium px-2.5 py-1 rounded-full border cursor-pointer"
              style={{ borderColor: 'var(--color-accent, #C9A86A)', color: 'var(--color-accent, #C9A86A)' }}
            >
              {dict.default}
            </button>
            <button
              type="button"
              onClick={onSelectAllInventory}
              className="text-[10.5px] font-sans px-2 py-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              {dict.all}
            </button>
            <button
              type="button"
              onClick={onClearInventory}
              className="text-[11px] px-2 py-1 cursor-pointer"
              style={{ color: 'var(--color-danger, #f87171)' }}
              title={dict.clearInventory}
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className="flex gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1 rounded-full text-[10.5px] font-sans font-medium whitespace-nowrap border transition-colors cursor-pointer"
                style={{
                  borderColor: active
                    ? 'var(--color-ink, #F4F0E8)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
                  background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                  color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                }}
              >
                {cat === 'ALL' ? dict.all : cat}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
          {filteredInventory.map((p) => {
            const on = inventoryIds.includes(p.id)
            return (
              <div
                key={p.id}
                className="flex items-center rounded-full border transition-colors overflow-hidden"
                style={{
                  background: on
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                  borderColor: on
                    ? 'var(--color-accent, #C9A86A)'
                    : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggleInventory(p.id)}
                  className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-[11px] font-sans cursor-pointer"
                  style={{
                    color: on
                      ? 'var(--color-ink, #F4F0E8)'
                      : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 60%, transparent)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: p.hex || '#444' }}
                  />
                  <span>{pigmentName(p)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInspectPigment(p.id)}
                  className="px-2 py-1.5 text-[11px] border-l cursor-pointer"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
                    color: 'var(--color-accent, #C9A86A)',
                  }}
                  title={dict.pigmentInfoBtn}
                >
                  ⓘ
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* КНОПКА СИНТЕЗА */}
      <button
        type="button"
        onClick={onRunRecipeSearch}
        disabled={
          recipeLoading ||
          loading ||
          !/^#[0-9A-Fa-f]{6}$/.test(targetHex) ||
          inventoryIds.length === 0
        }
        className="w-full py-3.5 rounded-full text-[12px] font-sans uppercase tracking-[0.18em] font-semibold transition-opacity disabled:opacity-35 cursor-pointer"
        style={{
          background: 'var(--color-ink, #F4F0E8)',
          color: 'var(--color-bg, #0B0B0C)',
        }}
      >
        {recipeLoading ? dict.picking : dict.pickRecipe}
      </button>

      {recipeError && (
        <p className="text-[12px] text-center" style={{ color: 'var(--color-danger, #f87171)' }}>
          {recipeError}
        </p>
      )}

      {/* РЕЗУЛЬТАТ СИНТЕЗА */}
      <AnimatePresence>
        {recipeResult && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border overflow-hidden"
            style={{
              background: 'var(--color-surface, #141416)',
              borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
            }}
          >
            <div className="p-3 pb-0">
              <div className="grid grid-cols-2 h-28 rounded-2xl overflow-hidden">
                <div className="p-3 flex flex-col justify-between" style={{ backgroundColor: targetHex }}>
                  <span className="text-[9.5px] uppercase tracking-[0.16em] font-mono bg-black/55 text-white px-2.5 py-0.5 rounded-full w-fit">
                    {dict.target}
                  </span>
                  <span className="font-mono text-[11.5px] text-white bg-black/55 px-2.5 py-0.5 rounded-full w-fit">
                    {targetHex}
                  </span>
                </div>
                <div
                  className="p-3 flex flex-col justify-between"
                  style={{ backgroundColor: recipeResult.resultHex || '#333' }}
                >
                  <span className="text-[9.5px] uppercase tracking-[0.16em] font-mono bg-black/55 text-white px-2.5 py-0.5 rounded-full w-fit">
                    {dict.recipe}
                  </span>
                  <span className="font-mono text-[11.5px] text-white bg-black/55 px-2.5 py-0.5 rounded-full w-fit">
                    {(recipeResult.resultHex || '').toUpperCase()} · ΔE₀₀ {recipeResult.deltaE.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div
                className="flex flex-col divide-y mb-4"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
              >
                {recipeResult.recipe.map((item, i) => {
                  const lore = getPigmentLore(item.pigment, lang)
                  return (
                    <div
                      key={`${item.pigment.id}-${i}`}
                      className="py-2.5"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: item.pigment.hex || '#888' }}
                          />
                          <span className="text-[13px] font-sans font-medium truncate">
                            {item.isBinder ? dict.binder : pigmentName(item.pigment)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <SpectralSparkline
                            spectrum={item.pigment.spectrum}
                            strokeColor={item.pigment.hex || '#C9A86A'}
                            width={46}
                            height={18}
                          />
                          <span className="font-mono text-[14px] font-semibold tabular-nums">
                            {item.ml.toFixed(2)} {dict.ml}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pl-6 mt-1 text-[11px]">
                        <span className="opacity-65 truncate">
                          {dict.opacityLabels[lore.opacity]} · {lore.whereToBuy.leatherBrands[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => onInspectPigment(item.pigment.id)}
                          className="font-semibold underline shrink-0 bg-transparent border-none p-0 cursor-pointer"
                          style={{ color: 'var(--color-accent, #C9A86A)' }}
                        >
                          ⓘ {dict.pigmentInfoBtn}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={onSendRecipeToMix}
                className="w-full py-3 rounded-full text-[11.5px] font-sans uppercase tracking-[0.16em] font-semibold border transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--color-accent, #C9A86A)',
                  background: 'color-mix(in srgb, var(--color-accent, #C9A86A) 16%, transparent)',
                  color: 'var(--color-accent, #C9A86A)',
                }}
              >
                {dict.moveToMix}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
