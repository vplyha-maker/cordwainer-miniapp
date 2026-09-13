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

export function WelcomePage({ onStart, onOpenBlog, lang, setLang, favorites = [] }: WelcomePageProps) {
  const blogFavorites = favorites.filter((f) => f.type === 'blog')
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
  }, [])

  const handleLangChange = (newLang: Lang) => {
    haptic('light')
    localStorage.setItem('app_lang', newLang)
    localStorage.setItem('cordwainer_lang', newLang)
    setLang(newLang)
  }

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
      favorites: 'Избранное',
      addToHomeShort: 'Установить',
      widgetTitle: 'Установка приложения',
      widgetText: 'Telegram не позволяет сохранять иконки напрямую. Откройте приложение в вашем браузере (Chrome или Safari), чтобы добавить его на экран.',
      widgetStep1: '1. Нажмите «Открыть в браузере» ниже',
      widgetStep2: '2. В меню браузера выберите «Добавить на главный экран»',
      widgetStep3: '3. Подтвердите установку',
      widgetAction: 'Открыть в браузере',
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
      favorites: 'Обране',
      addToHomeShort: 'Встановити',
      widgetTitle: 'Встановлення застосунку',
      widgetText: 'Telegram не дозволяє зберігати іконки безпосередньо. Відкрийте застосунок у вашому браузері (Chrome або Safari), щоб додати його на екран.',
      widgetStep1: '1. Натисніть «Відкрити в браузері» нижче',
      widgetStep2: '2. У меню браузера оберіть «На головний екран»',
      widgetStep3: '3. Підтвердіть встановлення',
      widgetAction: 'Відкрити в браузері',
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
      favorites: 'Favoriten',
      addToHomeShort: 'Installieren',
      widgetTitle: 'App installieren',
      widgetText: 'Telegram erlaubt kein direktes Speichern von Icons. Öffnen Sie die App in Ihrem Browser (Chrome oder Safari), um sie zum Startbildschirm hinzuzufügen.',
      widgetStep1: '1. Tippen Sie unten auf „Im Browser öffnen“',
      widgetStep2: '2. Wählen Sie im Browsermenü „Zum Startbildschirm hinzufügen“',
      widgetStep3: '3. Bestätigen Sie die Installation',
      widgetAction: 'Im Browser öffnen',
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

  const handleAddToHome = async () => {
    haptic('light')
    const deferredPrompt = (window as any).deferredPrompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          ;(window as any).deferredPrompt = null
          return
        }
      } catch {}
    }
    setShowWidgetHint(true)
  }

  const handleOpenInBrowser = () => {
    haptic('medium')
    const appUrl = 'https://cordwainer-miniapp.vercel.app'
    const tg = window.Telegram?.WebApp

    if (tg && tg.openLink) {
      tg.openLink(appUrl)
    } else {
      window.open(appUrl, '_blank')
    }
    setShowWidgetHint(false)
  }

  const handleStart = () => {
    haptic('medium')
    try {
      localStorage.setItem('cordwainer_visited', '1')
    } catch {}
    onStart?.()
  }

  const handleOpenFavorites = () => {
    haptic('light')
    const first = blogFavorites[0]
    if (first?.id === 'blog-orvard' && onOpenBlog) {
      onOpenBlog()
      return
    }
    onStart?.()
  }

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="relative flex-1 min-h-[220px] overflow-hidden">
        {!heroReady && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: 'var(--color-surface-2, #2F2924)' }}
            aria-hidden
          />
        )}
        <img
          src="/hero-cover.webp"
          alt=""
          width={780}
          height={1040}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroReady(true)}
          className="absolute inset-0 w-full h-full object-cover object-[center_28%]"
          style={{ opacity: heroReady ? 1 : 0, transition: 'opacity 280ms ease' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to bottom,
              rgba(12, 8, 6, 0.38) 0%,
              rgba(12, 8, 6, 0.12) 42%,
              color-mix(in srgb, var(--color-bg) 55%, transparent) 78%,
              var(--color-bg) 100%
            )`,
          }}
        />

        <div className="absolute inset-0 p-4 flex flex-col justify-between z-20">
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex rounded-full p-1"
              style={{
                background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(12px)',
              }}
              role="group"
              aria-label="Language selection"
            >
              {(['ru', 'uk', 'de'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLangChange(l)}
                  className={`min-h-9 min-w-9 px-2.5 text-[10px] font-bold tracking-wide uppercase rounded-full transition-colors ${
                    lang === l
                      ? 'bg-[var(--color-ink)] text-[var(--color-bg)]'
                      : 'text-[var(--color-muted)]'
                  }`}
                  aria-pressed={lang === l}
                >
                  {l === 'uk' ? 'UKR' : l}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddToHome}
              className="flex items-center justify-center gap-1.5 min-h-9 px-3 rounded-full active:scale-95 transition-transform"
              style={{
                background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(12px)',
              }}
              aria-label={t.addToHomeShort}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink)' }}>
                {t.addToHomeShort}
              </span>
            </button>
          </div>

          <div className="pb-3">
            <p
              className="text-[12px] font-medium tracking-[0.04em] mb-2"
              style={{ color: '#F5F1EA', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}
            >
              {greeting}
            </p>
            <h1
              className="font-display text-[2.15rem] sm:text-[2.5rem] leading-[0.92]"
              style={{
                color: '#F5F1EA',
                textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              }}
            >
              Cordwainer
            </h1>
            <p
              className={`mt-2 tracking-[0.18em] uppercase font-semibold ${lang === 'de' ? 'text-[8.5px]' : 'text-[10px]'}`}
              style={{ color: '#F5F1EA', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}
            >
              {t.tagline}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-30 px-4 pt-1 pb-[118px] shrink-0">
        <p
          className="text-[9px] tracking-[0.18em] uppercase mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          Issue 01 · 2026
        </p>
        <p
          className="text-[14px] leading-snug font-medium mb-2 max-w-[34ch]"
          style={{ color: 'var(--color-ink)' }}
        >
          {t.value}
        </p>
        <p
          className="text-[10px] tracking-[0.06em] leading-relaxed mb-5"
          style={{ color: 'var(--color-muted)' }}
        >
          {t.idea}
        </p>

        {blogFavorites.length > 0 && (
          <button
            type="button"
            onClick={handleOpenFavorites}
            className="w-full mb-4 rounded-2xl px-3 py-2.5 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            aria-label={`${t.favorites} ${blogFavorites.length}`}
          >
            <div className="flex -space-x-2 shrink-0">
              {blogFavorites.slice(0, 3).map((item) => (
                <img
                  key={item.id}
                  src={item.imagePng}
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover"
                  style={{ border: '2px solid var(--color-surface)' }}
                  decoding="async"
                />
              ))}
            </div>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--color-ink)' }}>
              {t.favorites} · {blogFavorites.length}
            </span>
            <span className="ml-auto text-[16px] font-bold" style={{ color: 'var(--color-accent, #C49A5A)' }} aria-hidden>
              →
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleStart}
          className="btn-primary w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
          aria-label={ctaLabel}
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-bg)',
            minHeight: '64px',
            height: 'auto',
          }}
        >
          <div className="relative flex items-center justify-between px-6 py-4">
            <div className="flex flex-col text-left">
              <span
                className="uppercase text-[10px] tracking-[.30em] font-bold"
                style={{ color: 'var(--color-bg)', opacity: 0.72 }}
              >
                {t.issue}
              </span>
              <span className={`${lang === 'de' ? 'text-[17px]' : 'text-[20px]'} font-bold mt-0.5`}>
                {ctaLabel}
              </span>
            </div>
            <div className="text-[28px] font-bold leading-none" aria-hidden>
              →
            </div>
          </div>
        </button>
      </div>

      <BottomDock active="search" lang={lang} />

      <AnimatePresence>
        {showWidgetHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setShowWidgetHint(false)}
          >
            <div
              className="absolute inset-0 backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            />

            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md mx-4 mb-6 rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent, #B46513) 15%, var(--color-surface))',
                      color: 'var(--color-accent, #B46513)',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  </div>
                  <div
                    className="text-[17px] font-bold"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {t.widgetTitle}
                  </div>
                </div>

                <p
                  className="text-[14px] leading-relaxed mb-5 font-medium"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {t.widgetText}
                </p>

                <div className="space-y-3 mb-6">
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                    <span style={{ color: 'var(--color-accent, #B46513)' }}>{t.widgetStep1}</span>
                  </div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                    <span style={{ color: 'var(--color-accent, #B46513)' }}>{t.widgetStep2}</span>
                  </div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                    <span style={{ color: 'var(--color-accent, #B46513)' }}>{t.widgetStep3}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenInBrowser}
                  className="w-full py-4 rounded-2xl text-[14px] font-bold uppercase tracking-wider active:scale-[0.98] transition-transform shadow-md"
                  style={{
                    background: 'var(--color-ink)',
                    color: 'var(--color-bg)',
                  }}
                >
                  {t.widgetAction}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
