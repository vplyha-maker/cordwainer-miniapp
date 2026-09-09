import { useEffect, useState } from 'react'
import { BottomDock } from '../components/BottomDock'
import { BLOG_ARTICLES } from '../data/blog'
import { GLOSSARY_TERMS } from '../data/glossary'
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

// Рекурсивный поиск по всем свойствам объекта (ищет сразу по RU, UK, DE)
const deepSearch = (obj: any, query: string): boolean => {
  if (!obj) return false
  if (typeof obj === 'string') return obj.toLowerCase().includes(query)
  if (typeof obj === 'object') {
    return Object.values(obj).some(val => deepSearch(val, query))
  }
  return false
}

// Функция для безопасного извлечения заголовка для текущего языка
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
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const hasNewBlog = BLOG_ARTICLES.some((a) => a.isNew)
  const articleFavorites = favorites.filter((f) => f.type === 'article')
  const glossaryCount = GLOSSARY_TERMS.length

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Lang
    const supportedLangs = ['ru', 'uk', 'de']
    
    if (savedLang && supportedLangs.includes(savedLang)) {
      if (savedLang !== lang) setLang(savedLang)
    }
  }, [])

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

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
      glossarySub: glossaryLabel(glossaryCount, 'ru'),
      prices: 'Цены',
      pricesSub: 'Клеи, материалы',
      favorites: 'Избранное',
      favoritesSub:
        articleFavorites.length > 0
          ? `Сохранено статей: ${articleFavorites.length}`
          : 'Нет сохраненных статей',
      quote: '«Мастерство — в деталях. Знание — в опыте.»',
      searchResults: 'Результаты поиска',
      noResults: 'Ничего не найдено',
      section: 'Раздел',
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
      glossarySub: glossaryLabel(glossaryCount, 'uk'),
      prices: 'Ціни',
      pricesSub: 'Клеї, матеріали',
      favorites: 'Обране',
      favoritesSub:
        articleFavorites.length > 0
          ? `Збережено статей: ${articleFavorites.length}`
          : 'Немає збережених статей',
      quote: '«Майстерність — в деталях. Знання — в досвіді.»',
      searchResults: 'Результати пошуку',
      noResults: 'Нічого не знайдено',
      section: 'Розділ',
    },
    de: {
      menu: 'Menü',
      search: 'Suche nach Materialien, Konstruktionen...',
      learning: 'Wissen',
      tools: 'Werkzeuge',
      materials: 'Materialien',
      materialsSub: 'Leder, Wildleder, Sohlen etc.',
      materialsCount: '245 Artikel',
      colors: 'Farben & Finish',
      colorsSub: 'Farbpsychologie, Patina',
      colorsCount: '128 Artikel',
      styles: 'Leisten & Silhouetten',
      stylesSub: 'Klassik, Damen, Streetwear',
      stylesCount: '186 Artikel',
      sizes: 'Größen & Orthopädie',
      sizesSub: 'Leisten, Rist, Fuß',
      sizesCount: '97 Artikel',
      calc: 'Rechner',
      calcSub: '12 Werkzeuge',
      blog: 'Journal',
      blogSub: hasNewBlog ? 'Neuer Artikel' : 'Werkstatt-Journal',
      glossary: 'Glossar',
      glossarySub: glossaryLabel(glossaryCount, 'de'),
      prices: 'Preise',
      pricesSub: 'Klebstoffe, Materialien',
      favorites: 'Favoriten',
      favoritesSub:
        articleFavorites.length > 0
          ? `${articleFavorites.length} Artikel gespeichert`
          : 'Keine Artikel gespeichert',
      quote: '„Meisterschaft liegt im Detail. Wissen in der Erfahrung.“',
      searchResults: 'Suchergebnisse',
      noResults: 'Nichts gefunden',
      section: 'Bereich',
    }
  }[lang]

  const LEARNING = [
    {
      id: 'materials',
      title: t.materials,
      subtitle: t.materialsSub,
      count: t.materialsCount,
      iconClass: 'bg-[var(--color-accent,#E4D00A)]/15 text-[var(--color-accent,#E4D00A)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 8.5 4 C 8.5 4 6 5 5 7.5 C 4 10 4.5 12 4.5 12 C 4.5 12 2.5 14 3.5 17 C 4.5 20 7 19.5 7 19.5 C 7 19.5 9 18 12 18 C 15 18 17 19.5 17 19.5 C 17 19.5 19.5 20 20.5 17 C 21.5 14 19.5 12 19.5 12 C 19.5 12 20 10 19 7.5 C 18 5 15.5 4 15.5 4 C 15.5 4 14 5.5 12 5.5 C 10 5.5 8.5 4 8.5 4 Z" />
        </svg>
      ),
    },
    {
      id: 'colors',
      title: t.colors,
      subtitle: t.colorsSub,
      count: t.colorsCount,
      iconClass: 'bg-[var(--pigment-azurite,#007FFF)]/15 text-[var(--pigment-azurite,#007FFF)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      iconClass: 'bg-[var(--pigment-egyptian-blue,#1034A6)]/15 text-[var(--pigment-egyptian-blue,#1034A6)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      iconClass: 'bg-[var(--pigment-malachite,#0BDA51)]/15 text-[var(--pigment-malachite,#0BDA51)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      iconClass: 'bg-[var(--color-accent,#E4D00A)]/15 text-[var(--color-accent,#E4D00A)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="3" />
          <path d="M8 6h8M16 14v.01M12 14v.01M8 14v.01M16 18v.01M12 18v.01M8 18v.01M16 10v.01M12 10v.01M8 10v.01" />
        </svg>
      ),
    },
    {
      id: 'blog',
      title: t.blog,
      subtitle: t.blogSub,
      iconClass: 'bg-[var(--pigment-lac-dye,#8B0000)]/15 text-[var(--pigment-lac-dye,#8B0000)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
    },
    {
      id: 'glossary',
      title: t.glossary,
      subtitle: t.glossarySub,
      iconClass: 'bg-[var(--pigment-azurite,#007FFF)]/15 text-[var(--pigment-azurite,#007FFF)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      ),
    },
    {
      id: 'prices',
      title: t.prices,
      subtitle: t.pricesSub,
      iconClass: 'bg-[var(--pigment-malachite,#0BDA51)]/15 text-[var(--pigment-malachite,#0BDA51)]',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
  ]

  // === ЛОГИКА ПОИСКА ===
  const query = searchQuery.trim().toLowerCase()
  const searchResults: Array<{ id: string; type: string; title: string; subtitle: string }> = []

  if (query) {
    // 1. Поиск по разделам (Обучение и Инструменты)
    [...LEARNING, ...TOOLS].forEach((item) => {
      if (item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query)) {
        searchResults.push({ type: 'category', id: item.id, title: item.title, subtitle: t.section })
      }
    })

    // 2. Поиск по статьям блога
    BLOG_ARTICLES.forEach((article) => {
      if (deepSearch(article, query)) {
        searchResults.push({ type: 'article', id: article.id, title: getDisplayTitle(article, lang), subtitle: t.blog })
      }
    })

    // 3. Поиск по глоссарию
    GLOSSARY_TERMS.forEach((term) => {
      if (deepSearch(term, query)) {
        searchResults.push({ type: 'glossary', id: term.id, title: getDisplayTitle(term, lang), subtitle: t.glossary })
      }
    })
  }

  // Обработчик клика по результату поиска
  const handleResultClick = (res: any) => {
    if (res.type === 'category') {
      switch (res.id) {
        case 'colors': onOpenColors?.(); break
        case 'styles': onOpenStyles?.(); break
        case 'calc': onOpenCalcMenu?.(); break
        case 'blog': onOpenBlog?.(); break
        case 'glossary': onOpenGlossary?.(); break
        case 'prices': onOpenPrices?.(); break
      }
    } else if (res.type === 'article') {
      onOpenArticle?.(res.id)
    } else if (res.type === 'glossary') {
      onOpenGlossary?.(res.id)
    }
    setSearchQuery('')
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-3 flex items-center justify-between shrink-0 relative z-20">
        <h1 className="text-[34px] font-serif font-normal tracking-wide leading-none text-[var(--color-ink,#F5F1EA)]">
          {t.menu}
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full p-1 border border-[var(--color-border,rgba(255,255,255,0.12))] bg-[var(--color-surface,#25201C)]">
            {['ru', 'uk', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l as Lang)}
                className={`lang-toggle px-2 py-1 text-[10px] sm:text-[11px] uppercase rounded-full transition-colors ${
                  lang === l ? 'active bg-white/10 text-white' : 'inactive text-white/50'
                }`}
                aria-pressed={lang === l}
              >
                {l}
              </button>
            ))}
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-ink,#F5F1EA)] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] active:scale-90 transition-transform"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 overflow-y-auto pb-[110px] overscroll-none">
        
        {/* АКТИВНЫЙ ПОИСК */}
        <div className="mb-5 relative">
          <div className="rounded-[18px] px-4 py-3 flex items-center gap-2.5 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] focus-within:border-[var(--color-accent,#E4D00A)] focus-within:shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent,#E4D00A)_15%,transparent)] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[var(--color-muted,#B9ACA0)] shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="bg-transparent border-none outline-none text-[13px] text-[var(--color-ink,#F5F1EA)] w-full placeholder:text-[var(--color-muted,#B9ACA0)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[var(--color-muted,#B9ACA0)] hover:text-white shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* УСЛОВНЫЙ РЕНДЕР: Поиск ИЛИ Обычное меню */}
        {query ? (
          <div className="search-results pb-6">
            <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-3">
              {t.searchResults} ({searchResults.length})
            </p>
            {searchResults.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.type}-${res.id}-${i}`}
                    onClick={() => handleResultClick(res)}
                    className="w-full text-left p-3.5 rounded-[16px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] hover:border-[var(--color-accent,#E4D00A)]/50 transition-colors active:scale-[0.98]"
                  >
                    <div className="text-[13px] font-medium text-[var(--color-ink,#F5F1EA)] line-clamp-1">{res.title}</div>
                    <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] mt-1">{res.subtitle}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[var(--color-muted,#B9ACA0)] text-center py-12 bg-[var(--color-surface,#25201C)] rounded-[18px] border border-[var(--color-border,rgba(255,255,255,0.12))]">
                {t.noResults}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ОБУЧЕНИЕ */}
            <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
              {t.learning}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {LEARNING.map((item) => {
                const isColors = item.id === 'colors'
                const isStyles = item.id === 'styles'
                return (
                  <button
                    key={item.id}
                    onClick={
                      isColors ? onOpenColors : 
                      isStyles ? onOpenStyles : 
                      undefined
                    }
                    className="min-h-[116px] h-auto p-4 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm"
                  >
                    <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${item.iconClass}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 mt-2">
                      <div className="text-[13px] font-medium leading-snug text-[var(--color-ink,#F5F1EA)] break-words">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] mt-0.5 line-clamp-2">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ИНСТРУМЕНТЫ */}
            <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--color-muted,#B9ACA0)] mb-2.5">
              {t.tools}
            </p>
            <div className="grid grid-cols-4 gap-2.5 md:gap-3 mb-6">
              {TOOLS.map((item) => {
                const isBlog = item.id === 'blog'
                const isCalc = item.id === 'calc'
                const isGlossary = item.id === 'glossary'
                const isPrices = item.id === 'prices'

                return (
                  <button
                    key={item.id}
                    onClick={
                      isCalc
                        ? onOpenCalcMenu
                        : isBlog
                          ? onOpenBlog
                          : isGlossary
                            ? onOpenGlossary
                            : isPrices
                              ? onOpenPrices
                              : undefined
                    }
                    className={`relative min-h-[116px] h-auto p-2.5 md:p-3 rounded-[18px] bg-[var(--color-surface,#25201C)] border ${
                      isBlog && hasNewBlog 
                        ? 'border-[var(--pigment-lac-dye,#8B0000)]/50 shadow-[0_0_10px_color-mix(in_srgb,var(--pigment-lac-dye,#8B0000)_15%,transparent)]' 
                        : 'border-[var(--color-border,rgba(255,255,255,0.12))]'
                    } flex flex-col justify-between text-left transition-transform active:scale-95 shadow-sm overflow-hidden`}
                  >
                    <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${item.iconClass}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 mt-2 w-full">
                      <div className="text-[11px] md:text-[13px] font-medium leading-snug text-[var(--color-ink,#F5F1EA)] flex items-start gap-0.5">
                        <span className="break-words hyphens-auto" lang={lang}>
                          {item.title}
                        </span>
                        {isBlog && hasNewBlog && (
                          <span className="text-[var(--pigment-lac-dye,#8B0000)] shrink-0">•</span>
                        )}
                      </div>
                      <div className="text-[9.5px] md:text-[11px] text-[var(--color-muted,#B9ACA0)] mt-0.5 line-clamp-2 leading-snug">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ИЗБРАННОЕ */}
            <button
              className="w-full min-h-[80px] px-4 py-3 rounded-[18px] bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] flex items-center gap-4 mb-4 text-left transition-transform active:scale-[0.98] shadow-sm"
              onClick={() => {
                if (articleFavorites.length === 0) return
                if (articleFavorites.length === 1) {
                  onOpenArticle?.(articleFavorites[0].id)
                } else {
                  onOpenFavorites?.()
                }
              }}
            >
              <div className="w-10 h-10 rounded-[10px] bg-[var(--color-accent,#E4D00A)]/15 text-[var(--color-accent,#E4D00A)] flex items-center justify-center shrink-0 text-xl">
                ★
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-ink,#F5F1EA)]">{t.favorites}</div>
                <div className="text-[11px] text-[var(--color-muted,#B9ACA0)] mt-0.5">{t.favoritesSub}</div>
              </div>
              <div className="flex -space-x-2.5 shrink-0">
                {articleFavorites.length === 0 && (
                  <div className="w-9 h-9 rounded-full bg-[var(--color-surface-2,#2F2924)] border border-[var(--color-border,rgba(255,255,255,0.12))] border-dashed flex items-center justify-center text-[var(--color-muted,#B9ACA0)]/40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                    </svg>
                  </div>
                )}
                {articleFavorites.slice(0, 3).map((item, idx) => (
                  <div
                    key={item.id}
                    className="w-9 h-9 rounded-full border-2 border-[var(--color-bg,#1C1816)] overflow-hidden bg-[var(--color-surface-2,#2F2924)]"
                    style={{ zIndex: 10 - idx }}
                  >
                    <img src={item.imagePng} alt="" className="w-full h-full object-cover" draggable={false} />
                  </div>
                ))}
                {articleFavorites.length > 3 && (
                  <div className="w-9 h-9 rounded-full border-2 border-[var(--color-bg,#1C1816)] flex items-center justify-center bg-[var(--color-surface,#25201C)] text-[10px] font-bold text-[var(--color-accent,#E4D00A)]">
                    +{articleFavorites.length - 3}
                  </div>
                )}
              </div>
            </button>

            {/* QUOTE */}
            <div className="rounded-[18px] p-4 bg-[var(--color-surface,#25201C)] border border-[var(--color-border,rgba(255,255,255,0.12))] shadow-sm">
              <p className="text-[13px] leading-relaxed text-[var(--color-ink,#F5F1EA)]/80 italic">{t.quote}</p>
              <p className="mt-2 text-[11px] text-[var(--color-accent,#E4D00A)] font-serif">Cordwainer</p>
            </div>
          </>
        )}
      </div>

      {/* Bottom Dock */}
      <div className="fixed bottom-[10px] left-0 right-0 z-50 pointer-events-auto">
        <div className="mx-auto w-full max-w-[var(--app-max-width)]">
          <BottomDock active="search" lang={lang} />
        </div>
      </div>
    </div>
  )
}
