import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

const MATCH_COPY: Record<
  Lang,
  {
    customColorBtn: string
    hidePickerBtn: string
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
    hidePickerBtn: 'Скрыть палитру',
    hueLabel: 'Оттенок',
    paletteSummary: 'Поиск по палитре',
    filterBtn: 'Фильтр',
    closeFilterBtn: 'Свернуть',
    synthShort: 'Подобрать',
    applyShort: 'В формулу',
  },
  uk: {
    customColorBtn: 'Свій колір',
    hidePickerBtn: 'Сховати палітру',
    hueLabel: 'Відтінок',
    paletteSummary: 'Пошук по палітрі',
    filterBtn: 'Фільтр',
    closeFilterBtn: 'Згорнути',
    synthShort: 'Підібрати',
    applyShort: 'У формулу',
  },
  de: {
    customColorBtn: 'Eigene Farbe',
    hidePickerBtn: 'Ausblenden',
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

function hexToHsv(hex: string): HSV {
  const clean = hex.replace(/^#/, '')
  if (clean.length !== 6) return { h: 25, s: 0.86, v: 0.55 }
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
  const safeH = ((h % 360) + 360) % 360
  const safeS = Math.max(0, Math.min(1, s))
  const safeV = Math.max(0, Math.min(1, v))
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
  const grainId = useId().replace(/:/g, '')
  const copy = MATCH_COPY[lang] || MATCH_COPY.ru
  const validColorValue = /^#[0-9A-Fa-f]{6}$/.test(targetHex) ? targetHex : '#8B4513'

  const [pickerOpen, setPickerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('ALL')
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(validColorValue))
  const [draggingSV, setDraggingSV] = useState(false)
  const [showFloatingBar, setShowFloatingBar] = useState(false)

  const svBoxRef = useRef<HTMLDivElement | null>(null)
  const targetAnchorRef = useRef<HTMLDivElement | null>(null)
  const lastHapticRef = useRef<number>(0)

  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(targetHex) && !draggingSV) {
      setHsv(hexToHsv(targetHex))
    }
  }, [targetHex, draggingSV])

  useEffect(() => {
    const el = targetAnchorRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setShowFloatingBar(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0.08 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fireThrottledTick = () => {
    const now = Date.now()
    if (now - lastHapticRef.current >= 45) {
      hapticSelect()
      lastHapticRef.current = now
    }
  }

  const updateSVFromPointer = (clientX: number, clientY: number) => {
    const rect = svBoxRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
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

  return (
    <div className="flex flex-col gap-4 relative">
      {/* SVG-фильтр фактуры кожи */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={grainId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="11" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.22" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* ПЛАВАЮЩАЯ FIXED-ПЛАШКА НА ЭКРАНЕ ПОДБОРА */}
      <AnimatePresence>
        {showFloatingBar && (
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
              <div className="flex items-center -space-x-2 shrink-0">
                <span
                  className="w-8 h-8 rounded-xl border border-black/25 block"
                  style={{ backgroundColor: validColorValue }}
                />
                {recipeResult?.resultHex && (
                  <span
                    className="w-8 h-8 rounded-xl border border-black/25 block"
                    style={{ backgroundColor: recipeResult.resultHex }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-[17px] leading-none tabular-nums">
                    {validColorValue}
                  </span>
                  {recipeResult && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.62)',
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
                <span className="block text-[10px] font-sans opacity-60 truncate mt-0.5">
                  ≤{maxComponents} · {system === 'acrylic' ? dict.acrylic : dict.aniline}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={recipeResult ? onSendRecipeToMix : onRunRecipeSearch}
              disabled={recipeLoading || loading || inventoryIds.length === 0}
              className="h-8 px-3.5 rounded-full text-[10px] font-sans uppercase tracking-[0.1em] font-semibold shrink-0 cursor-pointer disabled:opacity-35"
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

      {/* ЦЕЛЕВОЙ ОБРАЗЕЦ + ВСТРОЕННЫЙ 2D COLOR PICKER */}
      <section
        ref={targetAnchorRef}
        className="rounded-3xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div
          className="px-4 py-2.5 flex items-center justify-between border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
        >
          <h2 className="text-[10.5px] font-sans uppercase tracking-[0.18em] font-semibold opacity-80">
            {dict.targetColor}
          </h2>
          <span className="font-mono text-[9.5px] opacity-45">CIEDE2000 ENGINE</span>
        </div>

        <div className="p-4 flex flex-col gap-3.5">
          {/* Живая карточка целевого цвета + явная кнопка выбора своего цвета */}
          <div className="flex items-stretch gap-2.5">
            <button
              type="button"
              onClick={() => {
                hapticTap()
                setPickerOpen((o) => !o)
              }}
              className="relative w-20 h-14 rounded-2xl border shrink-0 cursor-pointer overflow-hidden shadow-inner"
              style={{
                backgroundColor: validColorValue,
                borderColor: pickerOpen
                  ? 'var(--color-accent, #C9A86A)'
                  : 'color-mix(in srgb, var(--color-ink, #F4F0E8) 20%, transparent)',
              }}
              aria-label={copy.customColorBtn}
            >
              <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-70"
                style={{ filter: `url(#${grainId})` }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.22) 0%, rgba(0,0,0,0.18) 100%)',
                }}
              />
            </button>

            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
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
                  className="flex-1 h-9 px-3 rounded-xl font-mono tracking-[0.14em] text-[14px] font-semibold border focus:outline-none min-w-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 4%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 14%, transparent)',
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
                  className="h-9 px-3 rounded-xl border text-[10.5px] font-sans font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  style={{
                    borderColor: pickerOpen
                      ? 'var(--color-accent, #C9A86A)'
                      : 'color-mix(in srgb, var(--color-accent, #C9A86A) 45%, transparent)',
                    background: pickerOpen
                      ? 'var(--color-accent, #C9A86A)'
                      : 'color-mix(in srgb, var(--color-accent, #C9A86A) 14%, transparent)',
                    color: pickerOpen ? 'var(--color-bg, #0B0B0C)' : 'var(--color-accent, #C9A86A)',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
                    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
                    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
                    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-5-4.5-8.6-10-8.6z" />
                  </svg>
                  <span className="whitespace-nowrap">
                    {pickerOpen ? copy.hidePickerBtn : copy.customColorBtn}
                  </span>
                </button>
              </div>
              <div className="text-[10px] font-mono opacity-50 px-0.5 tabular-nums">
                H {hsv.h}° · S {Math.round(hsv.s * 100)}% · V {Math.round(hsv.v * 100)}%
              </div>
            </div>
          </div>

          {/* Встроенный Cordwaine 2D HSV Color Picker */}
          <AnimatePresence initial={false}>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="p-3 rounded-2xl border flex flex-col gap-3"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 3%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 12%, transparent)',
                  }}
                >
                  {/* 2D-поле Насыщенность × Яркость */}
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
                      backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                      backgroundImage:
                        'linear-gradient(to top, #000000, transparent), linear-gradient(to right, #FFFFFF, transparent)',
                    }}
                  >
                    <span
                      className="absolute w-5 h-5 rounded-full pointer-events-none border-2 border-white"
                      style={{
                        left: `${hsv.s * 100}%`,
                        top: `${(1 - hsv.v) * 100}%`,
                        transform: `translate(-50%, -50%) scale(${draggingSV ? 1.2 : 1})`,
                        backgroundColor: validColorValue,
                        boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.45)',
                      }}
                    />
                  </div>

                  {/* Полоса Оттенка (Hue 0–360°) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-sans uppercase tracking-[0.12em] opacity-60">
                      <span>{copy.hueLabel}</span>
                      <span className="font-mono tabular-nums">{hsv.h}°</span>
                    </div>
                    <div className="relative h-6 flex items-center select-none touch-none">
                      <div
                        className="w-full h-2.5 rounded-full border border-black/15"
                        style={{
                          background:
                            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                        }}
                      />
                      <span
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full pointer-events-none border-2 border-white"
                        style={{
                          left: `${(hsv.h / 360) * 100}%`,
                          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.35)',
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

          {/* Классические оттенки кожи */}
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
                    onClick={() => {
                      hapticSelect()
                      onTargetHexChange(preset.hex)
                    }}
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

      {/* КНОПКА СИНТЕЗА — СРАЗУ ДОСТУПНА БЕЗ ПРОКРУТКИ ЧЕРЕЗ 146 ЧИПСОВ */}
      <button
        type="button"
        onClick={onRunRecipeSearch}
        disabled={
          recipeLoading ||
          loading ||
          !/^#[0-9A-Fa-f]{6}$/.test(targetHex) ||
          inventoryIds.length === 0
        }
        className="w-full py-3.5 rounded-full text-[12px] font-sans uppercase tracking-[0.18em] font-semibold transition-opacity disabled:opacity-35 cursor-pointer shadow-sm"
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
              borderColor: 'color-mix(in srgb, var(--color-accent, #C9A86A) 32%, transparent)',
            }}
          >
            <div className="p-3 pb-0">
              <div className="grid grid-cols-2 h-32 rounded-2xl overflow-hidden relative shadow-inner">
                <div className="p-3 flex flex-col justify-between relative" style={{ backgroundColor: targetHex }}>
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-70"
                    style={{ filter: `url(#${grainId})` }}
                  />
                  <span className="relative z-10 text-[9px] uppercase tracking-[0.14em] font-mono bg-black/52 text-white px-2.5 py-0.5 rounded-full w-fit backdrop-blur-sm">
                    {dict.target}
                  </span>
                  <span className="relative z-10 font-mono text-[11px] text-white bg-black/52 px-2.5 py-0.5 rounded-full w-fit backdrop-blur-sm">
                    {targetHex}
                  </span>
                </div>

                <div
                  className="p-3 flex flex-col justify-between relative"
                  style={{ backgroundColor: recipeResult.resultHex || '#333' }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-70"
                    style={{ filter: `url(#${grainId})` }}
                  />
                  <div className="relative z-10 flex items-center justify-end">
                    <span
                      className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap"
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.64)',
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
                  <div className="relative z-10 flex items-center justify-end">
                    <span className="font-mono text-[11px] text-white bg-black/52 px-2.5 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm">
                      {(recipeResult.resultHex || '').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              {/* Полоса пропорций рецепта */}
              {totalRecipeMl > 0 && (
                <div
                  className="w-full h-2 rounded-full overflow-hidden flex mb-3.5 border"
                  style={{
                    background: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 8%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
                  }}
                >
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

              <div
                className="flex flex-col divide-y mb-4"
                style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
              >
                {recipeResult.recipe.map((item, i) => {
                  const lore = getPigmentLore(item.pigment, lang)
                  const share = totalRecipeMl > 0 ? Math.round((item.ml / totalRecipeMl) * 100) : 0
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
                        <div className="flex items-center gap-2.5 shrink-0">
                          <SpectralSparkline
                            spectrum={item.pigment.spectrum}
                            strokeColor={item.pigment.hex || '#C9A86A'}
                            width={42}
                            height={18}
                          />
                          <span className="font-mono text-[13.5px] font-semibold tabular-nums whitespace-nowrap">
                            {item.ml.toFixed(2)} {dict.ml}
                          </span>
                          <span className="font-mono text-[10.5px] opacity-55 tabular-nums w-8 text-right">
                            {share}%
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
                className="w-full py-3.5 rounded-full text-[11.5px] font-sans uppercase tracking-[0.16em] font-semibold transition-opacity cursor-pointer"
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

      {/* СВОРАЧИВАЕМЫЙ ФИЛЬТР ПАЛИТРЫ (по умолчанию включены все 146 пигментов) */}
      <section
        className="rounded-3xl border overflow-hidden"
        style={{
          background: 'var(--color-surface, #141416)',
          borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 10%, transparent)',
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-[10.5px] font-sans uppercase tracking-[0.16em] font-semibold opacity-80">
              {copy.paletteSummary}
            </span>
            <span className="block text-[11px] font-mono opacity-55 mt-0.5 tabular-nums">
              {selectedColorCount} / {selectablePigments.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedColorCount < selectablePigments.length && (
              <button
                type="button"
                onClick={onSelectAllInventory}
                className="px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold border cursor-pointer"
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
              className="px-3 py-1 rounded-full text-[10.5px] font-sans font-medium border cursor-pointer transition-colors"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 16%, transparent)',
                color: 'var(--color-ink, #F4F0E8)',
              }}
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
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t"
              style={{ borderColor: 'color-mix(in srgb, var(--color-ink, #F4F0E8) 9%, transparent)' }}
            >
              <div className="p-4 pt-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0 pr-2">
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

                  <button
                    type="button"
                    onClick={onClearInventory}
                    className="text-[11px] px-2 py-1 shrink-0 cursor-pointer"
                    style={{ color: 'var(--color-danger, #f87171)' }}
                    title={dict.clearInventory}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
