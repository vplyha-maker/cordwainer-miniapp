import { useState, useEffect } from 'react'
import { BottomDock } from '../components/BottomDock'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenBlog?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

function getTelegramFirstName(): string {
  try {
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name
    if (typeof name === 'string') {
      const trimmed = name.trim()
      if (trimmed.length > 0 && trimmed.length < 32) return trimmed
    }
  } catch {}
  return ''
}

function hasVisitedBefore(): boolean {
  try {
    return localStorage.getItem('cordwainer_visited') === '1'
  } catch {
    return false
  }
}

export function WelcomePage({ onStart, lang, setLang, onChangeTab }: WelcomePageProps) {
  const [heroReady, setHeroReady] = useState(false)
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang = supportedLangs.includes(sysLang) ? (sysLang as Lang) : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }

    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  const t = {
    ru: {
      hello: 'Привет',
      helloBack: 'Снова здесь',
      welcome: 'Добро пожаловать',
      welcomeBack: 'С возвращением',
      tagline: 'Энциклопедия обувного мастерства',
      value: 'Материалы, цвета, фасоны и калькуляторы — для сапожника, модельера и ортопеда.',
      idea: 'Предмет как идея · Форма как язык · Мастерство как опыт',
      issue: 'ISSUE 01',
    },
    uk: {
      hello: 'Привіт',
      helloBack: 'Знову тут',
      welcome: 'Ласкаво просимо',
      welcomeBack: 'З поверненням',
      tagline: 'Енциклопедія взуттєвої майстерності',
      value: 'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',
      idea: 'Предмет як ідея · Форма як мова · Майстерність як досвід',
      issue: 'ISSUE 01',
    },
    de: {
      hello: 'Hallo',
      helloBack: 'Wieder da',
      welcome: 'Willkommen',
      welcomeBack: 'Willkommen zurück',
      tagline: 'Enzyklopädie der Schuhmacherkunst',
      value: 'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',
      idea: 'Objekt als Idee · Form als Sprache · Handwerk als Erfahrung',
      issue: 'ISSUE 01',
    },
  }[lang]

  const greeting = returning
    ? firstName
      ? `${t.helloBack}, ${firstName}`
      : t.welcomeBack
    : firstName
      ? `${t.hello}, ${firstName}`
      : t.welcome

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)] transition-colors duration-500">
      
      {/* Фон */}
      <div className="absolute inset-0 z-0">
        {!heroReady && (
          <div className="absolute inset-0 bg-[var(--color-surface)]" aria-hidden />
        )}
        <img
          src="/hero-cover.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroReady(true)}
          className="absolute inset-0 w-full h-full object-cover object-[center_top]"
          style={{
            opacity: heroReady ? (isDark ? 1 : 0.92) : 0,
            transition: 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: isDark
              ? `linear-gradient(
                  to bottom,
                  rgba(12, 10, 9, 0.15) 0%,
                  rgba(12, 10, 9, 0.35) 35%,
                  rgba(12, 10, 9, 0.78) 68%,
                  rgba(12, 10, 9, 0.94) 100%
                )`
              : `linear-gradient(
                  to bottom,
                  rgba(245, 241, 234, 0.25) 0%,
                  rgba(245, 241, 234, 0.55) 40%,
                  rgba(245, 241, 234, 0.88) 72%,
                  rgba(245, 241, 234, 0.97) 100%
                )`,
          }}
        />
      </div>

      {/* Контент */}
      <div className="relative z-20 flex-1 flex flex-col justify-end px-6 pb-[120px]">
        
        <div className="mb-8">
          <p className={`text-[9px] tracking-[0.35em] uppercase font-medium ${
            isDark ? 'text-white/50' : 'text-black/45'
          }`}>
            {t.issue}
          </p>
        </div>

        <p className={`text-[11px] tracking-[0.08em] mb-3 font-light ${
          isDark ? 'text-white/55' : 'text-black/55'
        }`}>
          {greeting}
        </p>

        {/* Название без "r" */}
        <h1 className={`font-display text-[3.1rem] leading-[0.92] tracking-tight mb-5 ${
          isDark ? 'text-white' : 'text-[#1C1816]'
        }`}>
          Cordwaine
        </h1>

        <p className={`text-[10px] uppercase tracking-[0.28em] mb-8 font-medium ${
          isDark ? 'text-white/45' : 'text-black/45'
        }`}>
          {t.tagline}
        </p>

        <div className={`w-10 h-px mb-8 ${
          isDark ? 'bg-white/25' : 'bg-black/20'
        }`} />

        <p className={`text-[13.5px] leading-[1.55] font-light max-w-[320px] mb-5 ${
          isDark ? 'text-white/75' : 'text-black/70'
        }`}>
          {t.value}
        </p>

        <p className={`text-[9.5px] tracking-[0.18em] uppercase leading-relaxed ${
          isDark ? 'text-white/35' : 'text-black/40'
        }`}>
          {t.idea}
        </p>
      </div>

      <BottomDock active="profile" lang={lang} onChange={onChangeTab} />
    </div>
  )
 }
