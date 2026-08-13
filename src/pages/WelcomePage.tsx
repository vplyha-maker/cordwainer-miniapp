import { useState } from 'react'
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
      addToHome: 'На главный экран',
      addToHomeSub: 'Быстрый доступ к приложению',
      widgetTitle: 'Добавить на главный экран',
      widgetText: 'Так вы сможете открывать Cordwainer одним касанием, как обычное приложение.',
      widgetStep1: '1. Нажмите кнопку ⋮ вверху справа',
      widgetStep2: '2. Выберите «Добавить на главный экран»',
      widgetStep3: '3. Подтвердите добавление',
      widgetClose: 'Понятно',
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
      addToHome: 'На головний екран',
      addToHomeSub: 'Швидкий доступ до застосунку',
      widgetTitle: 'Додати на головний екран',
      widgetText: 'Так ви зможете відкривати Cordwainer одним дотиком, як звичайний застосунок.',
      widgetStep1: '1. Натисніть кнопку ⋮ вгорі справа',
      widgetStep2: '2. Оберіть «Додати на головний екран»',
      widgetStep3: '3. Підтвердіть додавання',
      widgetClose: 'Зрозуміло',
    },
  }[lang]

  const categories = [
    {
      title: t.materials,
      sub: t.materialsSub,
      accent: '#D8A35C',
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
      accent: '#60A5FA',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 19 18 L 3 18 C 3 18 1.5 17.5 1.5 16.5 C 1.5 15 3 14 4 14 L 6.5 13 L 8.5 8.5 C 9 7.5 10 7 11.5 7 L 15 7 C 16 7 16.5 8 16 9 L 14 11.5 L 17 12 C 19 12.5 21 14 21 16 Z" />
          <path d="M 21 18 L 21 16 L 19 16 L 19 18 Z" />
          <path d="M 14 11.5 L 9 15" />
        </svg>
      ),
    },
  ]

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.01) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.25)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }

  // Попытка добавить на главный экран
  const handleAddToHome = async () => {
    // 1. Пробуем современный API (работает в некоторых браузерах / WebView)
    const deferredPrompt = (window as any).deferredPrompt

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          ;(window as any).deferredPrompt = null
          return
        }
      } catch (e) {
        // игнорируем
      }
    }

    // 2. Если не сработало — показываем нашу инструкцию
    setShowWidgetHint(true)
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden">
      {/* Hero */}
      <div className="relative shrink-0 h-[42vh] min-h-[260px] max-h-[360px] overflow-hidden z-20">
        <img
          src="/hero-cover.png"
          alt="Cordwainer"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(21,18,16,.20) 0%, rgba(21,18,16,.50) 60%, #151210 100%)',
          }}
        />
        <div className="absolute inset-0 p-4 flex flex-col justify-between z-20">
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="font-display text-[2.35rem] leading-[0.9] text-[#F5F1EB]"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,.6)' }}
              >
                Cordwainer
              </h1>
              <p className="mt-1.5 text-[10px] tracking-[0.2em] uppercase text-[#B9ACA0]">
                {t.tagline}
              </p>
            </div>

            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <button className="w-9 h-9 rounded-full bg-[#1D1815]/70 border border-[#C6A47A]/25 flex items-center justify-center text-[#F5F1EB] backdrop-blur-sm active:scale-90 transition-transform cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </button>

              <button
                onClick={() => setLang('ru')}
                className="w-9 h-9 rounded-full border flex items-center justify-center text-[10px] font-bold tracking-wide backdrop-blur-sm active:scale-90 transition-transform cursor-pointer"
                style={{
                  background: lang === 'ru' ? 'rgba(216,163,92,0.25)' : 'rgba(29,24,21,0.70)',
                  borderColor: lang === 'ru' ? '#D8A35C' : 'rgba(198,164,122,0.25)',
                  color: lang === 'ru' ? '#D8A35C' : '#F5F1EB',
                  boxShadow: lang === 'ru' ? '0 0 10px rgba(216,163,92,0.35)' : 'none',
                }}
              >
                RU
              </button>

              <button
                onClick={() => setLang('uk')}
                className="w-9 h-9 rounded-full border flex items-center justify-center text-[10px] font-bold tracking-wide backdrop-blur-sm active:scale-90 transition-transform cursor-pointer"
                style={{
                  background: lang === 'uk' ? 'rgba(216,163,92,0.25)' : 'rgba(29,24,21,0.70)',
                  borderColor: lang === 'uk' ? '#D8A35C' : 'rgba(198,164,122,0.25)',
                  color: lang === 'uk' ? '#D8A35C' : '#F5F1EB',
                  boxShadow: lang === 'uk' ? '0 0 10px rgba(216,163,92,0.35)' : 'none',
                }}
              >
                UA
              </button>
            </div>
          </div>

          <div className="pointer-events-none pb-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#B9ACA0]/80 mb-2">
              Issue 01 · 2026
            </p>
            <div className="flex flex-col gap-0.5 text-[8px] tracking-[0.12em] uppercase text-[#B9ACA0]/50 leading-tight">
              <span>{t.idea1}</span>
              <span>{t.idea2}</span>
              <span>{t.idea3}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-3 overflow-y-auto pb-[130px] overscroll-none relative z-30 -mt-3">
        {/* Categories */}
        <div className="grid grid-cols-3 gap-2.5 mb-5 items-stretch">
          {categories.map((item) => (
            <button
              key={item.title}
              className="relative rounded-2xl p-2.5 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full h-full active:scale-[0.96] transition-transform"
              style={cardStyle}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 relative z-10 shrink-0"
                style={{
                  background: `${item.accent}20`,
                  color: item.accent,
                  boxShadow: `0 0 16px ${item.accent}40`,
                }}
              >
                {item.icon}
              </div>
              <div className="relative z-10 flex-1 flex flex-col justify-end">
                <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB] whitespace-pre-line">
                  {item.title}
                </div>
                <div className="text-[9px] mt-1.5 leading-snug text-[#B9ACA0] whitespace-pre-line">
                  {item.sub}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          className="relative overflow-hidden w-full h-[72px] rounded-[26px] mb-4 cursor-pointer active:scale-[0.97] transition-transform"
          style={{
            background: 'linear-gradient(180deg,#F8F3EB 0%,#ECE1D0 100%)',
            border: '1px solid rgba(214,179,126,.30)',
            boxShadow: '0 14px 36px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.95)',
          }}
        >
          <div className="relative h-full flex items-center justify-between px-6">
            <div className="flex flex-col text-left">
              <span
                className="uppercase"
                style={{ fontSize: 10, letterSpacing: '.30em', color: '#8F6A42', fontWeight: 700 }}
              >
                ISSUE 01
              </span>
              <span style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: '#1A1612' }}>
                {t.start}
              </span>
            </div>
            <div style={{ fontSize: 28, color: '#8F6A42' }}>→</div>
          </div>
        </button>

        {/* Кнопка «На главный экран» */}
        <button
          onClick={handleAddToHome}
          className="w-full relative rounded-2xl px-4 py-3.5 flex items-center gap-3.5 mb-5 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
          style={cardStyle}
        >
          <div className="w-11 h-11 rounded-full bg-[#D8A35C]/15 flex items-center justify-center text-[#D8A35C] shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <path d="M12 18h.01" />
              <path d="M9 6h6" />
            </svg>
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[14px] font-semibold text-[#F5F1EB]">{t.addToHome}</div>
            <div className="text-[11px] text-[#B9ACA0] mt-0.5">{t.addToHomeSub}</div>
          </div>
          <div className="text-[#D8A35C] text-lg opacity-70">＋</div>
        </button>

        {/* Favorites */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] tracking-[0.14em] uppercase text-[#B9ACA0]">
              {t.favorites}
            </span>
            <button className="text-[11px] text-[#D8A35C] active:opacity-70 cursor-pointer">
              {t.seeAll}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
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
                  className="relative aspect-square rounded-xl flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
                  style={cardStyle}
                >
                  {item ? (
                    <img
                      src={item.imagePng}
                      alt={item.id}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[16px] font-light text-[#B9ACA0]/30">+</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>

      {/* Модалка с инструкцией */}
      <AnimatePresence>
        {showWidgetHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            onClick={() => setShowWidgetHint(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md mx-4 mb-6 rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #2A231D 0%, #1A1612 100%)',
                border: '1px solid rgba(198,164,122,0.25)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#D8A35C]/15 flex items-center justify-center text-[#D8A35C]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-[#F5F1EB]">{t.widgetTitle}</div>
                  </div>
                </div>

                <p className="text-[13px] text-[#B9ACA0] leading-relaxed mb-5">
                  {t.widgetText}
                </p>

                <div className="space-y-3 mb-6">
                  <div className="text-[13px] text-[#F5F1EB]/90">
                    <span className="text-[#D8A35C] font-medium">{t.widgetStep1}</span>
                  </div>
                  <div className="text-[13px] text-[#F5F1EB]/90">
                    <span className="text-[#D8A35C] font-medium">{t.widgetStep2}</span>
                  </div>
                  <div className="text-[13px] text-[#F5F1EB]/90">
                    <span className="text-[#D8A35C] font-medium">{t.widgetStep3}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowWidgetHint(false)}
                  className="w-full py-3.5 rounded-2xl text-[13px] font-semibold uppercase tracking-wider active:scale-[0.98] transition-transform"
                  style={{
                    background: 'linear-gradient(180deg, #D8A35C 0%, #C08A3E 100%)',
                    color: '#1A1612',
                  }}
                >
                  {t.widgetClose}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
