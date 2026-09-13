import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

function haptic(kind: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind)
  } catch {}
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

export function WelcomePage({ onStart, onOpenBlog, lang, setLang, favorites = [], onChangeTab }: WelcomePageProps) {
  const [showWidgetHint, setShowWidgetHint] = useState(false)
  const [heroReady, setHeroReady] = useState(false)
  const [firstName] = useState(getTelegramFirstName)
  const [returning] = useState(hasVisitedBefore)

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
  }, [lang, setLang])

  const t = {
    ru: {
      welcome: 'Добро пожаловать',
      hello: 'Привет',
      welcomeBack: 'С возвращением',
      helloBack: 'Снова здесь',
      tagline: 'Энциклопедия обувного мастерства',
      value: 'Материалы, цвета, фасоны и калькуляторы — для сапожника, модельера и ортопеда.',
      idea: 'Предмет как идея · Форма как язык · Мастерство как опыт',
      start: 'Начать обучение',
      continue: 'Продолжить',
      issue: 'ISSUE 01',
    },
    uk: {
      welcome: 'Ласкаво просимо',
      hello: 'Привіт',
      welcomeBack: 'З поверненням',
      helloBack: 'Знову тут',
      tagline: 'Енциклопедія взуттєвої майстерності',
      value: 'Матеріали, кольори, фасони і калькулятори — для шевця, модельєра та ортопеда.',
      idea: 'Предмет як ідея · Форма як мова · Майстерність як досвід',
      start: 'Почати навчання',
      continue: 'Продовжити',
      issue: 'ISSUE 01',
    },
    de: {
      welcome: 'Willkommen',
      hello: 'Hallo',
      welcomeBack: 'Willkommen zurück',
      helloBack: 'Wieder da',
      tagline: 'Enzyklopädie der Schuhmacherkunst',
      value: 'Materialien, Farben, Leisten und Rechner — für Schuhmacher, Designer und Orthopäden.',
      idea: 'Objekt als Idee · Form als Sprache · Handwerk als Erfahrung',
      start: 'Wissen entdecken',
      continue: 'Weiter',
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

  const ctaLabel = returning ? t.continue : t.start

  const handleStart = () => {
    haptic('medium')
    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
    onStart?.()
  }

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[#111] text-[#F5F1EA]">
      <div className="absolute inset-0 z-0">
        {!heroReady && (
          <div className="absolute inset-0 animate-pulse bg-[#1A1816]" aria-hidden />
        )}
        <img
          src="/hero-cover.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroReady(true)}
          className="absolute inset-0 w-full h-full object-cover object-[center_top]"
          style={{ opacity: heroReady ? 1 : 0, transition: 'opacity 500ms ease' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to bottom,
              rgba(17, 17, 17, 0.1) 0%,
              rgba(17, 17, 17, 0.4) 40%,
              rgba(17, 17, 17, 0.85) 75%,
              rgba(17, 17, 17, 1) 100%
            )`,
          }}
        />
      </div>

      {/* Пустое место сверху вместо языков и кнопки установки */}
      <div className="relative z-20 h-14" />

      <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-[110px]">
        <div className="mb-6">
          <p className="text-[10px] italic font-light opacity-60 mb-1">{greeting}</p>
          <h1 className="font-display text-[2.75rem] sm:text-[3rem] leading-none mb-2 drop-shadow-lg">
            Cordwainer
          </h1>
          <p className="text-[8.5px] uppercase tracking-[0.25em] opacity-60">
            {t.tagline}
          </p>
        </div>

        <div className="flex items-center gap-4 mb-4 opacity-50">
          <span className="h-[1px] flex-1 bg-white/30"></span>
          <span className="text-[8px] uppercase tracking-[0.3em] font-semibold">{t.issue}</span>
          <span className="h-[1px] flex-1 bg-white/30"></span>
        </div>

        <p className="text-[13px] font-light leading-relaxed mb-4 max-w-[90%] opacity-90">
          {t.value}
        </p>
        <p className="text-[9px] uppercase tracking-[0.15em] opacity-40 mb-6 leading-relaxed">
          {t.idea}
        </p>

        <button
          type="button"
          onClick={handleStart}
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-white/90 text-black active:scale-95 transition-transform"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] mt-0.5">
            {ctaLabel}
          </span>
          <span className="text-[16px] font-bold">→</span>
        </button>
      </div>

      <BottomDock active="profile" lang={lang} onChange={onChangeTab} />
    </div>
  )
 }
