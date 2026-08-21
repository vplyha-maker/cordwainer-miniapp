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

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(30)
  const [whiteAmount, setWhiteAmount] = useState(0.15)
  const [blackAmount, setBlackAmount] = useState(0.1)

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
      baseColor: 'Круг Иттена',
      ratio: 'Соотношение',
      main: '55%',
      secondary: '20%',
      secondary2: '15%',
      accent: '10%',
      quote: '«Цвет — это душа обуви.»',
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый',
      ittenLabel: 'Круг Иттена',
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
      baseColor: 'Коло Іттена',
      ratio: 'Співвідношення',
      main: '55%',
      secondary: '20%',
      secondary2: '15%',
      accent: '10%',
      quote: '«Колір — це душа взуття.»',
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий',
      ittenLabel: 'Коло Іттена',
    },
  }[lang]

  /** Itten-style pure hue → HSL with controlled white/black tint */
  const makeIttenColor = (
    hue: number,
    white: number,
    black: number,
    satBase = 72
  ): string => {
    const lightness = 52 * (1 - black) * (1 - white * 0.55) + white * 38
    const saturation = satBase * (1 - white * 0.85) * (1 - black * 0.7)
    return `hsl(${((hue % 360) + 360) % 360}, ${Math.max(8, Math.min(85, saturation))}%, ${Math.max(12, Math.min(90, lightness))}%)`
  }

  const getColors = useCallback((): string[] => {
    const h = ((baseHue % 360) + 360) % 360

    if (scheme === 'monochromatic') {
      return [
        makeIttenColor(h, whiteAmount * 0.2, blackAmount + 0.18, 48),
        makeIttenColor(h, whiteAmount + 0.35, blackAmount * 0.3, 28),
        makeIttenColor(h, whiteAmount * 0.05, blackAmount + 0.42, 40),
      ]
    }

    switch (scheme) {
      case 'complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.6, blackAmount * 0.5),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.12, blackAmount * 0.2, 78),
        ]
      case 'analogous':
        return [
          makeIttenColor(h, whiteAmount, blackAmount),
          makeIttenColor((h + 30) % 360, whiteAmount * 0.65, blackAmount * 0.4),
          makeIttenColor((h - 30 + 360) % 360, whiteAmount * 0.15, blackAmount * 0.3, 70),
        ]
      case 'triadic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount),
          makeIttenColor((h + 120) % 360, whiteAmount * 0.6, blackAmount * 0.4),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.15, blackAmount * 0.25, 72),
        ]
      case 'tetradic':
        // Itten Square tetrad: 4 colors exactly 90° (3 sectors) apart
        // Balance: Dominant \~55% | Support1 \~20% | Support2 \~15% | Accent \~10%
        // Secondary colors muted so the scheme doesn't become too flashy
        return [
          // 1. Main (dominant)
          makeIttenColor(h, whiteAmount, blackAmount, 70),
          // 2. Secondary support (h+90) — slightly muted
          makeIttenColor((h + 90) % 360, whiteAmount * 0.55 + 0.12, blackAmount * 0.45 + 0.08, 55),
          // 3. Secondary support (h+180) — complementary pair, more muted
          makeIttenColor((h + 180) % 360, whiteAmount * 0.5 + 0.15, blackAmount * 0.4 + 0.1, 50),
          // 4. Accent (h+270) — purest and brightest for small details
          makeIttenColor((h + 270) % 360, whiteAmount * 0.1, blackAmount * 0.15, 78),
        ]
      case 'split-complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount),
          makeIttenColor((h + 150) % 360, whiteAmount * 0.6, blackAmount * 0.45),
          makeIttenColor((h + 210) % 360, whiteAmount * 0.15, blackAmount * 0.25, 74),
        ]
      default:
        return [
          makeIttenColor(h, whiteAmount, blackAmount),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.6, blackAmount * 0.5),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.12, blackAmount * 0.2, 78),
        ]
    }
  }, [baseHue, whiteAmount, blackAmount, scheme])

  const colors = getColors()
  const isTetradic = scheme === 'tetradic'

  // Itten 12-sector wheel
  const wheelBackground = `conic-gradient(
    from 0deg,
    hsl(0, 80%, 50%),
    hsl(30, 80%, 50%),
    hsl(60, 80%, 50%),
    hsl(90, 80%, 50%),
    hsl(120, 80%, 50%),
    hsl(150, 80%, 50%),
    hsl(180, 80%, 50%),
    hsl(210, 80%, 50%),
    hsl(240, 80%, 50%),
    hsl(270, 80%, 50%),
    hsl(300, 80%, 50%),
    hsl(330, 80%, 50%),
    hsl(360, 80%, 50%)
  )`

  const pointerColor = `hsl(${baseHue}, 75%, 48%)`

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

    pendingValue.current = Math.round(angle)

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingValue.current !== null) {
          setBaseHue(pendingValue.current)
          pendingValue.current = null
        }
        rafId.current = null
      })
    }
  }, [])

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

  const pointerAngle = baseHue

  // Ratio labels: for tetradic follow Itten balance rules
  const ratioLabels = isTetradic
    ? [t.main, t.secondary, t.secondary2, t.accent] // 55 / 20 / 15 / 10
    : [t.main, t.secondary, t.accent]               // \~60 / 30 / 10

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
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 overflow-hidden">
        {/* Schemes — horizontal scroll */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-3 scrollbar-hide shrink-0">
          {(
            [
              'complementary',
              'analogous',
              'triadic',
              'tetradic',
              'split-complementary',
              'monochromatic',
            ] as Scheme[]
          ).map((s) => (
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

        {/* Main scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-none pb-6">
          {/* Itten wheel */}
          <div className="flex flex-col items-center mb-2">
            <div
              ref={wheelRef}
              className="relative w-[200px] h-[200px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                boxShadow: '0 0 0 8px var(--color-surface), 0 8px 28px rgba(0,0,0,0.4)',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Volumetric centre */}
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%,
                    white 0%,
                    ${colors[0]} 42%,
                    #111 95%)`,
                  boxShadow:
                    'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />

              {/* Pointer */}
              <div
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                  transformOrigin: '50% 96px',
                }}
              />
            </div>

            {/* Explicit Itten label */}
            <p className="mt-2 text-[12px] font-medium tracking-wide text-[var(--color-muted,#B9ACA0)]">
              {t.ittenLabel}
            </p>
          </div>

          {/* White / Black tints */}
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

          {/* Harmonic colour blocks */}
          <div
            className={`grid gap-2 mb-4 ${
              isTetradic ? 'grid-cols-4' : 'grid-cols-3'
            }`}
          >
            {colors.map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]"
              >
                <div
                  className="w-full h-10 rounded-md mb-1.5"
                  style={{ backgroundColor: c }}
                />
                <div className="text-[11px] font-medium text-center">
                  {ratioLabels[i]}
                </div>
              </div>
            ))}
          </div>

          {/* Continuous proportional bar according to Itten balance */}
          <div className="rounded-2xl overflow-hidden mb-4 border border-[var(--color-border,rgba(255,255,255,0.12))] h-14 flex">
            {colors.map((c, i) => {
              // Tetradic: 55 / 20 / 15 / 10  → flex 11 / 4 / 3 / 2
              // Others:   60 / 30 / 10     → flex 6 / 3 / 1
              const flex = isTetradic
                ? [11, 4, 3, 2][i]
                : [6, 3, 1][i]
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: c,
                    flex,
                  }}
                  className="h-full transition-colors duration-200"
                />
              )
            })}
          </div>

          {/* Quote */}
          <div className="rounded-2xl p-3.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <p className="text-[12px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">
              {t.quote}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">
              Cordwainer
            </p>
          </div>
        </div>
      </div>
    </div>
  )
 }
