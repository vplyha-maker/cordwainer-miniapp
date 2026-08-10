import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'
import { BLOG_ARTICLES } from '../data/blog'
import type { Lang, FavoriteItem } from '../App'

type HomePageProps = {
  onBack?: () => void
  onOpenBlog?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
}

const cardStyle = {
  background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.01) 100%)',
  boxShadow:
    'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.25)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
}

export function HomePage({
  onBack,
  onOpenBlog,
  lang,
  setLang,
  favorites = [],
}: HomePageProps) {
  const hasNewBlog = BLOG_ARTICLES.some((a) => a.isNew)

  // Фильтруем только статьи для меню HomePage
  const articleFavorites = favorites.filter((f) => f.type === 'article')

  const t = {
    ru: {
      menu: 'Меню',
      search: 'Поиск по материалам, конструкциям...',
      learning: 'Обучение',
      tools: 'Инструменты',
      materials: 'Материалы',
      materialsSub: 'Кожа, замша, подошвы и др.',
      materialsCount: '245 статей',
      colors: 'Цвета и отделка',
      colorsSub: 'Психология цвета, патина',
      colorsCount: '128 статей',
      styles: 'Фасоны и силуэты',
      stylesSub: 'Классика, женские, уличные',
      stylesCount: '186 статей',
      sizes: 'Размеры, ортопедия',
      sizesSub: 'Колодки, подъём, стопа',
      sizesCount: '97 статей',
      calc: 'Калькуляторы',
      calcSub: '12 инструментов',
      blog: 'Блог',
      blogSub: hasNewBlog ? 'Новая статья' : 'Статьи мастерской',
      glossary: 'Глоссарий',
      glossarySub: '342 термина',
      favorites: 'Избранное',
      favoritesSub:
        articleFavorites.length > 0
          ? `Сохранено статей: ${articleFavorites.length}`
          : 'Нет сохраненных статей',
      quote: '«Мастерство — в деталях. Знание — в опыте.»',
      newBadge: 'NEW',
    },
    uk: {
      menu: 'Меню',
      search: 'Пошук за матеріалами, конструкціями...',
      learning: 'Навчання',
      tools: 'Інструменти',
      materials: 'Матеріали',
      materialsSub: 'Шкіра, замша, підошви тощо',
      materialsCount: '245 статей',
      colors: 'Кольори та оздоблення',
      colorsSub: 'Психологія кольору, патина',
      colorsCount: '128 статей',
      styles: 'Фасони та силуети',
      stylesSub: 'Класика, жіночі, вуличні',
      stylesCount: '186 статей',
      sizes: 'Розміри, ортопедія',
      sizesSub: 'Колодки, підйом, стопа',
      sizesCount: '97 статей',
      calc: 'Калькулятори',
      calcSub: '12 інструментів',
      blog: 'Блог',
      blogSub: hasNewBlog ? 'Нова стаття' : 'Статті майстерні',
      glossary: 'Глосарій',
      glossarySub: '342 терміни',
      favorites: 'Обране',
      favoritesSub:
        articleFavorites.length > 0
          ? `Збережено статей: ${articleFavorites.length}`
          : 'Немає збережених статей',
      quote: '«Майстерність — в деталях. Знання — в досвіді.»',
      newBadge: 'NEW',
    },
  }[lang]

  const LEARNING = [
    {
      id: 'materials',
      title: t.materials,
      subtitle: t.materialsSub,
      count: t.materialsCount,
      accent: '#D8A35C',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 8.5 4 C 8.5 4 6 5 5 7.5 C 4 10 4.5 12 4.5 12 C 4.5 12 2.5 14 3.5 17 C 4.5 20 7 19.5 7 19.5 C 7 19.5 9 18 12 18 C 15 18 17 19.5 17 19.5 C 17 19.5 19.5 20 20.5 17 C 21.5 14 19.5 12 19.5 12 C 19.5 12 20 10 19 7.5 C 18 5 15.5 4 15.5 4 C 15.5 4 14 5.5 12 5.5 C 10 5.5 8.5 4 8.5 4 Z" />
        </svg>
      ),
    },
    {
      id: 'colors',
      title: t.colors,
      subtitle: t.colorsSub,
      count: t.colorsCount,
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
      id: 'styles',
      title: t.styles,
      subtitle: t.stylesSub,
      count: t.stylesCount,
      accent: '#60A5FA',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 19 18 L 3 18 C 3 18 1.5 17.5 1.5 16.5 C 1.5 15 3 14 4 14 L 6.5 13 L 8.5 8.5 C 9 7.5 10 7 11.5 7 L 15 7 C 16 7 16.5 8 16 9 L 14 11.5 L 17 12 C 19 12.5 21 14 21 16 Z" />
          <path d="M 21 18 L 21 16 L 19 16 L 19 18 Z" />
          <path d="M 14 11.5 L 9 15" />
        </svg>
      ),
    },
    {
      id: 'sizes',
      title: t.sizes,
      subtitle: t.sizesSub,
      count: t.sizesCount,
      accent: '#34D399',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.875 6.27L17.73 4.125a2.25 2.25 0 00-3.18 0L3.375 15.3a2.25 2.25 0 000 3.18l2.145 2.145a2.25 2.25 0 003.18 0l11.175-11.175a2.25 2.25 0 000-3.18z" />
          <path d="M14.5 5.5l4 4M10.5 9.5l4 4M6.5 13.5l4 4" />
        </svg>
      ),
    },
  ]

  const TOOLS = [
    {
      id: 'calc',
      title: t.calc,
      subtitle: t.calcSub,
      accent: '#F59E0B',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="3" />
          <path d="M8 6h8M16 14v.01M12 14v.01M8 14v.01M16 18v.01M12 18v.01M8 18v.01M16 10v.01M12 10v.01M8 10v.01" />
        </svg>
      ),
    },
    {
      id: 'blog',
      title: t.blog,
      subtitle: t.blogSub,
      accent: '#F472B6',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
          <path d="M7 7h10M7 11h10M7 15h6" />
        </svg>
      ),
    },
    {
      id: 'glossary',
      title: t.glossary,
      subtitle: t.glossarySub,
      accent: '#38BDF8',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      ),
    },
  ]

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-[1.65rem] leading-none text-[#F5F1EB]"
        >
          {t.menu}
        </motion.h1>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLang('ru')}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-[10px] font-bold tracking-wide active:scale-90 transition-transform cursor-pointer"
            style={{
              background: lang === 'ru' ? 'rgba(216,163,92,0.25)' : 'rgba(39,33,29,0.7)',
              borderColor: lang === 'ru' ? '#D8A35C' : 'rgba(198,164,122,0.25)',
              color: lang === 'ru' ? '#D8A35C' : '#F5F1EB',
              boxShadow: lang === 'ru' ? '0 0 10px rgba(216,163,92,0.35)' : 'none',
            }}
          >
            RU
          </button>
          <button
            onClick={() => setLang('uk')}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-[10px] font-bold tracking-wide active:scale-90 transition-transform cursor-pointer"
            style={{
              background: lang === 'uk' ? 'rgba(216,163,92,0.25)' : 'rgba(39,33,29,0.7)',
              borderColor: lang === 'uk' ? '#D8A35C' : 'rgba(198,164,122,0.25)',
              color: lang === 'uk' ? '#D8A35C' : '#F5F1EB',
              boxShadow: lang === 'uk' ? '0 0 10px rgba(216,163,92,0.35)' : 'none',
            }}
          >
            UA
          </button>

          {onBack && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#B9ACA0] active:scale-90 transition-transform overflow-hidden cursor-pointer"
              style={cardStyle}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex-1 px-4 overflow-y-auto pb-[110px] overscroll-none"
      >
        <div className="mb-4">
          <div
            className="rounded-[16px] px-3.5 py-2.5 flex items-center gap-2.5 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
            style={cardStyle}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="text-[#B9ACA0] shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="text-[12.5px] text-[#B9ACA0] truncate">{t.search}</span>
          </div>
        </div>

        <p className="text-[10px] tracking-[0.14em] uppercase text-[#B9ACA0] mb-2 px-0.5">
          {t.learning}
        </p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {LEARNING.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.03 }}
              className="relative rounded-2xl p-3 text-left active:scale-[0.96] transition-transform flex flex-col overflow-hidden cursor-pointer"
              style={cardStyle}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 shrink-0"
                style={{
                  background: `${item.accent}20`,
                  color: item.accent,
                  boxShadow: `0 0 16px ${item.accent}30`,
                }}
              >
                {item.icon}
              </div>
              <div className="text-[13px] font-semibold text-[#F5F1EB] leading-tight mb-1">
                {item.title}
              </div>
              <div className="text-[10px] text-[#B9ACA0] leading-snug mb-2">{item.subtitle}</div>
              <div className="mt-auto text-[9px] text-[#B9ACA0]/70 pt-1">{item.count}</div>
            </motion.button>
          ))}
        </div>

        <p className="text-[10px] tracking-[0.14em] uppercase text-[#B9ACA0] mb-2 px-0.5">
          {t.tools}
        </p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {TOOLS.map((item, i) => {
            const isBlog = item.id === 'blog'
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.03 }}
                onClick={isBlog ? onOpenBlog : undefined}
                className="relative rounded-2xl p-2.5 text-left active:scale-[0.96] transition-transform flex flex-col overflow-hidden cursor-pointer h-full"
                style={cardStyle}
              >
                {isBlog && hasNewBlog && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    animate={{ opacity: [0.12, 0.35, 0.12] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      boxShadow: 'inset 0 0 0 1px rgba(244,114,182,0.5), 0 0 16px rgba(244,114,182,0.2)',
                    }}
                  />
                )}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 shrink-0 relative z-10"
                  style={{
                    background: `${item.accent}20`,
                    color: item.accent,
                    boxShadow: `0 0 14px ${item.accent}30`,
                  }}
                >
                  {item.icon}
                </div>
                <div className="text-[11px] font-semibold text-[#F5F1EB] leading-tight mb-0.5 mt-auto relative z-10 flex items-center gap-1">
                  {item.title}
                  {isBlog && hasNewBlog && (
                    <span className="text-[8px] font-bold text-[#F472B6]">•</span>
                  )}
                </div>
                <div className="text-[9px] text-[#B9ACA0] leading-snug mt-1 relative z-10">
                  {item.subtitle}
                </div>
              </motion.button>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="relative rounded-2xl px-3.5 py-3 flex items-center gap-3 mb-4 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
          style={cardStyle}
        >
          <div className="w-8 h-8 rounded-xl bg-[#D8A35C]/15 flex items-center justify-center text-[#D8A35C] text-sm shrink-0">
            ★
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#F5F1EB]">{t.favorites}</div>
            <div className="text-[10px] text-[#B9ACA0]">{t.favoritesSub}</div>
          </div>

          {/* Аватарки сохранённых статей */}
          <div className="flex -space-x-2 shrink-0">
            {articleFavorites.length === 0 && (
              <div className="w-7 h-7 rounded-full bg-[#1D1815] border border-[#2A231D] border-dashed flex items-center justify-center text-[#B9ACA0]/40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                </svg>
              </div>
            )}
            {articleFavorites.slice(0, 4).map((item, idx) => (
              <div
                key={item.id}
                className="w-7 h-7 rounded-full border-2 border-[#151210] flex items-center justify-center overflow-hidden bg-[#27211D] relative"
                style={{ zIndex: 10 - idx }}
              >
                <img src={item.imagePng} alt={item.id} className="w-full h-full object-cover" />
              </div>
            ))}
            {articleFavorites.length > 4 && (
              <div
                className="w-7 h-7 rounded-full border-2 border-[#151210] flex items-center justify-center bg-[#1D1815] relative text-[9px] font-bold text-[#D8A35C]"
                style={{ zIndex: 0 }}
              >
                +{articleFavorites.length - 4}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="relative rounded-2xl p-4 overflow-hidden"
          style={cardStyle}
        >
          <p className="text-[12.5px] leading-relaxed text-[#F5F1EB]/80 italic">{t.quote}</p>
          <p className="mt-2 text-[11px] text-[#D8A35C] font-display">Cordwainer</p>
        </motion.div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomDock active="search" lang={lang} />
      </div>
    </div>
  )
  }
