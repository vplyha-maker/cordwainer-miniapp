import { useState, useEffect, useRef, useCallback } from 'react'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split-complementary'
  | 'monochromatic'
  | 'grayscale'

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(30)
  const [whiteAmount, setWhiteAmount] = useState(0.2)
  const [blackAmount, setBlackAmount] = useState(0.15)

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingHue = useRef<number | null>(null)

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
    },
  }[lang]

  const makeOstwaldColor = (
    hue: number,
    white: number,
    black: number,
    satBase = 58
  ): string => {
    const lightness = 48 * (1 - black) * (1 - white * 0.65) + white * 42
    const saturation = satBase * (1 - white * 0.9) * (1 - black * 0.75)
    return `hsl(${hue}, ${Math.max(4, Math.min(80, saturation))}%, ${Math.max(7, Math.min(93, lightness))}%)`
  }

  const getColors = useCallback(() => {
    const h = ((baseHue % 360) + 360) % 360

    if (scheme === 'grayscale') {
      return {
        main: 'hsl(0, 0%, 20%)',
        secondary: 'hsl(0, 0%, 78%)',
        accent: 'hsl(0, 0%, 8%)',
      }
    }

    if (scheme === 'monochromatic') {
      return {
        main: makeOstwaldColor(h, whiteAmount * 0.25, blackAmount + 0.22, 38),
        secondary: makeOstwaldColor(h, whiteAmount + 0.4, blackAmount * 0.25, 22),
        accent: makeOstwaldColor(h, whiteAmount * 0.08, blackAmount + 0.5, 32),
      }
    }

    switch (scheme) {
      case 'complementary':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.65, blackAmount * 0.55),
          accent: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.15, blackAmount * 0.25, 68),
        }
      case 'analogous':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 28) % 360, whiteAmount * 0.7, blackAmount * 0.45),
          accent: makeOstwaldColor((h - 28 + 360) % 360, whiteAmount * 0.2, blackAmount * 0.35, 62),
        }
      case 'triadic':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 120) % 360, whiteAmount * 0.65, blackAmount * 0.45),
          accent: makeOstwaldColor((h + 240) % 360, whiteAmount * 0.18, blackAmount * 0.3, 64),
        }
      case 'tetradic':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 90) % 360, whiteAmount * 0.65, blackAmount * 0.45),
          accent: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.18, blackAmount * 0.3, 64),
        }
      case 'split-complementary':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 150) % 360, whiteAmount * 0.65, blackAmount * 0.5),
          accent: makeOstwaldColor((h + 210) % 360, whiteAmount * 0.18, blackAmount * 0.3, 66),
        }
      default:
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.65, blackAmount * 0.55),
          accent: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.15, blackAmount * 0.25, 68),
        }
    }
  }, [baseHue, whiteAmount, blackAmount, scheme])

  const colors = getColors()

  const updateHue = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360

    pendingHue.current = Math.round(angle)

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingHue.current !== null) {
          setBaseHue(pendingHue.current)
          pendingHue.current = null
        }
        rafId.current = null
      })
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateHue(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    updateHue(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-[20px] font-serif font-normal tracking-wide leading-none">
          {t.title}
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full p-0.5 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
            <button
              onClick={() => handleLangChange('ru')}
              className={`lang-toggle ${lang === 'ru' ? 'active' : 'inactive'}`}
            >
              RU
            </button>
            <button
              onClick={() => handleLangChange('uk')}
              className={`lang-toggle ${lang === 'uk' ? 'active' : 'inactive'}`}
            >
              UA
            </button>
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

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 overflow-hidden">

        {/* Схемы — горизонтальный скролл */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-3 scrollbar-hide shrink-0">
          {([
            'complementary',
            'analogous',
            'triadic',
            'tetradic',
            'split-complementary',
            'monochromatic',
            'grayscale',
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

        {/* Основной блок */}
        <div className="flex-1 overflow-y-auto overscroll-none pb-6">

          {/* Круг Оствальда */}
          <div className="flex justify-center mb-3">
            <div
              ref={wheelRef}
              className="relative w-[200px] h-[200px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: `conic-gradient(
                  from 0deg,
                  hsl(0, 75%, 50%),
                  hsl(30, 75%, 50%),
                  hsl(60, 75%, 50%),
                  hsl(90, 75%, 50%),
                  hsl(120, 75%, 50%),
                  hsl(150, 75%, 50%),
                  hsl(180, 75%, 50%),
                  hsl(210, 75%, 50%),
                  hsl(240, 75%, 50%),
                  hsl(270, 75%, 50%),
                  hsl(300, 75%, 50%),
                  hsl(330, 75%, 50%),
                  hsl(360, 75%, 50%)
                )`,
                boxShadow: '0 0 0 8px var(--color-surface), 0 8px 28px rgba(0,0,0,0.4)',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Объёмный центр */}
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%,
                    white 0%,
                    ${colors.main} 42%,
                    #111 95%)`,
                  boxShadow: 'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />

              {/* Указатель */}
              <div
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  backgroundColor: `hsl(${baseHue}, 70%, 50%)`,
                  transform: `translateX(-50%) rotate(${baseHue}deg)`,
                  transformOrigin: '50% 96px',
                }}
              />
            </div>
          </div>

          {/* Ползунки (компактные) */}
          {scheme !== 'grayscale' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1 text-[var(--color-muted,#B9ACA0)]">
                  <span>{t.pure}</span>
                  <span>{t.white}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
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
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={blackAmount}
                  onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-accent,#E4D00A)] h-1.5"
                />
              </div>
            </div>
          )}

          {/* Компактные 60/30/10 */}
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

          {/* Кроссовок */}
          <div className="rounded-2xl p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] mb-4 flex justify-center">
            <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="140" style={{ maxWidth: 300 }}>
              <path
                d="M 40 200 L 360 200 C 380 200 380 230 360 230 L 40 230 C 20 230 20 200 40 200 Z"
                fill={colors.secondary}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M 40 200 L 40 100 C 40 70 70 70 90 70 L 140 100 L 220 100 C 280 100 330 150 360 200 Z"
                fill={colors.main}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M 280 160 C 320 160 350 180 360 200 L 280 200 Z"
                fill={colors.secondary}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M 40 200 L 40 130 C 70 130 90 160 90 200 Z"
                fill={colors.secondary}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M 140 100 L 160 80 L 180 100 L 200 80 L 220 100 L 210 115 L 190 95 L 170 115 L 150 95 Z"
                fill={colors.accent}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Quote */}
          <div className="rounded-2xl p-3.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">{t.quote}</p>
            <p className="mt-1.5 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">Cordwainer</p>
          </div>
        </div>
      </div>
    </div>
  )
}
