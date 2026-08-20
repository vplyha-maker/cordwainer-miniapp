import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Lang } from '../App'
import type { Pigment } from '../data/pigments'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  pigments: Pigment[]
}

type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split-complementary'
  | 'monochromatic'
  | 'grayscale'

// --- Утилиты цвета ---
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s, l }
}

function mixWithWhiteBlack(hex: string, white: number, black: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  let { r, g, b } = rgb
  r = r * (1 - white) + 255 * white
  g = g * (1 - white) + 255 * white
  b = b * (1 - white) + 255 * white

  r = r * (1 - black)
  g = g * (1 - black)
  b = b * (1 - black)

  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#\( {toHex(r)} \){toHex(g)}${toHex(b)}`
}

export function ColorsPage({ onBack, lang, setLang, pigments }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(15)
  const [whiteAmount, setWhiteAmount] = useState(0.08)
  const [blackAmount, setBlackAmount] = useState(0.08)
  const [baseLightness, setBaseLightness] = useState(35)

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingValue = useRef<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Lang | null
    if (saved === 'ru' || saved === 'uk') {
      if (saved !== lang) setLang(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const t = {
    ru: {
      title: 'Цвета и отделка',
      schemes: 'Цветовые схемы',
      complementary: 'Комплементарная',
      analogous: 'Аналогичная',
      triadic: 'Триадная',
      tetradic: 'Тетрадная',
      'split-complementary': 'Контрастная триада',
      monochromatic: 'Монохромная',
      grayscale: 'Чёрно-белая',
      baseColor: 'Круг Оствальда',
      ratio: 'Соотношение',
      main: '60%',
      secondary: '30%',
      accent: '10%',
      quote: '«Цвет — это душа обуви.»',
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый',
      pigment: 'Пигмент',
    },
    uk: {
      title: 'Кольори та оздоблення',
      schemes: 'Колірні схеми',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрадна',
      'split-complementary': 'Контрастна тріада',
      monochromatic: 'Монохромна',
      grayscale: 'Чорно-біла',
      baseColor: 'Коло Оствальда',
      ratio: 'Співвідношення',
      main: '60%',
      secondary: '30%',
      accent: '10%',
      quote: '«Колір — це душа взуття.»',
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий',
      pigment: 'Пігмент',
    },
  }[lang]

  const readyPigments = useMemo(() => {
    return pigments.filter((p) => p.hex && p.hex.length >= 6)
  }, [pigments])

  const findNearestPigment = useCallback((targetHue: number): Pigment | null => {
    if (readyPigments.length === 0) return null

    let best: Pigment | null = null
    let bestDiff = 999

    for (const p of readyPigments) {
      const rgb = hexToRgb(p.hex!)
      if (!rgb) continue
      const { h } = rgbToHsl(rgb.r, rgb.g, rgb.b)
      let diff = Math.abs(h - targetHue)
      if (diff > 180) diff = 360 - diff
      if (diff < bestDiff) {
        bestDiff = diff
        best = p
      }
    }
    return best
  }, [readyPigments])

  const nearestPigment = useMemo(() => {
    return findNearestPigment(baseHue)
  }, [baseHue, findNearestPigment])

  const getAchromaticColors = (base: number) => {
    const clamp = (v: number) => Math.max(4, Math.min(96, Math.round(v)))
    return {
      main: `hsl(0, 0%, ${clamp(base)}%)`,
      secondary: `hsl(0, 0%, ${clamp(100 - base)}%)`,
      accent: `hsl(0, 0%, ${base > 50 ? 10 : 90}%)`,
    }
  }

  const getColors = useCallback(() => {
    if (scheme === 'grayscale') {
      return getAchromaticColors(baseLightness)
    }

    if (!nearestPigment?.hex) {
      const h = baseHue
      return {
        main: `hsl(${h}, 65%, 42%)`,
        secondary: `hsl(${(h + 180) % 360}, 55%, 48%)`,
        accent: `hsl(${(h + 180) % 360}, 70%, 55%)`,
      }
    }

    const baseHex = nearestPigment.hex
    const main = mixWithWhiteBlack(baseHex, whiteAmount, blackAmount)

    const getShifted = (shift: number, w = whiteAmount * 0.6, b = blackAmount * 0.5) => {
      const target = (baseHue + shift + 360) % 360
      const p = findNearestPigment(target)
      if (p?.hex) return mixWithWhiteBlack(p.hex, w, b)
      return mixWithWhiteBlack(baseHex, w, b)
    }

    switch (scheme) {
      case 'complementary':
        return {
          main,
          secondary: getShifted(180, whiteAmount * 0.55, blackAmount * 0.45),
          accent: getShifted(180, whiteAmount * 0.1, blackAmount * 0.15),
        }
      case 'analogous':
        return {
          main,
          secondary: getShifted(30, whiteAmount * 0.6, blackAmount * 0.4),
          accent: getShifted(-30, whiteAmount * 0.15, blackAmount * 0.25),
        }
      case 'triadic':
        return {
          main,
          secondary: getShifted(120, whiteAmount * 0.55, blackAmount * 0.4),
          accent: getShifted(240, whiteAmount * 0.12, blackAmount * 0.2),
        }
      case 'tetradic':
        return {
          main,
          secondary: getShifted(90, whiteAmount * 0.55, blackAmount * 0.4),
          accent: getShifted(180, whiteAmount * 0.12, blackAmount * 0.2),
        }
      case 'split-complementary':
        return {
          main,
          secondary: getShifted(150, whiteAmount * 0.55, blackAmount * 0.4),
          accent: getShifted(210, whiteAmount * 0.12, blackAmount * 0.2),
        }
      case 'monochromatic':
        return {
          main: mixWithWhiteBlack(baseHex, whiteAmount * 0.15, blackAmount + 0.15),
          secondary: mixWithWhiteBlack(baseHex, whiteAmount + 0.35, blackAmount * 0.2),
          accent: mixWithWhiteBlack(baseHex, whiteAmount * 0.05, blackAmount + 0.4),
        }
      default:
        return {
          main,
          secondary: getShifted(180),
          accent: getShifted(180, 0.1, 0.15),
        }
    }
  }, [scheme, baseHue, whiteAmount, blackAmount, baseLightness, nearestPigment, findNearestPigment])

  const colors = getColors()

  const getWheelBackground = () => {
    if (scheme === 'grayscale') {
      return 'conic-gradient(from 0deg, #ffffff, #d0d0d0, #888, #333, #000, #333, #888, #d0d0d0, #ffffff)'
    }
    return `conic-gradient(
      from 0deg,
      hsl(0, 80%, 50%), hsl(30, 80%, 50%), hsl(60, 80%, 50%),
      hsl(90, 80%, 50%), hsl(120, 80%, 50%), hsl(150, 80%, 50%),
      hsl(180, 80%, 50%), hsl(210, 80%, 50%), hsl(240, 80%, 50%),
      hsl(270, 80%, 50%), hsl(300, 80%, 50%), hsl(330, 80%, 50%), hsl(360, 80%, 50%)
    )`
  }

  const updateFromAngle = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360

    if (scheme === 'grayscale') {
      const lightness = Math.round(Math.abs(100 - (angle / 180) * 100))
      pendingValue.current = Math.max(0, Math.min(100, lightness))
    } else {
      pendingValue.current = Math.round(angle)
    }

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingValue.current !== null) {
          if (scheme === 'grayscale') setBaseLightness(pendingValue.current)
          else setBaseHue(pendingValue.current)
          pendingValue.current = null
        }
        rafId.current = null
      })
    }
  }, [scheme])

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromAngle(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    updateFromAngle(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const pointerAngle = scheme === 'grayscale' ? (100 - baseLightness) * 1.8 : baseHue
  const pointerColor = scheme === 'grayscale'
    ? `hsl(0, 0%, ${baseLightness}%)`
    : (nearestPigment?.hex || `hsl(${baseHue}, 80%, 50%)`)

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-[20px] font-serif font-normal tracking-wide leading-none">
          {t.title}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full p-0.5 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
            <button onClick={() => handleLangChange('ru')} className={`lang-toggle ${lang === 'ru' ? 'active' : 'inactive'}`}>RU</button>
            <button onClick={() => handleLangChange('uk')} className={`lang-toggle ${lang === 'uk' ? 'active' : 'inactive'}`}>UA</button>
          </div>
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 overflow-hidden">
        {/* Схемы */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-3 scrollbar-hide shrink-0">
          {([
            'complementary', 'analogous', 'triadic', 'tetradic',
            'split-complementary', 'monochromatic', 'grayscale',
          ] as Scheme[]).map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 transition-all ${
                scheme === s
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
              }`}
            >
              {t[s]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-none pb-6">
          {/* Круг */}
          <div className="flex justify-center mb-2">
            <div
              ref={wheelRef}
              className="relative w-[200px] h-[200px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: getWheelBackground(),
                boxShadow: '0 0 0 8px var(--color-surface), 0 8px 28px rgba(0,0,0,0.4)',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%, white 0%, ${colors.main} 42%, #111 95%)`,
                  boxShadow: 'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />
              <div
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                  transformOrigin: '50% 96px',
                }}
              />
            </div>
          </div>

          {/* Название пигмента */}
          {nearestPigment && scheme !== 'grayscale' && (
            <p className="text-center text-[12px] text-[var(--color-muted,#B9ACA0)] mb-3">
              {t.pigment}: {nearestPigment.name[lang] || nearestPigment.name.ru}
            </p>
          )}

          {/* Ползунки */}
          {scheme !== 'grayscale' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                  <span>{t.pure}</span>
                  <span>{t.white}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={whiteAmount}
                  onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                  <span>{t.pure}</span>
                  <span>{t.black}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={blackAmount}
                  onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5"
                />
              </div>
            </div>
          )}

          {/* 60/30/10 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl p-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
              <div className="w-full h-8 rounded-md mb-1.5" style={{ backgroundColor: colors.main }} />
              <div className="text-[11px] font-medium text-center">{t.main}</div>
            </div>
            <div className="rounded-xl p-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
              <div className="w-full h-8 rounded-md mb-1.5" style={{ backgroundColor: colors.secondary }} />
              <div className="text-[11px] font-medium text-center">{t.secondary}</div>
            </div>
            <div className="rounded-xl p-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
              <div className="w-full h-8 rounded-md mb-1.5" style={{ backgroundColor: colors.accent }} />
              <div className="text-[11px] font-medium text-center">{t.accent}</div>
            </div>
          </div>

          {/* Твой SVG кроссовок */}
          <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] mb-4 flex justify-center">
            <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="150" style={{ maxWidth: 320 }}>
              {/* Подошва */}
              <path
                d="M 40 200 L 360 200 C 380 200 380 230 360 230 L 40 230 C 20 230 20 200 40 200 Z"
                fill={colors.secondary}
                stroke="#111111"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Основная часть */}
              <path
                d="M 40 200 L 40 100 C 40 70 70 70 90 70 L 140 100 L 220 100 C 280 100 330 150 360 200 Z"
                fill={colors.main}
                stroke="#111111"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Носок */}
              <path
                d="M 280 160 C 320 160 350 180 360 200 L 280 200 Z"
                fill={colors.secondary}
                stroke="#111111"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Пятка */}
              <path
                d="M 40 200 L 40 130 C 70 130 90 160 90 200 Z"
                fill={colors.secondary}
                stroke="#111111"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Шнурки */}
              <path
                d="M 140 100 L 160 80 L 180 100 L 200 80 L 220 100 L 210 115 L 190 95 L 170 115 L 150 95 Z"
                fill={colors.accent}
                stroke="#111111"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="rounded-2xl p-3.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">{t.quote}</p>
            <p className="mt-1.5 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">Cordwainer</p>
          </div>
        </div>
      </div>
    </div>
  )
 }
