import { useState, useEffect } from 'react'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
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

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
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

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0A0A0A] text-[#F4F0E8]">
      
      {/* ФОНОВОЕ ИЗОБРАЖЕНИЕ И ГРАДИЕНТЫ */}
      <div className="absolute inset-0 z-0 bg-[#0A0A0A]">
        <img
          src="/hero-cover.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroReady(true)}
          className={`
            absolute inset-0 h-full w-full object-cover object-[center_top]
            transition-opacity duration-[1.5s] ease-out
            ${heroReady ? 'opacity-100' : 'opacity-0'}
            ${isDark ? 'brightness-90' : 'brightness-95'}
          `}
        />
        
        {/* Жесткий затемняющий градиент снизу для читаемости текста */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,10,10,0.1) 0%, rgba(10,10,10,0.4) 40%, rgba(10,10,10,0.85) 75%, rgba(10,10,10,0.98) 100%)'
          }}
        />
      </div>

      {/* КОНТЕНТНАЯ ЧАСТЬ */}
      <section className="relative z-20 flex h-full w-full flex-col justify-between px-6 py-8 lg:p-12">
        
        {/* ВЕРХНИЙ БЛОК (Мета-данные) */}
        <div className="flex w-full items-start justify-between">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.35em] text-white/70">
            {t.issue}
          </span>
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-white/50 text-right max-w-[120px]">
            {greeting}
          </span>
        </div>

        {/* НИЖНИЙ БЛОК (Типографика и кнопка) */}
        <div className="mb-4 flex w-full flex-col">
          
          <p className="mb-4 text-[10px] font-sans font-medium uppercase leading-[1.6] tracking-[0.25em] text-white/70">
            {t.tagline}
          </p>

          {/* Заголовок масштабируется через vw, чтобы не вылезать за края на любом смартфоне */}
          <h1 className="mb-8 font-serif text-[14vw] sm:text-[4rem] lg:text-[6rem] leading-[0.85] tracking-[-0.02em] text-white">
            Cordwainer
          </h1>

          <div className="h-px w-12 bg-white/30 mb-6" />
          
          <p className="mb-10 max-w-[320px] text-[14px] font-sans font-light leading-[1.6] text-white/80">
            {t.value}
          </p>
          
          <button
            type="button"
            onClick={onStart}
            className="group relative inline-flex items-center gap-4 self-start text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-white active:opacity-60"
          >
            <span className="relative z-10 transition-transform duration-500 ease-out group-hover:translate-x-2">
              {t.start}
            </span>
            <span className="relative z-10 block h-[1px] w-12 bg-white transition-all duration-500 ease-out group-hover:w-20" />
          </button>
          
        </div>
      </section>
    </main>
  )
}
