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

function haptic(style: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style)
  } catch {}
}

export function WelcomePage({ onStart, onOpenBlog, lang, setLang }: WelcomePageProps) {
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

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
    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
  }, [lang, setLang])

  const t = {
    ru: {
      hello: 'АТЕЛЬЕ ОТКРЫТО',
      helloBack: 'С ВОЗВРАЩЕНИЕМ',
      tagline: 'Энциклопедия обувного мастерства',
      subhead: 'The Shoemaker’s Lexicon & Bespoke System',
      value: 'Материалы, цвета, фасоны и калькуляторы — для сапожника, модельера и ортопеда.',
      ch1: '01 / Материалы',
      ch2: '02 / Силуэты',
      ch3: '03 / Расчёты',
      start: 'ОТКРЫТЬ АРХИВ',
      journal: 'ЖУРНАЛ',
    },
    uk: {
      hello: 'АТЕЛЬЄ ВІДКРИТО',
      helloBack: 'З ПОВЕРНЕННЯМ',
      tagline: 'Енциклопедія взуттєвої майстерності',
      subhead: 'The Shoemaker’s Lexicon & Bespoke System',
      value: 'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',
      ch1: '01 / Матеріали',
      ch2: '02 / Силуети',
      ch3: '03 / Розрахунки',
      start: 'ВІДКРИТИ АРХІВ',
      journal: 'ЖУРНАЛ',
    },
    de: {
      hello: 'ATELIER GEÖFFNET',
      helloBack: 'WILLKOMMEN ZURÜCK',
      tagline: 'Enzyklopädie der Schuhmacherkunst',
      subhead: 'The Shoemaker’s Lexicon & Bespoke System',
      value: 'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',
      ch1: '01 / Materialien',
      ch2: '02 / Silhouetten',
      ch3: '03 / Rechner',
      start: 'ARCHIV ÖFFNEN',
      journal: 'JOURNAL',
    },
  }[lang]

  const greetingText = returning
    ? firstName
      ? `${t.helloBack}, ${firstName.toUpperCase()}`
      : t.helloBack
    : firstName
    ? `${t.hello}, ${firstName.toUpperCase()}`
    : t.hello

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4EFE6]' : 'text-[#141210]'
  const cMuted = isDark ? 'text-[#F4EFE6]/65' : 'text-[#141210]/65'
  const cBorder = isDark ? 'border-[#F4EFE6]/15' : 'border-[#141210]/15'
  const cAccent = isDark ? 'text-[#C5A880]' : 'text-[#8C6D46]'

  const vignetteStyle: React.CSSProperties = {
    background: isDark
      ? 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.92) 32%, rgba(10,10,10,0.35) 62%, rgba(10,10,10,0.15) 100%)'
      : 'linear-gradient(to top, #F2EFE9 0%, rgba(242,239,233,0.92) 30%, rgba(242,239,233,0.28) 60%, rgba(242,239,233,0.0) 100%)',
  }

  return (
    <main className={`relative flex h-[100dvh] w-full flex-col justify-between overflow-y-auto select-none ${cBg} ${cText}`}>
      {/* 1. ФОНОВАЯ ИЛЛЮСТРАЦИЯ ОБЛОЖКИ */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/hero-cover.webp"
          alt="Cordwainer Lookbook Cover"
          fetchPriority="high"
          className={`h-full w-full object-cover object-[center_top] ${
            isDark ? 'opacity-75' : 'opacity-95'
          }`}
        />
        <div className="absolute inset-0" style={vignetteStyle} />
      </div>

      {/* 2. ШАПКА ОБЛОЖКИ */}
      <header className="relative z-20 px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#C5A880]' : 'bg-[#141210]'}`} />
          <span className="font-mono text-[9px] uppercase tracking-[0.25em]">
            ISSUE N° 01 // ARCHIVE
          </span>
        </div>

        {/* Переключатель языков */}
        <div className={`flex items-center border ${cBorder} px-1 py-0.5 backdrop-blur-md ${isDark ? 'bg-black/30' : 'bg-[#F2EFE9]/60'}`}>
          {(['ru', 'uk', 'de'] as Lang[]).map((l) => {
            const active = lang === l
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  haptic('light')
                  setLang(l)
                }}
                className={`px-2 py-1 text-[8px] font-mono uppercase tracking-[0.2em] border-0 outline-none cursor-pointer transition-colors ${
                  active
                    ? isDark
                      ? 'bg-[#F4EFE6] text-[#0A0A0A] font-semibold'
                      : 'bg-[#141210] text-[#F2EFE9] font-semibold'
                    : `bg-transparent ${cMuted}`
                }`}
              >
                {l === 'uk' ? 'UA' : l.toUpperCase()}
              </button>
            )
          })}
        </div>
      </header>

      {/* 3. НИЖНИЙ ЖУРНАЛЬНЫЙ БЛОК */}
      <section className="relative z-20 flex flex-col justify-end px-6 pb-9 sm:pb-12 mt-auto">
        {/* Приветствие */}
        <div className="flex items-center justify-between mb-2">
          <span className={`font-mono text-[8.5px] uppercase tracking-[0.28em] ${cAccent}`}>
            ✦ {greetingText}
          </span>
          <span className={`font-serif italic text-[11px] ${cMuted}`}>
            Vol. I — IV
          </span>
        </div>

        {/* Надзаголовок */}
        <p className={`text-[9.5px] font-sans font-medium uppercase tracking-[0.28em] mb-1.5 ${cMuted}`}>
          {t.tagline}
        </p>

        {/* Главный титул */}
        <h1 className="font-serif font-normal text-[14vw] min-[390px]:text-[56px] sm:text-[64px] leading-[0.88] tracking-[-0.03em] mb-2">
          Cordwainer
        </h1>

        <p className={`font-serif italic text-[13px] mb-5 ${cAccent}`}>
          {t.subhead}
        </p>

        {/* Индекс разделов */}
        <div className={`grid grid-cols-3 gap-2 py-2.5 mb-5 border-y ${cBorder} text-[8px] font-mono uppercase tracking-[0.16em] ${cMuted}`}>
          <span className="truncate">{t.ch1}</span>
          <span className={`truncate border-l pl-2 ${cBorder}`}>{t.ch2}</span>
          <span className={`truncate border-l pl-2 ${cBorder}`}>{t.ch3}</span>
        </div>

        {/* Описание */}
        <p className={`mb-7 max-w-[340px] text-[13px] font-sans font-light leading-[1.6] ${isDark ? 'text-[#F4EFE6]/80' : 'text-[#141210]/80'}`}>
          {t.value}
        </p>

        {/* Кнопки */}
        <div className="flex items-stretch gap-2.5 w-full">
          <button
            type="button"
            onClick={() => {
              haptic('medium')
              onStart?.()
            }}
            className={`flex-1 py-4 px-5 flex items-center justify-between text-[10px] font-sans font-medium uppercase tracking-[0.25em] border transition-transform active:scale-[0.98] cursor-pointer outline-none ${
              isDark
                ? 'bg-[#F4EFE6] text-[#0A0A0A] border-[#F4EFE6]'
                : 'bg-[#141210] text-[#F2EFE9] border-[#141210]'
            }`}
          >
            <span>{t.start}</span>
            <span className="text-[13px] leading-none">→</span>
          </button>

          {onOpenBlog && (
            <button
              type="button"
              onClick={() => {
                haptic('light')
                onOpenBlog()
              }}
              className={`px-4 py-4 border ${cBorder} text-[9px] font-mono uppercase tracking-[0.22em] bg-transparent ${cText} active:scale-[0.98] cursor-pointer outline-none`}
            >
              {t.journal}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
