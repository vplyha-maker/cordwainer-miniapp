import { useEffect, useMemo, useRef, useState } from 'react'
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
import { hapticSelect, hapticTap } from './haptics'

interface LeatherPreset {
  hex: string
  group: 'classic' | 'accent'
  label: Record<Lang, string>
}

const LEATHER_PRESETS: LeatherPreset[] = [
  // Классическая база
  { hex: '#3E2417', group: 'classic', label: { ru: 'Шоколад', uk: 'Шоколад', de: 'Espresso' } },
  { hex: '#8B4513', group: 'classic', label: { ru: 'Коньяк', uk: 'Коньяк', de: 'Cognac' } },
  { hex: '#B57236', group: 'classic', label: { ru: 'Тан', uk: 'Тан', de: 'Tan' } },
  { hex: '#5A1E22', group: 'classic', label: { ru: 'Оксблад', uk: 'Оксблад', de: 'Oxblood' } },
  { hex: '#1C1B1A', group: 'classic', label: { ru: 'Jet Black', uk: 'Jet Black', de: 'Jet Black' } },
  { hex: '#D6C7B2', group: 'classic', label: { ru: 'Краст', uk: 'Краст', de: 'Natur' } },
  // Сложные и акцентные оттенки
  { hex: '#212D40', group: 'accent', label: { ru: 'Нэви', uk: 'Неві', de: 'Navy' } },
  { hex: '#243A2C', group: 'accent', label: { ru: 'Хвойный', uk: 'Хвойний', de: 'Racing Green' } },
  { hex: '#8C7D6E', group: 'accent', label: { ru: 'Тауп / Минк', uk: 'Тауп / Мінк', de: 'Taupe / Mink' } },
  { hex: '#B68856', group: 'accent', label: { ru: 'Кэмел', uk: 'Кемел', de: 'Camel' } },
  { hex: '#C9B292', group: 'accent', label: { ru: 'Песочный', uk: 'Пісочний', de: 'Sand' } },
  { hex: '#3D4B3A', group: 'accent', label: { ru: 'Олива', uk: 'Олива', de: 'Olive' } },
]

// Физические пределы реальных пигментов для кожи (исключают кислотный RGB-неон)
const MAX_PIGMENT_S = 0.76
const MIN_PIGMENT_V = 0.1
const MAX_PIGMENT_V = 0.94

const MATCH_COPY: Record<
  Lang,
  {
    customColorBtn: string
    hidePickerBtn: string
    classicGroup: string
    accentGroup: string
    gamutNote: string
    hueLabel: string
    paletteSummary: string
    filterBtn: string
    closeFilterBtn: string
    synthShort: string
    applyShort: string
  }
> = {
  ru: {
    customColorBtn: 'Свой цвет',
    hidePickerBtn: 'Скрыть',
    classicGroup: 'Классическая база',
    accentGroup: 'Сложные и акцентные',
    gamutNote: 'Пигментный охват (без компьютерного неона)',
    hueLabel: 'Оттенок',
    paletteSummary: 'Палитра поиска',
    filterBtn: 'Фильтр',
    closeFilterBtn: 'Свернуть',
    synthShort: 'Подобрать',
    applyShort: 'В формулу',
  },
  uk: {
    customColorBtn: 'Свій колір',
    hidePickerBtn: 'Сховати',
    classicGroup: 'Класична база',
    accentGroup: 'Складні та акцентні',
    gamutNote: 'Пігментне охоплення (без компʼютерного неону)',
    hueLabel: 'Відтінок',
    paletteSummary: 'Палітра пошуку',
    filterBtn: 'Фільтр',
    closeFilterBtn: 'Згорнути',
    synthShort: 'Підібрати',
    applyShort: 'У формулу',
  },
  de: {
    customColorBtn: 'Eigene Farbe',
    hidePickerBtn: 'Schließen',
    classicGroup: 'Klassische Basis',
    accentGroup: 'Komplexe Akzenttöne',
    gamutNote: 'Pigment-Farbraum (ohne Computer-Neon)',
    hueLabel: 'Farbton',
    paletteSummary: 'Suchpalette',
    filterBtn: 'Filter',
    closeFilterBtn: 'Schließen',
    synthShort: 'Berechnen',
    applyShort: 'Übernehmen',
  },
}

interface HSV {
  h: number
  s: number
  v: number
}

function clampPigmentHsv(hsv: HSV): HSV {
  return {
    h: ((Math.round(hsv.h) % 360) + 360) % 360,
    s: Math.max(0, Math.min(MAX_PIGMENT_S, hsv.s)),
    v: Math.max(MIN_PIGMENT_V, Math.min(MAX_PIGMENT_V, hsv.v)),
  }
}

function hexToHsv(hex: string): HSV {
  const clean = hex.replace(/^#/, '')
  if (clean.length !== 6) return { h: 25, s: 0.72, v: 0.55 }
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d > 1e-6) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  const s = max > 1e-6 ? d / max : 0
  return { h: Math.round(h) % 360, s, v: max }
}

function hsvToHex(h: number, s: number, v: number): string {
  const clamped = clampPigmentHsv({ h, s, v })
  const safeH = clamped.h
  const safeS = clamped.s
  const safeV = clamped.v
  const c = safeV * safeS
  const x = c * (1 - Math.abs(((safeH / 60) % 2) - 1))
  const m = safeV - c
  let r = 0
  let g = 0
  let b = 0
  if (safeH < 60) {
    r = c; g = x; b = 0
  } else if (safeH < 120) {
    r = x; g = c; b = 0
  } else if (safeH < 180) {
    r = 0; g = c; b = x
  } else if (safeH < 240) {
    r = 0; g = x; b = c
  } else if (safeH < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }
  const toHex = (val: number) =>
    Math.max(0, Math.min(255, Math.round((val + m) * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

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
  onSelectAllInventory,
  onClearInventory,
  recipeLoading,
  recipeError,
  recipeResult,
  onRunRecipeSearch,
  onSendRecipeToMix,
  onInspectPigment,
}: MatchingPanelProps) {
  const copy = MATCH_COPY[lang] || MATCH_COPY.ru
  const validColorValue = /^#[0-9A-Fa-f]{6}$/.test(targetHex) ? targetHex : '#8B4513'
  const hairline = 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)'

  const [pickerOpen, setPickerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('ALL')
  const [hsv, setHsv] = useState<HSV>(() => clampPigmentHsv(hexToHsv(validColorValue)))
  const [draggingSV, setDraggingSV] = useState(false)
  const [showFloatingBar, setShowFloatingBar] = useState(false)

  const svBoxRef = useRef<HTMLDivElement | null>(null)
  const targetSwatchRef = useRef<HTMLDivElement | null>(null)
  const lastHapticRef = useRef<number>(0)

  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(targetHex) && !draggingSV) {
      setHsv(clampPigmentHsv(hexToHsv(targetHex)))
    }
  }, [targetHex, draggingSV])

  useEffect(() => {
    const el = targetSwatchRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setShowFloatingBar(!entry.isIntersecting && entry.boundingClientRect.bottom <= 48)
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fireThrottledTick = () => {
    const now = Date.now()
    if (now - lastHapticRef.current >= 55) {
      hapticSelect()
      lastHapticRef.current = now
    }
  }

  const updateSVFromPointer = (clientX: number, clientY: number) => {
    const rect = svBoxRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const normY = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    const s = normX * MAX_PIGMENT_S
    const v = MIN_PIGMENT_V + normY * (MAX_PIGMENT_V - MIN_PIGMENT_V)
    const next: HSV = { h: hsv.h, s, v }
    setHsv(next)
    onTargetHexChange(hsvToHex(next.h, next.s, next.v))
    fireThrottledTick()
  }

  const updateHue = (nextH: number) => {
    const next: HSV = { h: nextH, s: hsv.s, v: hsv.v }
    setHsv(next)
    onTargetHexChange(hsvToHex(next.h, next.s, next.v))
    fireThrottledTick()
  }

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

  const selectedColorCount = useMemo(
    () => inventoryIds.filter((id) => id !== 'acrylic_binder').length,
    [inventoryIds]
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

  const totalRecipeMl = useMemo(() => {
    if (!recipeResult) return 0
    return recipeResult.recipe.reduce((acc, item) => acc + item.ml, 0)
  }, [recipeResult])

  const classicPresets = LEATHER_PRESETS.filter((p) => p.group === 'classic')
  const accentPresets = LEATHER_PRESETS.filter((p) => p.group === 'accent')

  const pointerX = Math.max(0, Math.min(100, (hsv.s / MAX_PIGMENT_S) * 100))
  const pointerY = Math.max(
    0,
    Math.min(100, (1 - (hsv.v - MIN_PIGMENT_V) / (MAX_PIGMENT_V - MIN_PIGMENT_V)) * 100)
  )

  const hueEdgeHex = hsvToHex(hsv.h, MAX_PIGMENT_S, MAX_PIGMENT_V)
  const neutralLightHex = hsvToHex(hsv.h, 0, MAX_PIGMENT_V)
  const deepDarkHex = hsvToHex(hsv.h, MAX_PIGMENT_S * 0.4, MIN_PIGMENT_V)

  const renderPresetRow = (title: string, list: LeatherPreset[]) => (
    <div className="space-y-1.5">
      <div className="text-[10.5px] font-sans uppercase tracking-[0.12em] opacity-55">
        {title}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-2">
        {list.map((preset) => {
          const active = targetHex.toUpperCase() === preset.hex
          return (
            <button
              key={preset.hex}
              type="button"
              onClick={() => {
                hapticSelect()
                onTargetHexChange(preset.hex)
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-sans cursor-pointer bg-transparent border-none p-0"
              style={{
                color: active
                  ? 'var(--color-ink, #F4F0E8)'
                  : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 68%, transparent)',
                fontWeight: active ? 600 : 400,
              }}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{
                  backgroundColor: preset.hex,
                  boxShadow: active
                    ? '0 0 0 2px var(--color-surface, #141416), 0 0 0 3.5px var(--color-accent, #C9A86A)'
                    : 'inset 0 0 0 1px rgba(0,0,0,0.25)',
                }}
              />
              <span>{preset.label[lang]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 relative">
      {/* ПЛАВАЮЩАЯ FIXED-ПЛАШКА */}
      <AnimatePresence>
        {showFloatingBar && (
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
              <div className="flex items-center -space-x-2 shrink-0">
                <span className="w-9 h-9 rounded-xl border border-black/20 block" style={{ backgroundColor: validColorValue }} />
                {recipeResult?.resultHex && (
                  <span className="w-9 h-9 rounded-xl border border-black/20 block" style={{ backgroundColor: recipeResult.resultHex }} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[19px] leading-none tabular-nums">{validColorValue}</span>
                  {recipeResult && (
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.68)',
                        color:
                          recipeResult.deltaE <= 2
                            ? '#4ade80'
                            : recipeResult.deltaE <= 5
                            ? '#facc15'
                            : '#f87171',
                      }}
                    >
                      ΔE {recipeResult.deltaE.toFixed(1)}
                    </span>
                  )}
                </div>
                <span className="block text-[12px] font-sans opacity-60 truncate mt-0.5">
                  ≤{maxComponents} · {system === 'acrylic' ? dict.acrylic : dict.aniline}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={recipeResult ? onSendRecipeToMix : onRunRecipeSearch}
              disabled={recipeLoading || loading || inventoryIds.length === 0}
              className="h-9 px-4 rounded-xl text-[12px] font-sans font-semibold shrink-0 cursor-pointer disabled:opacity-35"
              style={{
                background: recipeResult ? 'var(--color-accent, #C9A86A)' : 'var(--color-ink, #F4F0E8)',
                color: 'var(--color-bg, #0B0B0C)',
              }}
            >
              {recipeLoading ? '...' : recipeResult ? copy.applyShort : copy.synthShort}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ЕДИНАЯ КАРТА ПОДБОРА */}
      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: hairline,
        }}
      >
        <div
          className="px-4 sm:px-5 py-3 flex items-center justify-between border-b"
          style={{ borderColor: hairline }}
        >
          <h2 className="text-[12px] font-sans uppercase tracking-[0.12em] font-semibold opacity-80">
            {dict.targetColor}
          </h2>
          <span className="font-mono text-[11px] opacity-50">CIEDE2000</span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <div ref={targetSwatchRef} className="flex items-stretch gap-3">
            <button
              type="button"
              onClick={() => {
                hapticTap()
                setPickerOpen((o) => !o)
              }}
              className="relative w-20 h-16 rounded-xl border shrink-0 cursor-pointer overflow-hidden"
              style={{
                backgroundColor: validColorValue,
                borderColor: pickerOpen ? 'var(--color-accent, #C9A86A)' : hairline,
              }}
              aria-label={copy.customColorBtn}
            />

            <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2">
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
                  className="flex-1 h-10 px-3 rounded-xl font-mono tracking-[0.1em] text-[15px] font-semibold border focus:outline-none min-w-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
                    borderColor: hairline,
                    color: 'var(--color-ink, #F4F0E8)',
                  }}
                  placeholder="#RRGGBB"
                  maxLength={7}
                />

                <button
                  type="button"
                  onClick={() => {
                    hapticTap()
                    setPickerOpen((o) => !o)
                  }}
                  className="h-10 px-3.5 rounded-xl border text-[12.5px] font-sans font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
                  style={{
                    borderColor: 'var(--color-accent, #C9A86A)',
                    background: pickerOpen ? 'var(--color-accent, #C9A86A)' : 'transparent',
                    color: pickerOpen ? 'var(--color-bg, #0B0B0C)' : 'var(--color-accent, #C9A86A)',
                  }}
                >
                  <span className="whitespace-nowrap">
                    {pickerOpen ? copy.hidePickerBtn : copy.customColorBtn}
                  </span>
                </button>
              </div>
              <div className="text-[12px] font-mono opacity-55 tabular-nums">
                H {hsv.h}° · S {Math.round(hsv.s * 100)}% · V {Math.round(hsv.v * 100)}%
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden"
              >
                <div className="pt-1 flex flex-col gap-3">
                  <div className="text-[11px] font-sans font-medium" style={{ color: 'var(--color-accent, #C9A86A)' }}>
                    {copy.gamutNote}
                  </div>

                  {/* Gamut-safe пигментный SV-квадрат (без кислотного неона) */}
                  <div
                    ref={svBoxRef}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setDraggingSV(true)
                      hapticTap()
                      updateSVFromPointer(e.clientX, e.clientY)
                    }}
                    onPointerMove={(e) => {
                      if (!draggingSV) return
                      updateSVFromPointer(e.clientX, e.clientY)
                    }}
                    onPointerUp={() => setDraggingSV(false)}
                    onPointerCancel={() => setDraggingSV(false)}
                    className="relative w-full h-44 rounded-xl overflow-hidden select-none touch-none cursor-crosshair border border-black/15"
                    style={{
                      backgroundColor: hueEdgeHex,
                      backgroundImage: `linear-gradient(to top, ${deepDarkHex}, transparent), linear-gradient(to right, ${neutralLightHex}, transparent)`,
                    }}
                  >
                    <span
                      className="absolute w-5 h-5 rounded-full pointer-events-none border-2 border-white"
                      style={{
                        left: `${pointerX}%`,
                        top: `${pointerY}%`,
                        transform: `translate(-50%, -50%) scale(${draggingSV ? 1.15 : 1})`,
                        backgroundColor: validColorValue,
                        boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45)',
                      }}
                    />
                  </div>

                  {/* Шкала оттенков в реальном пигментном спектре */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[12px] font-sans opacity-65">
                      <span>{copy.hueLabel}</span>
                      <span className="font-mono tabular-nums">{hsv.h}°</span>
                    </div>
                    <div className="relative h-7 flex items-center select-none touch-none">
                      <div
                        className="w-full h-2.5 rounded-full border border-black/15"
                        style={{
                          background:
                            'linear-gradient(to right, hsl(0,55%,48%) 0%, hsl(40,58%,50%) 14%, hsl(75,45%,48%) 26%, hsl(135,40%,42%) 40%, hsl(190,46%,44%) 54%, hsl(225,50%,45%) 67%, hsl(280,42%,45%) 80%, hsl(335,52%,48%) 92%, hsl(0,55%,48%) 100%)',
                        }}
                      />
                      <span
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full pointer-events-none border-2 border-white"
                        style={{
                          left: `${(hsv.h / 360) * 100}%`,
                          backgroundColor: hueEdgeHex,
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={359}
                        step={1}
                        value={hsv.h}
                        onChange={(e) => updateHue(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
                        aria-label={copy.hueLabel}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Карта реальных обувных кож */}
          <div className="space-y-3 pt-1">
            {renderPresetRow(copy.classicGroup, classicPresets)}
            {renderPresetRow(copy.accentGroup, accentPresets)}
          </div>
        </div>

        <div className="grid grid-cols-2 border-t divide-x" style={{ borderColor: hairline }}>
          {([3, 4] as const).map((num) => {
            const active = maxComponents === num
            return (
              <button
                key={num}
                type="button"
                onClick={() => onMaxComponentsChange(num)}
                className="py-3 text-[12.5px] font-sans font-medium cursor-pointer"
                style={{
                  borderColor: hairline,
                  background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                  color: active ? 'var(--color-bg, #0B0B0C)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 70%, transparent)',
                }}
              >
                ≤ {num} {dict.maxPigments}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 border-t divide-x" style={{ borderColor: hairline }}>
          {(['acrylic', 'aniline'] as const).map((sys) => {
            const active = system === sys
            return (
              <button
                key={sys}
                type="button"
                onClick={() => onSystemChange(sys)}
                className="py-3 px-2 text-[12.5px] font-sans font-medium cursor-pointer"
                style={{
                  borderColor: hairline,
                  background: active
                    ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 15%, transparent)'
                    : 'transparent',
                  color: active ? 'var(--color-accent, #C9A86A)' : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 70%, transparent)',
                }}
              >
                {sys === 'acrylic' ? dict.acrylic : dict.aniline}
              </button>
            )
          })}
        </div>

        <div className="p-4 sm:p-5 border-t" style={{ borderColor: hairline }}>
          <button
            type="button"
            onClick={onRunRecipeSearch}
            disabled={
              recipeLoading ||
              loading ||
              !/^#[0-9A-Fa-f]{6}$/.test(targetHex) ||
              inventoryIds.length === 0
            }
            className="w-full h-12 rounded-xl text-[13px] font-sans uppercase tracking-[0.14em] font-semibold disabled:opacity-35 cursor-pointer"
            style={{
              background: 'var(--color-ink, #F4F0E8)',
              color: 'var(--color-bg, #0B0B0C)',
            }}
          >
            {recipeLoading ? dict.picking : dict.pickRecipe}
          </button>

          {recipeError && (
            <p className="text-[13px] text-center mt-3" style={{ color: 'var(--color-danger, #f87171)' }}>
              {recipeError}
            </p>
          )}
        </div>
      </section>

      {/* РЕЗУЛЬТАТ СИНТЕЗА */}
      <AnimatePresence>
        {recipeResult && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: 'var(--color-surface, #141416)',
              borderColor: 'color-mix(in srgb, var(--color-accent, #C9A86A) 36%, transparent)',
            }}
          >
            <div className="grid grid-cols-2 h-36 relative">
              <div className="p-3.5 flex flex-col justify-between relative" style={{ backgroundColor: targetHex }}>
                <span className="relative z-10 text-[11px] font-mono bg-black/55 text-white px-2.5 py-0.5 rounded-md w-fit">
                  {dict.target}
                </span>
                <span className="relative z-10 font-mono text-[12px] text-white bg-black/55 px-2.5 py-0.5 rounded-md w-fit">
                  {targetHex}
                </span>
              </div>

              <div className="p-3.5 flex flex-col justify-between relative" style={{ backgroundColor: recipeResult.resultHex || '#333' }}>
                <div className="relative z-10 flex justify-end">
                  <span
                    className="text-[12px] font-mono font-semibold px-2.5 py-0.5 rounded-md whitespace-nowrap"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.68)',
                      color:
                        recipeResult.deltaE <= 2
                          ? '#4ade80'
                          : recipeResult.deltaE <= 5
                          ? '#facc15'
                          : '#f87171',
                    }}
                  >
                    ΔE₀₀ {recipeResult.deltaE.toFixed(1)}
                  </span>
                </div>
                <div className="relative z-10 flex justify-end">
                  <span className="font-mono text-[12px] text-white bg-black/55 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                    {(recipeResult.resultHex || '').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {totalRecipeMl > 0 && (
              <div className="w-full h-1.5 flex">
                {recipeResult.recipe.map((item, idx) => (
                  <div
                    key={`bar-${item.pigment.id}-${idx}`}
                    className="h-full"
                    style={{
                      width: `${(item.ml / totalRecipeMl) * 100}%`,
                      backgroundColor: item.pigment.hex || '#C9A86A',
                    }}
                  />
                ))}
              </div>
            )}

            <div className="divide-y" style={{ borderColor: hairline }}>
              {recipeResult.recipe.map((item, i) => {
                const lore = getPigmentLore(item.pigment, lang)
                const share = totalRecipeMl > 0 ? Math.round((item.ml / totalRecipeMl) * 100) : 0
                return (
                  <div key={`${item.pigment.id}-${i}`} className="px-4 sm:px-5 py-3.5" style={{ borderColor: hairline }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: item.pigment.hex || '#888' }}
                        />
                        <span className="text-[14px] font-sans font-medium truncate">
                          {item.isBinder ? dict.binder : pigmentName(item.pigment)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <SpectralSparkline
                          spectrum={item.pigment.spectrum}
                          strokeColor={item.pigment.hex || '#C9A86A'}
                          width={44}
                          height={18}
                        />
                        <span className="font-mono text-[14px] font-semibold tabular-nums whitespace-nowrap">
                          {item.ml.toFixed(2)} {dict.ml}
                        </span>
                        <span className="font-mono text-[12px] opacity-55 tabular-nums w-9 text-right">
                          {share}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-6 mt-1.5 text-[12px]">
                      <span className="opacity-65 truncate">
                        {dict.opacityLabels[lore.opacity]} · {lore.whereToBuy.leatherBrands[0]}
                      </span>
                      <button
                        type="button"
                        onClick={() => onInspectPigment(item.pigment.id)}
                        className="font-medium underline underline-offset-4 shrink-0 bg-transparent border-none p-0 cursor-pointer"
                        style={{ color: 'var(--color-accent, #C9A86A)' }}
                      >
                        {dict.pigmentInfoBtn}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-4 sm:p-5 border-t" style={{ borderColor: hairline }}>
              <button
                type="button"
                onClick={onSendRecipeToMix}
                className="w-full h-12 rounded-xl text-[13px] font-sans uppercase tracking-[0.14em] font-semibold cursor-pointer"
                style={{
                  background: 'var(--color-accent, #C9A86A)',
                  color: 'var(--color-bg, #0B0B0C)',
                }}
              >
                {dict.moveToMix}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* СВОРАЧИВАЕМЫЙ ФИЛЬТР ПАЛИТРЫ */}
      <section
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: hairline,
        }}
      >
        <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[12px] font-sans uppercase tracking-[0.12em] font-semibold opacity-80">
              {copy.paletteSummary}
            </span>
            <span className="block text-[12px] font-mono opacity-55 mt-0.5 tabular-nums">
              {selectedColorCount} / {selectablePigments.length}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedColorCount < selectablePigments.length && (
              <button
                type="button"
                onClick={onSelectAllInventory}
                className="h-9 px-3 rounded-lg text-[12px] font-sans font-medium border cursor-pointer"
                style={{
                  borderColor: 'var(--color-accent, #C9A86A)',
                  color: 'var(--color-accent, #C9A86A)',
                }}
              >
                {dict.all}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                hapticTap()
                setPaletteOpen((v) => !v)
              }}
              className="h-9 px-3.5 rounded-lg text-[12px] font-sans font-medium border cursor-pointer"
              style={{ borderColor: hairline, color: 'var(--color-ink, #F4F0E8)' }}
            >
              {paletteOpen ? copy.closeFilterBtn : copy.filterBtn}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {paletteOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden border-t"
              style={{ borderColor: hairline }}
            >
              <div className="p-4 sm:p-5 pt-3.5">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0">
                    {categories.map((cat) => {
                      const active = activeCategory === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className="h-8 px-3 rounded-lg text-[12px] font-sans font-medium whitespace-nowrap border cursor-pointer"
                          style={{
                            borderColor: active ? 'var(--color-ink, #F4F0E8)' : hairline,
                            background: active ? 'var(--color-ink, #F4F0E8)' : 'transparent',
                            color: active ? 'var(--color-bg, #0B0B0C)' : 'var(--color-ink, #F4F0E8)',
                          }}
                        >
                          {cat === 'ALL' ? dict.all : cat}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={onClearInventory}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer text-[13px]"
                    style={{ color: 'var(--color-danger, #f87171)' }}
                    title={dict.clearInventory}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredInventory.map((p) => {
                    const on = inventoryIds.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        className="flex items-center rounded-lg border overflow-hidden"
                        style={{
                          background: on
                            ? 'color-mix(in srgb, var(--color-accent, #C9A86A) 15%, transparent)'
                            : 'transparent',
                          borderColor: on ? 'var(--color-accent, #C9A86A)' : hairline,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleInventory(p.id)}
                          className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-[12px] font-sans cursor-pointer"
                          style={{
                            color: on
                              ? 'var(--color-ink, #F4F0E8)'
                              : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 62%, transparent)',
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
                          className="px-2 py-1.5 text-[12px] border-l cursor-pointer"
                          style={{
                            borderColor: hairline,
                            color: 'var(--color-accent, #C9A86A)',
                          }}
                          title={dict.pigmentInfoBtn}
                        >
                          i
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
