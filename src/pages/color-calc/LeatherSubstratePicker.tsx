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
  group: 'classic' | 'accent'
  name: { ru: string; uk: string; de: string }
  note: { ru: string; uk: string; de: string }
}

const LEATHER_CATALOG: LeatherSwatch[] = [
  // Классическая тёмная и базовая палитра
  {
    hex: '#3E2417',
    group: 'classic',
    name: { ru: 'Шоколад', uk: 'Шоколад', de: 'Espresso' },
    note: {
      ru: 'Dark Brown / Espresso — мягче и дороже чёрного, раскрывает фактуру кожи.',
      uk: 'Dark Brown / Espresso — мʼякший за чорний, розкриває фактуру шкіри.',
      de: 'Dark Brown / Espresso — weicher als Schwarz, betont die Lederstruktur.',
    },
  },
  {
    hex: '#8B4513',
    group: 'classic',
    name: { ru: 'Коньяк', uk: 'Коньяк', de: 'Cognac' },
    note: {
      ru: 'Cognac — эталон для полуформальной обуви и ручного патинирования.',
      uk: 'Cognac — еталон для напівформального взуття та ручного патинування.',
      de: 'Cognac — Referenzton für Handpatina und klassische Rahmenschuhe.',
    },
  },
  {
    hex: '#B57236',
    group: 'classic',
    name: { ru: 'Тан', uk: 'Тан', de: 'Tan' },
    note: {
      ru: 'Tan — тёплый рыже-коричневый, идеально принимает тёмные воски и патину.',
      uk: 'Tan — теплий рудо-коричневий, ідеально приймає темні воски та патину.',
      de: 'Tan — warmes Hellbraun, ideal für dunkles Wachs und Patinierung.',
    },
  },
  {
    hex: '#5A1E22',
    group: 'classic',
    name: { ru: 'Оксблад', uk: 'Оксблад', de: 'Oxblood' },
    note: {
      ru: 'Burgundy / Oxblood — винно-бордовый с коричневым подтоном, аристократичная классика.',
      uk: 'Burgundy / Oxblood — винно-бордовий із коричневим підтоном, шляхетна класика.',
      de: 'Burgundy / Oxblood — dunkles Weinrot mit braunem Unterton.',
    },
  },
  {
    hex: '#1C1B1A',
    group: 'classic',
    name: { ru: 'Jet Black', uk: 'Jet Black', de: 'Jet Black' },
    note: {
      ru: 'Чёрный с лёгким глянцем — строгий дресс-код, глубина за счёт полировки.',
      uk: 'Чорний із легким глянцем — строгий дрес-код, глибина за рахунок полірування.',
      de: 'Tiefschwarz mit feinem Glanz — formelle Basis für perfekte Politur.',
    },
  },
  {
    hex: '#D8C5A8',
    group: 'classic',
    name: { ru: 'Краст', uk: 'Краст', de: 'Crust' },
    note: {
      ru: 'Неокрашенный краст — чистая база для полного окрашивания и патины с нуля.',
      uk: 'Нефарбований краст — чиста база для повного фарбування та патини з нуля.',
      de: 'Naturbelassenes Crust — neutrale Basis für Färbung und Handpatina.',
    },
  },

  // Сложные и акцентные оттенки
  {
    hex: '#212D40',
    group: 'accent',
    name: { ru: 'Нэви', uk: 'Неві', de: 'Navy' },
    note: {
      ru: 'Navy — сдержанная альтернатива чёрному, особенно выразительна в замше и нубуке.',
      uk: 'Navy — стримана альтернатива чорному, чудово виглядає в замші та нубуку.',
      de: 'Navy — dezente Alternative zu Schwarz, stark auf Velours und Nubuk.',
    },
  },
  {
    hex: '#243A2C',
    group: 'accent',
    name: { ru: 'Хвойный', uk: 'Хвойний', de: 'Racing Green' },
    note: {
      ru: 'British Racing Green — глубокий бутылочный зелёный в рамках строгой классики.',
      uk: 'British Racing Green — глибокий пляшковий зелений у межах класики.',
      de: 'British Racing Green — tiefes Flaschengrün im klassischen Rahmen.',
    },
  },
  {
    hex: '#8C7D6E',
    group: 'accent',
    name: { ru: 'Тауп / Минк', uk: 'Тауп / Мінк', de: 'Taupe / Mink' },
    note: {
      ru: 'Taupe / Mink — сложный серо-коричневый, идеален для замши и весенне-летней обуви.',
      uk: 'Taupe / Mink — складний сіро-коричневий, ідеальний для замші та літніх моделей.',
      de: 'Taupe / Mink — edles Graubraun, ideal für Rauleder und Sommermodelle.',
    },
  },
  {
    hex: '#B68856',
    group: 'accent',
    name: { ru: 'Кэмел', uk: 'Кемел', de: 'Camel' },
    note: {
      ru: 'Camel — тёплый верблюжий тон, визуально удорожает повседневные и кэжуал-модели.',
      uk: 'Camel — теплий верблюжий тон, робить кежуал-моделі візуально дорожчими.',
      de: 'Camel — warmer Naturton, veredelt Casual- und Freizeitmodelle.',
    },
  },
  {
    hex: '#C9B292',
    group: 'accent',
    name: { ru: 'Песочный', uk: 'Пісочний', de: 'Sand' },
    note: {
      ru: 'Sand — благородный светлый песок для замши, лоферов и летней классики.',
      uk: 'Sand — шляхетний світлий пісок для замші, лоферів і літньої класики.',
      de: 'Sand — heller Sandton für Loafer, Velours und Sommerklassiker.',
    },
  },
  {
    hex: '#EAE3D5',
    group: 'accent',
    name: { ru: 'Слон. кость', uk: 'Слон. кістка', de: 'Ivory' },
    note: {
      ru: 'Ivory — тёплая белая кожа с кремовым подтоном, мягче стерильного белого.',
      uk: 'Ivory — тепла біла шкіра з кремовим підтоном, мʼякша за стерильний білий.',
      de: 'Ivory — warmes Naturweiß mit Cremeton, weicher als Reinweiß.',
    },
  },
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

  const matchedPreset = useMemo(
    () => LEATHER_CATALOG.find((c) => c.hex.toUpperCase() === valueHex.toUpperCase()),
    [valueHex]
  )

  const ui = useMemo(() => {
    const map = {
      ru: {
        title: 'Карта обувных кож',
        badge: 'Пигментный охват · без неона',
        classicGroup: 'Классическая база',
        accentGroup: 'Сложные и акцентные',
        fineTune: 'Точная подстройка (в пределах реальных пигментов)',
        hue: 'Тон',
        sat: 'Насыщенность пигмента',
        light: 'Светлота кожи',
        done: 'Готово',
      },
      uk: {
        title: 'Карта взуттєвих шкір',
        badge: 'Пігментне охоплення · без неону',
        classicGroup: 'Класична база',
        accentGroup: 'Складні та акцентні',
        fineTune: 'Точне підлаштування (у межах реальних пігментів)',
        hue: 'Тон',
        sat: 'Насиченість пігменту',
        light: 'Світлота шкіри',
        done: 'Готово',
      },
      de: {
        title: 'Leder-Farbkarte',
        badge: 'Pigment-Farbraum · kein Neon',
        classicGroup: 'Klassische Basis',
        accentGroup: 'Feine Akzenttöne',
        fineTune: 'Feinabstimmung (realer Pigment-Farbraum)',
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

  const hueGradient =
    'linear-gradient(90deg, hsl(0,52%,44%), hsl(35,54%,45%), hsl(65,45%,46%), hsl(120,38%,38%), hsl(185,42%,40%), hsl(225,44%,40%), hsl(280,38%,40%), hsl(335,48%,44%), hsl(360,52%,44%))'
  const satGradient = `linear-gradient(90deg, hsl(${hue}, 0%, ${light}%), hsl(${hue}, ${MAX_LEATHER_SAT}%, ${light}%))`
  const lightGradient = `linear-gradient(90deg, hsl(${hue}, ${sat}%, ${MIN_LEATHER_LIGHT}%), hsl(${hue}, ${sat}%, 52%), hsl(${hue}, ${sat}%, ${MAX_LEATHER_LIGHT}%))`

  const classicList = LEATHER_CATALOG.filter((c) => c.group === 'classic')
  const accentList = LEATHER_CATALOG.filter((c) => c.group === 'accent')

  const renderGroup = (title: string, items: LeatherSwatch[]) => (
    <div>
      <div
        className="text-[10.5px] uppercase tracking-[0.12em] font-semibold mb-1.5"
        style={{ color: tokens.inkMuted }}
      >
        {title}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {items.map((item) => {
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
              <span className="text-[11px] font-medium truncate">{item.name[lang]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className="mx-4 sm:mx-5 my-3 rounded-2xl border p-3.5 sm:p-4 space-y-3.5"
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

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => handleHexInput(e.target.value)}
            maxLength={7}
            className="w-[78px] px-2 py-1.5 rounded-lg border font-mono text-[12px] text-center focus:outline-none"
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

      {/* Две группы обувных кож */}
      <div className="space-y-3">
        {renderGroup(ui.classicGroup, classicList)}
        {renderGroup(ui.accentGroup, accentList)}
      </div>

      {/* Подсказка ателье по выбранной коже */}
      {matchedPreset && (
        <div
          className="px-3 py-2 rounded-xl border text-[12px] leading-snug"
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            color: tokens.inkSecondary,
          }}
        >
          {matchedPreset.note[lang]}
        </div>
      )}

      {/* 3 пигментно-безопасных ползунка */}
      <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: tokens.border }}>
        <div
          className="text-[10.5px] uppercase tracking-[0.1em] font-semibold"
          style={{ color: tokens.inkMuted }}
        >
          {ui.fineTune}
        </div>

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
            style={{ background: hueGradient, touchAction: 'pan-y' }}
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
            style={{ background: satGradient, touchAction: 'pan-y' }}
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
            style={{ background: lightGradient, touchAction: 'pan-y' }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
