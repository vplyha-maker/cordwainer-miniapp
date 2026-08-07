import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import type { Lang } from '../App'

type WelcomePageProps = {
  onStart?: () => void
  onOpenBlog?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: string[]
}

const getFavoriteIcon = (id?: string) => {
  if (!id) return null
  switch (id) {
    case 'blog-orvard':
      return '📖'
    case 'materials':
      return '🪵'
    case 'colors':
      return '🎨'
    case 'styles':
      return '👞'
    default:
      return '★'
  }
}

export function WelcomePage({ onStart, onOpenBlog, lang, setLang, favorites = [] }: WelcomePageProps) {
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

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden">
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
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-[2.35rem] leading-[0.9] text-[#F5F1EB]"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,.6)' }}
              >
                Cordwainer
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-1.5 text-[10px] tracking-[0.2em] uppercase text-[#B9ACA0]"
              >
                {t.tagline}
              </motion.p>
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

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex-1 px-4 pt-3 overflow-y-auto pb-[130px] overscroll-none relative z-30 -mt-3"
      >
        <div className="grid grid-cols-3 gap-2.5 mb-5 items-stretch">
          {categories.map((item, index) => (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.06, duration: 0.4 }}
              whileTap={{ scale: 0.88 }}
              className="relative rounded-2xl p-2.5 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full h-full"
              style={{
                background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.01) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
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
            </motion.button>
          ))}
        </div>

        <motion.button
          onClick={onStart}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          whileTap={{ scale: 0.94 }}
          className="relative overflow-hidden w-full h-[72px] rounded-[26px] mb-5 cursor-pointer"
          style={{
            background: 'linear-gradient(180deg,#F8F3EB 0%,#ECE1D0 100%)',
            border: '1px solid rgba(214,179,126,.30)',
            boxShadow: '0 14px 36px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.95)',
            transform: 'translateZ(0)',
          }}
        >
          <motion.div
            className="absolute inset-y-0 w-32 pointer-events-none"
            animate={{ x: ['-120%', '350%'] }}
            transition={{
              repeat: Infinity,
              duration: 3.2,
              repeatDelay: 1.8,
              ease: 'easeInOut',
            }}
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 85%, transparent 100%)',
              transform: 'skewX(-20deg)',
            }}
          />
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
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              style={{ fontSize: 28, color: '#8F6A42' }}
            >
              →
            </motion.div>
          </div>
        </motion.button>

        {/* БЛОК ИЗБРАННОЕ (РОВНО 4 СЛОТА) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mb-2"
        >
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
              const itemId = favorites[index]
              const icon = getFavoriteIcon(itemId)

              return (
                <motion.div
                  key={index}
                  onClick={() => {
                    if (itemId === 'blog-orvard' && onOpenBlog) {
                      onOpenBlog()
                    }
                  }}
                  whileTap={itemId ? { scale: 0.88 } : undefined}
                  className={`relative aspect-square rounded-xl flex items-center justify-center text-xl overflow-hidden ${itemId ? 'cursor-pointer' : ''}`}
                  style={{
                    background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.01) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  {itemId ? (
                    <span>{icon}</span>
                  ) : (
                    <span className="text-[16px] font-light text-[#B9ACA0]/30">+</span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>
    </div>
  )
}
