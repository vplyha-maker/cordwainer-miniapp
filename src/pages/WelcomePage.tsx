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
  }, [lang, setLang])

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
      widgetText: 'Telegram не позволяет сохранять иконки напрямую. Откройте приложение в вашем браузере (Chrome или Safari).',
      widgetStep1: '1. Нажмите «Открыть в браузере»',
      widgetStep2: '2. Выберите «На главный экран»',
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
      widgetText: 'Telegram не дозволяє зберігати іконки безпосередньо. Відкрийте застосунок у вашому браузері (Chrome або Safari).',
      widgetStep1: '1. Натисніть «Відкрити в браузері»',
      widgetStep2: '2. Оберіть «На головний екран»',
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
      widgetText: 'Telegram erlaubt kein direktes Speichern von Icons. Öffnen Sie die App in Ihrem Browser.',
      widgetStep1: '1. Tippen Sie auf „Im Browser öffnen“',
      widgetStep2: '2. Wählen Sie „Zum Startbildschirm hinzufügen“',
      widgetStep3: '3. Bestätigen Sie',
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
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[#111] text-[#F5F1EA]">
      {/* Иллюстрация теперь занимает 100% экрана с мягким затемнением внизу */}
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

      {/* Верхняя панель управления */}
      <div className="relative z-20 flex items-start justify-between p-4">
        <div
          className="flex rounded-full p-1 bg-black/20 backdrop-blur-md border border-white/10"
        >
          {(['ru', 'uk', 'de'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => handleLangChange(l)}
              className={`min-h-8 min-w-8 px-2.5 text-[9px] font-bold tracking-widest uppercase rounded-full transition-colors ${
                lang === l ? 'bg-white/90 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {l === 'uk' ? 'UKR' : l}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddToHome}
          className="flex items-center gap-1.5 min-h-8 px-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 active:scale-95 transition-transform"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/90">
            {t.addToHomeShort}
          </span>
        </button>
      </div>

      {/* Контентная часть — прижата вниз */}
      <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-[110px]">
        
        {/* Заголовок */}
        <div className="mb-6">
          <p className="text-[10px] italic font-light opacity-60 mb-1">{greeting}</p>
          <h1 className="font-display text-[2.75rem] sm:text-[3rem] leading-none mb-2 drop-shadow-lg">
            Cordwainer
          </h1>
          <p className="text-[8.5px] uppercase tracking-[0.25em] opacity-60">
            {t.tagline}
          </p>
        </div>

        {/* Разделитель "Журнала" */}
        <div className="flex items-center gap-4 mb-4 opacity-50">
          <span className="h-[1px] flex-1 bg-white/30"></span>
          <span className="text-[8px] uppercase tracking-[0.3em] font-semibold">{t.issue}</span>
          <span className="h-[1px] flex-1 bg-white/30"></span>
        </div>

        {/* Тексты */}
        <p className="text-[13px] font-light leading-relaxed mb-4 max-w-[90%] opacity-90">
          {t.value}
        </p>
        <p className="text-[9px] uppercase tracking-[0.15em] opacity-40 mb-6 leading-relaxed">
          {t.idea}
        </p>

        {/* Блок Избранное (если есть) */}
        {blogFavorites.length > 0 && (
          <button
            type="button"
            onClick={handleOpenFavorites}
            className="w-full mb-3 rounded-xl p-3 flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md active:scale-95 transition-all text-left"
          >
            <div className="flex -space-x-2 shrink-0">
              {blogFavorites.slice(0, 3).map((item) => (
                <img
                  key={item.id}
                  src={item.imagePng}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-[#111]"
                />
              ))}
            </div>
            <span className="text-[11px] uppercase tracking-widest font-medium opacity-80">
              {t.favorites} · {blogFavorites.length}
            </span>
            <span className="ml-auto opacity-50 text-[14px]">→</span>
          </button>
        )}

        {/* Элегантная тонкая кнопка */}
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

      <BottomDock active="search" lang={lang} />

      {/* Модальное окно установки */}
      <AnimatePresence>
        {showWidgetHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setShowWidgetHint(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md mx-4 mb-6 rounded-2xl bg-[#1A1816] border border-white/10 p-5 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <path d="M12 18h.01" />
                  </svg>
                </div>
                <div className="text-[15px] font-medium">{t.widgetTitle}</div>
              </div>
              <p className="text-[13px] font-light leading-relaxed opacity-70 mb-5">
                {t.widgetText}
              </p>
              <div className="space-y-2.5 mb-6 opacity-80 text-[12px] font-light">
                <div>{t.widgetStep1}</div>
                <div>{t.widgetStep2}</div>
                <div>{t.widgetStep3}</div>
              </div>
              <button
                type="button"
                onClick={handleOpenInBrowser}
                className="w-full py-3.5 rounded-xl bg-white/90 text-black text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-transform"
              >
                {t.widgetAction}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
