import { useState, useEffect, useMemo } from 'react'
import type { Lang } from '../../App'
import { useAtelierTheme } from './themeTokens'
import { hapticSelect, hapticTap } from './haptics'

interface LeatherSubstratePickerProps {
  lang: Lang
  valueHex: string
  onChange: (hex: string) => void
  onClose: () => void
}

interface LeatherSwatch {
  hex: string
  name: { ru: string; uk: string; de: string }
}

const LEATHER_CATALOG: LeatherSwatch[] = [
  { hex: '#D8C5A8', name: { ru: 'Краст', uk: 'Краст', de: 'Crust' } },
  { hex: '#EAE3D5', name: { ru: 'Слон. кость', uk: 'Слон. кістка', de: 'Elfenbein' } },
  { hex: '#C6AC88', name: { ru: 'Песок', uk: 'Пісок', de: 'Sand' } },
  { hex: '#B48454', name: { ru: 'Кэмел', uk: 'Кемел', de: 'Camel' } },
  { hex: '#B56E33', name: { ru: 'Тан', uk: 'Тан', de: 'Tan' } },
  { hex: '#8B4513', name: { ru: 'Коньяк', uk: 'Коньяк', de: 'Cognac' } },
  { hex: '#6A3822', name: { ru: 'Каштан', uk: 'Каштан', de: 'Kastanie' } },
  { hex: '#462C1D', name: { ru: 'Шоколад', uk: 'Шоколад', de: 'Schoko' } },
  { hex: '#5C1F22', name: { ru: 'Оксблад', uk: 'Оксблад', de: 'Oxblood' } },
  { hex: '#253245', name: { ru: 'Нэви', uk: 'Неві', de: 'Navy' } },
  { hex: '#2B3F33', name: { ru: 'Брит. зел.', uk: 'Брит. зел.', de: 'Brit. Grün' } },
  { hex: '#2F2F31', name: { ru: 'Антрацит', uk: 'Антрацит', de: 'Anthrazit' } },
]

// Физические пределы реальной окрашенной кожи (исключают кислотный RGB-неон)
const MAX_LEATHER_SAT = 72
const MIN_LEATHER_LIGHT = 12
const MAX_LEATHER_LIGHT = 92

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }

  return {
    h: Math.round(h),
    s: Math.min(MAX_LEATHER_SAT, Math.round(s * 100)),
    l: Math.max(MIN_LEATHER_LIGHT, Math.min(MAX_LEATHER_LIGHT, Math.round(l * 100))),
  }
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = Math.max(0, Math.min(MAX_LEATHER_SAT, s)) / 100
  const ln = Math.max(MIN_LEATHER_LIGHT, Math.min(MAX_LEATHER_LIGHT, l)) / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v + m)) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function LeatherSubstratePicker({
  lang,
  valueHex,
  onChange,
  onClose,
}: LeatherSubstratePickerProps) {
  const { tokens } = useAtelierTheme()
  const initial = useMemo(() => hexToHsl(valueHex || '#8B4513'), [valueHex])

  const [hue, setHue] = useState(initial.h)
  const [sat, setSat] = useState(initial.s)
  const [light, setLight] = useState(initial.l)
  const [hexDraft, setHexDraft] = useState(valueHex.toUpperCase())

  useEffect(() => {
    const parsed = hexToHsl(valueHex || '#8B4513')
    setHue(parsed.h)
    setSat(parsed.s)
    setLight(parsed.l)
    setHexDraft(valueHex.toUpperCase())
  }, [valueHex])

  const ui = useMemo(() => {
    const map = {
      ru: {
        title: 'Свой оттенок кожи',
        badge: 'Пигментный охват · без неона',
        catalog: 'Карта обувных кож',
        hue: 'Тон',
        sat: 'Насыщенность пигмента',
        light: 'Светлота кожи',
        done: 'Готово',
      },
      uk: {
        title: 'Свій відтінок шкіри',
        badge: 'Пігментне охоплення · без неону',
        catalog: 'Карта взуттєвих шкір',
        hue: 'Тон',
        sat: 'Насиченість пігменту',
        light: 'Світлота шкіри',
        done: 'Готово',
      },
      de: {
        title: 'Eigener Lederfarbton',
        badge: 'Pigment-Farbraum · kein Neon',
        catalog: 'Leder-Farbkarte',
        hue: 'Farbton',
        sat: 'Pigmentsättigung',
        light: 'Helligkeit',
        done: 'Fertig',
      },
    }
    return map[lang]
  }, [lang])

  const emitHsl = (nextH: number, nextS: number, nextL: number) => {
    setHue(nextH)
    setSat(nextS)
    setLight(nextL)
    const nextHex = hslToHex(nextH, nextS, nextL)
    setHexDraft(nextHex)
    onChange(nextHex)
  }

  const handleHexInput = (raw: string) => {
    const formatted = raw.startsWith('#') ? raw.toUpperCase() : `#${raw.toUpperCase()}`
    setHexDraft(formatted)
    if (/^#[0-9A-F]{6}$/.test(formatted)) {
      const clamped = hexToHsl(formatted)
      const safeHex = hslToHex(clamped.h, clamped.s, clamped.l)
      setHue(clamped.h)
      setSat(clamped.s)
      setLight(clamped.l)
      onChange(safeHex)
    }
  }

  // Реалистичный пигментный градиент тона (приглушённый, не кислотный)
  const hueGradient =
    'linear-gradient(90deg, hsl(0,55%,45%), hsl(35,55%,45%), hsl(65,48%,46%), hsl(120,42%,40%), hsl(185,45%,42%), hsl(225,48%,42%), hsl(280,42%,42%), hsl(335,52%,45%), hsl(360,55%,45%))'

  const satGradient = `linear-gradient(90deg, hsl(${hue}, 0%, ${light}%), hsl(${hue}, ${MAX_LEATHER_SAT}%, ${light}%))`
  const lightGradient = `linear-gradient(90deg, hsl(${hue}, ${sat}%, ${MIN_LEATHER_LIGHT}%), hsl(${hue}, ${sat}%, 52%), hsl(${hue}, ${sat}%, ${MAX_LEATHER_LIGHT}%))`

  return (
    <div
      className="mt-3 rounded-2xl border p-3.5 sm:p-4 space-y-3.5"
      style={{
        backgroundColor: tokens.surfaceSoft,
        borderColor: tokens.border,
        color: tokens.ink,
      }}
    >
      {/* Заголовок + Живой свотч + HEX */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl border shrink-0"
            style={{
              backgroundColor: valueHex,
              borderColor: tokens.border,
            }}
          />
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold truncate">{ui.title}</div>
            <div className="text-[11px] truncate" style={{ color: tokens.accent }}>
              {ui.badge}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleHexInput(e.target.value)}
            maxLength={7}
            className="w-[82px] px-2 py-1.5 rounded-lg border font-mono text-[12px] text-center focus:outline-none"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              color: tokens.ink,
            }}
          />
          <button
            type="button"
            onClick={() => {
              hapticTap()
              onClose()
            }}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer"
            style={{
              backgroundColor: tokens.activeBg,
              color: tokens.activeText,
            }}
          >
            {ui.done}
          </button>
        </div>
      </div>

      {/* Карта 12 реальных обувных кож */}
      <div>
        <div
          className="text-[10.5px] uppercase tracking-[0.12em] font-semibold mb-2"
          style={{ color: tokens.inkMuted }}
        >
          {ui.catalog}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {LEATHER_CATALOG.map((item) => {
            const active = item.hex.toUpperCase() === valueHex.toUpperCase()
            return (
              <button
                key={item.hex}
                type="button"
                onClick={() => {
                  hapticSelect()
                  onChange(item.hex)
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-left cursor-pointer"
                style={{
                  backgroundColor: tokens.surface,
                  borderColor: active ? tokens.accent : tokens.border,
                }}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="text-[11px] truncate">{item.name[lang]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3 пигментно-безопасных ползунка */}
      <div className="space-y-3 pt-1">
        <div>
          <div className="flex justify-between text-[11.5px] mb-1">
            <span style={{ color: tokens.inkSecondary }}>{ui.hue}</span>
            <span className="font-mono" style={{ color: tokens.inkMuted }}>
              {hue}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => emitHsl(Number(e.target.value), sat, light)}
            style={{
              background: hueGradient,
              touchAction: 'pan-y',
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11.5px] mb-1">
            <span style={{ color: tokens.inkSecondary }}>{ui.sat}</span>
            <span className="font-mono" style={{ color: tokens.inkMuted }}>
              {sat}% / {MAX_LEATHER_SAT}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_LEATHER_SAT}
            value={sat}
            onChange={(e) => emitHsl(hue, Number(e.target.value), light)}
            style={{
              background: satGradient,
              touchAction: 'pan-y',
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11.5px] mb-1">
            <span style={{ color: tokens.inkSecondary }}>{ui.light}</span>
            <span className="font-mono" style={{ color: tokens.inkMuted }}>
              {light}%
            </span>
          </div>
          <input
            type="range"
            min={MIN_LEATHER_LIGHT}
            max={MAX_LEATHER_LIGHT}
            value={light}
            onChange={(e) => emitHsl(hue, sat, Number(e.target.value))}
            style={{
              background: lightGradient,
              touchAction: 'pan-y',
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}

