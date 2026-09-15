import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import { BLOG_ARTICLES } from '../data/blog'
import { ARTICLE_CONTENTS } from '../data/articleContents'
import type { Lang } from '../App'
import AboutProject from '../components/AboutProject'
import { ArticleAudioPlayer } from '../components/ArticleAudioPlayer'

type BlogPageProps = {
  onBack?: () => void
  lang: Lang
  isFavorite?: boolean
  onToggleFavorite?: () => void
  favoriteArticleIds?: string[]
  onToggleArticleFavorite?: (articleId: string, cover: string) => void
  initialArticleId?: string | null
  onArticleOpened?: () => void
  initialShowFavorites?: boolean
}

type ViewState = 'cover' | 'journal' | 'article' | 'collaboration' | 'about'

const getWebApp = () => {
  if (typeof window !== 'undefined') {
    return (window as any).Telegram?.WebApp
  }
  return null
}

const getPlural = (count: number, forms: [string, string, string]) => {
  const cases = [2, 0, 1, 1, 1, 2]
  return forms[
    count % 100 > 4 && count % 100 < 20 ? 2 : cases[count % 10 < 5 ? count % 10 : 5]
  ]
}

const getTagSlug = (tag: string) => {
  const upper = tag.toUpperCase()
  if (upper === 'ИНДУСТРИЯ' || upper === 'ІНДУСТРІЯ' || upper === 'INDUSTRIE') return 'industry'
  if (upper === 'МАРКЕТИНГ' || upper === 'MARKETING') return 'marketing'
  if (upper === 'ДИЗАЙН' || upper === 'DESIGN') return 'design'
  if (upper === 'ПРОИЗВОДСТВО' || upper === 'ВИРОБНИЦТВО' || upper === 'PRODUKTION') return 'production'
  return tag
}

function haptic(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
  try {
    const tg = getWebApp()
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
    else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 20 : 40)
    }
  } catch {}
}

// --- АНИМАЦИИ ПЕРЕХОДОВ ---
const pageVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

export function BlogPage({
  onBack,
  lang,
  isFavorite = false,
  onToggleFavorite,
  favoriteArticleIds = [],
  onToggleArticleFavorite,
  initialArticleId = null,
  onArticleOpened,
  initialShowFavorites = false,
}: BlogPageProps) {
  const [view, setView] = useState<ViewState>('cover')
  const [rawSearchQuery, setRawSearchQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  const [emailCopied, setEmailCopied] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  
  // Инициализируем тему синхронно, чтобы избежать вспышек (FOUC)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onArticleOpenedRef = useRef(onArticleOpened)

  const count = BLOG_ARTICLES.length

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark')
      setIsDark(dark)
      document.body.style.backgroundColor = dark ? '#151210' : '#F5F1EA'
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [view, activeArticleId])

  useEffect(() => {
    onArticleOpenedRef.current = onArticleOpened
  }, [onArticleOpened])

  useEffect(() => {
    const timerId = setTimeout(() => setSearchQuery(rawSearchQuery), 300)
    return () => clearTimeout(timerId)
  }, [rawSearchQuery])

  useEffect(() => {
    if (initialArticleId) {
      setActiveArticleId(initialArticleId)
      setView('article')
      setShowOnlyFavorites(false)
      onArticleOpenedRef.current?.()
    } else if (initialShowFavorites) {
      setShowOnlyFavorites(true)
      setActiveFilter('favorites')
      setView('journal')
    }
  }, [initialArticleId, initialShowFavorites])

  useEffect(() => {
    const tg = getWebApp()
    if (tg) {
      if (!tg.isExpanded) tg.expand()
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (view === 'cover') e.preventDefault()
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [view])

  const showToastMessage = (message: string) => {
    setToast({ message, visible: true })
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2000)
  }

  const handleCopyEmail = async () => {
    haptic('medium')
    const email = 'support@cordwaine.app'
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = email
        textArea.style.position = 'absolute'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      setEmailCopied(true)
      showToastMessage(t.copiedBtn)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {}
  }

  const handleShareArticle = async (title: string, tag: string) => {
    haptic('medium')
    const tg = getWebApp()
    const appUrl = 'https://cordwaine.app'
    const text = `Прочитал статью «${title}» (${tag}) в PRO Обувь.`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Cordwainer', text, url: appUrl })
        return
      } catch (error) {}
    }
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl)
    else window.open(shareUrl, '_blank')
  }

  const t = useMemo(() => {
    const ruPlural = getPlural(count, ['статья', 'статьи', 'статей'])
    const ukPlural = getPlural(count, ['стаття', 'статті', 'статей'])

    return {
      ru: {
        title: 'PRO Обувь',
        subtitle: 'Архив & Журнал',
        tagline: 'Изнанка индустрии. Дизайн, технологии и секреты производства.',
        read: 'Читать',
        readSub: count === 0 ? 'Скоро' : `${count} ${ruPlural}`,
        contact: 'Сотрудничество',
        contactSub: 'Предложить идею',
        backToMenu: 'Назад',
        journalTitle: 'Журнал',
        journalDesc: 'Размышления об индустрии, людях, дизайне и производстве.',
        searchPlaceholder: 'Найти материал...',
        fresh: 'Свежее',
        emptyTitle: 'Материалы не найдены',
        emptyDesc: 'Попробуйте изменить поисковый запрос.',
        emptyBtn: 'Сбросить фильтры',
        emptyFavoritesTitle: 'Архив пуст',
        emptyFavoritesDesc: 'Сохраняйте статьи, чтобы читать их позже.',
        emptyFavoritesBtn: 'Все статьи',
        filters: [
          { id: 'all', label: 'Все' },
          { id: 'favorites', label: 'Избранное' },
          { id: 'industry', label: 'Индустрия' },
          { id: 'marketing', label: 'Маркетинг' },
          { id: 'design', label: 'Дизайн' },
          { id: 'production', label: 'Производство' },
        ],
        readBtn: 'Читать',
        collabTitle: 'Сотрудничество',
        collabSubtitle: 'Связь',
        collabText: 'Это проект об обувной индустрии. Я открыт к диалогу: идеи, замечания, обратная связь или предложения. Пишите — обсудим.',
        collabEmailLabel: 'Почта',
        copyBtn: 'Скопировать',
        copiedBtn: 'Скопировано!',
        aboutBtn: 'О проекте',
        shareBtn: 'Поделиться',
        articleFavAdd: 'В закладки',
        articleFavRemove: 'Сохранено',
      },
      uk: {
        title: 'PRO Взуття',
        subtitle: 'Архів & Журнал',
        tagline: 'Виворіт індустрії. Дизайн, технології та секрети виробництва.',
        read: 'Читати',
        readSub: count === 0 ? 'Незабаром' : `${count} ${ukPlural}`,
        contact: 'Співпраця',
        contactSub: 'Запропонувати ідею',
        backToMenu: 'Назад',
        journalTitle: 'Журнал',
        journalDesc: 'Роздуми про індустрію, людей, дизайн та виробництво.',
        searchPlaceholder: 'Знайти матеріал...',
        fresh: 'Свіже',
        emptyTitle: 'Матеріали не знайдено',
        emptyDesc: 'Спробуйте змінити пошуковий запит.',
        emptyBtn: 'Скинути фільтри',
        emptyFavoritesTitle: 'Архів порожній',
        emptyFavoritesDesc: 'Зберігайте статті, щоб читати їх пізніше.',
        emptyFavoritesBtn: 'Усі статті',
        filters: [
          { id: 'all', label: 'Усі' },
          { id: 'favorites', label: 'Обране' },
          { id: 'industry', label: 'Індустрія' },
          { id: 'marketing', label: 'Маркетинг' },
          { id: 'design', label: 'Дизайн' },
          { id: 'production', label: 'Виробництво' },
        ],
        readBtn: 'Читати',
        collabTitle: 'Співпраця',
        collabSubtitle: 'Зв\'язок',
        collabText: 'Це проєкт про взуттєву індустрію. Я відкритий до діалогу: ідеї, зауваження, зворотний звʼязок або пропозиції. Пишіть — обговоримо.',
        collabEmailLabel: 'Пошта',
        copyBtn: 'Скопіювати',
        copiedBtn: 'Скопійовано!',
        aboutBtn: 'Про проєкт',
        shareBtn: 'Поділитися',
        articleFavAdd: 'У закладки',
        articleFavRemove: 'Збережено',
      },
      de: {
        title: 'PRO Schuhe',
        subtitle: 'Archiv & Journal',
        tagline: 'Hinter den Kulissen. Design, Technologie und Produktion.',
        read: 'Lesen',
        readSub: count === 0 ? 'Bald' : `${count} Artikel`,
        contact: 'Kooperation',
        contactSub: 'Idee vorschlagen',
        backToMenu: 'Zurück',
        journalTitle: 'Journal',
        journalDesc: 'Gedanken über die Industrie, Menschen, Design und Produktion.',
        searchPlaceholder: 'Artikel suchen...',
        fresh: 'Neu',
        emptyTitle: 'Nichts gefunden',
        emptyDesc: 'Versuchen Sie, die Suchanfrage zu ändern.',
        emptyBtn: 'Filter zurücksetzen',
        emptyFavoritesTitle: 'Leeres Archiv',
        emptyFavoritesDesc: 'Speichern Sie Artikel, um sie später zu lesen.',
        emptyFavoritesBtn: 'Alle Artikel',
        filters: [
          { id: 'all', label: 'Alle' },
          { id: 'favorites', label: 'Favoriten' },
          { id: 'industry', label: 'Industrie' },
          { id: 'marketing', label: 'Marketing' },
          { id: 'design', label: 'Design' },
          { id: 'production', label: 'Produktion' },
        ],
        readBtn: 'Lesen',
        collabTitle: 'Zusammenarbeit',
        collabSubtitle: 'Kontakt',
        collabText: 'Dies ist ein Projekt über die Schuhindustrie. Ich bin offen für Dialoge: Ideen, Feedback oder Kooperationsvorschläge. Schreiben Sie mir.',
        collabEmailLabel: 'E-Mail',
        copyBtn: 'Kopieren',
        copiedBtn: 'Kopiert!',
        aboutBtn: 'Über das Projekt',
        shareBtn: 'Teilen',
        articleFavAdd: 'Speichern',
        articleFavRemove: 'Gespeichert',
      },
    }[lang]
  }, [lang, count])

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: BLOG_ARTICLES.length,
      favorites: BLOG_ARTICLES.filter((a) => favoriteArticleIds.includes(a.id)).length,
    }
    BLOG_ARTICLES.forEach((a) => {
      const tag = lang === 'ru' ? a.tagRu : lang === 'uk' ? a.tagUk : (a as any).tagDe || a.tagRu
      const slug = getTagSlug(tag)
      counts[slug] = (counts[slug] || 0) + 1
    })
    return counts
  }, [lang, favoriteArticleIds])

  const isFavoritesActive = showOnlyFavorites || activeFilter === 'favorites'

  const filteredArticles = BLOG_ARTICLES.filter((article) => {
    if (isFavoritesActive) return favoriteArticleIds.includes(article.id)
    const title = lang === 'ru' ? article.titleRu : lang === 'uk' ? article.titleUk : (article as any).titleDe || article.titleRu
    const tag = lang === 'ru' ? article.tagRu : lang === 'uk' ? article.tagUk : (article as any).tagDe || article.tagRu
    const slug = getTagSlug(tag)
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || slug === activeFilter
    return matchesSearch && matchesFilter
  }).slice().reverse()

  const activeArticle = activeArticleId ? BLOG_ARTICLES.find((a) => a.id === activeArticleId) : null
  const content = activeArticleId ? ARTICLE_CONTENTS[activeArticleId] : null
  const isCurrentArticleFavorite = activeArticleId ? favoriteArticleIds.includes(activeArticleId) : false

  const activeTitle = activeArticle 
    ? (lang === 'ru' ? activeArticle.titleRu : lang === 'uk' ? activeArticle.titleUk : (activeArticle as any).titleDe || activeArticle.titleRu) 
    : ''
  const activeTag = activeArticle 
    ? (lang === 'ru' ? activeArticle.tagRu : lang === 'uk' ? activeArticle.tagUk : (activeArticle as any).tagDe || activeArticle.tagRu) 
    : ''
  const activeReadTime = activeArticle 
    ? (lang === 'ru' ? activeArticle.readTimeRu : lang === 'uk' ? activeArticle.readTimeUk : (activeArticle as any).readTimeDe || activeArticle.readTimeRu) 
    : ''
  const activeContentHtml = content ? ((content as any)[lang] || content.ru) : ''

  // Динамические цвета для плавного переключения темы
  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  const gradStart = isDark ? 'from-[#0A0A0A]' : 'from-[#F2EFE9]'
  const gradMid = isDark ? 'via-[#0A0A0A]/80' : 'via-[#F2EFE9]/80'

  const MENU_ITEMS = [
    { id: 'journal', title: t.journalTitle, subtitle: t.readSub, action: () => { setView('journal'); setShowOnlyFavorites(false); setActiveFilter('all') } },
    { id: 'collab', title: t.collabTitle, subtitle: t.contactSub, action: () => setView('collaboration') },
  ]

  return (
    <div className={`relative min-h-[100dvh] w-full transition-colors duration-500 ${cBg} ${cText}`}>
      <style>{`
        html, body {
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: touch;
        }
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        /* Editorial Markdown Typography */
        .article-content { max-width: 650px; margin: 0 auto; padding-bottom: 4rem; }
        .article-content p { 
          font-family: var(--font-body); 
          font-weight: 300; 
          font-size: 16px; 
          line-height: 1.8; 
          margin-bottom: 2rem; 
          opacity: 0.85; 
        }
        .article-content h2 { 
          font-family: var(--font-display); 
          font-size: 2.2rem; 
          margin-top: 4rem; 
          margin-bottom: 1.5rem; 
          line-height: 1.1; 
          letter-spacing: -0.02em; 
        }
        .article-content h3 { 
          font-family: var(--font-body); 
          font-size: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.25em; 
          margin-top: 3rem; 
          margin-bottom: 1rem; 
          opacity: 0.5; 
        }
        .article-content ul, .article-content ol { 
          font-family: var(--font-body); 
          font-weight: 300; 
          font-size: 16px; 
          line-height: 1.8; 
          margin-bottom: 2rem; 
          padding-left: 1.5rem; 
          opacity: 0.85; 
        }
        .article-content li { margin-bottom: 0.5rem; }
        .article-content strong { font-weight: 600; opacity: 1; }
        .article-content blockquote { 
          border-left: none; 
          padding-left: 0; 
          font-family: var(--font-display); 
          font-size: 1.8rem; 
          font-style: italic; 
          line-height: 1.3;
          margin: 3.5rem 0; 
          text-align: center; 
          opacity: 0.9; 
        }
        .article-content blockquote p { font-size: inherit; margin-bottom: 0; }
        .article-content img { 
          width: 100%; 
          border-radius: 4px; 
          margin: 3rem 0; 
          filter: grayscale(15%); 
          transition: filter 0.5s ease; 
        }
        .article-content img:hover { filter: grayscale(0%); }
      `}</style>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-none border ${isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black'} text-[10px] font-sans uppercase tracking-[0.2em] shadow-2xl whitespace-nowrap`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBAL HEADER */}
      {view !== 'cover' && view !== 'article' && (
        <header className="px-6 pt-8 pb-4 flex items-start justify-between sticky top-0 z-50 pointer-events-none">
          <button 
            onClick={() => {
              haptic('light')
              if (view === 'journal') { setShowOnlyFavorites(false); setActiveFilter('all'); setView('cover') } 
              else if (view === 'collaboration' || view === 'about') setView('cover')
              else onBack?.()
            }}
            className={`pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer transition-colors ${cTextMuted} ${cHover}`}
          >
            <span className="transform transition-transform group-hover:-translate-x-1">←</span>
            <span>{t.backToMenu}</span>
          </button>
        </header>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <AnimatePresence mode="wait">
        
        {/* ================= COVER VIEW ================= */}
        {view === 'cover' && (
          <motion.div key="cover" variants={pageVariants} initial="hidden" animate="show" exit="exit" className={`fixed inset-0 z-50 overflow-hidden flex flex-col justify-end ${cBg} ${cText} touch-none`}>
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img src="/blog-hero.webp" alt="Cover" className={`w-full h-full object-cover object-[center_top] transition-opacity duration-1000 ${isDark ? 'grayscale-[30%]' : 'grayscale-[10%]'}`} />
              <div className={`absolute inset-0 bg-gradient-to-t ${gradStart} ${gradMid} to-transparent`} />
            </div>

            <header className="absolute top-10 left-6 z-20">
              <button onClick={onBack} className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors drop-shadow-md`}>
                <span className="transform transition-transform group-hover:-translate-x-1">←</span>
                <span>Back</span>
              </button>
            </header>

            <div className="relative z-10 px-6 pb-24 w-full pt-20">
              <motion.div variants={staggerItem} initial="hidden" animate="show" className="mb-16">
                <p className={`text-[9px] font-sans font-medium uppercase tracking-[0.4em] mb-4 ${cTextMuted} drop-shadow-md`}>
                  {t.subtitle}
                </p>
                <h1 className="font-serif text-[18vw] min-[400px]:text-7xl leading-[0.85] tracking-tight break-words drop-shadow-lg">
                  {t.title}
                </h1>
                <p className={`mt-6 text-[11px] font-sans font-light leading-[1.8] max-w-[260px] ${cTextMuted} drop-shadow-md`}>
                  {t.tagline}
                </p>
              </motion.div>

              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col">
                {MENU_ITEMS.map((item, idx) => (
                  <motion.button
                    variants={staggerItem}
                    key={item.id}
                    onClick={() => { haptic('medium'); item.action?.(); }}
                    className={`w-full group relative flex items-end justify-between py-6 border-b outline-none border-0 bg-transparent cursor-pointer ${cLine} text-left transition-all active:opacity-50`}
                  >
                    <div className="flex items-start gap-4 w-[60%]">
                      <span className={`text-[9px] font-sans tracking-widest mt-2 ${cTextMuted}`}>
                        0{idx + 1}
                      </span>
                      <div className="font-serif text-[7vw] min-[375px]:text-3xl leading-[1.1] transition-transform group-hover:translate-x-1 drop-shadow-md break-words w-full">
                        {item.title}
                      </div>
                    </div>
                    <div className={`text-[10px] font-sans tracking-[0.1em] text-right w-[40%] ${cTextMuted}`}>
                      {item.subtitle}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ================= JOURNAL VIEW (EDITORIAL LIST) ================= */}
        {view === 'journal' && (
          <motion.div key="journal" variants={pageVariants} initial="hidden" animate="show" exit="exit" className="px-6 pb-24 pt-10 min-h-[100dvh]">
            <motion.div variants={staggerItem} initial="hidden" animate="show" className="mb-12">
              <h1 className="font-serif text-[16vw] min-[400px]:text-6xl leading-[0.85] tracking-tight mb-4 break-words w-full">
                {t.journalTitle}
              </h1>
              <p className={`text-[11px] font-sans font-light leading-[1.8] max-w-[280px] ${cTextMuted}`}>
                {t.journalDesc}
              </p>
            </motion.div>

            <motion.div variants={staggerItem} initial="hidden" animate="show" className="mb-10">
              <div className={`relative flex items-end border-b pb-3 transition-colors ${cLine} hover:border-current`}>
                <span className={`text-[12px] font-serif italic mr-4 ${cTextMuted}`}>Find.</span>
                <input
                  type="text"
                  value={rawSearchQuery}
                  onChange={(e) => setRawSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={`w-full bg-transparent outline-none border-0 text-[16px] font-sans font-light placeholder:font-light transition-colors ${isDark ? 'placeholder:text-[#F4F0E8]/30' : 'placeholder:text-[#1C1816]/30'}`}
                />
                {rawSearchQuery && (
                  <button onClick={() => setRawSearchQuery('')} className={`ml-2 text-[10px] uppercase tracking-widest outline-none border-0 bg-transparent cursor-pointer ${cTextMuted} hover:text-current`}>
                    [X]
                  </button>
                )}
              </div>
            </motion.div>

            <motion.div variants={staggerItem} initial="hidden" animate="show" className="mb-12">
              <div className={`flex overflow-x-auto gap-6 pb-4 border-b ${cLine} scrollbar-hide`}>
                {t.filters.map(filter => {
                  const isActive = activeFilter === filter.id || (filter.id === 'favorites' && showOnlyFavorites)
                  return (
                    <button 
                      key={filter.id}
                      onClick={() => {
                        haptic('light')
                        if (filter.id === 'favorites') setShowOnlyFavorites(true)
                        else setShowOnlyFavorites(false)
                        setActiveFilter(filter.id)
                      }} 
                      className={`flex items-center gap-2 text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all duration-300 outline-none border-none bg-transparent cursor-pointer ${
                        isActive ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
                      }`}
                    >
                      {filter.label}
                      <span className="opacity-40 tracking-normal text-[8px]">({filterCounts[filter.id] || 0})</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col">
              {filteredArticles.length > 0 ? (
                filteredArticles.map((article) => {
                  const title = lang === 'ru' ? article.titleRu : lang === 'uk' ? article.titleUk : (article as any).titleDe || article.titleRu
                  const excerpt = lang === 'ru' ? article.excerptRu : lang === 'uk' ? article.excerptUk : (article as any).excerptDe || article.excerptRu
                  const tag = lang === 'ru' ? article.tagRu : lang === 'uk' ? article.tagUk : (article as any).tagDe || article.tagRu
                  const readTime = lang === 'ru' ? article.readTimeRu : lang === 'uk' ? article.readTimeUk : (article as any).readTimeDe || article.readTimeRu

                  return (
                    <motion.button
                      variants={staggerItem}
                      key={article.id}
                      onClick={() => { haptic('medium'); setActiveArticleId(article.id); setView('article') }}
                      className={`group w-full py-8 border-b ${cLine} flex flex-col text-left outline-none border-x-0 border-t-0 bg-transparent cursor-pointer active:opacity-50 transition-colors hover:bg-current/5 px-2`}
                    >
                      <div className="flex justify-between items-baseline w-full mb-5">
                         <span className={`text-[9px] uppercase tracking-widest ${cTextMuted}`}>{tag}</span>
                         <span className={`text-[9px] uppercase tracking-widest ${cTextMuted}`}>{readTime}</span>
                      </div>
                      <h3 className="font-serif text-3xl md:text-5xl leading-[1.1] mb-4 group-hover:translate-x-2 md:group-hover:italic transition-all duration-500 break-words w-full">
                         {title}
                      </h3>
                      <p className={`text-[13px] font-sans font-light leading-[1.6] line-clamp-2 max-w-md ${cTextMuted}`}>
                         {excerpt}
                      </p>
                    </motion.button>
                  )
                })
              ) : (
                <motion.div variants={staggerItem} className={`py-16 text-center flex flex-col items-center gap-6`}>
                  <p className={`font-serif text-3xl italic ${cTextMuted}`}>
                    {isFavoritesActive ? t.emptyFavoritesTitle : t.emptyTitle}
                  </p>
                  <button 
                    onClick={() => { haptic('light'); setShowOnlyFavorites(false); setActiveFilter('all'); setRawSearchQuery('') }}
                    className={`text-[9px] font-sans uppercase tracking-[0.3em] border-b pb-1 transition-colors hover:text-current ${cTextMuted} ${cLine}`}
                  >
                    {isFavoritesActive ? t.emptyFavoritesBtn : t.emptyBtn}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ================= COLLABORATION VIEW ================= */}
        {view === 'collaboration' && (
          <motion.div key="collab" variants={pageVariants} initial="hidden" animate="show" exit="exit" className="px-6 pb-24 pt-24 min-h-[100dvh] flex flex-col justify-center max-w-lg mx-auto">
            <div className="text-center flex flex-col items-center">
              <p className={`text-[9px] font-sans uppercase tracking-[0.4em] mb-6 ${cTextMuted}`}>
                {t.collabSubtitle}
              </p>
              <h2 className="font-serif text-4xl min-[400px]:text-5xl leading-tight mb-8 break-words w-full">
                {t.collabTitle}
              </h2>
              <p className={`text-[13px] font-sans font-light leading-[1.8] mb-12 ${cTextMuted}`}>
                {t.collabText}
              </p>

              <button 
                onClick={handleCopyEmail}
                className={`w-full py-6 border transition-all duration-300 active:scale-95 flex flex-col items-center gap-2 ${emailCopied ? (isDark ? 'border-white bg-white text-black' : 'border-black bg-black text-white') : `${cLine} ${cHover} bg-transparent`}`}
              >
                <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${emailCopied ? 'opacity-60' : 'opacity-40'}`}>
                  {t.collabEmailLabel}
                </span>
                <span className="font-serif text-xl tracking-wide">
                  support@cordwaine.app
                </span>
              </button>

              <button 
                onClick={() => { haptic('light'); setView('about') }}
                className={`mt-8 text-[10px] font-sans uppercase tracking-[0.3em] border-b pb-1 transition-colors ${cTextMuted} hover:text-current ${cLine}`}
              >
                {t.aboutBtn}
              </button>
            </div>
          </motion.div>
        )}

        {/* ================= ABOUT VIEW ================= */}
        {view === 'about' && (
          <motion.div key="about" variants={pageVariants} initial="hidden" animate="show" exit="exit" className={`absolute inset-0 z-50 ${cBg} ${cText} overflow-y-auto pb-24 pt-6`}>
             <AboutProject lang={lang} onClose={() => setView('collaboration')} />
          </motion.div>
        )}

        {/* ================= ARTICLE VIEW ================= */}
        {view === 'article' && activeArticle && content && (
          <motion.div key="article" variants={pageVariants} initial="hidden" animate="show" exit="exit" className="min-h-[100dvh] w-full">
            
            {/* Article Sticky Header */}
            <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
              <button 
                onClick={() => {
                  haptic('light')
                  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
                  setView('journal')
                }}
                className={`pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors drop-shadow-md`}
              >
                <span className="transform transition-transform group-hover:-translate-x-1">←</span>
                <span>Back</span>
              </button>
              <div className="pointer-events-auto flex items-center gap-4">
                 <button onClick={() => handleShareArticle(activeTitle, activeTag)} className={`${cTextMuted} ${cHover} active:scale-90 transition-transform drop-shadow-md bg-transparent border-none`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                 </button>
              </div>
            </header>

            {/* Article Cover (Dynamic Gradient for Theme) */}
            <div className="relative w-full h-[45vh] -mt-[60px]">
              <img src={activeArticle.cover || '/blog-hero.webp'} alt={activeTitle} className={`w-full h-full object-cover transition-all duration-700 ${isDark ? 'grayscale-[20%]' : 'grayscale-0'}`} />
              <div className={`absolute inset-0 bg-gradient-to-t ${gradStart} ${gradMid} to-transparent`} />
            </div>

            <div className="px-6 -mt-16 relative z-10 pb-24 w-full">
              {/* Meta */}
              <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 mb-8">
                 <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>
                   {activeTag}
                 </span>
                 <span className={`w-4 h-px ${cBg} invert opacity-20`} />
                 <span className={`text-[9px] font-sans uppercase tracking-[0.3em] ${cTextMuted}`}>
                   {activeReadTime}
                 </span>
              </div>

              {/* Title */}
              <h1 className="max-w-3xl mx-auto text-center font-serif text-[11vw] md:text-6xl leading-[0.95] tracking-tight mb-12 break-words">
                {activeTitle}
              </h1>

              <div className="max-w-2xl mx-auto mb-16">
                <ArticleAudioPlayer text={activeContentHtml} lang={lang} />
              </div>

              {/* Markdown Content (Editorial Styling applied via CSS above) */}
              <div className="article-content">
                <Markdown>{activeContentHtml}</Markdown>
              </div>

              {/* Bottom Actions */}
              <div className={`max-w-2xl mx-auto mt-16 pt-12 border-t ${cLine} flex flex-col items-center`}>
                <button 
                  onClick={() => {
                    haptic(isCurrentArticleFavorite ? 'light' : 'medium')
                    onToggleArticleFavorite?.(activeArticle.id, activeArticle.cover || '/blog-hero.webp')
                  }}
                  className="group flex flex-col items-center gap-3 outline-none border-none bg-transparent transition-transform active:scale-95 cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 ${isCurrentArticleFavorite ? (isDark ? 'border-white bg-white text-black' : 'border-black bg-black text-white') : `${cLine} ${cText} hover:opacity-60`}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isCurrentArticleFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <span className={`text-[9px] font-sans tracking-widest uppercase ${cTextMuted}`}>
                    {isCurrentArticleFavorite ? t.articleFavRemove : t.articleFavAdd}
                  </span>
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
