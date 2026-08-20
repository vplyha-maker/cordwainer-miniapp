import { useState, useEffect } from 'react'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic'>('complementary')
  const [baseHue, setBaseHue] = useState(30) // начальный оттенок (коричневый/кожа)

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
      baseColor: 'Базовый цвет',
      ratio: 'Соотношение (обувь)',
      main: 'Основной 60%',
      secondary: 'Вторичный 30%',
      accent: 'Акцент 10%',
      quote: '«Цвет — это душа обуви.»',
    },
    uk: {
      title: 'Кольори та оздоблення',
      schemes: 'Колірні схеми',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрадна',
      monochromatic: 'Монохромна',
      baseColor: 'Базовий колір',
      ratio: 'Співвідношення (взуття)',
      main: 'Основний 60%',
      secondary: 'Вторинний 30%',
      accent: 'Акцент 10%',
      quote: '«Колір — це душа взуття.»',
    },
  }[lang]

  // Простая функция получения цветов по схеме (пока заглушка)
  const getColors = () => {
    const h = baseHue
    switch (scheme) {
      case 'complementary':
        return {
          main: `hsl(${h}, 55%, 35%)`,
          secondary: `hsl(${(h + 180) % 360}, 45%, 45%)`,
          accent: `hsl(${(h + 180) % 360}, 70%, 55%)`,
        }
      case 'analogous':
        return {
          main: `hsl(${h}, 55%, 35%)`,
          secondary: `hsl(${(h + 30) % 360}, 50%, 40%)`,
          accent: `hsl(${(h - 30 + 360) % 360}, 60%, 50%)`,
        }
      case 'triadic':
        return {
          main: `hsl(${h}, 55%, 35%)`,
          secondary: `hsl(${(h + 120) % 360}, 50%, 40%)`,
          accent: `hsl(${(h + 240) % 360}, 60%, 50%)`,
        }
      case 'tetradic':
        return {
          main: `hsl(${h}, 55%, 35%)`,
          secondary: `hsl(${(h + 90) % 360}, 50%, 40%)`,
          accent: `hsl(${(h + 180) % 360}, 60%, 50%)`,
        }
      case 'monochromatic':
        return {
          main: `hsl(${h}, 45%, 30%)`,
          secondary: `hsl(${h}, 35%, 45%)`,
          accent: `hsl(${h}, 55%, 60%)`,
        }
      default:
        return {
          main: `hsl(${h}, 55%, 35%)`,
          secondary: `hsl(${(h + 180) % 360}, 45%, 45%)`,
          accent: `hsl(${(h + 180) % 360}, 70%, 55%)`,
        }
    }
  }

  const colors = getColors()

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <h1 className="text-[22px] font-serif font-normal tracking-wide leading-none text-[var(--color-ink,#F5F1EA)]">
          {t.title}
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full p-1 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
            <button
              onClick={() => handleLangChange('ru')}
              className={`lang-toggle ${lang === 'ru' ? 'active' : 'inactive'}`}
              aria-pressed={lang === 'ru'}
            >
              RU
            </button>
            <button
              onClick={() => handleLangChange('uk')}
              className={`lang-toggle ${lang === 'uk' ? 'active' : 'inactive'}`}
              aria-pressed={lang === 'uk'}
            >
              UA
            </button>
          </div>

          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-ink,#F5F1EA)] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-8 overscroll-none">
        {/* Выбор схемы */}
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
          {t.schemes}
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {(['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                scheme === s
                  ? 'bg-[var(--color-accent,#E4D00A)] text-[var(--color-bg,#1C1816)]'
                  : 'bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] text-[var(--color-ink,#F5F1EA)]'
              }`}
            >
              {t[s]}
            </button>
          ))}
        </div>

        {/* Базовый цвет (ползунок) */}
        <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
          {t.baseColor}
        </p>
        <div className="mb-6">
          <input
            type="range"
            min="0"
            max="360"
            value={baseHue}
            onChange={(e) => setBaseHue(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-[var(--color-surface,#25201C)] accent-[var(--color-accent,#E4D00A)]"
          />
          <div className="flex justify-between text-[11px] text-[var(--color-muted,#B9ACA0)] mt-1">
            <span>0°</span>
            <span>{baseHue}°</span>
            <span>360°</span>
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

        {/* Место под SVG модель и круг Оствальда (добавим на следующих шагах) */}
        <div className="rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] mb-4">
          <p className="text-[13px] text-[var(--color-muted,#B9ACA0)] text-center">
            Здесь будет SVG-модель обуви + круг Оствальда
          </p>
        </div>

        {/* Quote */}
        <div className="rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] shadow-sm">
          <p className="text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">{t.quote}</p>
          <p className="mt-2 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">Cordwainer</p>
        </div>
      </div>
    </div>
  )
 }
