import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BLOG_ARTICLES } from '../data/blog'
import { GLOSSARY_TERMS } from '../data/glossary'
import { CALCULATORS_COUNT } from './CalcMenuPage'
import type { Lang, FavoriteItem } from '../App'

type HomePageProps = {
  onBack?: () => void
  onOpenBlog?: () => void
  onOpenCalcMenu?: () => void
  onOpenColors?: () => void
  onOpenStyles?: () => void
  onOpenGlossary?: (termId?: string) => void
  onOpenPrices?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onOpenArticle?: (articleId: string) => void
  onOpenFavorites?: () => void
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void 
}

type MenuItem = {
  id: string
  title: string
  subtitle: string
  action?: () => void
  dot?: boolean
}

function glossaryLabel(count: number, lang: Lang): string {
  if (lang === 'uk') {
    const n10 = count % 10
    const n100 = count % 100
    if (n10 === 1 && n100 !== 11) return `${count} термін`
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${count} терміни`
    return `${count} термінів`
  }
  if (lang === 'de') {
    return count === 1 ? `${count} Begriff` : `${count} Begriffe`
  }
  const n10 = count % 10
  const n100 = count % 100
  if (n10 === 1 && n100 !== 11) return `${count} термин`
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${count} термина`
  return `${count} терминов`
}

const deepSearch = (obj: any, query: string): boolean => {
  if (!obj) return false
  if (typeof obj === 'string') return obj.toLowerCase().includes(query)
  if (typeof obj === 'object') {
    return Object.values(obj).some(val => deepSearch(val, query))
  }
  return false
}

const getDisplayTitle = (item: any, lang: Lang): string => {
  if (!item) return '...'
  if (typeof item.title === 'string') return item.title
  if (item.title && item.title[lang]) return item.title[lang]
  if (typeof item.name === 'string') return item.name
  if (item.name && item.name[lang]) return item.name[lang]
  if (typeof item.term === 'string') return item.term
  if (item.term && item.term[lang]) return item.term[lang]
  return '...'
}

// --- АНИМАЦИИ ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 40, rotate: 2 },
  show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
}

export function HomePage({
  onBack,
  onOpenBlog,
  onOpenCalcMenu,
  onOpenColors,
  onOpenStyles,
  onOpenGlossary,
  onOpenPrices,
  lang,
  setLang,
  favorites = [],
  onOpenArticle,
  onOpenFavorites,
  onChangeTab,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDark, setIsDark] = useState(true)
  
  const hasNewBlog = BLOG_ARTICLES?.some((a) => a.isNew) || false
  const articleFavorites = favorites?.filter((f) => f.type === 'article') || []
  const glossaryCount = GLOSSARY_TERMS?.length || 0

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs = ['ru', 'uk', 'de']
    if (savedLang && supportedLangs.includes(savedLang) && savedLang !== lang) {
      setLang(savedLang)
    }
  }, [lang, setLang])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const safeLang = (lang && ['ru', 'uk', 'de'].includes(lang)) ? lang : 'uk'

  const t = {
    ru: {
      menu: 'Меню',
      search: 'Поиск (материалы, конструкции...)',
      learning: 'Исследование',
      tools: 'Инструментарий',
      system: 'Система',
      materials: 'Материалы',
      materialsSub: 'Кожа, замша, подошвы',
      colors: 'Цвета',
      colorsSub: 'Патина и психология',
      styles: 'Силуэты',
      stylesSub: 'Фасоны и классика',
      sizes: 'Ортопедия',
      sizesSub: 'Размеры и колодки',
      calc: 'Калькуляторы',
      calcSub: `${CALCULATORS_COUNT} Модулей`,
      blog: 'Архив',
      blogSub: hasNewBlog ? 'Новое издание' : 'Статьи',
      glossary: 'Глоссарий',
      glossarySub: glossaryLabel(glossaryCount, 'ru'),
      prices: 'Рынок',
      pricesSub: 'Сводка цен',
      settings: 'Настройки',
      settingsSub: 'Тема, язык, интерфейс',
      profile: 'Профиль',
      profileSub: 'Аккаунт и данные',
      favorites: 'Сохраненное',
      favoritesSub: articleFavorites.length > 0 ? `Томов: ${articleFavorites.length}` : 'Архив пуст',
      quote: '«Мастерство — в деталях. Знание — в опыте.»',
      searchResults: 'Результаты',
      noResults: 'Записи не найдены',
      section: 'Раздел',
    },
    uk: { menu: 'Меню', search: 'Пошук', learning: 'Дослідження', tools: 'Інструментарій', system: 'Система', materials: 'Матеріали', materialsSub: 'Шкіра, замша, підошви', colors: 'Кольори', colorsSub: 'Патина та психологія', styles: 'Силуети', stylesSub: 'Фасони та класика', sizes: 'Ортопедія', sizesSub: 'Розміри та колодки', calc: 'Калькулятори', calcSub: `${CALCULATORS_COUNT} Модулів`, blog: 'Архів', blogSub: hasNewBlog ? 'Нове видання' : 'Статті', glossary: 'Глосарій', glossarySub: glossaryLabel(glossaryCount, 'uk'), prices: 'Ринок', pricesSub: 'Зведення цін', settings: 'Налаштування', settingsSub: 'Тема, мова, інтерфейс', profile: 'Профіль', profileSub: 'Акаунт та дані', favorites: 'Збережене', favoritesSub: articleFavorites.length > 0 ? `Томів: ${articleFavorites.length}` : 'Архів порожній', quote: '«Майстерність — в деталях. Знання — в досвіді.»', searchResults: 'Результати', noResults: 'Записів не знайдено', section: 'Розділ' },
    de: { menu: 'Menü', search: 'Suchen', learning: 'Forschung', tools: 'Werkzeuge', system: 'System', materials: 'Materialien', materialsSub: 'Leder, Sohlen', colors: 'Farben', colorsSub: 'Patina & Psychologie', styles: 'Silhouetten', stylesSub: 'Klassik & Formen', sizes: 'Orthopädie', sizesSub: 'Leisten & Maße', calc: 'Rechner', calcSub: `${CALCULATORS_COUNT} Module`, blog: 'Archiv', blogSub: hasNewBlog ? 'Neue Ausgabe' : 'Artikel', glossary: 'Glossar', glossarySub: glossaryLabel(glossaryCount, 'de'), prices: 'Markt', pricesSub: 'Preisübersicht', settings: 'Einstellungen', settingsSub: 'Design, Sprache', profile: 'Profil', profileSub: 'Account & Daten', favorites: 'Gespeichert', favoritesSub: articleFavorites.length > 0 ? `Ausgaben: ${articleFavorites.length}` : 'Leeres Archiv', quote: '„Meisterschaft liegt im Detail. Wissen in der Erfahrung.“', searchResults: 'Ergebnisse', noResults: 'Keine Einträge', section: 'Bereich' }
  }[safeLang]

  const LEARNING: MenuItem[] = [
    { id: 'materials', title: t.materials, subtitle: t.materialsSub, action: undefined },
    { id: 'colors', title: t.colors, subtitle: t.colorsSub, action: onOpenColors },
    { id: 'styles', title: t.styles, subtitle: t.stylesSub, action: onOpenStyles },
    { id: 'sizes', title: t.sizes, subtitle: t.sizesSub, action: undefined },
  ]

  const TOOLS: MenuItem[] = [
    { id: 'calc', title: t.calc, subtitle: t.calcSub, action: onOpenCalcMenu },
    { id: 'blog', title: t.blog, subtitle: t.blogSub, action: onOpenBlog, dot: hasNewBlog },
    { id: 'glossary', title: t.glossary, subtitle: t.glossarySub, action: () => onOpenGlossary?.() },
    { id: 'prices', title: t.prices, subtitle: t.pricesSub, action: onOpenPrices },
  ]

  const SYSTEM: MenuItem[] = [
    { id: 'settings', title: t.settings, subtitle: t.settingsSub, action: () => onChangeTab?.('settings') },
    { id: 'profile', title: t.profile, subtitle: t.profileSub, action: () => onChangeTab?.('profile') },
  ]

  const query = searchQuery.trim().toLowerCase()
  const searchResults: Array<{ id: string; type: string; title: string; subtitle: string }> = []

  if (query) {
    [...LEARNING, ...TOOLS, ...SYSTEM].forEach((item) => {
      if (item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query)) {
        searchResults.push({ type: 'category', id: item.id, title: item.title, subtitle: t.section })
      }
    })
    BLOG_ARTICLES?.forEach((article) => {
      if (deepSearch(article, query)) {
        searchResults.push({ type: 'article', id: article.id, title: getDisplayTitle(article, safeLang), subtitle: t.blog })
      }
    })
    GLOSSARY_TERMS?.forEach((term) => {
      if (deepSearch(term, query)) {
        searchResults.push({ type: 'glossary', id: term.id, title: getDisplayTitle(term, safeLang), subtitle: t.glossary })
      }
    })
  }

  const handleResultClick = (res: any) => {
    if (res.type === 'category') {
      const match = [...LEARNING, ...TOOLS, ...SYSTEM].find(i => i.id === res.id)
      match?.action?.()
    } else if (res.type === 'article') {
      onOpenArticle?.(res.id)
    } else if (res.type === 'glossary') {
      onOpenGlossary?.(res.id)
    }
    setSearchQuery('')
  }

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  // Адаптивная сетка: на мобилках аккуратная лесенка, на десктопе - асимметрия
  const gridClasses = [
    "self-start text-left ml-0 md:ml-[5%] md:w-[60%]",
    "self-start text-left ml-[12%] md:self-end md:text-right md:mr-[5%] md:-mt-8 md:w-[50%]",
    "self-start text-left ml-[4%] md:self-center md:text-center md:ml-[10%] md:mt-4 md:w-[70%]",
    "self-start text-left ml-[16%] md:ml-[40%] md:-mt-4 md:w-[45%]"
  ]

  const renderBrokenGrid = (items: MenuItem[], startIndex: number = 1) => (
    <div className="flex flex-col mb-16 md:mb-24 w-full gap-6 md:gap-4">
      {items.map((item, idx) => {
        const num = startIndex + idx
        const numStr = num < 10 ? `0${num}` : `${num}`
        const alignClass = gridClasses[idx % gridClasses.length]
        
        return (
          <motion.button
            variants={itemVariants}
            key={item.id}
            onClick={item.action}
            className={`group relative flex flex-col justify-center py-4 md:py-6 px-0 md:px-4 outline-none border-0 bg-transparent cursor-pointer transition-opacity ${alignClass} ${item.action ? 'active:opacity-50' : 'opacity-30 cursor-not-allowed'}`}
          >
            {/* Тонкая линия-разделитель (только на десктопе при наведении) */}
            <div className={`hidden md:block absolute bottom-0 left-0 right-0 h-[1px] ${cLine} scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left ease-[cubic-bezier(0.16,1,0.3,1)]`} />
            
            <div className="flex flex-col w-full h-full justify-center">
              <span className={`text-[9px] font-sans tracking-[0.3em] mb-1 md:mb-2 ${cTextMuted} transition-colors group-hover:text-current`}>
                [{numStr}] {item.subtitle}
              </span>
              
              <div className="flex items-center gap-3 md:gap-4 w-full justify-[inherit]">
                {/* РЕЗИНОВЫЙ ШРИФТ: text-[11.5vw] спасает длинные слова от вылезания на мобилках */}
                <span className="font-serif text-[11.5vw] min-[420px]:text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:group-hover:tracking-normal md:group-hover:italic break-words text-left md:text-inherit">
                  {item.title}
                </span>
                
                {item.dot && (
                  <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#991B1B] shadow-[0_0_15px_rgba(153,27,27,0.5)] block -translate-y-2 md:-translate-y-4 shrink-0" />
                )}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )

  return (
    <div className={`relative min-h-[100dvh] w-full overflow-hidden transition-colors duration-300 ${cBg} ${cText}`}>
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
      `}</style>

      {/* HEADER */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="px-6 pt-10 pb-4 flex items-start justify-between z-50 relative"
      >
        {onBack ? (
          <button onClick={onBack} className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer ${cTextMuted} ${cHover}`}>
            <span className="transform transition-transform group-hover:-translate-x-1">←</span>
            <span>Back</span>
          </button>
        ) : (
          <div className="w-10"></div>
        )}

        <div className="flex items-center gap-6">
          {['ru', 'uk', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => handleLangChange(l as Lang)}
              className={`text-[9px] font-sans uppercase tracking-[0.3em] outline-none border-0 bg-transparent cursor-pointer transition-colors duration-300 ${
                safeLang === l ? cText : cTextMuted
              } ${cHover}`}
            >
              {l === 'uk' ? 'UKR' : l}
            </button>
          ))}
        </div>
      </motion.header>

      <div className="px-6 pb-32 pt-8 relative z-10 w-full max-w-[1200px] mx-auto">
        
        {/* ЗАГОЛОВОК СТРАНИЦЫ (Анимированный и адаптированный) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 md:mb-32 flex justify-center mt-4 md:mt-0"
        >
          <h1 className="font-serif text-[28vw] md:text-[15rem] leading-[0.75] tracking-[-0.05em] opacity-10">
            {t.menu}
          </h1>
        </motion.div>

        {/* ПОИСК */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
          className="mb-16 md:mb-24 px-0 md:px-12"
        >
          <div className={`relative flex flex-col md:flex-row md:items-end border-b pb-4 md:pb-6 transition-colors group ${cLine} hover:border-current`}>
            <span className={`text-[10px] font-sans uppercase tracking-[0.3em] mb-4 md:mb-0 md:mr-8 ${cTextMuted} transition-colors group-hover:text-current`}>
              Search.
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className={`w-full bg-transparent outline-none border-0 text-3xl md:text-5xl font-serif italic placeholder:not-italic placeholder:font-light transition-colors ${isDark ? 'placeholder:text-[#F4F0E8]/20' : 'placeholder:text-[#1C1816]/20'}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`absolute right-0 bottom-4 md:bottom-6 text-[10px] uppercase tracking-widest outline-none border-0 bg-transparent cursor-pointer ${cTextMuted} hover:text-current`}>
                [X]
              </button>
            )}
          </div>
        </motion.div>

        {/* РЕЗУЛЬТАТЫ / КАТЕГОРИИ */}
        <AnimatePresence mode="wait">
          {query ? (
            <motion.div key="search-results" initial="hidden" animate="show" exit="hidden" variants={containerVariants}>
              <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-8 px-0 md:px-4 ${cTextMuted}`}>
                {t.searchResults} / {searchResults.length}
              </p>
              {searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map((res, i) => (
                    <motion.button
                      variants={itemVariants}
                      key={`${res.type}-${res.id}-${i}`}
                      onClick={() => handleResultClick(res)}
                      className={`w-full group flex items-center justify-between py-6 md:py-8 px-0 md:px-4 border-b ${cLine} text-left outline-none border-0 bg-transparent cursor-pointer active:opacity-50 transition-colors hover:bg-current/5`}
                    >
                      <div className="font-serif text-3xl md:text-5xl leading-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:group-hover:translate-x-4">
                        {res.title}
                      </div>
                      <div className={`text-[10px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
                        {res.subtitle}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <motion.div variants={itemVariants} className={`py-20 text-[18px] md:text-2xl font-serif italic text-center ${cTextMuted}`}>
                  {t.noResults}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="menu-grid" initial="hidden" animate="show" exit="hidden" variants={containerVariants} className="flex flex-col">
              
              {/* СЕКЦИИ МЕНЮ */}
              <div className="relative w-full">
                {/* Десктоп: вертикально сбоку. Мобилка: горизонтально сверху */}
                <div className={`hidden md:block absolute top-0 left-0 text-[10px] uppercase tracking-[0.4em] origin-top-left rotate-90 translate-x-4 ${cTextMuted}`}>
                  {t.learning}
                </div>
                <div className={`md:hidden text-[9px] uppercase tracking-[0.4em] mb-6 border-b pb-2 ${cLine} ${cTextMuted}`}>
                  {t.learning}
                </div>
                {renderBrokenGrid(LEARNING, 1)}
              </div>

              <div className="relative w-full md:mt-12">
                <div className={`hidden md:block absolute top-0 right-0 text-[10px] uppercase tracking-[0.4em] origin-top-right -rotate-90 -translate-x-4 ${cTextMuted}`}>
                  {t.tools}
                </div>
                <div className={`md:hidden text-[9px] uppercase tracking-[0.4em] mt-8 mb-6 border-b pb-2 ${cLine} ${cTextMuted}`}>
                  {t.tools}
                </div>
                {renderBrokenGrid(TOOLS, 5)}
              </div>

              <div className="relative w-full md:mt-12">
                <div className={`md:hidden text-[9px] uppercase tracking-[0.4em] mt-8 mb-6 border-b pb-2 ${cLine} ${cTextMuted}`}>
                  {t.system}
                </div>
                {renderBrokenGrid(SYSTEM, 9)}
              </div>

              {/* ИЗБРАННОЕ КАК ЖУРНАЛЬНАЯ ВРЕЗКА */}
              <motion.div variants={itemVariants} className="mt-8 md:mt-12 px-0 md:px-12 w-full md:w-[80%] mx-auto">
                <button
                  className={`w-full relative group overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-6 md:p-12 border outline-none bg-transparent cursor-pointer ${cLine} transition-colors hover:border-current`}
                  onClick={() => {
                    if (articleFavorites.length === 1) onOpenArticle?.(articleFavorites[0].id)
                    else if (articleFavorites.length > 1) onOpenFavorites?.()
                  }}
                >
                  <div className="absolute inset-0 bg-current/0 md:group-hover:bg-current/5 transition-colors duration-500" />
                  
                  <div className="text-left relative z-10 mb-8 md:mb-0">
                    <div className={`text-[10px] font-sans uppercase tracking-[0.3em] mb-4 ${cTextMuted}`}>{t.favoritesSub}</div>
                    <div className="font-serif text-3xl md:text-6xl leading-none italic md:group-hover:not-italic transition-all duration-500">{t.favorites}</div>
                  </div>
                  
                  <div className="flex -space-x-4 md:-space-x-6 relative z-10">
                    {articleFavorites.slice(0, 3).map((item, idx) => (
                      <div key={item.id} className={`w-12 h-12 md:w-24 md:h-24 rounded-full border border-current overflow-hidden grayscale transition-transform duration-500 md:group-hover:scale-110`} style={{ zIndex: 10 - idx }}>
                        <img src={item.imagePng} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </button>
              </motion.div>

              {/* ЦИТАТА */}
              <motion.div variants={itemVariants} className="mt-24 md:mt-32 pb-10">
                <div className="flex flex-col items-center text-center px-4">
                  <div className={`w-px h-16 md:h-24 mb-8 md:mb-12 ${cLine} border-l`} />
                  <p className={`font-serif text-xl md:text-4xl italic leading-[1.4] max-w-2xl ${cTextMuted}`}>
                    {t.quote}
                  </p>
                  <p className="mt-6 md:mt-8 text-[10px] font-sans font-medium uppercase tracking-[0.5em]">
                    Cordwainer
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
