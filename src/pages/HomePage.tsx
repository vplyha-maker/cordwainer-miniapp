import { useEffect, useState, CSSProperties } from 'react'
import { motion } from 'framer-motion'
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
  onOpenSneakers?: () => void
  onOpenMaterials?: () => void
  lang: Lang
  setLang: (lang: Lang) => void
  favorites?: FavoriteItem[]
  onOpenArticle?: (articleId: string) => void
  onOpenFavorites?: () => void
  onChangeTab?: (tab: 'search' | 'settings' | 'profile') => void
}

type MenuItem = {
  id: string
  roman: string
  title: string
  subtitle: string
  tag: string
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
    return Object.values(obj).some((val) => deepSearch(val, query))
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
}

export function HomePage({
  onBack,
  onOpenBlog,
  onOpenCalcMenu,
  onOpenColors,
  onOpenStyles,
  onOpenGlossary,
  onOpenPrices,
  onOpenSneakers,
  onOpenMaterials,
  lang,
  setLang,
  favorites = [],
  onOpenArticle,
  onOpenFavorites,
  onChangeTab,
}: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const hasNewBlog = BLOG_ARTICLES?.some((a) => a.isNew) || false
  const articleFavorites = favorites?.filter((f) => f.type === 'article') || []
  const glossaryCount = GLOSSARY_TERMS?.length || 0

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
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

  const safeLang = lang && ['ru', 'uk', 'de'].includes(lang) ? lang : 'uk'

  const t = {
    ru: {
      back: 'Назад',
      issue: 'ВЫПУСК № 01 — ЦИФРОВАЯ ЭНЦИКЛОПЕДИЯ',
      heroTag: 'ВИДЕО-ЛУКБУК • 15 СИЛУЭТОВ',
      heroTitle: 'Анатомия\nФормы',
      heroCta: 'Смотреть лукбук',
      search: 'Поиск: коллекция Cardio, силуэты, статьи...',
      clear: 'Сброс',
      learning: 'I. ДОМ ОБУВИ И ЭКСПОЗИЦИЯ',
      tools: 'II. ИНСТРУМЕНТАРИЙ И АРХИВ',
      system: 'III. СИСТЕМА И КОЛЛЕКЦИЯ',
      materials: 'Cardio',
      materialsSub: 'Мужская обувь • Производство и опт',
      cardioBadge: 'MAISON CARDIO // MEN’S FOOTWEAR',
      cardioDesc: 'Авторское производство мужской обуви. Сезонный лукбук, колодки и прямой оптовый заказ.',
      cardioCta: 'Открыть коллекцию дома',
      colors: 'Цвета',
      colorsSub: 'Патина и колористика',
      styles: 'Силуэты',
      stylesSub: '15 культовых фасонов',
      sneakers: 'Footwear Index',
      sneakersSub: 'Каталог и мировые релизы',
      calc: 'Калькуляторы',
      calcSub: `${CALCULATORS_COUNT} точных модулей`,
      blog: 'Архив статей',
      blogSub: hasNewBlog ? 'Свежий выпуск' : 'Журнал',
      glossary: 'Глоссарий',
      glossarySub: glossaryLabel(glossaryCount, 'ru'),
      prices: 'Рынок',
      pricesSub: 'Индекс цен',
      settings: 'Интерфейс',
      settingsSub: 'Тема и язык',
      profile: 'Профиль',
      profileSub: 'Личные данные',
      favorites: 'Личный архив',
      favoritesSub:
        articleFavorites.length > 0 ? `Сохранено томов: ${articleFavorites.length}` : 'Пусто',
      supportTitle: 'Меценатство',
      supportDesc: 'Поддержать издание',
      quote: '«Мастерство — в деталях. Знание — в опыте.»',
      searchResults: 'Найдено в архиве',
      noResults: 'По вашему запросу записей не найдено',
      section: 'Раздел',
    },
    uk: {
      back: 'Назад',
      issue: 'ВИПУСК № 01 — ЦИФРОВА ЕНЦИКЛОПЕДІЯ',
      heroTag: 'ВІДЕО-ЛУКБУК • 15 СИЛУЕТІВ',
      heroTitle: 'Анатомія\nФорми',
      heroCta: 'Дивитися лукбук',
      search: 'Пошук: колекція Cardio, силуети, статті...',
      clear: 'Скинути',
      learning: 'I. ДІМ ВЗУТТЯ ТА ЕКСПОЗИЦІЯ',
      tools: 'II. ІНСТРУМЕНТАРІЙ ТА АРХІВ',
      system: 'III. СИСТЕМА ТА КОЛЕКЦІЯ',
      materials: 'Cardio',
      materialsSub: 'Чоловіче взуття • Виробництво та гурт',
      cardioBadge: 'MAISON CARDIO // MEN’S FOOTWEAR',
      cardioDesc: 'Авторське виробництво чоловічого взуття. Сезонний лукбук, колодки та пряме гуртове замовлення.',
      cardioCta: 'Відкрити колекцію дому',
      colors: 'Кольори',
      colorsSub: 'Патина та колористика',
      styles: 'Силуети',
      stylesSub: '15 культових фасонів',
      sneakers: 'Footwear Index',
      sneakersSub: 'Каталог та світові релізи',
      calc: 'Калькулятори',
      calcSub: `${CALCULATORS_COUNT} точних модулів`,
      blog: 'Архів статей',
      blogSub: hasNewBlog ? 'Свіжий випуск' : 'Журнал',
      glossary: 'Глосарій',
      glossarySub: glossaryLabel(glossaryCount, 'uk'),
      prices: 'Ринок',
      pricesSub: 'Індекс цін',
      settings: 'Інтерфейс',
      settingsSub: 'Тема та мова',
      profile: 'Профіль',
      profileSub: 'Особисті дані',
      favorites: 'Особистий архів',
      favoritesSub:
        articleFavorites.length > 0 ? `Збережено томів: ${articleFavorites.length}` : 'Порожньо',
      supportTitle: 'Меценатство',
      supportDesc: 'Підтримати видання',
      quote: '«Майстерність — в деталях. Знання — в досвіді.»',
      searchResults: 'Знайдено в архіві',
      noResults: 'За вашим запитом записів не знайдено',
      section: 'Розділ',
    },
    de: {
      back: 'Zurück',
      issue: 'AUSGABE № 01 — DIGITALE ENZYKLOPÄDIE',
      heroTag: 'VIDEO-LOOKBOOK • 15 SILHOUETTEN',
      heroTitle: 'Anatomie\nder Form',
      heroCta: 'Lookbook öffnen',
      search: 'Suche: Cardio Kollektion, Silhouetten, Artikel...',
      clear: 'Löschen',
      learning: 'I. SCHUHHAUS & EXPOSITION',
      tools: 'II. WERKZEUGE & ARCHIV',
      system: 'III. SYSTEM & SAMMLUNG',
      materials: 'Cardio',
      materialsSub: 'Herrenschuhe • Manufaktur & Großhandel',
      cardioBadge: 'MAISON CARDIO // MEN’S FOOTWEAR',
      cardioDesc: 'Herrenschuh-Manufaktur. Saisonales Lookbook, Leisten und direkte B2B-Bestellung.',
      cardioCta: 'Kollektion öffnen',
      colors: 'Farben',
      colorsSub: 'Patina & Farblehre',
      styles: 'Silhouetten',
      stylesSub: '15 ikonische Schnitte',
      sneakers: 'Footwear Index',
      sneakersSub: 'Katalog & Releases',
      calc: 'Rechner',
      calcSub: `${CALCULATORS_COUNT} Präzisionsmodule`,
      blog: 'Artikelarchiv',
      blogSub: hasNewBlog ? 'Neue Ausgabe' : 'Journal',
      glossary: 'Glossar',
      glossarySub: glossaryLabel(glossaryCount, 'de'),
      prices: 'Markt',
      pricesSub: 'Preisindex',
      settings: 'Oberfläche',
      settingsSub: 'Design & Sprache',
      profile: 'Profil',
      profileSub: 'Persönliche Daten',
      favorites: 'Persönliches Archiv',
      favoritesSub:
        articleFavorites.length > 0 ? `Gespeicherte Bände: ${articleFavorites.length}` : 'Leer',
      supportTitle: 'Patronat',
      supportDesc: 'Edition unterstützen',
      quote: '„Meisterschaft liegt im Detail. Wissen in der Erfahrung.“',
      searchResults: 'Suchergebnisse',
      noResults: 'Keine Einträge gefunden',
      section: 'Bereich',
    },
  }[safeLang]

  const LEARNING: MenuItem[] = [
    { id: 'materials', roman: '01', tag: 'MAISON', title: t.materials, subtitle: t.materialsSub, action: onOpenMaterials },
    { id: 'colors', roman: '02', tag: 'PALETTE', title: t.colors, subtitle: t.colorsSub, action: onOpenColors },
    { id: 'styles', roman: '03', tag: 'LOOKBOOK', title: t.styles, subtitle: t.stylesSub, action: onOpenStyles },
    { id: 'sneakers', roman: '04', tag: 'CATALOG', title: t.sneakers, subtitle: t.sneakersSub, action: onOpenSneakers },
  ]

  const TOOLS: MenuItem[] = [
    { id: 'calc', roman: '05', tag: 'UTILITY', title: t.calc, subtitle: t.calcSub, action: onOpenCalcMenu },
    { id: 'blog', roman: '06', tag: 'EDITORIAL', title: t.blog, subtitle: t.blogSub, action: onOpenBlog, dot: hasNewBlog },
    { id: 'glossary', roman: '07', tag: 'LEXICON', title: t.glossary, subtitle: t.glossarySub, action: () => onOpenGlossary?.() },
    { id: 'prices', roman: '08', tag: 'VALUATION', title: t.prices, subtitle: t.pricesSub, action: onOpenPrices },
  ]

  const SYSTEM: MenuItem[] = [
    { id: 'settings', roman: '09', tag: 'PREFERENCES', title: t.settings, subtitle: t.settingsSub, action: () => onChangeTab?.('settings') },
    { id: 'profile', roman: '10', tag: 'IDENTITY', title: t.profile, subtitle: t.profileSub, action: () => onChangeTab?.('profile') },
  ]

  const query = searchQuery.trim().toLowerCase()
  const searchResults: Array<{ id: string; type: string; title: string; subtitle: string }> = []

  if (query) {
    ;[...LEARNING, ...TOOLS, ...SYSTEM].forEach((item) => {
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
      const match = [...LEARNING, ...TOOLS, ...SYSTEM].find((i) => i.id === res.id)
      match?.action?.()
    } else if (res.type === 'article') {
      onOpenArticle?.(res.id)
    } else if (res.type === 'glossary') {
      onOpenGlossary?.(res.id)
    }
    setSearchQuery('')
  }

  const handleSupportClick = () => {
    const tributeLink = 'https://t.me/tribute/app?startapp=dQO9'
    const tg = (window as any).Telegram?.WebApp

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tributeLink)
    } else {
      window.open(tributeLink, '_blank')
    }
  }

  const palette = isDark
    ? {
        text: '#F4F0E8',
        textMuted: 'rgba(244, 240, 232, 0.52)',
        textSubtle: 'rgba(244, 240, 232, 0.32)',
        line: 'rgba(244, 240, 232, 0.14)',
        lineStrong: 'rgba(244, 240, 232, 0.34)',
        surface: 'rgba(255, 255, 255, 0.025)',
        cardioSurface: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(30,80,162,0.08) 100%)',
        logoPlateBg: '#F6F4EF',
        logoPlateBorder: 'rgba(244, 240, 232, 0.25)',
        bg: '#080808',
        noiseOpacity: 0.035,
        noiseBlend: 'screen' as const,
        accentRed: '#991B1B',
        accentCobalt: '#3B82F6',
      }
    : {
        text: '#181615',
        textMuted: 'rgba(24, 22, 21, 0.56)',
        textSubtle: 'rgba(24, 22, 21, 0.36)',
        line: 'rgba(24, 22, 21, 0.12)',
        lineStrong: 'rgba(24, 22, 21, 0.28)',
        surface: 'rgba(24, 22, 21, 0.025)',
        cardioSurface: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(28,78,158,0.05) 100%)',
        logoPlateBg: '#FAF8F5',
        logoPlateBorder: 'rgba(24, 22, 21, 0.16)',
        bg: '#F4F1EA',
        noiseOpacity: 0.05,
        noiseBlend: 'multiply' as const,
        accentRed: '#881313',
        accentCobalt: '#1D4ED8',
      }

  const noiseBg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`

  const gridItems = LEARNING.slice(1, 3) // 02 Цвета, 03 Силуэты
  const catalogItem = LEARNING[3] // 04 Footwear Index

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden transition-colors duration-500 select-none"
      style={{
        background: palette.bg,
        color: palette.text,
      }}
    >
      {/* Текстура журнальной бумаги */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
        style={{
          backgroundImage: noiseBg,
          opacity: palette.noiseOpacity,
          mixBlendMode: palette.noiseBlend,
        }}
      />

      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
      `}</style>

      <div className="relative z-10 flex flex-col min-h-screen max-w-[540px] mx-auto px-5 sm:px-8">
        {/* Верхний колонтитул (Running Header) */}
        <header
          className="pt-6 pb-4 flex items-center justify-between border-b"
          style={{ borderColor: palette.line }}
        >
          {onBack ? (
            <button
              onClick={onBack}
              className="group flex items-center gap-2 text-[9px] font-sans uppercase tracking-[0.28em] outline-none border-0 bg-transparent cursor-pointer active:opacity-50 transition-opacity"
              style={{ color: palette.textMuted }}
            >
              <span>←</span>
              <span>{t.back}</span>
            </button>
          ) : (
            <span
              className="text-[9px] font-sans uppercase tracking-[0.32em]"
              style={{ color: palette.textMuted }}
            >
              CORDWAINER × CARDIO
            </span>
          )}

          {/* Переключатель языков со слэшами */}
          <div className="flex items-center gap-3">
            {(['ru', 'uk', 'de'] as Lang[]).map((l, i) => (
              <div key={l} className="flex items-center gap-3">
                <button
                  onClick={() => handleLangChange(l)}
                  className="text-[9px] font-sans uppercase tracking-[0.28em] outline-none border-0 bg-transparent cursor-pointer transition-all"
                  style={{
                    color: safeLang === l ? palette.text : palette.textSubtle,
                    borderBottom: safeLang === l ? `1px solid ${palette.text}` : '1px solid transparent',
                    paddingBottom: '2px',
                  }}
                >
                  {l === 'uk' ? 'UKR' : l}
                </button>
                {i < 2 && (
                  <span className="text-[8px]" style={{ color: palette.line }}>
                    /
                  </span>
                )}
              </div>
            ))}
          </div>
        </header>

        <motion.div
          className="pb-20"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          {/* Журнальная шапка (Masthead) */}
          <motion.div variants={itemVariants} className="pt-7 pb-6">
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[8px] font-sans uppercase tracking-[0.32em]"
                style={{ color: palette.textMuted }}
              >
                {t.issue}
              </span>
              <span
                className="text-[9px] font-serif italic"
                style={{ color: palette.textMuted }}
              >
                Vol. I
              </span>
            </div>

            <h1
              className="font-serif text-[13.5vw] min-[440px]:text-[62px] leading-[0.86] tracking-[-0.03em] uppercase font-normal"
              style={{ color: palette.text }}
            >
              Cordwainer
            </h1>
          </motion.div>

          {/* Редакционная строка поиска */}
          <motion.div variants={itemVariants} className="mb-8">
            <div
              className="relative flex items-center py-2.5 px-3.5 border transition-colors"
              style={{
                borderColor: searchQuery ? palette.lineStrong : palette.line,
                backgroundColor: palette.surface,
              }}
            >
              <span
                className="text-[10px] font-serif italic mr-3 shrink-0"
                style={{ color: palette.textMuted }}
              >
                Index.
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full bg-transparent outline-none border-0 text-[12px] font-sans font-light placeholder:opacity-50"
                style={{ color: palette.text } as CSSProperties}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 text-[8px] font-sans uppercase tracking-[0.25em] outline-none border-0 bg-transparent cursor-pointer shrink-0"
                  style={{ color: palette.textMuted }}
                >
                  {t.clear}
                </button>
              )}
            </div>
          </motion.div>

          {query ? (
            /* Выдача поиска */
            <div>
              <p
                className="text-[9px] font-sans uppercase tracking-[0.3em] mb-4 pb-2 border-b"
                style={{ color: palette.textMuted, borderColor: palette.line }}
              >
                {t.searchResults} — {searchResults.length}
              </p>
              {searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map((res, i) => (
                    <button
                      key={`${res.type}-${res.id}-${i}`}
                      onClick={() => handleResultClick(res)}
                      className="w-full group flex items-baseline justify-between py-4 border-b text-left outline-none bg-transparent cursor-pointer active:opacity-50 transition-opacity"
                      style={{ borderColor: palette.line }}
                    >
                      <div
                        className="font-serif text-[21px] leading-snug pr-4 transition-transform group-hover:translate-x-1"
                        style={{ color: palette.text }}
                      >
                        {res.title}
                      </div>
                      <div
                        className="text-[8px] font-sans uppercase tracking-[0.25em] shrink-0"
                        style={{ color: palette.textMuted }}
                      >
                        {res.subtitle} ↗
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="py-16 text-[14px] font-serif italic text-center"
                  style={{ color: palette.textMuted }}
                >
                  {t.noResults}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* HERO LOOKBOOK BANNER */}
              {onOpenStyles && (
                <motion.div variants={itemVariants} className="mb-12">
                  <button
                    onClick={onOpenStyles}
                    className="group relative w-full h-[240px] overflow-hidden border outline-none bg-[#0A0A0A] text-left cursor-pointer block"
                    style={{ borderColor: palette.line }}
                  >
                    <video
                      src="/Fason/Topsaed.mp4"
                      poster="/Fason/posters/Topsaed.jpg"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover object-center opacity-85 scale-100 transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

                    <div className="relative z-10 h-full p-5 sm:p-6 flex flex-col justify-between text-[#F4F0E8]">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-sans uppercase tracking-[0.35em] text-white/80">
                          {t.heroTag}
                        </span>
                        <span className="text-[9px] font-sans tracking-[0.25em] text-white/60">
                          01 / 15
                        </span>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <h2 className="font-serif text-3xl sm:text-4xl leading-[1.02] tracking-tight whitespace-pre-line drop-shadow-md">
                            {t.heroTitle}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 pb-1 text-[9px] font-sans uppercase tracking-[0.25em] text-white/90 border-b border-white/40 shrink-0">
                          <span>{t.heroCta}</span>
                          <span>↗</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              )}

              {/* СЕКЦИЯ I: ФЛАГМАНСКИЙ ДОМ CARDIO + ЭКСПОЗИЦИЯ */}
              <motion.div variants={itemVariants} className="mb-12">
                <div
                  className="flex items-center justify-between pb-2.5 mb-0 border-b"
                  style={{ borderColor: palette.lineStrong }}
                >
                  <span
                    className="text-[9px] font-sans uppercase tracking-[0.32em]"
                    style={{ color: palette.text }}
                  >
                    {t.learning}
                  </span>
                  <span
                    className="text-[8px] font-sans tracking-[0.25em]"
                    style={{ color: palette.textMuted }}
                  >
                    01—04
                  </span>
                </div>

                <div
                  className="border-l border-r"
                  style={{ borderColor: palette.line }}
                >
                  {/* 01. ФЛАГМАНСКАЯ МОНОГРАФИЯ: CARDIO (Во всю ширину с логотипом /logo.png) */}
                  <button
                    type="button"
                    onClick={onOpenMaterials}
                    disabled={!onOpenMaterials}
                    className={`group relative w-full p-5 sm:p-6 text-left outline-none border-b transition-all block overflow-hidden ${
                      onOpenMaterials
                        ? 'cursor-pointer active:opacity-75'
                        : 'opacity-40 cursor-default'
                    }`}
                    style={{
                      borderColor: palette.line,
                      background: palette.cardioSurface,
                    }}
                  >
                    {/* Верхняя индексная строка карточки Cardio */}
                    <div className="flex items-center justify-between w-full mb-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-[9px] font-sans tracking-[0.25em] tabular-nums"
                          style={{ color: palette.textMuted }}
                        >
                          01
                        </span>
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: palette.accentCobalt }}
                        />
                        <span
                          className="text-[8px] font-sans uppercase tracking-[0.28em] font-medium"
                          style={{ color: palette.text }}
                        >
                          {t.cardioBadge}
                        </span>
                      </div>

                      <span
                        className="text-[7.5px] font-sans uppercase tracking-[0.26em] px-2 py-0.5 border"
                        style={{
                          borderColor: palette.lineStrong,
                          color: palette.textMuted,
                        }}
                      >
                        BESPOKE & B2B
                      </span>
                    </div>

                    {/* Основное тело карточки: Типографика + Архитектурный медальон с /logo.png */}
                    <div className="flex items-center justify-between gap-4 my-1">
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-baseline gap-2.5 mb-1.5">
                          <h3
                            className="font-serif text-[32px] sm:text-[38px] leading-[0.95] tracking-[0.02em] uppercase font-normal transition-transform duration-300 group-hover:translate-x-0.5"
                            style={{ color: palette.text }}
                          >
                            Cardio
                          </h3>
                          <span
                            className="font-serif italic text-[12px]"
                            style={{ color: palette.textMuted }}
                          >
                            Atelier
                          </span>
                        </div>

                        <p
                          className="text-[11.5px] font-sans font-light leading-[1.45] mb-3 max-w-[270px]"
                          style={{ color: palette.textMuted }}
                        >
                          {t.cardioDesc}
                        </p>
                      </div>

                      {/* Пасху-медальон для /logo.png (растворяет белый фон через multiply) */}
                      <div
                        className="relative shrink-0 w-[92px] h-[72px] sm:w-[108px] sm:h-[82px] flex items-center justify-center p-2 border transition-transform duration-500 group-hover:scale-[1.03]"
                        style={{
                          backgroundColor: palette.logoPlateBg,
                          borderColor: palette.logoPlateBorder,
                          boxShadow: isDark
                            ? '0 8px 24px rgba(0, 0, 0, 0.45)'
                            : '0 6px 18px rgba(24, 22, 21, 0.05)',
                        }}
                      >
                        {/* Внутренняя тонкая рамка паспарту */}
                        <div
                          className="pointer-events-none absolute inset-[3px] border"
                          style={{ borderColor: 'rgba(24, 22, 21, 0.08)' }}
                        />
                        <img
                          src="/logo.png"
                          alt="Cardio Men's Footwear Emblem"
                          className="relative z-10 w-full h-full object-contain"
                          style={{
                            mixBlendMode: 'multiply',
                            filter: 'contrast(1.06)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Нижняя плашка действия */}
                    <div
                      className="mt-3 pt-3 border-t flex items-center justify-between"
                      style={{ borderColor: palette.line }}
                    >
                      <span
                        className="text-[8.5px] font-sans uppercase tracking-[0.2em]"
                        style={{ color: palette.textMuted }}
                      >
                        {t.materialsSub}
                      </span>
                      <span
                        className="text-[9px] font-sans uppercase tracking-[0.24em] font-medium flex items-center gap-1.5"
                        style={{ color: palette.text }}
                      >
                        <span>{t.cardioCta}</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          ↗
                        </span>
                      </span>
                    </div>
                  </button>

                  {/* 02 & 03. ДВУХКОЛОНОЧНЫЙ РЯД: ЦВЕТА И СИЛУЭТЫ (Без обрезки троеточием) */}
                  <div className="grid grid-cols-2">
                    {gridItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        disabled={!item.action}
                        className={`group relative p-4 sm:p-5 min-h-[128px] flex flex-col justify-between text-left bg-transparent outline-none border-b transition-colors ${
                          idx === 0 ? 'border-r' : ''
                        } ${
                          item.action
                            ? 'cursor-pointer active:opacity-50'
                            : 'opacity-40 cursor-default'
                        }`}
                        style={{ borderColor: palette.line }}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <span
                            className="text-[9px] font-sans tracking-[0.25em] tabular-nums"
                            style={{ color: palette.textMuted }}
                          >
                            {item.roman}
                          </span>
                          <span
                            className="text-[7px] font-sans uppercase tracking-[0.24em]"
                            style={{ color: palette.textSubtle }}
                          >
                            {item.tag}
                          </span>
                        </div>

                        <div>
                          <div
                            className="font-serif text-[22px] sm:text-[25px] leading-[1.08] tracking-tight mb-1.5 transition-transform group-hover:translate-x-0.5"
                            style={{ color: palette.text }}
                          >
                            {item.title}
                          </div>
                          <div
                            className="text-[8.5px] font-sans uppercase tracking-[0.12em] leading-[1.35]"
                            style={{ color: palette.textMuted }}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 04. ПОЛНОШИРИННАЯ СТРОКА КАТАЛОГА: FOOTWEAR INDEX */}
                  {catalogItem && (
                    <button
                      type="button"
                      onClick={catalogItem.action}
                      disabled={!catalogItem.action}
                      className={`group w-full p-4 sm:p-5 flex items-center justify-between text-left bg-transparent outline-none border-b transition-colors ${
                        catalogItem.action
                          ? 'cursor-pointer active:opacity-50'
                          : 'opacity-40 cursor-default'
                      }`}
                      style={{ borderColor: palette.line }}
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span
                            className="text-[9px] font-sans tracking-[0.25em] tabular-nums"
                            style={{ color: palette.textMuted }}
                          >
                            {catalogItem.roman}
                          </span>
                          <span
                            className="text-[7px] font-sans uppercase tracking-[0.28em]"
                            style={{ color: palette.textSubtle }}
                          >
                            {catalogItem.tag}
                          </span>
                        </div>
                        <div
                          className="font-serif text-[23px] sm:text-[25px] leading-tight tracking-tight transition-transform group-hover:translate-x-0.5"
                          style={{ color: palette.text }}
                        >
                          {catalogItem.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 pl-3 shrink-0">
                        <span
                          className="text-[8.5px] font-sans uppercase tracking-[0.16em]"
                          style={{ color: palette.textMuted }}
                        >
                          {catalogItem.subtitle}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: palette.textSubtle }}
                        >
                          ↗
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </motion.div>

              {/* СЕКЦИЯ II: Инструментарий (Исправлена обрезка длинных заголовков) */}
              <motion.div variants={itemVariants} className="mb-12">
                <div
                  className="flex items-center justify-between pb-2.5 border-b"
                  style={{ borderColor: palette.lineStrong }}
                >
                  <span
                    className="text-[9px] font-sans uppercase tracking-[0.32em]"
                    style={{ color: palette.text }}
                  >
                    {t.tools}
                  </span>
                  <span
                    className="text-[8px] font-sans tracking-[0.25em]"
                    style={{ color: palette.textMuted }}
                  >
                    05—08
                  </span>
                </div>

                <div className="flex flex-col">
                  {TOOLS.map((item) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      disabled={!item.action}
                      className={`group flex items-baseline justify-between gap-3 py-4 border-b outline-none bg-transparent text-left transition-opacity ${
                        item.action
                          ? 'cursor-pointer active:opacity-50'
                          : 'opacity-40 cursor-default'
                      }`}
                      style={{ borderColor: palette.line }}
                    >
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span
                          className="text-[9px] font-sans tracking-[0.22em] tabular-nums shrink-0"
                          style={{ color: palette.textMuted }}
                        >
                          {item.roman}
                        </span>
                        <span
                          className="font-serif text-[21px] sm:text-[24px] leading-snug tracking-tight transition-transform group-hover:translate-x-1"
                          style={{ color: palette.text }}
                        >
                          {item.title}
                        </span>
                        {item.dot && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 self-center"
                            style={{ backgroundColor: palette.accentRed }}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[8px] font-sans uppercase tracking-[0.16em]"
                          style={{ color: palette.textMuted }}
                        >
                          {item.subtitle}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: palette.textSubtle }}
                        >
                          ↗
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* СЕКЦИЯ III: Система + Архив + Меценатство */}
              <motion.div variants={itemVariants} className="mb-14">
                <div
                  className="flex items-center justify-between pb-2.5 border-b"
                  style={{ borderColor: palette.lineStrong }}
                >
                  <span
                    className="text-[9px] font-sans uppercase tracking-[0.32em]"
                    style={{ color: palette.text }}
                  >
                    {t.system}
                  </span>
                  <span
                    className="text-[8px] font-sans tracking-[0.25em]"
                    style={{ color: palette.textMuted }}
                  >
                    09—12
                  </span>
                </div>

                {/* Настройки и Профиль в 2 колонки */}
                <div
                  className="grid grid-cols-2 border-l border-r border-b"
                  style={{ borderColor: palette.line }}
                >
                  {SYSTEM.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`group p-4 text-left bg-transparent outline-none cursor-pointer active:opacity-50 transition-opacity ${
                        idx === 0 ? 'border-r' : ''
                      }`}
                      style={{ borderColor: palette.line }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[8px] font-sans tracking-[0.25em]"
                          style={{ color: palette.textMuted }}
                        >
                          {item.roman}
                        </span>
                        <span
                          className="text-[9px]"
                          style={{ color: palette.textSubtle }}
                        >
                          ↗
                        </span>
                      </div>
                      <div
                        className="font-serif text-[20px] leading-tight mb-1"
                        style={{ color: palette.text }}
                      >
                        {item.title}
                      </div>
                      <div
                        className="text-[8px] font-sans uppercase tracking-[0.16em]"
                        style={{ color: palette.textMuted }}
                      >
                        {item.subtitle}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Личный архив (Сохраненное) */}
                <button
                  onClick={() => {
                    if (articleFavorites.length === 1) onOpenArticle?.(articleFavorites[0].id)
                    else if (articleFavorites.length > 1) onOpenFavorites?.()
                  }}
                  className="w-full flex items-center justify-between py-4 px-4 border-l border-r border-b outline-none bg-transparent cursor-pointer active:opacity-50 transition-opacity"
                  style={{ borderColor: palette.line, backgroundColor: palette.surface }}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span
                        className="text-[8px] font-sans tracking-[0.25em]"
                        style={{ color: palette.textMuted }}
                      >
                        11
                      </span>
                      <span
                        className="font-serif text-[20px] leading-none"
                        style={{ color: palette.text }}
                      >
                        {t.favorites}
                      </span>
                    </div>
                    <div
                      className="text-[8px] font-sans uppercase tracking-[0.22em] pl-5"
                      style={{ color: palette.textMuted }}
                    >
                      {t.favoritesSub}
                    </div>
                  </div>

                  {articleFavorites.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {articleFavorites.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="w-8 h-10 border overflow-hidden grayscale contrast-125"
                          style={{ borderColor: palette.lineStrong }}
                        >
                          <img src={item.imagePng} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className="text-[9px] font-serif italic"
                      style={{ color: palette.textSubtle }}
                    >
                      —
                    </span>
                  )}
                </button>

                {/* Меценатство / Поддержать проект */}
                <button
                  onClick={handleSupportClick}
                  className="group w-full flex items-center justify-between py-4 px-4 border-l border-r border-b outline-none bg-transparent cursor-pointer active:opacity-50 transition-opacity"
                  style={{ borderColor: palette.line }}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span
                        className="text-[8px] font-sans tracking-[0.25em]"
                        style={{ color: palette.textMuted }}
                      >
                        12
                      </span>
                      <span
                        className="font-serif text-[20px] leading-none"
                        style={{ color: palette.text }}
                      >
                        {t.supportTitle}
                      </span>
                    </div>
                    <div
                      className="text-[8px] font-sans uppercase tracking-[0.22em] pl-5"
                      style={{ color: palette.textMuted }}
                    >
                      {t.supportDesc}
                    </div>
                  </div>

                  <span
                    className="text-[9px] font-sans uppercase tracking-[0.25em] border px-2.5 py-1 transition-colors"
                    style={{ borderColor: palette.lineStrong, color: palette.text }}
                  >
                    TRIBUTE ↗
                  </span>
                </button>
              </motion.div>

              {/* Редакционный колофон (Footer) */}
              <motion.div variants={itemVariants} className="pt-2 pb-6">
                <div className="flex flex-col items-center text-center px-4">
                  <div
                    className="w-px h-8 mb-5"
                    style={{ backgroundColor: palette.lineStrong }}
                  />
                  <p
                    className="font-serif text-[16px] italic leading-[1.5] max-w-[280px]"
                    style={{ color: palette.textMuted }}
                  >
                    {t.quote}
                  </p>
                  <p
                    className="mt-4 text-[8px] font-sans uppercase tracking-[0.45em]"
                    style={{ color: palette.textSubtle }}
                  >
                    CORDWAINER × CARDIO • MMXXVI
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
