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

export function WelcomePage({
  onStart,
  lang,
  setLang,
}: WelcomePageProps) {
  const [heroReady, setHeroReady] = useState(false)
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)
  const [isDark, setIsDark] = useState(true)

  /* -------------------------------------------------------
     THEME
  ------------------------------------------------------- */
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  /* -------------------------------------------------------
     LANGUAGE
  ------------------------------------------------------- */
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs: Lang[] = ['ru', 'uk', 'de']

    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    } else if (!savedLang) {
      const sysLang = navigator.language.slice(0, 2)
      const defaultLang: Lang = supportedLangs.includes(sysLang as Lang)
        ? (sysLang as Lang)
        : 'uk'
      setLang(defaultLang)
      localStorage.setItem('app_lang', defaultLang)
      localStorage.setItem('cordwainer_lang', defaultLang)
    }

    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  /* -------------------------------------------------------
     TRANSLATIONS
  ------------------------------------------------------- */
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
      start: 'НАЧАТЬ ИССЛЕДОВАНИЕ',
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
      start: 'ПОЧАТИ ДОСЛІДЖЕННЯ',
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
      start: 'ENTDECKEN',
    },
  }[lang]

  const greeting = returning
    ? firstName ? `${t.helloBack}, ${firstName}` : t.welcomeBack
    : firstName ? `${t.hello}, ${firstName}` : t.welcome

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <main
      className={`
        relative flex h-[100dvh] w-full flex-col overflow-hidden
        transition-colors duration-[1.2s] ease-[0.25,1,0.5,1]
        ${isDark ? 'bg-[#0A0A0A] text-[#F4F0E8]' : 'bg-[#F2EFE9] text-[#121212]'}
      `}
    >
      <div className="grid h-full grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 px-6 py-8 lg:p-16">
        
        {/* LEFT COLUMN: TYPOGRAPHY & NEGATIVE SPACE */}
        <section className="relative z-20 flex flex-col justify-between col-span-1 lg:col-span-5 h-full">
          
          {/* HEADER / META */}
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans font-medium uppercase tracking-[0.35em] opacity-60">
              {t.issue}
            </span>
            <span className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] opacity-40 lg:hidden">
              {greeting}
            </span>
          </div>

          {/* OVERSIZED TYPOGRAPHY (Broken grid overlapping) */}
          <div className="relative mt-auto mb-16 lg:mb-32 lg:w-[150%] z-30 pointer-events-none mix-blend-difference">
            <h1 className="font-serif text-[4.5rem] leading-[0.8] tracking-[-0.04em] lg:text-[9vw] text-[#F4F0E8]">
              Cordwainer
            </h1>
            <p className="mt-6 text-[10px] font-sans font-medium uppercase leading-[1.6] tracking-[0.25em] opacity-70 lg:max-w-[300px]">
              {t.tagline}
            </p>
          </div>

          {/* BOTTOM EDITORIAL TEXT & CTA */}
          <div className="max-w-[340px] mb-8 lg:mb-0">
            <div className="h-px w-12 bg-current opacity-20 mb-8" />
            <p className="text-[14px] font-sans font-light leading-[1.6] opacity-80 mb-10">
              {t.value}
            </p>
            
            <button
              type="button"
              onClick={onStart}
              className="
                group relative inline-flex items-center gap-6 overflow-hidden
                text-[11px] font-sans font-medium uppercase tracking-[0.2em]
              "
            >
              <span className="relative z-10 transition-transform duration-700 ease-[0.25,1,0.5,1] group-hover:translate-x-2">
                {t.start}
              </span>
              <span className="relative z-10 block h-[1px] w-12 bg-current transition-all duration-700 ease-[0.25,1,0.5,1] group-hover:w-20" />
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: KINETIC MEDIA */}
        <section className="absolute lg:relative inset-0 lg:inset-auto z-10 lg:col-span-7 h-full w-full pointer-events-none lg:pointer-events-auto">
          <div className="relative h-full w-full overflow-hidden flex items-center justify-end">
            
            {/* MAIN HERO IMAGE */}
            <div className="w-full h-full lg:h-[85%] lg:w-[90%] relative overflow-hidden bg-[var(--color-surface)]">
              <img
                src="/hero-cover.webp"
                alt=""
                fetchPriority="high"
                decoding="async"
                onLoad={() => setHeroReady(true)}
                className={`
                  absolute inset-0 h-full w-full object-cover object-[center_top]
                  transition-all duration-[2s] ease-[0.16,1,0.3,1] scale-105 lg:hover:scale-100
                  ${heroReady ? 'opacity-100' : 'opacity-0'}
                  ${isDark ? 'brightness-90' : 'brightness-95 contrast-125'}
                `}
              />
              
              {/* EDITORIAL GRADIENT OVERLAY */}
              <div 
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                  background: isDark
                    ? 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.2) 50%, transparent 100%)'
                    : 'linear-gradient(to top, rgba(242,239,233,0.85) 0%, rgba(242,239,233,0.1) 60%, transparent 100%)',
                }}
              />
            </div>

            {/* ASYMMETRICAL OFFSET FRAME (Visible on desktop) */}
            <div className="hidden lg:block absolute left-[-10%] bottom-[15%] w-[35%] aspect-[3/4] overflow-hidden z-20 bg-current">
              <img
                src="/hero-cover.webp"
                alt=""
                className={`
                  absolute inset-0 h-full w-full object-cover object-[center_bottom]
                  transition-transform duration-[1.5s] ease-[0.25,1,0.5,1] hover:scale-110
                  ${heroReady ? 'opacity-100' : 'opacity-0'}
                  ${isDark ? 'opacity-70 grayscale mix-blend-screen' : 'opacity-90 mix-blend-multiply'}
                `}
              />
            </div>
            
          </div>
        </section>
      </div>

      {/* FLOATING IDEA TICKER (Minimalist detail) */}
      <div className="absolute top-8 right-6 lg:right-16 z-30 hidden lg:block rotate-90 origin-right">
        <p className="text-[9px] font-sans font-medium uppercase tracking-[0.25em] opacity-30 whitespace-nowrap">
          {t.idea}
        </p>
      </div>
    </main>
  )
}
