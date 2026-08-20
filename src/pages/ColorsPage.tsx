import { useState, useEffect, useRef } from 'react'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme = 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic'

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(28) // тёплый коричневый — типичная кожа
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
      baseColor: 'Базовый цвет (круг)',
      ratio: 'Соотношение на обуви',
      main: 'Основной 60%',
      secondary: 'Вторичный 30%',
      accent: 'Акцент 10%',
      quote: '«Цвет — это душа обуви.»',
      drag: 'Крути круг',
    },
    uk: {
      title: 'Кольори та оздоблення',
      schemes: 'Колірні схеми',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрадна',
      monochromatic: 'Монохромна',
      baseColor: 'Базовий колір (коло)',
      ratio: 'Співвідношення на взутті',
      main: 'Основний 60%',
      secondary: 'Вторинний 30%',
      accent: 'Акцент 10%',
      quote: '«Колір — це душа взуття.»',
      drag: 'Крути коло',
    },
  }[lang]

  // Генерация цветов по схеме
  const getColors = (hue: number, sch: Scheme) => {
    const h = ((hue % 360) + 360) % 360

    switch (sch) {
      case 'complementary':
        return {
          main: `hsl(${h}, 48%, 32%)`,
          secondary: `hsl(${(h + 180) % 360}, 42%, 42%)`,
          accent: `hsl(${(h + 180) % 360}, 65%, 58%)`,
        }
      case 'analogous':
        return {
          main: `hsl(${h}, 48%, 32%)`,
          secondary: `hsl(${(h + 28) % 360}, 44%, 40%)`,
          accent: `hsl(${(h - 28 + 360) % 360}, 55%, 52%)`,
        }
      case 'triadic':
        return {
          main: `hsl(${h}, 48%, 32%)`,
          secondary: `hsl(${(h + 120) % 360}, 44%, 40%)`,
          accent: `hsl(${(h + 240) % 360}, 58%, 52%)`,
        }
      case 'tetradic':
        return {
          main: `hsl(${h}, 48%, 32%)`,
          secondary: `hsl(${(h + 90) % 360}, 44%, 40%)`,
          accent: `hsl(${(h + 180) % 360}, 58%, 52%)`,
        }
      case 'monochromatic':
        return {
          main: `hsl(${h}, 42%, 28%)`,
          secondary: `hsl(${h}, 36%, 42%)`,
          accent: `hsl(${h}, 52%, 58%)`,
        }
      default:
        return {
          main: `hsl(${h}, 48%, 32%)`,
          secondary: `hsl(${(h + 180) % 360}, 42%, 42%)`,
          accent: `hsl(${(h + 180) % 360}, 65%, 58%)`,
        }
    }
  }

  const colors = getColors(baseHue, scheme)

  // Обработка вращения круга
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
    angle = (angle + 90 + 360) % 360 // 0 сверху
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
          {(['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic'] as Scheme[]).map((s) => (
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

        {/* Цветовой круг */}
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
          {t.baseColor} · {t.drag}
        </p>
        <div className="flex justify-center mb-6">
          <div
            ref={wheelRef}
            className="relative w-[220px] h-[220px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
            style={{
              background: `conic-gradient(
                from 0deg,
                hsl(0, 70%, 50%),
                hsl(60, 70%, 50%),
                hsl(120, 70%, 50%),
                hsl(180, 70%, 50%),
                hsl(240, 70%, 50%),
                hsl(300, 70%, 50%),
                hsl(360, 70%, 50%)
              )`,
              boxShadow: '0 0 0 8px var(--color-surface), 0 8px 32px rgba(0,0,0,0.4)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Внутренний круг */}
            <div className="absolute inset-[28%] rounded-full bg-[var(--color-bg,#1C1816)] border border-[var(--color-border,rgba(255,255,255,0.15))]" />

            {/* Указатель */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{
                backgroundColor: `hsl(${baseHue}, 70%, 50%)`,
                transform: `translateX(-50%) rotate(${baseHue}deg) translateY(0)`,
                transformOrigin: '50% 102px',
              }}
            />
          </div>
        </div>

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

        {/* SVG-модель обуви */}
        <div className="rounded-[18px] p-5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] mb-5 flex justify-center">
          <svg
            width="280"
            height="180"
            viewBox="0 0 280 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Подошва (вторичный цвет) */}
            <path
              d="M40 130 C60 145 120 155 180 148 C220 142 250 130 255 120 L250 135 C240 150 200 162 160 165 C100 170 50 155 35 140 Z"
              fill={colors.secondary}
            />
            {/* Основная часть (верх) — основной цвет 60% */}
            <path
              d="M45 125 C50 90 70 55 110 45 C150 35 190 50 210 75 C225 95 235 115 240 125 C200 135 120 140 60 130 Z"
              fill={colors.main}
            />
            {/* Язык / внутренняя часть */}
            <path
              d="M95 70 C110 55 140 52 165 65 C175 72 180 85 178 95 C160 88 130 85 105 92 Z"
              fill={colors.secondary}
              opacity="0.7"
            />
            {/* Детали / прострочка / акцент */}
            <path
              d="M70 100 Q120 90 170 100"
              stroke={colors.accent}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M80 115 Q130 108 175 112"
              stroke={colors.accent}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            {/* Каблук / задник акцент */}
            <path
              d="M40 125 C35 110 38 95 48 85 C55 95 52 115 48 125 Z"
              fill={colors.accent}
            />
            {/* Контур */}
            <path
              d="M45 125 C50 90 70 55 110 45 C150 35 190 50 210 75 C225 95 235 115 240 125"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="1.5"
              fill="none"
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
