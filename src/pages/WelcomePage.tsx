import { useState, useEffect } from 'react'
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

export function WelcomePage({ onStart, lang, setLang }: WelcomePageProps) {
  const [heroReady, setHeroReady] = useState(false)
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)
  const [mounted, setMounted] = useState(false) // Стейт для запуска крутых анимаций

  // Запускаем анимации после монтирования компонента
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang: Lang = supportedLangs.includes(sysLang as Lang) ? (sysLang as Lang) : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }
    try { localStorage.setItem('cordwainer_visited', '1') } catch {}
  }, [lang, setLang])

  const t = {
    ru: {
      hello: 'Привет',
      helloBack: 'Снова здесь',
      welcome: 'Добро пожаловать',
      welcomeBack: 'С возвращением',
      tagline: 'Энциклопедия обувного мастерства',
      value: 'Материалы, цвета, фасоны и калькуляторы — для сапожника, модельера и ортопеда.',
      issue: 'ISSUE 01',
      start: 'НАЧАТЬ ИССЛЕДОВАНИЕ',
    },
    uk: {
      hello: 'Привіт',
      helloBack: 'Знову тут',
      welcome: 'Ласкаво просимо',
      welcomeBack: 'З поверненням',
      tagline: 'Енциклопедія взуттєвої майстерності',
      value: 'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',
      issue: 'ISSUE 01',
      start: 'ПОЧАТИ ДОСЛІДЖЕННЯ',
    },
    de: {
      hello: 'Hallo',
      helloBack: 'Wieder da',
      welcome: 'Willkommen',
      welcomeBack: 'Willkommen zurück',
      tagline: 'Enzyklopädie der Schuhmacherkunst',
      value: 'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',
      issue: 'ISSUE 01',
      start: 'ENTDECKEN',
    },
  }[lang]

  const greeting = returning
    ? firstName ? `${t.helloBack}, ${firstName}` : t.welcomeBack
    : firstName ? `${t.hello}, ${firstName}` : t.welcome

  // Утилита для премиальной анимации (берем easing из концепта выше)
  const revealClass = (delayMs: number) => `
    transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]
    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
  `

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0A0A0A]">
      
      {/* 1. АНИМИРОВАННЫЙ ФОН */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-cover.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroReady(true)}
          className={`
            absolute inset-0 h-full w-full object-cover object-[center_top]
            transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${heroReady && mounted ? 'opacity-80 scale-100' : 'opacity-0 scale-105'}
          `}
        />
        <div className="absolute inset-0 bg-black/20 z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-[65%] z-10 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/85 to-transparent pointer-events-none" />
      </div>

      {/* 2. МЕТА-ДАННЫЕ ВВЕРХУ */}
      <div className={`absolute top-6 left-6 right-6 z-30 flex items-start justify-between ${revealClass(100)}`} style={{ transitionDelay: '100ms' }}>
        <span className="text-[10px] font-sans font-medium uppercase tracking-[0.35em] text-[#F4F0E8]/70">
          {t.issue}
        </span>
        <span className="max-w-[120px] text-right text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-[#F4F0E8]/50">
          {greeting}
        </span>
      </div>

      {/* 3. ОСНОВНОЙ КОНТЕНТ СНИЗУ (С каскадной анимацией) */}
      <section className="relative z-30 flex h-full w-full flex-col justify-end px-6 pb-12 sm:pb-16">
        <div className="flex w-full flex-col">
          
          <div className={revealClass(200)} style={{ transitionDelay: '200ms' }}>
            <p className="mb-3 text-[10px] font-sans font-medium uppercase leading-[1.6] tracking-[0.25em] text-[#F4F0E8]/70">
              {t.tagline}
            </p>
          </div>

          <div className={revealClass(350)} style={{ transitionDelay: '350ms' }}>
            <h1 className="mb-6 font-serif text-4xl min-[375px]:text-5xl sm:text-6xl leading-[0.9] tracking-[-0.02em] text-[#F4F0E8]">
              Cordwainer
            </h1>
          </div>

          <div className={revealClass(500)} style={{ transitionDelay: '500ms' }}>
            <div className="mb-6 h-px w-10 bg-[#F4F0E8]/30" />
            <p className="mb-10 max-w-[320px] text-[14px] font-sans font-light leading-[1.6] text-[#F4F0E8]/80">
              {t.value}
            </p>
          </div>
          
          {/* Кнопка с анимацией */}
          <div className={revealClass(650)} style={{ transitionDelay: '650ms' }}>
            <button
              type="button"
              onClick={onStart}
              className="group relative inline-flex items-center gap-4 self-start text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-[#F4F0E8] transition-opacity active:opacity-60"
            >
              <span className="relative z-10 transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
                {t.start}
              </span>
              <span className="relative z-10 block h-[1px] w-12 bg-[#F4F0E8] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-16" />
            </button>
          </div>
          
        </div>
      </section>

    </main>
  )
}
