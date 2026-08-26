import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import { BLOG_ARTICLES } from '../data/blog'
import { ARTICLE_CONTENTS } from '../data/articleContents'
import type { Lang } from '../App'
import AboutProject from '../components/AboutProject'
import { EmptyState } from '../components/EmptyState'
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
  if (upper === 'ИНДУСТРИЯ' || upper === 'ІНДУСТРІЯ') return 'industry'
  if (upper === 'МАРКЕТИНГ') return 'marketing'
  if (upper === 'ДИЗАЙН') return 'design'
  if (upper === 'ПРОИЗВОДСТВО' || upper === 'ВИРОБНИЦТВО') return 'production'
  return tag
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

  const articleScrollRef = useRef<HTMLDivElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onArticleOpenedRef = useRef(onArticleOpened)

  const hasNew = BLOG_ARTICLES.some((a) => a.isNew)
  const count = BLOG_ARTICLES.length

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
    if (view === 'article' && articleScrollRef.current) {
      articleScrollRef.current.scrollTo(0, 0)
    }
  }, [view, activeArticleId])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      // Останавливаем озвучку при полном размонтировании страницы
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    const tg = getWebApp()
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 20 : 40)
    }
  }

  const showToastMessage = (message: string) => {
    setToast({ message, visible: true })
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2000)
  }

  const handleAboutClick = () => {
    triggerHaptic('medium')
    setView('about')
  }

  const handleCopyEmail = async () => {
    triggerHaptic('medium')
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
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const handleShareArticle = async (title: string, tag: string) => {
    triggerHaptic('medium')
    const tg = getWebApp()
    const appUrl = 'https://cordwainer-miniapp.vercel.app'
    const text = `Прочитал статью «\( {title}» ( \){tag}) в PRO Обувь.`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'PRO Обувь', text, url: appUrl })
        return
      } catch (error) {
        console.log('Share canceled or failed', error)
      }
    }

    const shareUrl = `https://t.me/share/url?url=\( {encodeURIComponent(appUrl)}&text= \){encodeURIComponent(text)}`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank')
    }
  }

  const t = useMemo(() => {
    const ruPlural = getPlural(count, ['статья', 'статьи', 'статей'])
    const ukPlural = getPlural(count, ['стаття', 'статті', 'статей'])

    return {
      ru: {
        title: 'PRO Обувь',
        subtitle: 'БЛОГ И СТАТЬИ',
        tagline: 'Изнанка обувной индустрии. Дизайн, технологии и секреты производства',
        read: 'Читать',
        readSub: count === 0 ? 'Статьи скоро появятся' : `${count} ${ruPlural}`,
        contact: 'Сотрудничество',
        contactSub: 'Предложить идею',
        favoriteAdd: 'В избранное',
        favoriteAddSub: 'Сохранить на главной',
        favoriteRemove: 'В избранном',
        favoriteRemoveSub: 'Убрать с главной',
        backToMenu: 'Назад в меню',
        journalTitle: 'Журнал',
        journalDesc: 'Размышления об индустрии, людях, дизайне, производстве и всем, что происходит вокруг обуви.',
        searchPlaceholder: 'Найти статью...',
        fresh: 'СВЕЖЕЕ',
        emptyTitle: 'Ничего не найдено',
        emptyDesc: 'Попробуйте изменить запрос или сбросить фильтры',
        emptyBtn: 'Сбросить фильтры',
        emptyFavoritesTitle: 'Нет сохранённых статей',
        emptyFavoritesDesc: 'Нажмите на иконку звезды в карточке статьи, чтобы добавить её в этот раздел',
        emptyFavoritesBtn: 'Все статьи',
        filters: [
          { id: 'all', label: 'Все' },
          { id: 'favorites', label: '★ Избранное' },
          { id: 'industry', label: 'Индустрия' },
          { id: 'marketing', label: 'Маркетинг' },
          { id: 'design', label: 'Дизайн' },
          { id: 'production', label: 'Производство' },
        ],
        readBtn: 'Читать',
        collabTitle: 'Сотрудничество',
        collabSubtitle: 'ЦИФРОВАЯ ВИЗИТКА',
        collabText:
          'Это хобби-проект об обувной индустрии. Я открыт к диалогу: идеи, замечания, обратная связь, предложения по сотрудничеству или просто интересные наблюдения. Пишите — с удовольствием обсудим.',
        collabEmailLabel: 'Прямая связь',
        copyBtn: 'Скопировать',
        copiedBtn: 'Скопировано!',
        aboutBtn: 'О проекте',
        shareBtn: 'Поделиться',
        articleFavAdd: 'Сохранить статью',
        articleFavRemove: 'В избранном',
      },
      uk: {
        title: 'PRO Взуття',
        subtitle: 'БЛОГ ТА СТАТТІ',
        tagline: 'Виворіт взуттєвої індустрії. Дизайн, технології та секрети виробництва',
        read: 'Читати',
        readSub: count === 0 ? 'Статті зʼявляться незабаром' : `${count} ${ukPlural}`,
        contact: 'Співпраця',
        contactSub: 'Запропонувати ідею',
        favoriteAdd: 'В обране',
        favoriteAddSub: 'Зберегти на головній',
        favoriteRemove: 'В обраному',
        favoriteRemoveSub: 'Видалити з головної',
        backToMenu: 'Назад до меню',
        journalTitle: 'Журнал',
        journalDesc:
          'Роздуми про індустрію, людей, дизайн, виробництво та все, що відбувається навколо взуття.',
        searchPlaceholder: 'Знайти статтю...',
        fresh: 'СВІЖЕ',
        emptyTitle: 'Нічого не знайдено',
        emptyDesc: 'Спробуйте змінити запит або скинути фільтри',
        emptyBtn: 'Скинути фільтри',
        emptyFavoritesTitle: 'Немає збережених статей',
        emptyFavoritesDesc:
          'Натисніть на іконку зірочки в картці статті, щоб додати її до цього розділу',
        emptyFavoritesBtn: 'Усі статті',
        filters: [
          { id: 'all', label: 'Усі' },
          { id: 'favorites', label: '★ Обране' },
          { id: 'industry', label: 'Індустрія' },
          { id: 'marketing', label: 'Маркетинг' },
          { id: 'design', label: 'Дизайн' },
          { id: 'production', label: 'Виробництво' },
        ],
        readBtn: 'Читати',
        collabTitle: 'Співпраця',
        collabSubtitle: 'ЦИФРОВА ВІЗИТКА',
        collabText:
          'Це хобі-проєкт про взуттєву індустрію. Я відкритий до діалогу: ідеї, зауваження, зворотний звʼязок, пропозиції щодо співпраці або просто цікаві спостереження. Пишіть — із задоволенням обговоримо.',
        collabEmailLabel: 'Прямий звʼязок',
        copyBtn: 'Скопіювати',
        copiedBtn: 'Скопійовано!',
        aboutBtn: 'Про проєкт',
        shareBtn: 'Поділитися',
        articleFavAdd: 'Зберегти статтю',
        articleFavRemove: 'В обраному',
      },
    }[lang]
  }, [lang, count])

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: BLOG_ARTICLES.length,
      favorites: BLOG_ARTICLES.filter((a) => favoriteArticleIds.includes(a.id)).length,
    }
    BLOG_ARTICLES.forEach((a) => {
      const tag = lang === 'ru' ? a.tagRu : a.tagUk
      const slug = getTagSlug(tag)
      counts[slug] = (counts[slug] || 0) + 1
    })
    return counts
  }, [lang, favoriteArticleIds])

  const cardStyle = {
    background:
      'linear-gradient(180deg, color-mix(in srgb, var(--color-surface, #25201C) 92%, transparent) 10%, color-mix(in srgb, var(--color-bg, #1C1816) 20%, transparent) 100%)',
    boxShadow: `
      inset 0 1px 0 color-mix(in srgb, var(--color-accent, #D8A35C) 35%, transparent),
      inset 1px 0 0 color-mix(in srgb, var(--color-accent, #D8A35C) 5%, transparent),
      inset -1px 0 0 color-mix(in srgb, var(--color-accent, #D8A35C) 5%, transparent),
      0 6px 18px color-mix(in srgb, var(--color-bg, #1C1816) 50%, transparent)
    `,
    border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
  }

  const isFavoritesActive = showOnlyFavorites || activeFilter === 'favorites'

  const filteredArticles = BLOG_ARTICLES.filter((article) => {
    if (isFavoritesActive) {
      return favoriteArticleIds.includes(article.id)
    }
    const title = lang === 'ru' ? article.titleRu : article.titleUk
    const tag = lang === 'ru' ? article.tagRu : article.tagUk
    const slug = getTagSlug(tag)
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || slug === activeFilter
    return matchesSearch && matchesFilter
  })
    .slice()
    .reverse()

  const activeArticle = activeArticleId ? BLOG_ARTICLES.find((a) => a.id === activeArticleId) : null
  const content = activeArticleId ? ARTICLE_CONTENTS[activeArticleId] : null
  const isCurrentArticleFavorite = activeArticleId ? favoriteArticleIds.includes(activeArticleId) : false

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[var(--color-bg,#1C1816)] text-[var(--color-ink,#F5F1EA)] overflow-hidden">
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-[12px] font-medium tracking-wide shadow-xl whitespace-nowrap"
            style={{
              background: 'color-mix(in srgb, var(--color-surface, #25201C) 90%, transparent)',
              backdropFilter: 'blur(12px)',
              border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 30%, transparent)',
              color: 'var(--color-ink, #F5F1EA)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {view !== 'article' && view !== 'about' && (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => {
            triggerHaptic('light')
            if (view === 'journal') {
              setShowOnlyFavorites(false)
              setActiveFilter('all')
              setView('cover')
            } else if (view === 'collaboration') setView('cover')
            else onBack?.()
          }}
          className="absolute top-4 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer focus-visible"
          style={{
            background: 'color-mix(in srgb, var(--color-surface, #25201C) 75%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-accent, #D8A35C) 30%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink, #F5F1EA)" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ========== COVER ========== */}
        {view === 'cover' && (
          <motion.div
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col justify-between"
          >
            <div className="absolute inset-0 z-0 h-[65vh] overflow-hidden pointer-events-none">
              <img
                src="/blog-hero.webp"
                alt="PRO"
                width={780}
                height={520}
                decoding="async"
                className="w-full h-full object-cover object-center"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(
                    to bottom,
                    color-mix(in srgb, var(--color-bg, #1C1816) 15%, transparent) 0%,
                    color-mix(in srgb, var(--color-bg, #1C1816) 65%, transparent) 55%,
                    var(--color-bg, #1C1816) 100%
                  )`,
                }}
              />
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-end px-4 md:px-6 pb-6 pt-16">
              <div className="mb-5">
                <p
                  className="text-[9px] tracking-[0.22em] uppercase font-semibold mb-1"
                  style={{ color: 'var(--color-accent, #D8A35C)' }}
                >
                  {t.subtitle}
                </p>
                <h1
                  className="font-display text-[2.2rem] leading-tight tracking-wide"
                  style={{
                    color: 'var(--color-ink, #F5F1EA)',
                    textShadow: '0 2px 20px color-mix(in srgb, var(--color-bg, #1C1816) 80%, transparent)',
                  }}
                >
                  {t.title}
                </h1>
                <p
                  className="mt-1.5 text-[11.5px] leading-relaxed max-w-[92%]"
                  style={{ color: 'var(--color-muted, #B9ACA0)' }}
                >
                  {t.tagline}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-6 items-stretch">
                <motion.button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    setShowOnlyFavorites(false)
                    setActiveFilter('all')
                    setView('journal')
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px] focus-visible"
                  style={{ ...cardStyle, willChange: 'transform' }}
                >
                  {hasNew && (
                    <motion.div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      animate={{ opacity: [0.15, 0.4, 0.15] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        boxShadow:
                          'inset 0 0 0 1px color-mix(in srgb, var(--color-accent, #D8A35C) 50%, transparent), 0 0 20px color-mix(in srgb, var(--color-accent, #D8A35C) 15%, transparent)',
                      }}
                    />
                  )}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10"
                    style={{
                      background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent)',
                      color: 'var(--color-accent, #D8A35C)',
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                      {t.read}
                    </div>
                    <div className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                      {t.readSub}
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    setView('collaboration')
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px] focus-visible"
                  style={{ ...cardStyle, willChange: 'transform' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--color-info, #60A5FA) 18%, transparent)',
                      color: 'var(--color-info, #60A5FA)',
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                      {t.contact}
                    </div>
                    <div className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                      {t.contactSub}
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    onToggleFavorite?.()
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px] focus-visible"
                  style={{ ...cardStyle, willChange: 'transform' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0"
                    style={{
                      background: isFavorite
                        ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent)'
                        : 'color-mix(in srgb, var(--color-muted, #B9ACA0) 12%, transparent)',
                      color: isFavorite ? 'var(--color-accent, #D8A35C)' : 'var(--color-muted, #B9ACA0)',
                    }}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill={isFavorite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                      {isFavorite ? t.favoriteRemove : t.favoriteAdd}
                    </div>
                    <div className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                      {isFavorite ? t.favoriteRemoveSub : t.favoriteAddSub}
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== JOURNAL ========== */}
        {view === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col"
          >
            <div className="px-4 md:px-6 pt-16 pb-3 shrink-0">
              <h2 className="font-display text-[1.75rem] leading-tight mb-1" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                {t.journalTitle}
              </h2>
              <p className="text-[12px] leading-relaxed mb-4" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                {t.journalDesc}
              </p>

              <div
                className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2 mb-3"
                style={{
                  background: 'var(--color-surface, #25201C)',
                  border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={rawSearchQuery}
                  onChange={(e) => setRawSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
                  style={{ color: 'var(--color-ink, #F5F1EA)' }}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x">
                {t.filters.map((filter) => {
                  const isActive = activeFilter === filter.id || (filter.id === 'favorites' && showOnlyFavorites)
                  const cnt = filterCounts[filter.id] ?? 0
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light')
                        if (filter.id === 'favorites') setShowOnlyFavorites(true)
                        else setShowOnlyFavorites(false)
                        setActiveFilter(filter.id)
                      }}
                      className="snap-start shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-colors border focus-visible flex items-center gap-1.5"
                      style={{
                        background: isActive
                          ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 15%, transparent)'
                          : 'transparent',
                        color: isActive ? 'var(--color-accent, #D8A35C)' : 'var(--color-muted, #B9ACA0)',
                        borderColor: isActive
                          ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 30%, transparent)'
                          : 'color-mix(in srgb, var(--color-muted, #B9ACA0) 20%, transparent)',
                      }}
                    >
                      {filter.label}
                      <span className="opacity-60 text-[9px]">{cnt}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-6 mt-2 pb-8">
              <p
                className="text-[10px] tracking-[0.14em] uppercase mb-3 font-semibold"
                style={{ color: 'var(--color-accent, #D8A35C)' }}
              >
                {isFavoritesActive
                  ? lang === 'ru'
                    ? 'ИЗБРАННОЕ'
                    : 'ОБРАНЕ'
                  : searchQuery
                    ? lang === 'ru'
                      ? 'Результаты'
                      : 'Результати'
                    : t.fresh}
              </p>

              <div className="flex flex-col gap-3">
                {filteredArticles.map((article) => {
                  const title = lang === 'ru' ? article.titleRu : article.titleUk
                  const excerpt = lang === 'ru' ? article.excerptRu : article.excerptUk
                  const tag = lang === 'ru' ? article.tagRu : article.tagUk
                  const readTime = lang === 'ru' ? article.readTimeRu : article.readTimeUk

                  return (
                    <button
                      key={article.id}
                      type="button"
                      aria-label={`Читать статью ${title}`}
                      onClick={() => {
                        triggerHaptic()
                        setActiveArticleId(article.id)
                        setView('article')
                      }}
                      className="w-full text-left relative rounded-2xl p-4 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform focus-visible block"
                      style={cardStyle}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm"
                            style={{
                              color: 'var(--color-accent, #D8A35C)',
                              background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 10%, transparent)',
                            }}
                          >
                            {tag}
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                            · {readTime}
                          </span>
                        </div>
                        {article.isNew && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F472B6] animate-pulse" />
                        )}
                      </div>
                      <h3 className="text-[15px] font-semibold leading-snug mb-1.5" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                        {title}
                      </h3>
                      <p
                        className="text-[11.5px] leading-relaxed line-clamp-2 mb-3"
                        style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 80%, transparent)' }}
                      >
                        {excerpt}
                      </p>
                      <div className="flex items-center text-[11px] font-medium" style={{ color: 'var(--color-accent, #D8A35C)' }}>
                        {t.readBtn}
                        <span className="ml-1 opacity-70">→</span>
                      </div>
                    </button>
                  )
                })}

                {filteredArticles.length === 0 && (
                  <EmptyState
                    variant={isFavoritesActive ? 'favorites' : 'search'}
                    title={isFavoritesActive ? t.emptyFavoritesTitle : t.emptyTitle}
                    description={isFavoritesActive ? t.emptyFavoritesDesc : t.emptyDesc}
                    action={
                      isFavoritesActive
                        ? {
                            label: t.emptyFavoritesBtn,
                            onClick: () => {
                              triggerHaptic('light')
                              setShowOnlyFavorites(false)
                              setActiveFilter('all')
                            },
                          }
                        : {
                            label: t.emptyBtn,
                            onClick: () => {
                              triggerHaptic('light')
                              setRawSearchQuery('')
                              setActiveFilter('all')
                            },
                          }
                    }
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== COLLABORATION ========== */}
        {view === 'collaboration' && (
          <motion.div
            key="collaboration"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col px-4 md:px-6 pt-16 pb-8 overflow-y-auto"
          >
            <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-1" style={{ color: 'var(--color-accent, #D8A35C)' }}>
              {t.collabSubtitle}
            </p>
            <h2 className="font-display text-[1.75rem] leading-tight mb-4" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
              {t.collabTitle}
            </h2>
            <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
              {t.collabText}
            </p>

            <div
              className="rounded-2xl p-4 mb-4"
              style={{
                background: 'var(--color-surface, #25201C)',
                border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
              }}
            >
              <p className="text-[10px] tracking-[0.12em] uppercase mb-2" style={{ color: 'var(--color-muted, #B9ACA0)' }}>
                {t.collabEmailLabel}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium truncate" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                  support@cordwaine.app
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold active:scale-95 transition-transform"
                  style={{
                    background: emailCopied
                      ? 'color-mix(in srgb, var(--color-success, #0BDA51) 20%, transparent)'
                      : 'color-mix(in srgb, var(--color-accent, #D8A35C) 18%, transparent)',
                    color: emailCopied ? 'var(--color-success, #0BDA51)' : 'var(--color-accent, #D8A35C)',
                  }}
                >
                  {emailCopied ? t.copiedBtn : t.copyBtn}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAboutClick}
              className="w-full py-3.5 rounded-2xl text-[12px] font-semibold uppercase tracking-wider active:scale-[0.98] transition-transform"
              style={{
                background: 'var(--color-surface, #25201C)',
                border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
                color: 'var(--color-muted, #B9ACA0)',
              }}
            >
              {t.aboutBtn}
            </button>
          </motion.div>
        )}

        {/* ========== ABOUT ========== */}
        {view === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 overflow-y-auto pt-14"
          >
            <AboutProject lang={lang} onClose={() => setView('collaboration')} />
          </motion.div>
        )}

        {/* ========== ARTICLE ========== */}
        {view === 'article' && activeArticle && content && (
          <motion.div
            key="article"
            ref={articleScrollRef}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col z-30 overflow-y-auto overflow-x-hidden"
            style={{ background: 'var(--color-bg, #1C1816)' }}
          >
            <div
              className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
              style={{
                background: 'color-mix(in srgb, var(--color-bg, #1C1816) 85%, transparent)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 60%, transparent)',
              }}
            >
              <button
                aria-label="Back"
                onClick={() => {
                  triggerHaptic('light')
                  // Останавливаем озвучку при выходе из статьи
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel()
                  }
                  setView('journal')
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform focus-visible"
                style={{
                  background: 'var(--color-surface, #25201C)',
                  border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
                  color: 'var(--color-ink, #F5F1EA)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div
                className="flex-1 truncate mx-4 text-center text-[12px] font-semibold tracking-wide"
                style={{ color: 'var(--color-ink, #F5F1EA)' }}
              >
                {lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk}
              </div>

              <div className="flex items-center gap-2">
                <button
                  aria-label="Share"
                  onClick={() =>
                    handleShareArticle(
                      lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk,
                      lang === 'ru' ? activeArticle.tagRu : activeArticle.tagUk
                    )
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform focus-visible"
                  style={{
                    background: 'var(--color-surface, #25201C)',
                    border: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
                    color: 'var(--color-muted, #B9ACA0)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
                <button
                  aria-label="Favorite"
                  onClick={() => {
                    triggerHaptic(isCurrentArticleFavorite ? 'light' : 'medium')
                    onToggleArticleFavorite?.(activeArticle.id, activeArticle.cover || '/blog-hero.webp')
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full border active:scale-90 transition-all focus-visible"
                  style={{
                    background: isCurrentArticleFavorite
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 15%, transparent)'
                      : 'var(--color-surface, #25201C)',
                    borderColor: isCurrentArticleFavorite
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 40%, transparent)'
                      : 'color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
                    color: isCurrentArticleFavorite
                      ? 'var(--color-accent, #D8A35C)'
                      : 'var(--color-muted, #B9ACA0)',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={isCurrentArticleFavorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="relative w-full h-[35vh] shrink-0">
              <img
                src={activeArticle.cover || '/blog-hero.webp'}
                alt={lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, color-mix(in srgb, var(--color-bg, #1C1816) 10%, transparent) 0%, var(--color-bg, #1C1816) 100%)`,
                }}
              />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span
                  className="text-[10px] font-bold tracking-[0.1em] uppercase px-2 py-1 rounded-sm"
                  style={{
                    color: 'var(--color-bg, #1C1816)',
                    background: 'var(--color-accent, #D8A35C)',
                  }}
                >
                  {lang === 'ru' ? activeArticle.tagRu : activeArticle.tagUk}
                </span>
                <span
                  className="text-[10px] px-2 py-1 rounded-sm"
                  style={{
                    color: 'var(--color-muted, #B9ACA0)',
                    background: 'color-mix(in srgb, var(--color-bg, #1C1816) 50%, transparent)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {lang === 'ru' ? activeArticle.readTimeRu : activeArticle.readTimeUk}
                </span>
              </div>
            </div>

            <div className="px-5 py-6 pb-8">
              <h1 className="font-display text-[1.8rem] leading-tight mb-4" style={{ color: 'var(--color-ink, #F5F1EA)' }}>
                {lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk}
              </h1>

              {/* Кнопка озвучки */}
              <div className="mb-6">
                <ArticleAudioPlayer text={content[lang]} lang={lang} />
              </div>

              <div className="article-content">
                <Markdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="text-[14.5px] leading-relaxed mb-4" style={{ color: 'var(--color-muted, #B9ACA0)' }} {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="font-display text-[1.4rem] font-bold mt-8 mb-4" style={{ color: 'var(--color-ink, #F5F1EA)' }} {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="font-display text-[1.1rem] font-semibold mt-6 mb-3" style={{ color: 'var(--color-accent, #D8A35C)' }} {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-5 mb-5 text-[14.5px] space-y-2" style={{ color: 'var(--color-muted, #B9ACA0)' }} {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-5 mb-5 text-[14.5px] space-y-2" style={{ color: 'var(--color-muted, #B9ACA0)' }} {...props} />
                    ),
                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold" style={{ color: 'var(--color-ink, #F5F1EA)' }} {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-2 pl-4 py-2 my-6 text-[14px] italic rounded-r-lg"
                        style={{
                          borderColor: 'var(--color-accent, #D8A35C)',
                          color: 'var(--color-muted, #B9ACA0)',
                          background: 'color-mix(in srgb, var(--color-accent, #D8A35C) 5%, transparent)',
                        }}
                        {...props}
                      />
                    ),
                    a: ({ node, href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 transition-colors focus-visible"
                        style={{
                          color: 'var(--color-info, #60A5FA)',
                          textDecorationColor: 'color-mix(in srgb, var(--color-info, #60A5FA) 30%, transparent)',
                        }}
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    img: ({ node, alt, ...props }) => (
                      <div
                        className="my-6 w-full flex justify-center rounded-xl p-2"
                        style={{ background: 'color-mix(in srgb, var(--color-surface, #25201C) 60%, transparent)' }}
                      >
                        <img
                          className="max-w-full max-h-[360px] w-auto h-auto object-contain rounded-lg"
                          loading="lazy"
                          decoding="async"
                          alt={alt || 'Иллюстрация к статье'}
                          {...props}
                        />
                      </div>
                    ),
                  }}
                >
                  {content[lang]}
                </Markdown>
              </div>

              <div className="mt-10 mb-4">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const cover = activeArticle.cover || '/blog-hero.webp'
                    triggerHaptic(isCurrentArticleFavorite ? 'light' : 'medium')
                    onToggleArticleFavorite?.(activeArticle.id, cover)
                  }}
                  className="btn-favorite-overlay w-full relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl border transition-colors duration-300 focus-visible"
                  style={{
                    willChange: 'transform',
                    borderColor: isCurrentArticleFavorite
                      ? 'color-mix(in srgb, var(--color-accent, #D8A35C) 40%, transparent)'
                      : 'color-mix(in srgb, var(--color-muted, #B9ACA0) 20%, transparent)',
                  }}
                >
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      isCurrentArticleFavorite ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      background:
                        'linear-gradient(to bottom, color-mix(in srgb, var(--color-accent, #D8A35C) 15%, transparent), color-mix(in srgb, var(--color-accent, #D8A35C) 5%, transparent))',
                    }}
                  />
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      isCurrentArticleFavorite ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                      background:
                        'linear-gradient(to bottom, color-mix(in srgb, var(--color-surface, #25201C) 70%, transparent), color-mix(in srgb, var(--color-surface, #25201C) 50%, transparent))',
                    }}
                  />
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={isCurrentArticleFavorite ? 'var(--color-accent, #D8A35C)' : 'none'}
                    stroke={
                      isCurrentArticleFavorite
                        ? 'var(--color-accent, #D8A35C)'
                        : 'var(--color-muted, #B9ACA0)'
                    }
                    strokeWidth="1.8"
                    className="relative z-10"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span
                    className="relative z-10 text-[12px] font-bold uppercase tracking-wider"
                    style={{
                      color: isCurrentArticleFavorite
                        ? 'var(--color-accent, #D8A35C)'
                        : 'var(--color-ink, #F5F1EA)',
                    }}
                  >
                    {isCurrentArticleFavorite ? t.articleFavRemove : t.articleFavAdd}
                  </span>
                </motion.button>
              </div>

              <div
                className="mt-6 pt-5 flex items-center justify-between"
                style={{
                  borderTop: '1px solid color-mix(in srgb, var(--color-border, rgba(255,255,255,0.12)) 80%, transparent)',
                }}
              >
                <div className="text-[11px]" style={{ color: 'color-mix(in srgb, var(--color-muted, #B9ACA0) 60%, transparent)' }}>
                  {lang === 'ru' ? 'Опубликовано:' : 'Опубліковано:'} {activeArticle.createdAt}
                </div>
              </div>
            </div>

            <div className="h-10 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
