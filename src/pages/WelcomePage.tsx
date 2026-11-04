import { useState, useEffect } from 'react'
import type { Lang, FavoriteItem } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenMaterials?: () => void
  onOpenStyles?: () => void
  onOpenCalc?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

function getTelegramFirstName(): string {
  try {
    const name = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name
    if (typeof name === 'string') {
      // Удаляем любые эмодзи и спецсимволы, оставляя только буквы, пробелы и дефис
      const cleaned = name.replace(/[^\p{L}\s-]/gu, '').trim()
      if (cleaned.length > 0 && cleaned.length < 32) return cleaned
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

export function WelcomePage({
  onStart,
  onOpenMaterials,
  onOpenStyles,
  onOpenCalc,
  lang,
  setLang,
}: WelcomePageProps) {
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
      ch1: 'Cardio',
      ch2: 'Силуэты',
      ch3: 'Расчёты',
      start: 'ОТКРЫТЬ АРХИВ',
    },
    uk: {
      hello: 'АТЕЛЬЄ ВІДКРИТО',
      helloBack: 'З ПОВЕРНЕННЯМ',
      tagline: 'Енциклопедія взуттєвої майстерності',
      subhead: 'The Shoemaker’s Lexicon & Bespoke System',
      value: 'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',
      ch1: 'Cardio',
      ch2: 'Силуети',
      ch3: 'Розрахунки',
      start: 'ВІДКРИТИ АРХІВ',
    },
    de: {
      hello: 'ATELIER GEÖFFNET',
      helloBack: 'WILLKOMMEN ZURÜCK',
      tagline: 'Enzyklopädie der Schuhmacherkunst',
      subhead: 'The Shoemaker’s Lexicon & Bespoke System',
      value: 'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',
      ch1: 'Cardio',
      ch2: 'Silhouetten',
      ch3: 'Rechner',
      start: 'ARCHIV ÖFFNEN',
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
  const cMuted = isDark ? 'text-[#F4EFE6]/60' : 'text-[#141210]/60'
  const cBorder = isDark ? 'border-[#F4EFE6]/15' : 'border-[#141210]/15'
  const cAccent = isDark ? 'text-[#C5A880]' : 'text-[#7A5C38]'

  const vignetteStyle: React.CSSProperties = {
    background: isDark
      ? 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.94) 34%, rgba(10,10,10,0.38) 65%, rgba(10,10,10,0.12) 100%)'
      : 'linear-gradient(to top, #F2EFE9 0%, rgba(242,239,233,0.95) 32%, rgba(242,239,233,0.3) 62%, rgba(242,239,233,0.0) 100%)',
  }

  const chapters = [
    { num: '01', label: t.ch1, onClick: onOpenMaterials },
    { num: '02', label: t.ch2, onClick: onOpenStyles },
    { num: '03', label: t.ch3, onClick: onOpenCalc },
  ]

  return (
    <main
      className={`relative flex h-[100dvh] w-full flex-col justify-between overflow-y-auto select-none ${cBg} ${cText}`}
    >
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

      {/* 2. ВЕРХНИЙ КОЛОНТИТУЛ ЛУКБУКА */}
      <header className="relative z-20 px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isDark ? 'bg-[#C5A880]' : 'bg-[#141210]'
            }`}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.28em]">
            ISSUE N° 01 // ARCHIVE
          </span>
        </div>

        {/* Переключатель языков */}
        <div
          className={`flex items-center border ${cBorder} p-0.5 backdrop-blur-md ${
            isDark ? 'bg-black/35' : 'bg-[#F2EFE9]/70'
          }`}
        >
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
                className={`px-2 py-1 text-[8px] font-mono uppercase tracking-[0.22em] border-0 outline-none cursor-pointer transition-all ${
                  active
                    ? isDark
                      ? 'bg-[#F4EFE6] text-[#0A0A0A] font-semibold'
                      : 'bg-[#141210] text-[#F2EFE9] font-semibold'
                    : `bg-transparent ${cMuted} hover:opacity-100`
                }`}
              >
                {l === 'uk' ? 'UA' : l.toUpperCase()}
              </button>
            )
          })}
        </div>
      </header>

      {/* 3. НИЖНИЙ РЕДАКЦИОННЫЙ БЛОК */}
      <section className="relative z-20 flex flex-col justify-end px-6 pb-8 sm:pb-12 mt-auto">
        {/* Приветствие в стиле модного дома (без эмодзи) */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-block w-4 h-[1px] ${
                isDark ? 'bg-[#C5A880]/70' : 'bg-[#7A5C38]/70'
              }`}
            />
            <span className={`font-mono text-[8.5px] uppercase tracking-[0.3em] ${cAccent}`}>
              {greetingText}
            </span>
          </div>
          <span className={`font-serif italic text-[11px] tracking-wide ${cMuted}`}>
            Vol. I — IV
          </span>
        </div>

        {/* Надзаголовок */}
        <p
          className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-1 ${cMuted}`}
        >
          {t.tagline}
        </p>

        {/* Главный титул */}
        <h1 className="font-serif font-normal text-[14.5vw] min-[390px]:text-[58px] sm:text-[66px] leading-[0.86] tracking-[-0.035em] mb-2">
          Cordwainer
        </h1>

        <p className={`font-serif italic text-[13.5px] tracking-[0.01em] mb-5 ${cAccent}`}>
          {t.subhead}
        </p>

        {/* ИНТЕРАКТИВНЫЙ ИНДЕКС РАЗДЕЛОВ (01 Cadio / 02 Силуэты / 03 Расчёты) */}
        <nav
          aria-label="Lookbook chapters"
          className={`grid grid-cols-3 border-y ${cBorder} divide-x ${
            isDark ? 'divide-[#F4EFE6]/15' : 'divide-[#141210]/15'
          } mb-5 backdrop-blur-[2px]`}
        >
          {chapters.map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                haptic('light')
                item.onClick?.()
              }}
              className={`group flex flex-col items-start justify-between py-3 px-2.5 first:pl-0 last:pr-0 bg-transparent border-0 outline-none cursor-pointer text-left transition-opacity active:opacity-60`}
            >
              <div className="w-full flex items-center justify-between mb-1">
                <span className={`font-mono text-[8px] tracking-[0.22em] ${cAccent}`}>
                  {item.num}
                </span>
                <span
                  className={`font-mono text-[9px] leading-none transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${cMuted}`}
                >
                  ↗
                </span>
              </div>
              <span className="font-sans text-[9.5px] font-medium uppercase tracking-[0.2em] truncate w-full">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Редакционное описание */}
        <p
          className={`mb-6 max-w-[340px] text-[12.5px] font-sans font-light leading-[1.65] ${
            isDark ? 'text-[#F4EFE6]/80' : 'text-[#141210]/80'
          }`}
        >
          {t.value}
        </p>

        {/* ГЛАВНАЯ КНОПКА (Во всю ширину, без кнопки «Журнал») */}
        <button
          type="button"
          onClick={() => {
            haptic('medium')
            onStart?.()
          }}
          className={`w-full py-4 px-6 flex items-center justify-between text-[10px] font-sans font-medium uppercase tracking-[0.28em] border transition-all active:scale-[0.985] cursor-pointer outline-none ${
            isDark
              ? 'bg-[#F4EFE6] text-[#0A0A0A] border-[#F4EFE6] hover:bg-[#F4EFE6]/90'
              : 'bg-[#141210] text-[#F2EFE9] border-[#141210] hover:bg-[#141210]/90'
          }`}
        >
          <span>{t.start}</span>
          <span className="font-mono text-[13px] leading-none tracking-normal">⟶</span>
        </button>
      </section>
    </main>
  )
}
