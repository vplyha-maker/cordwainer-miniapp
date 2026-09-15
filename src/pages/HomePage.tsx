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

// Мягкая анимация появления списка
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
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
    uk: {
      menu: 'Меню',
      search: 'Пошук (матеріали, конструкції...)',
      learning: 'Дослідження',
      tools: 'Інструментарій',
      system: 'Система',
      materials: 'Матеріали',
      materialsSub: 'Шкіра, замша, підошви',
      colors: 'Кольори',
      colorsSub: 'Патина та психологія',
      styles: 'Силуети',
      stylesSub: 'Фасони та класика',
      sizes: 'Ортопедія',
      sizesSub: 'Розміри та колодки',
      calc: 'Калькулятори',
      calcSub: `${CALCULATORS_COUNT} Модулів`,
      blog: 'Архів',
      blogSub: hasNewBlog ? 'Нове видання' : 'Статті',
      glossary: 'Глосарій',
      glossarySub: glossaryLabel(glossaryCount, 'uk'),
      prices: 'Ринок',
      pricesSub: 'Зведення цін',
      settings: 'Налаштування',
      settingsSub: 'Тема, мова, інтерфейс',
      profile: 'Профіль',
      profileSub: 'Акаунт та дані',
      favorites: 'Збережене',
      favoritesSub: articleFavorites.length > 0 ? `Томів: ${articleFavorites.length}` : 'Архів порожній',
      quote: '«Майстерність — в деталях. Знання — в досвіді.»',
      searchResults: 'Результати',
      noResults: 'Записів не знайдено',
      section: 'Розділ',
    },
    de: {
      menu: 'Menü',
      search: 'Suchen (Materialien, Formen...)',
      learning: 'Forschung',
      tools: 'Werkzeuge',
      system: 'System',
      materials: 'Materialien',
      materialsSub: 'Leder, Sohlen',
      colors: 'Farben',
      colorsSub: 'Patina & Psychologie',
      styles: 'Silhouetten',
      stylesSub: 'Klassik & Formen',
      sizes: 'Orthopädie',
      sizesSub: 'Leisten & Maße',
      calc: 'Rechner',
      calcSub: `${CALCULATORS_COUNT} Module`,
      blog: 'Archiv',
      blogSub: hasNewBlog ? 'Neue Ausgabe' : 'Artikel',
      glossary: 'Glossar',
      glossarySub: glossaryLabel(glossaryCount, 'de'),
      prices: 'Markt',
      pricesSub: 'Preisübersicht',
      settings: 'Einstellungen',
      settingsSub: 'Design, Sprache',
      profile: 'Profil',
      profileSub: 'Account & Daten',
      favorites: 'Gespeichert',
      favoritesSub: articleFavorites.length > 0 ? `Ausgaben: ${articleFavorites.length}` : 'Leeres Archiv',
      quote: '„Meisterschaft liegt im Detail. Wissen in der Erfahrung.“',
      searchResults: 'Ergebnisse',
      noResults: 'Keine Einträge',
      section: 'Bereich',
    }
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

  // ВАШ ИСХОДНЫЙ ДИЗАЙН
  const renderList = (items: MenuItem[], startIndex: number = 1) => (
    <div className="flex flex-col mb-16">
      {items.map((item, idx) => {
        const num = startIndex + idx
        const numStr = num < 10 ? `0${num}` : `${num}`
        return (
          <motion.button
            variants={itemVariants}
            key={item.id}
            onClick={item.action}
            disabled={!item.action}
            className={`group relative flex items-end justify-between py-6 border-b outline-none border-0 bg-transparent text-left transition-all ${
              item.action 
                ? 'active:opacity-50 cursor-pointer' 
                : 'opacity-40 cursor-default' // Неактивные элементы выглядят именно так, как на скриншоте
            } ${cLine}`}
          >
            <div className="flex items-start gap-4">
              <span className={`text-[9px] font-sans tracking-widest mt-2 ${cTextMuted}`}>
                {numStr}
              </span>
              <div className="flex items-center gap-3">
                <div className={`font-serif text-[7vw] min-[375px]:text-3xl leading-[1.1] transition-transform ${item.action ? 'group-hover:translate-x-1 group-active:translate-x-1' : ''}`}>
                  {item.title}
                </div>
                {item.dot && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B] block mb-4" />
                )}
              </div>
            </div>
            <div className={`text-[10px] font-sans tracking-[0.1em] text-right w-[40%] ${cTextMuted}`}>
              {item.subtitle}
            </div>
          </motion.button>
        )
      })}
    </div>
  )

  return (
    <div className={`relative min-h-[100dvh] w-full transition-colors duration-300 ${cBg} ${cText}`}>
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20">
        {onBack ? (
          <button onClick={onBack} className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer ${cTextMuted} ${cHover}`}>
            <span className="transform transition-transform group-hover:-translate-x-1">←</span>
            <span>Back</span>
          </button>
        ) : (
          <div className="w-10"></div>
        )}

        <div className="flex items-center gap-4">
          {['ru', 'uk', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => handleLangChange(l as Lang)}
              className={`text-[10px] font-sans uppercase tracking-[0.25em] outline-none border-0 bg-transparent cursor-pointer transition-colors duration-300 ${
                safeLang === l ? cText : cTextMuted
              } ${cHover}`}
            >
              {l === 'uk' ? 'UKR' : l}
            </button>
          ))}
        </div>
      </header>

      {/* КОНТЕНТ */}
      <motion.div 
        className="px-6 pb-24"
        initial="hidden"
        animate="show"
        variants={containerVariants}
      >
        {/* ЗАГОЛОВОК СТРАНИЦЫ */}
        <motion.div variants={itemVariants} className="mb-12 mt-4">
          <h1 className="font-serif text-[18vw] leading-[0.8] tracking-[-0.04em]">
            {t.menu}
          </h1>
        </motion.div>

        {/* ПОИСК В ТОЧНОСТИ КАК БЫЛ */}
        <motion.div variants={itemVariants} className="mb-16">
          <div className={`relative flex items-end border-b pb-3 transition-colors ${cLine}`}>
            <span className={`text-[12px] font-serif italic mr-4 ${cTextMuted}`}>Find.</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className={`w-full bg-transparent outline-none border-0 text-[16px] font-sans font-light placeholder:font-light ${isDark ? 'placeholder:text-[#F4F0E8]/30' : 'placeholder:text-[#1C1816]/30'}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`ml-2 text-[10px] uppercase tracking-widest outline-none border-0 bg-transparent cursor-pointer ${cTextMuted}`}>
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* РЕЗУЛЬТАТЫ / КАТЕГОРИИ */}
        {query ? (
          <div>
            <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
              {t.searchResults} / {searchResults.length}
            </p>
            {searchResults.length > 0 ? (
              <div className="flex flex-col">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.type}-${res.id}-${i}`}
                    onClick={() => handleResultClick(res)}
                    className={`w-full group flex items-center justify-between py-5 border-b ${cLine} text-left outline-none border-0 bg-transparent cursor-pointer active:opacity-50 transition-opacity`}
                  >
                    <div className="font-serif text-[22px] leading-none transition-transform group-hover:translate-x-1">
                      {res.title}
                    </div>
                    <div className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
                      {res.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={`py-12 text-[14px] font-serif italic text-center ${cTextMuted}`}>
                {t.noResults}
              </div>
            )}
          </div>
        ) : (
          <>
            <motion.div variants={itemVariants} className="mb-4">
              <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-4 ${cTextMuted}`}>
                {t.learning}
              </p>
              {renderList(LEARNING, 1)}
            </motion.div>

            <motion.div variants={itemVariants} className="mb-4">
              <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-4 ${cTextMuted}`}>
                {t.tools}
              </p>
              {renderList(TOOLS, 5)}
            </motion.div>

            <motion.div variants={itemVariants} className="mb-4">
              <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.3em] mb-4 ${cTextMuted}`}>
                {t.system}
              </p>
              {renderList(SYSTEM, 9)}
            </motion.div>

            {/* ИЗБРАННОЕ КАК ЖУРНАЛЬНАЯ ВРЕЗКА */}
            <motion.div variants={itemVariants} className="mb-16">
              <button
                className={`w-full flex items-center justify-between p-6 border outline-none bg-transparent cursor-pointer ${cLine} transition-colors active:bg-current/5`}
                onClick={() => {
                  if (articleFavorites.length === 1) onOpenArticle?.(articleFavorites[0].id)
                  else if (articleFavorites.length > 1) onOpenFavorites?.()
                }}
              >
                <div>
                  <div className="font-serif text-[26px] leading-none mb-2 text-left">{t.favorites}</div>
                  <div className={`text-[10px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>{t.favoritesSub}</div>
                </div>
                <div className="flex -space-x-4">
                  {articleFavorites.slice(0, 3).map((item, idx) => (
                    <div key={item.id} className={`w-12 h-12 rounded-full border-2 ${isDark ? 'border-[#0A0A0A]' : 'border-[#F2EFE9]'} overflow-hidden grayscale`} style={{ zIndex: 10 - idx }}>
                      <img src={item.imagePng} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </button>
            </motion.div>

            {/* ЦИТАТА */}
            <motion.div variants={itemVariants} className="pb-10">
              <div className="flex flex-col items-center text-center px-4">
                <div className={`w-px h-12 mb-8 ${cLine} border-l`} />
                <p className={`font-serif text-[18px] sm:text-[20px] italic leading-[1.5] ${cTextMuted}`}>
                  {t.quote}
                </p>
                <p className="mt-6 text-[9px] font-sans font-bold uppercase tracking-[0.4em]">
                  Cordwainer
                </p>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  )
}
