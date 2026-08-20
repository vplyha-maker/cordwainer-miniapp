import { useState, useEffect, useRef } from 'react'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme = 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic' | 'grayscale'

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(30)
  const [whiteAmount, setWhiteAmount] = useState(0.25) // 0 = pure, 1 = white
  const [blackAmount, setBlackAmount] = useState(0.15) // 0 = pure, 1 = black
  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    if (savedLang && (savedLang === 'ru' || savedLang === 'uk') && savedLang !== lang) {
      setLang(savedLang)
    }
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
      monochromatic: 'Монохромная',
      grayscale: 'Чёрно-белая',
      baseColor: 'Круг Оствальда',
      ratio: 'Соотношение на обуви',
      main: 'Основной 60%',
      secondary: 'Вторичный 30%',
      accent: 'Акцент 10%',
      quote: '«Цвет — это душа обуви.»',
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый цвет',
    },
    uk: {
      title: 'Кольори та оздоблення',
      schemes: 'Колірні схеми',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрадна',
      monochromatic: 'Монохромна',
      grayscale: 'Чорно-біла',
      baseColor: 'Коло Оствальда',
      ratio: 'Співвідношення на взутті',
      main: 'Основний 60%',
      secondary: 'Вторинний 30%',
      accent: 'Акцент 10%',
      quote: '«Колір — це душа взуття.»',
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий колір',
    },
  }[lang]

  // Оствальд: цвет = чистый + белый + чёрный
  const makeOstwaldColor = (hue: number, white: number, black: number, sat = 55) => {
    // Упрощённая модель Оствальда
    const lightness = 50 * (1 - black) * (1 - white * 0.7) + white * 45
    const saturation = sat * (1 - white) * (1 - black * 0.8)
    return `hsl(${hue}, ${Math.max(5, saturation)}%, ${Math.max(8, Math.min(92, lightness))}%)`
  }

  const getColors = () => {
    const h = ((baseHue % 360) + 360) % 360

    if (scheme === 'grayscale') {
      return {
        main: `hsl(0, 0%, 22%)`,
        secondary: `hsl(0, 0%, 78%)`,
        accent: `hsl(0, 0%, 8%)`,
      }
    }

    if (scheme === 'monochromatic') {
      return {
        main: makeOstwaldColor(h, whiteAmount * 0.3, blackAmount + 0.25, 40),
        secondary: makeOstwaldColor(h, whiteAmount + 0.45, blackAmount * 0.3, 25),
        accent: makeOstwaldColor(h, whiteAmount * 0.1, blackAmount + 0.55, 35),
      }
    }

    switch (scheme) {
      case 'complementary':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.7, blackAmount * 0.6),
          accent: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.2, blackAmount * 0.3, 70),
        }
      case 'analogous':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 30) % 360, whiteAmount * 0.8, blackAmount * 0.5),
          accent: makeOstwaldColor((h - 30 + 360) % 360, whiteAmount * 0.3, blackAmount * 0.4, 65),
        }
      case 'triadic':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 120) % 360, whiteAmount * 0.7, blackAmount * 0.5),
          accent: makeOstwaldColor((h + 240) % 360, whiteAmount * 0.25, blackAmount * 0.35, 65),
        }
      case 'tetradic':
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 90) % 360, whiteAmount * 0.7, blackAmount * 0.5),
          accent: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.25, blackAmount * 0.35, 65),
        }
      default:
        return {
          main: makeOstwaldColor(h, whiteAmount, blackAmount),
          secondary: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.7, blackAmount * 0.6),
          accent: makeOstwaldColor((h + 180) % 360, whiteAmount * 0.2, blackAmount * 0.3, 70),
        }
    }
  }

  const colors = getColors()

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateHueFromEvent(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    updateHueFromEvent(e)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const updateHueFromEvent = (e: React.PointerEvent) => {
    const el = wheelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360
    setBaseHue(Math.round(angle))
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <h1 className="text-[22px] font-serif font-normal tracking-wide leading-none">
          {t.title}
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full p-1 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
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
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-8 overscroll-none">

        {/* Схемы */}
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
          {t.schemes}
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {(['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic', 'grayscale'] as Scheme[]).map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                scheme === s
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]'
              }`}
            >
              {t[s]}
            </button>
          ))}
        </div>

        {/* Круг Оствальда */}
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
          {t.baseColor}
        </p>

        <div className="flex justify-center mb-4">
          <div
            ref={wheelRef}
            className="relative w-[230px] h-[230px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
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
              boxShadow: '0 0 0 10px var(--color-surface), 0 10px 40px rgba(0,0,0,0.45)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Центральный круг (сечение Оствальда) */}
            <div
              className="absolute inset-[26%] rounded-full border border-white/20"
              style={{
                background: `radial-gradient(circle at 50% 30%, 
                  white 0%, 
                  hsl(${baseHue}, 60%, 55%) 45%, 
                  black 100%)`,
              }}
            />
            {/* Указатель */}
            <div
              className="absolute top-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg"
              style={{
                backgroundColor: `hsl(${baseHue}, 70%, 50%)`,
                transform: `translateX(-50%) rotate(${baseHue}deg)`,
                transformOrigin: '50% 107px',
              }}
            />
          </div>
        </div>

        {/* Ползунки Оствальда (белый / чёрный) */}
        {scheme !== 'grayscale' && (
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-[12px] mb-1.5 text-[var(--color-muted,#B9ACA0)]">
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
                className="w-full accent-[var(--color-accent,#E4D00A)]"
              />
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1.5 text-[var(--color-muted,#B9ACA0)]">
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
                className="w-full accent-[var(--color-accent,#E4D00A)]"
              />
            </div>
          </div>
        )}

        {/* Соотношение цветов */}
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
          {t.ratio}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-[14px] p-3 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <div className="w-full h-10 rounded-lg mb-2" style={{ backgroundColor: colors.main }} />
            <div className="text-[12px] font-medium">{t.main}</div>
          </div>
          <div className="rounded-[14px] p-3 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <div className="w-full h-10 rounded-lg mb-2" style={{ backgroundColor: colors.secondary }} />
            <div className="text-[12px] font-medium">{t.secondary}</div>
          </div>
          <div className="rounded-[14px] p-3 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
            <div className="w-full h-10 rounded-lg mb-2" style={{ backgroundColor: colors.accent }} />
            <div className="text-[12px] font-medium">{t.accent}</div>
          </div>
        </div>

        {/* Модель кроссовка */}
        <div className="rounded-[18px] p-5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] mb-5 flex justify-center">
          <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="160" style={{ maxWidth: 340 }}>
            {/* Подошва */}
            <path
              d="M 40 200 L 360 200 C 380 200 380 230 360 230 L 40 230 C 20 230 20 200 40 200 Z"
              fill={colors.secondary}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Основная часть */}
            <path
              d="M 40 200 L 40 100 C 40 70 70 70 90 70 L 140 100 L 220 100 C 280 100 330 150 360 200 Z"
              fill={colors.main}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Носок */}
            <path
              d="M 280 160 C 320 160 350 180 360 200 L 280 200 Z"
              fill={colors.secondary}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Пятка */}
            <path
              d="M 40 200 L 40 130 C 70 130 90 160 90 200 Z"
              fill={colors.secondary}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Шнурки */}
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
        <div className="rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))]">
          <p className="text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">{t.quote}</p>
          <p className="mt-2 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">Cordwainer</p>
        </div>
      </div>
    </div>
  )
}
