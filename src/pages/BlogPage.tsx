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
  const [isDark, setIsDark] = useState(true)

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onArticleOpenedRef = useRef(onArticleOpened)

  const count = BLOG_ARTICLES.length

  // Сброс скролла и отслеживание темы
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
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
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

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

  // Цветовые токены для Журнала (Зависят от темы ОС)
  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  const MENU_ITEMS = [
    { id: 'journal', title: t.journalTitle, subtitle: t.readSub, action: () => { setView('journal'); setShowOnlyFavorites(false); setActiveFilter('all') } },
    { id: 'collab', title: t.collabTitle, subtitle: t.contactSub, action: () => setView('collaboration') },
  ]

  return (
    <div className={`relative min-h-[100dvh] w-full transition-colors duration-500 ${cBg} ${cText}`}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; -webkit-touch-callout: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stagger-item {
          opacity: 0;
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Markdown Typography Styles */
        .article-content p { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-weight: 300; font-size: 14px; line-height: 1.8; margin-bottom: 1.5rem; opacity: 0.8; }
        .article-content h2 { font-family: "Playfair Display", serif; font-size: 2rem; margin-top: 3rem; margin-bottom: 1rem; line-height: 1.1; }
        .article-content h3 { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 2rem; margin-bottom: 1rem; opacity: 0.6; }
        .article-content ul, .article-content ol { font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 300; font-size: 14px; line-height: 1.8; margin-bottom: 1.5rem; padding-left: 1.2rem; opacity: 0.8; }
        .article-content li { margin-bottom: 0.5rem; }
        .article-content strong { font-weight: 600; opacity: 1; }
        .article-content blockquote { border-left: 1px solid currentColor; opacity: 0.7; padding-left: 1.2rem; font-family: "Playfair Display", serif; font-size: 1.2rem; font-style: italic; margin: 2rem 0; }
        .article-content img { width: 100%; border-radius: 12px; margin: 2rem 0; filter: grayscale(20%); }
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

      {/* GLOBAL HEADER (Except Cover & Article) */}
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

      {/* ================= COVER VIEW ================= */}
      {view === 'cover' && (
        <div className="relative min-h-[100dvh] flex flex-col justify-end bg-[#0A0A0A] text-[#F4F0E8]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img src="/blog-hero.webp" alt="Cover" className={`w-full h-full object-cover object-[center_top] transition-opacity duration-1000 ${isDark ? 'grayscale-[30%]' : 'grayscale-[10%]'}`} />
            {/* Жесткий темный градиент для обложки, чтобы белый текст всегда читался идеально */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-black/30" />
          </div>

          {/* HEADER ВЫНЕСЕН НАВЕРХ И ОТВЯЗАН ОТ НИЖНЕГО БЛОКА */}
          <header className="absolute top-10 left-6 z-20">
            <button onClick={onBack} className="group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-white/80 hover:text-white transition-colors drop-shadow-md">
              <span className="transform transition-transform group-hover:-translate-x-1">←</span>
              <span>Back</span>
            </button>
          </header>

          <div className="relative z-10 px-6 pb-24 w-full pt-20">
            <div className="stagger-item mb-16" style={{ animationDelay: '0.1s' }}>
              <p className="text-[9px] font-sans font-medium uppercase tracking-[0.4em] mb-4 text-white/60 drop-shadow-md">
                {t.subtitle}
              </p>
              <h1 className="font-serif text-[18vw] min-[400px]:text-7xl leading-[0.85] tracking-tight whitespace-nowrap text-[#F4F0E8] drop-shadow-lg">
                {t.title}
              </h1>
              <p className="mt-6 text-[11px] font-sans font-light leading-[1.8] max-w-[260px] text-white/70 drop-shadow-md">
                {t.tagline}
              </p>
            </div>

            <div className="flex flex-col">
              {MENU_ITEMS.map((item, idx) => (
                <div key={item.id} className="stagger-item" style={{ animationDelay: `${0.2 + idx * 0.05}s` }}>
                  <button
                    onClick={() => { haptic('medium'); item.action?.(); }}
                    className="w-full group relative flex items-end justify-between py-6 border-b outline-none border-0 bg-transparent cursor-pointer border-white/20 text-left transition-all active:opacity-50"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-[9px] font-sans tracking-widest mt-2 text-white/50">
                        0{idx + 1}
                      </span>
                      <div className="font-serif text-[7vw] min-[375px]:text-3xl leading-[1.1] text-white transition-transform group-hover:translate-x-1 drop-shadow-md">
                        {item.title}
                      </div>
                    </div>
                    <div className="text-[10px] font-sans tracking-[0.1em] text-right w-[40%] text-white/50">
                      {item.subtitle}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= JOURNAL VIEW ================= */}
      {view === 'journal' && (
        <div className="px-6 pb-24 pt-10 min-h-[100dvh]">
          <div className="stagger-item mb-12" style={{ animationDelay: '0.05s' }}>
            <h1 className="font-serif text-[16vw] min-[400px]:text-6xl leading-[0.85] tracking-tight mb-4">
              {t.journalTitle}
            </h1>
            <p className={`text-[11px] font-sans font-light leading-[1.8] max-w-[280px] ${cTextMuted}`}>
              {t.journalDesc}
            </p>
          </div>

          <div className="stagger-item mb-10" style={{ animationDelay: '0.1s' }}>
            <div className={`relative flex items-end border-b pb-3 transition-colors ${cLine}`}>
              <span className={`text-[12px] font-serif italic mr-4 ${cTextMuted}`}>Find.</span>
              <input
                type="text"
                value={rawSearchQuery}
                onChange={(e) => setRawSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full bg-transparent outline-none border-0 text-[16px] font-sans font-light placeholder:font-light ${isDark ? 'placeholder:text-[#F4F0E8]/30' : 'placeholder:text-[#1C1816]/30'}`}
              />
              {rawSearchQuery && (
                <button onClick={() => setRawSearchQuery('')} className={`ml-2 text-[10px] uppercase tracking-widest outline-none border-0 bg-transparent cursor-pointer ${cTextMuted}`}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="stagger-item mb-12" style={{ animationDelay: '0.15s' }}>
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
          </div>

          <div className="stagger-item" style={{ animationDelay: '0.2s' }}>
            {filteredArticles.length > 0 ? (
              <div className="flex flex-col gap-10">
                {filteredArticles.map((article) => {
                  const title = lang === 'ru' ? article.titleRu : lang === 'uk' ? article.titleUk : (article as any).titleDe || article.titleRu
                  const excerpt = lang === 'ru' ? article.excerptRu : lang === 'uk' ? article.excerptUk : (article as any).excerptDe || article.excerptRu
                  const tag = lang === 'ru' ? article.tagRu : lang === 'uk' ? article.tagUk : (article as any).tagDe || article.tagRu
                  const readTime = lang === 'ru' ? article.readTimeRu : lang === 'uk' ? article.readTimeUk : (article as any).readTimeDe || article.readTimeRu

                  return (
                    <button
                      key={article.id}
                      onClick={() => { haptic('medium'); setActiveArticleId(article.id); setView('article') }}
                      className="group text-left outline-none border-none bg-transparent cursor-pointer active:opacity-50 transition-opacity flex flex-col items-start"
                    >
                      <div className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-3 ${cTextMuted}`}>
                        {tag} <span className="mx-2">—</span> {readTime}
                      </div>
                      <h3 className="font-serif text-[26px] min-[400px]:text-3xl leading-[1.1] mb-3 transition-transform group-hover:translate-x-1">
                        {title}
                      </h3>
                      <p className={`text-[12px] font-sans font-light leading-[1.6] line-clamp-2 max-w-sm ${cTextMuted}`}>
                        {excerpt}
                      </p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={`py-12 text-center flex flex-col items-center gap-6`}>
                <p className={`font-serif text-2xl italic ${cTextMuted}`}>
                  {isFavoritesActive ? t.emptyFavoritesTitle : t.emptyTitle}
                </p>
                <button 
                  onClick={() => { haptic('light'); setShowOnlyFavorites(false); setActiveFilter('all'); setRawSearchQuery('') }}
                  className={`text-[9px] font-sans uppercase tracking-[0.3em] border-b pb-1 transition-colors hover:text-white ${cTextMuted} ${cLine}`}
                >
                  {isFavoritesActive ? t.emptyFavoritesBtn : t.emptyBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= COLLABORATION VIEW ================= */}
      {view === 'collaboration' && (
        <div className="px-6 pb-24 pt-24 min-h-[100dvh] flex flex-col justify-center max-w-lg mx-auto">
          <div className="stagger-item text-center flex flex-col items-center" style={{ animationDelay: '0.1s' }}>
            <p className={`text-[9px] font-sans uppercase tracking-[0.4em] mb-6 ${cTextMuted}`}>
              {t.collabSubtitle}
            </p>
            <h2 className="font-serif text-4xl min-[400px]:text-5xl leading-tight mb-8">
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
              className={`mt-6 text-[10px] font-sans uppercase tracking-[0.3em] border-b pb-1 transition-colors ${cTextMuted} hover:text-current ${cLine}`}
            >
              {t.aboutBtn}
            </button>
          </div>
        </div>
      )}

      {/* ================= ABOUT VIEW ================= */}
      {view === 'about' && (
        <div className={`absolute inset-0 z-50 ${cBg} ${cText} overflow-y-auto pb-24 pt-6`}>
           <AboutProject lang={lang} onClose={() => setView('collaboration')} />
        </div>
      )}

      {/* ================= ARTICLE VIEW ================= */}
      {view === 'article' && activeArticle && content && (
        <div className="min-h-[100dvh] w-full bg-[#0A0A0A] text-[#F4F0E8]">
          
          {/* Article Sticky Header */}
          <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
            <button 
              onClick={() => {
                haptic('light')
                if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
                setView('journal')
              }}
              className="pointer-events-auto group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer text-white/80 hover:text-white transition-colors drop-shadow-md"
            >
              <span className="transform transition-transform group-hover:-translate-x-1">←</span>
              <span>Back</span>
            </button>
            <div className="pointer-events-auto flex items-center gap-4">
               <button onClick={() => handleShareArticle(activeTitle, activeTag)} className="text-white/80 hover:text-white active:scale-90 transition-transform drop-shadow-md">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
               </button>
            </div>
          </header>

          {/* Article Cover */}
          <div className="relative w-full h-[45vh] -mt-[60px]">
            <img src={activeArticle.cover || '/blog-hero.webp'} alt={activeTitle} className="w-full h-full object-cover grayscale-[20%]" />
            {/* Жесткий темный градиент для читаемости текста на обложке статьи */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-black/30" />
          </div>

          <div className="px-6 -mt-16 relative z-10 pb-24 max-w-2xl mx-auto">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-6">
               <span className="text-[9px] font-sans uppercase tracking-[0.3em] text-white/60 drop-shadow-sm">
                 {activeTag}
               </span>
               <span className="w-4 h-px bg-white/20" />
               <span className="text-[9px] font-sans uppercase tracking-[0.3em] text-white/60 drop-shadow-sm">
                 {activeReadTime}
               </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight mb-8 text-white drop-shadow-md">
              {activeTitle}
            </h1>

            <div className="mb-12">
              <ArticleAudioPlayer text={activeContentHtml} lang={lang} />
            </div>

            {/* Markdown Content */}
            <div className="article-content">
              <Markdown>{activeContentHtml}</Markdown>
            </div>

            {/* Bottom Actions */}
            <div className="mt-16 pt-12 border-t border-white/10 flex flex-col items-center">
              <button 
                onClick={() => {
                  haptic(isCurrentArticleFavorite ? 'light' : 'medium')
                  onToggleArticleFavorite?.(activeArticle.id, activeArticle.cover || '/blog-hero.webp')
                }}
                className={`group flex flex-col items-center gap-3 outline-none transition-transform active:scale-95`}
              >
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 ${isCurrentArticleFavorite ? 'border-white bg-white text-black' : 'border-white/20 text-white hover:border-white/60'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isCurrentArticleFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <span className="text-[9px] font-sans tracking-widest uppercase text-white/60">
                  {isCurrentArticleFavorite ? t.articleFavRemove : t.articleFavAdd}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
