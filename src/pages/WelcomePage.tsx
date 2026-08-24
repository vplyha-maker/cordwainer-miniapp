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

export function WelcomePage({ onStart, onOpenBlog, lang, setLang, favorites = [] }: WelcomePageProps) {
  const blogFavorites = favorites.filter((f) => f.type === 'blog')
  const [showWidgetHint, setShowWidgetHint] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    if (savedLang && (savedLang === 'ru' || savedLang === 'uk')) {
      if (savedLang !== lang) setLang(savedLang)
    }
  }, [])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const t = {
    ru: {
      tagline: 'Энциклопедия обувного мастерства',
      idea1: 'Предмет как идея.',
      idea2: 'Форма как язык.',
      idea3: 'Мастерство как опыт.',
      materials: 'Материалы',
      materialsSub: 'Кожа · Замша\nПодошвы',
      colors: 'Цвета',
      colorsSub: 'Колористика\nПатина',
      styles: 'Фасоны\nи силуэты',
      stylesSub: 'Классика\nУличные',
      start: 'Начать обучение',
      favorites: 'Избранное',
      seeAll: 'Смотреть все',
      addToHomeShort: 'Установить',
      widgetTitle: 'Установка приложения',
      widgetText: 'Telegram не позволяет сохранять иконки напрямую. Откройте приложение в вашем браузере (Chrome или Safari), чтобы добавить его на экран.',
      widgetStep1: '1. Нажмите «Открыть в браузере» ниже',
      widgetStep2: '2. В меню браузера выберите «Добавить на главный экран»',
      widgetStep3: '3. Подтвердите установку',
      widgetAction: 'Открыть в браузере',
    },
    uk: {
      tagline: 'Енциклопедія взуттєвої майстерності',
      idea1: 'Предмет як ідея.',
      idea2: 'Форма як мова.',
      idea3: 'Майстерність як досвід.',
      materials: 'Матеріали',
      materialsSub: 'Шкіра · Замша\nПідошви',
      colors: 'Кольори',
      colorsSub: 'Колористика\nПатина',
      styles: 'Фасони\nта силуети',
      stylesSub: 'Класика\nВуличні',
      start: 'Почати навчання',
      favorites: 'Обране',
      seeAll: 'Дивитись усі',
      addToHomeShort: 'Встановити',
      widgetTitle: 'Встановлення застосунку',
      widgetText: 'Telegram не дозволяє зберігати іконки безпосередньо. Відкрийте застосунок у вашому браузері (Chrome або Safari), щоб додати його на екран.',
      widgetStep1: '1. Натисніть «Відкрити в браузері» нижче',
      widgetStep2: '2. У меню браузера оберіть «На головний екран»',
      widgetStep3: '3. Підтвердіть встановлення',
      widgetAction: 'Відкрити в браузері',
    },
  }[lang]

  const categories = [
    {
      title: t.materials,
      sub: t.materialsSub,
      accent: 'var(--color-accent, #D8A35C)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 8.5 4 C 8.5 4 6 5 5 7.5 C 4 10 4.5 12 4.5 12 C 4.5 12 2.5 14 3.5 17 C 4.5 20 7 19.5 7 19.5 C 7 19.5 9 18 12 18 C 15 18 17 19.5 17 19.5 C 17 19.5 19.5 20 20.5 17 C 21.5 14 19.5 12 19.5 12 C 19.5 12 20 10 19 7.5 C 18 5 15.5 4 15.5 4 C 15.5 4 14 5.5 12 5.5 C 10 5.5 8.5 4 8.5 4 Z" />
        </svg>
      ),
    },
    {
      title: t.colors,
      sub: t.colorsSub,
      accent: '#A78BFA',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      ),
    },
    {
      title: t.styles,
      sub: t.stylesSub,
      accent: 'var(--color-info, #60A5FA)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 19 18 L 3 18 C 3 18 1.5 17.5 1.5 16.5 C 1.5 15 3 14 4 14 L 6.5 13 L 8.5 8.5 C 9 7.5 10 7 11.5 7 L 15 7 C 16 7 16.5 8 16 9 L 14 11.5 L 17 12 C 19 12.5 21 14 21 16 Z" />
          <path d="M 21 18 L 21 16 L 19 16 L 19 18 Z" />
          <path d="M 14 11.5 L 9 15" />
        </svg>
      ),
    },
  ]

  const handleAddToHome = async () => {
    const deferredPrompt = (window as any).deferredPrompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          ;(window as any).deferredPrompt = null
          return
        }
      } catch (e) {}
    }
    setShowWidgetHint(true)
  }

  const handleOpenInBrowser = () => {
    const appUrl = 'https://cordwainer-miniapp.vercel.app'
    const tg = (window as any).Telegram?.WebApp

    if (tg && tg.openLink) {
      tg.openLink(appUrl)
    } else {
      window.open(appUrl, '_blank')
    }
    setShowWidgetHint(false)
  }

  return (
    <div
      className="relative flex flex-col h-[100dvh] overflow-hidden"
      style={{
        background: 'var(--color-bg, #1C1816)',
        color: 'var(--color-ink, #F5F1EA)',
      }}
    >
      {/* Hero */}
      <div className="relative shrink-0 h-[42vh] min-h-[260px] max-h-[360px] md:h-[36vh] md:max-h-[400px] lg:h-[32vh] lg:max-h-[440px] overflow-hidden z-20">
        <img
          src="/hero-cover.webp"
          alt="Cordwainer Background"
          width={780}
          height={1040}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              to bottom,
              color-mix(in srgb, var(--color-bg, #1C1816) 20%, transparent) 0%,
              color-mix(in srgb, var(--color-bg, #1C1816) 50%, transparent) 60%,
              var(--color-bg, #1C1816) 100%
            )`,
          }}
        />
        <div className="absolute inset-0 p-4 flex flex-col justify-between z-20">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              <h1
                className="font-display text-[2.5rem] leading-[0.9]"
                style={{
                  color: 'var(--color-ink, #F5F1EA)',
                  textShadow: '0 2px 20px color-mix(in srgb, var(--color-bg, #1C1816) 60%, transparent)',
                }}
              >
                Cordwainer
              </h1>
              <p
                className="mt-2 text-[10px] tracking-[0.2em] uppercase"
                style={{ color: 'var(--color-muted, #B9ACA0)' }}
              >
                {t.tagline}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div
                className="flex rounded-full p-1"
                style={{
                  background: 'color-mix(in srgb, var(--color-surface, #25201C) 80%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 20%, transparent)',
                }}
                role="group"
                aria-label="Language selection"
              >
                <button
                  onClick={() => handleLangChange('ru')}
                  className={`lang-toggle ${lang === 'ru' ? 'active' : 'inactive'}`}
                  aria-pressed={lang === 'ru'}
                  role="button"
                >
                  RU
                </button>
                <button
                  onClick={() => handleLangChange('uk')}
                  className={`lang-toggle ${lang === 'uk' ? 'active' : 'inactive'}`}
                  aria-pressed={lang === 'uk'}
                  role="button"
                >
                  UA
                </button>
              </div>

              <button
                onClick={handleAddToHome}
                className="action-pill w-full flex items-center justify-center"
                aria-label={t.addToHomeShort}
                role="button"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <path d="M12 18h.01" />
                </svg>
                {t.addToHomeShort}
              </button>
            </div>
          </div>

          <div className="pointer-events-none pb-2">
            <p
              className="text-[9px] tracking-[0.2em] uppercase mb-2"
              style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 80%, transparent)' }}
            >
              Issue 01 · 2026
            </p>
            <div
              className="flex flex-col gap-0.5 text-[8px] tracking-[0.12em] uppercase leading-tight"
              style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 50%, transparent)' }}
            >
              <span>{t.idea1}</span>
              <span>{t.idea2}</span>
              <span>{t.idea3}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-3 overflow-y-auto pb-[130px] overscroll-none relative z-30 -mt-3">
        <div className="grid grid-cols-3 gap-2.5 md:gap-3 mb-5 items-stretch max-w-full">
          {categories.map((item) => (
            <button
              key={item.title}
              className="card-simplified relative rounded-2xl p-2.5 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full h-full active:scale-[0.96] transition-transform"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 relative z-10 shrink-0"
                style={{
                  background: `color-mix(in srgb, ${item.accent} 20%, transparent)`,
                  color: item.accent,
                }}
              >
                {item.icon}
              </div>
              <div className="relative z-10 flex-1 flex flex-col justify-end">
                <div
                  className="text-[11px] font-semibold leading-tight whitespace-pre-line"
                  style={{ color: 'var(--color-ink, #F5F1EA)' }}
                >
                  {item.title}
                </div>
                <div
                  className="text-[9px] mt-1.5 leading-snug whitespace-pre-line"
                  style={{ color: 'var(--color-muted, #B9ACA0)' }}
                >
                  {item.sub}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onStart}
          className="btn-primary mb-6"
          aria-label={t.start}
          role="button"
        >
          <div className="relative h-full flex items-center justify-between px-6">
            <div className="flex flex-col text-left">
              <span
                className="uppercase text-[10px] tracking-[.30em] font-bold"
                style={{ color: 'color-mix(in srgb, var(--color-accent, #D8A35C) 70%, #000)' }}
              >
                ISSUE 01
              </span>
              <span
                className="mt-1 text-[20px] font-bold"
                style={{ color: 'var(--color-bg, #1C1816)' }}
              >
                {t.start}
              </span>
            </div>
            <div
              className="text-[28px]"
              style={{ color: 'color-mix(in srgb, var(--color-accent, #D8A35C) 70%, #000)' }}
            >
              →
            </div>
          </div>
        </button>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span
              className="text-[10px] tracking-[0.14em] uppercase"
              style={{ color: 'var(--color-muted, #B9ACA0)' }}
            >
              {t.favorites}
            </span>
            <button
              className="text-[11px] active:opacity-70 cursor-pointer"
              style={{ color: 'var(--color-accent, #D8A35C)' }}
            >
              {t.seeAll}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {[0, 1, 2, 3].map((index) => {
              const item = blogFavorites[index]

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (item?.id === 'blog-orvard' && onOpenBlog) {
                      onOpenBlog()
                    } else if (!item && onStart) {
                      onStart()
                    }
                  }}
                  className="card-simplified relative aspect-square rounded-xl flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
                >
                  {item ? (
                    <img
                      src={item.imagePng}
                      alt={`Favorite ${index}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span
                      className="text-[16px] font-light"
                      style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 30%, transparent)' }}
                    >
                      +
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <div className="mx-auto w-full max-w-[var(--app-max-width)]">
          <BottomDock active="search" lang={lang} />
        </div>
      </div>

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
              className="absolute inset-0 backdrop-blur-sm"
              style={{ background: 'color-mix(in srgb, var(--color-bg, #1C1816) 60%, transparent)' }}
            />

            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md mx-4 mb-6 rounded-3xl overflow-hidden"
              style={{
                background: `linear-gradient(180deg, var(--color-surface, #25201C) 0%, var(--color-bg, #1C1816) 100%)`,
                border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 25%, transparent)',
                boxShadow: '0 20px 50px color-mix(in srgb, var(--color-bg, #1C1816) 50%, transparent)',
              }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 15%, transparent)',
                      color: 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="text-[16px] font-semibold"
                      style={{ color: 'var(--color-ink, #F5F1EA)' }}
                    >
                      {t.widgetTitle}
                    </div>
                  </div>
                </div>

                <p
                  className="text-[13px] leading-relaxed mb-5"
                  style={{ color: 'var(--color-muted, #B9ACA0)' }}
                >
                  {t.widgetText}
                </p>

                <div className="space-y-3 mb-6">
                  <div
                    className="text-[13px]"
                    style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}
                  >
                    <span className="font-medium" style={{ color: 'var(--color-accent, #D8A35C)' }}>
                      {t.widgetStep1}
                    </span>
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}
                  >
                    <span className="font-medium" style={{ color: 'var(--color-accent, #D8A35C)' }}>
                      {t.widgetStep2}
                    </span>
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ color: 'color-mix(in srgb, var(--color-ink, #F5F1EA) 90%, transparent)' }}
                  >
                    <span className="font-medium" style={{ color: 'var(--color-accent, #D8A35C)' }}>
                      {t.widgetStep3}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleOpenInBrowser}
                  className="w-full py-3.5 rounded-2xl text-[13px] font-semibold uppercase tracking-wider active:scale-[0.98] transition-transform cursor-pointer"
                  style={{
                    background: 'linear-gradient(180deg, var(--color-accent, #D8A35C) 0%, color-mix(in srgb, var(--color-accent, #D8A35C) 85%, #000) 100%)',
                    color: 'var(--color-bg, #1C1816)',
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
