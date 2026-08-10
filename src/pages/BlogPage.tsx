import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from 'react-markdown'
import { BLOG_ARTICLES } from '../data/blog'
import { ARTICLE_CONTENTS } from '../data/articleContents'
import type { Lang } from '../App'
import AboutProject from '../components/AboutProject'

type BlogPageProps = {
  onBack?: () => void
  lang: Lang
  isFavorite?: boolean
  onToggleFavorite?: () => void
  favoriteArticleIds?: string[]
  onToggleArticleFavorite?: (articleId: string, cover: string) => void
  initialArticleId?: string | null
  onArticleOpened?: () => void
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
    count % 100 > 4 && count % 100 < 20
      ? 2
      : cases[count % 10 < 5 ? count % 10 : 5]
  ]
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
}: BlogPageProps) {
  const [view, setView] = useState<ViewState>('cover')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  const [emailCopied, setEmailCopied] = useState(false)

  const articleScrollRef = useRef<HTMLDivElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasNew = BLOG_ARTICLES.some((a) => a.isNew)
  const count = BLOG_ARTICLES.length

  // Открываем статью сразу, если пришли из избранного
  useEffect(() => {
    if (initialArticleId) {
      setActiveArticleId(initialArticleId)
      setView('article')
      onArticleOpened?.()
    }
  }, [initialArticleId])

  useEffect(() => {
    if (view === 'article' && articleScrollRef.current) {
      articleScrollRef.current.scrollTo(0, 0)
    }
  }, [view, activeArticleId])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
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

  const handleCopyEmail = async () => {
    triggerHaptic('medium')
    const email = 'cordwain@tuta.io'

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
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const handleShareArticle = (title: string, tag: string) => {
    triggerHaptic('medium')
    const tg = getWebApp()

    const appUrl = 'https://t.me/YourBotName/app'
    const text = `Прочитал статью «\( {title}» ( \){tag}) в PRO Обувь.`
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
        filters: [
          { id: 'all', label: 'Все' },
          { id: 'ИНДУСТРИЯ', label: 'Индустрия' },
          { id: 'МАРКЕТИНГ', label: 'Маркетинг' },
          { id: 'ДИЗАЙН', label: 'Дизайн' },
          { id: 'ПРОИЗВОДСТВО', label: 'Производство' },
        ],
        readBtn: 'Читать',
        collabTitle: 'Сотрудничество',
        collabSubtitle: 'ЦИФРОВАЯ ВИЗИТКА',
        collabText:
          'Мы всегда открыты для профессионального диалога. Разработка концептов, B2B-партнерство, коллаборации или новые идеи в сфере обувного дизайна и производства.',
        collabEmailLabel: 'Прямая связь',
        copyBtn: 'Скопировать',
        copiedBtn: 'Скопировано!',
        aboutBtn: 'О проекте',
        aboutPlaceholder: 'Текст о проекте появится здесь...',
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
        filters: [
          { id: 'all', label: 'Усі' },
          { id: 'ІНДУСТРІЯ', label: 'Індустрія' },
          { id: 'МАРКЕТИНГ', label: 'Маркетинг' },
          { id: 'ДИЗАЙН', label: 'Дизайн' },
          { id: 'ВИРОБНИЦТВО', label: 'Виробництво' },
        ],
        readBtn: 'Читати',
        collabTitle: 'Співпраця',
        collabSubtitle: 'ЦИФРОВА ВІЗИТКА',
        collabText:
          'Ми завжди відкриті до професійного діалогу. Розробка концептів, B2B-партнерство, колаборації або нові ідеї у сфері взуттєвого дизайну та виробництва.',
        collabEmailLabel: 'Прямий звʼязок',
        copyBtn: 'Скопіювати',
        copiedBtn: 'Скопійовано!',
        aboutBtn: 'Про проєкт',
        aboutPlaceholder: 'Текст про проєкт зʼявиться тут...',
        shareBtn: 'Поділитися',
        articleFavAdd: 'Зберегти статтю',
        articleFavRemove: 'В обраному',
      },
    }[lang]
  }, [lang, count])

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.2) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }

  const filteredArticles = BLOG_ARTICLES.filter((article) => {
    const title = lang === 'ru' ? article.titleRu : article.titleUk
    const tag = lang === 'ru' ? article.tagRu : article.tagUk
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || tag === activeFilter
    return matchesSearch && matchesFilter
  }).slice().reverse()

  const activeArticle = activeArticleId ? BLOG_ARTICLES.find((a) => a.id === activeArticleId) : null
  const content = activeArticleId ? ARTICLE_CONTENTS[activeArticleId] : null
  const isCurrentArticleFavorite = activeArticleId ? favoriteArticleIds.includes(activeArticleId) : false

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden">
      <button
        type="button"
        aria-label="Go back"
        onClick={() => {
          triggerHaptic('light')
          if (view === 'article') setView('journal')
          else if (view === 'journal') setView('cover')
          else if (view === 'about') setView('collaboration')
          else if (view === 'collaboration') setView('cover')
          else onBack?.()
        }}
        className="absolute top-4 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
        style={{
          background: 'rgba(29,24,21,0.75)',
          border: '1px solid rgba(198,164,122,0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5F1EB" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <AnimatePresence mode="wait">
        {view === 'cover' && (
          <motion.div
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col justify-between"
          >
            <div className="absolute inset-0 z-0 h-[65vh] overflow-hidden pointer-events-none">
              <img src="/blog-hero.png" alt="PRO" className="w-full h-full object-cover object-center" />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(21,18,16,0.15) 0%, rgba(21,18,16,0.65) 55%, #151210 100%)',
                }}
              />
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-6 pt-16">
              <div className="mb-5">
                <p className="text-[9px] tracking-[0.22em] uppercase text-[#D8A35C] font-semibold mb-1">
                  {t.subtitle}
                </p>
                <h1
                  className="font-display text-[2.2rem] leading-tight text-[#F5F1EB] tracking-wide"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
                >
                  {t.title}
                </h1>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#B9ACA0] max-w-[92%]">
                  {t.tagline}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-6 items-stretch">
                <motion.button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    setView('journal')
                  }}
                  whileTap={{ scale: 0.94 }}
                  className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]"
                  style={cardStyle}
                >
                  {hasNew && (
                    <motion.div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      animate={{ opacity: [0.15, 0.4, 0.15] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        boxShadow: 'inset 0 0 0 1px rgba(216,163,92,0.5), 0 0 20px rgba(216,163,92,0.15)',
                      }}
                    />
                  )}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10"
                    style={{
                      background: 'rgba(216,163,92,0.18)',
                      color: '#D8A35C',
                      boxShadow: '0 0 12px rgba(216,163,92,0.3)',
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">{t.read}</div>
                    <div className="text-[9px] text-[#B9ACA0] mt-1 leading-snug">{t.readSub}</div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    setView('collaboration')
                  }}
                  whileTap={{ scale: 0.94 }}
                  className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]"
                  style={cardStyle}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10"
                    style={{
                      background: 'rgba(96,165,250,0.18)',
                      color: '#60A5FA',
                      boxShadow: '0 0 12px rgba(96,165,250,0.25)',
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">{t.contact}</div>
                    <div className="text-[9px] text-[#B9ACA0] mt-1 leading-snug">{t.contactSub}</div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    triggerHaptic()
                    onToggleFavorite?.()
                  }}
                  whileTap={{ scale: 0.94 }}
                  className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]"
                  style={cardStyle}
                >
                  <motion.div
                    animate={{
                      backgroundColor: isFavorite ? '#F472B6' : 'rgba(244,114,182,0.18)',
                      color: isFavorite ? '#F5F1EB' : '#F472B6',
                      boxShadow: isFavorite
                        ? '0 0 16px rgba(244,114,182,0.6)'
                        : '0 0 12px rgba(244,114,182,0.25)',
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10 text-sm transition-colors"
                  >
                    ★
                  </motion.div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">
                      {isFavorite ? t.favoriteRemove : t.favoriteAdd}
                    </div>
                    <div
                      className="text-[9px] mt-1 leading-snug"
                      style={{ color: isFavorite ? '#F472B6' : '#B9ACA0' }}
                    >
                      {isFavorite ? t.favoriteRemoveSub : t.favoriteAddSub}
                    </div>
                  </div>
                </motion.button>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light')
                  onBack?.()
                }}
                className="w-full text-center text-[15px] font-medium text-[#B9ACA0] hover:text-[#F5F1EB] py-2 active:scale-95 transition-all cursor-pointer"
              >
                {t.backToMenu}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'collaboration' && (
          <motion.div
            key="collaboration"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col z-40 bg-[#151210] overflow-y-auto px-5 pt-20 pb-10"
          >
            <div className="flex flex-col mt-4 mb-10 border-t border-[#3A332D] pt-8">
              <div className="flex items-center text-[10px] font-mono tracking-[0.2em] uppercase text-[#B9ACA0] mb-4">
                <span className="bg-[#60A5FA] text-[#151210] px-2 py-0.5 font-bold mr-3">INFO</span>
                {t.collabSubtitle}
              </div>
              <h2 className="font-display text-[2.4rem] font-black uppercase leading-none tracking-tighter text-[#F5F1EB] mb-5">
                {t.collabTitle}
              </h2>
              <p className="text-[13px] leading-relaxed text-[#B9ACA0] max-w-sm">{t.collabText}</p>
            </div>

            <div className="rounded-2xl p-5 w-full flex flex-col" style={cardStyle}>
              <span className="text-[10px] text-[#B9ACA0] uppercase font-bold tracking-widest mb-1">
                {t.collabEmailLabel}
              </span>
              <span className="text-[1.4rem] font-medium text-[#F5F1EB] mb-6 tracking-wide">
                cordwain@tuta.io
              </span>

              <div className="grid grid-cols-2 gap-3 w-full mt-auto">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="py-3.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: emailCopied ? 'rgba(96,165,250,0.15)' : 'transparent',
                    color: emailCopied ? '#60A5FA' : '#F5F1EB',
                    border: `1px solid ${emailCopied ? 'rgba(96,165,250,0.3)' : 'rgba(185,172,160,0.3)'}`,
                  }}
                >
                  {emailCopied ? t.copiedBtn : t.copyBtn}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium')
                    setView('about')
                  }}
                  className="py-3.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-[#151210]"
                  style={{ backgroundColor: '#D8A35C' }}
                >
                  {t.aboutBtn}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 bg-black"
          >
            <AboutProject lang={lang} onClose={() => setView('collaboration')} />
          </motion.div>
        )}

        {view === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col pt-16 z-20 bg-[#151210]"
          >
            <div className="px-4 shrink-0">
              <h2 className="font-display text-[2rem] leading-none text-[#F5F1EB] mb-1">{t.journalTitle}</h2>
              <p className="text-[11px] text-[#B9ACA0] mb-4 leading-relaxed max-w-[90%]">{t.journalDesc}</p>

              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B9ACA0" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1D1815] border border-[#2A231D] rounded-xl py-2.5 pl-9 pr-4 text-[13px] text-[#F5F1EB] placeholder:text-[#B9ACA0]/60 focus:outline-none focus:border-[#D8A35C]/50 transition-colors"
                />
              </div>

              <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide snap-x">
                {t.filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic()
                      setActiveFilter(filter.id)
                    }}
                    className="snap-start shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-colors border"
                    style={{
                      background: activeFilter === filter.id ? 'rgba(216,163,92,0.15)' : 'transparent',
                      color: activeFilter === filter.id ? '#D8A35C' : '#B9ACA0',
                      borderColor: activeFilter === filter.id ? 'rgba(216,163,92,0.3)' : 'rgba(185,172,160,0.2)',
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 mt-2 pb-8">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#D8A35C] mb-3 font-semibold">
                {searchQuery ? 'Результаты' : t.fresh}
              </p>

              <div className="flex flex-col gap-3">
                {filteredArticles.map((article, i) => {
                  const title = lang === 'ru' ? article.titleRu : article.titleUk
                  const excerpt = lang === 'ru' ? article.excerptRu : article.excerptUk
                  const tag = lang === 'ru' ? article.tagRu : article.tagUk
                  const readTime = lang === 'ru' ? article.readTimeRu : article.readTimeUk

                  return (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        triggerHaptic()
                        setActiveArticleId(article.id)
                        setView('article')
                      }}
                      className="relative rounded-2xl p-4 overflow-hidden cursor-pointer"
                      style={cardStyle}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] tracking-[0.1em] uppercase text-[#D8A35C] bg-[#D8A35C]/10 px-1.5 py-0.5 rounded-sm">
                            {tag}
                          </span>
                          <span className="text-[9px] text-[#B9ACA0]">· {readTime}</span>
                        </div>
                        {article.isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#F472B6] animate-pulse" />}
                      </div>
                      <h3 className="text-[15px] font-semibold leading-snug text-[#F5F1EB] mb-1.5">{title}</h3>
                      <p className="text-[11.5px] text-[#B9ACA0]/80 leading-relaxed line-clamp-2 mb-3">{excerpt}</p>
                      <div className="flex items-center text-[11px] text-[#D8A35C] font-medium group">
                        {t.readBtn}
                        <span className="ml-1 opacity-70 group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </motion.div>
                  )
                })}

                {filteredArticles.length === 0 && (
                  <div className="text-center text-[#B9ACA0] text-[13px] py-10">Ничего не найдено</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {view === 'article' && activeArticle && content && (
          <motion.div
            key="article"
            ref={articleScrollRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col z-30 bg-[#151210] overflow-y-auto overflow-x-hidden"
          >
            <div className="relative w-full h-[40vh] shrink-0">
              <img
                src={activeArticle.cover || '/blog-hero.png'}
                alt={lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(21,18,16,0.1) 0%, #151210 100%)' }}
              />

              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#151210] bg-[#D8A35C] px-2 py-1 rounded-sm">
                  {lang === 'ru' ? activeArticle.tagRu : activeArticle.tagUk}
                </span>
                <span className="text-[10px] text-[#B9ACA0] bg-black/50 backdrop-blur-md px-2 py-1 rounded-sm">
                  {lang === 'ru' ? activeArticle.readTimeRu : activeArticle.readTimeUk}
                </span>
              </div>
            </div>

            <div className="px-5 py-6 pb-8">
              <h1 className="font-display text-[1.8rem] leading-tight text-[#F5F1EB] mb-6">
                {lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk}
              </h1>

              <div className="article-content">
                <Markdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="text-[14.5px] leading-relaxed text-[#B9ACA0] mb-4" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="font-display text-[1.4rem] font-bold text-[#F5F1EB] mt-8 mb-4" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="font-display text-[1.1rem] font-semibold text-[#D8A35C] mt-6 mb-3" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-5 mb-5 text-[14.5px] text-[#B9ACA0] space-y-2 marker:text-[#D8A35C]" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-5 mb-5 text-[14.5px] text-[#B9ACA0] space-y-2 marker:text-[#D8A35C]" {...props} />
                    ),
                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-[#E5DCD3]" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-2 border-[#D8A35C] pl-4 py-2 my-6 text-[14px] italic text-[#B9ACA0] bg-[#D8A35C]/5 rounded-r-lg" {...props} />
                    ),
                    a: ({ node, href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#60A5FA] underline decoration-[#60A5FA]/30 underline-offset-4 hover:decoration-[#60A5FA] transition-colors"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    img: ({ node, alt, ...props }) => (
                      <div className="my-6 w-full flex justify-center rounded-xl bg-[#1D1815]/60 p-2">
                        <img
                          className="max-w-full max-h-[360px] w-auto h-auto object-contain rounded-lg"
                          loading="lazy"
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
                    const cover = activeArticle.cover || '/blog-hero.png'
                    triggerHaptic(isCurrentArticleFavorite ? 'light' : 'medium')
                    onToggleArticleFavorite?.(activeArticle.id, cover)
                  }}
                  className="w-full relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all duration-300"
                  style={{
                    background: isCurrentArticleFavorite
                      ? 'linear-gradient(180deg, rgba(216,163,92,0.15) 0%, rgba(216,163,92,0.02) 100%)'
                      : 'linear-gradient(180deg, rgba(39,33,29,0.7) 0%, rgba(29,24,21,0.5) 100%)',
                    borderColor: isCurrentArticleFavorite
                      ? 'rgba(216,163,92,0.4)'
                      : 'rgba(185,172,160,0.15)',
                    boxShadow: isCurrentArticleFavorite
                      ? '0 8px 24px rgba(216,163,92,0.12), inset 0 1px 0 rgba(216,163,92,0.2)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={isCurrentArticleFavorite ? '#D8A35C' : 'none'}
                    stroke={isCurrentArticleFavorite ? '#D8A35C' : '#B9ACA0'}
                    strokeWidth="1.8"
                    className="transition-colors duration-300"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span
                    className="text-[12px] font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: isCurrentArticleFavorite ? '#D8A35C' : '#F5F1EB' }}
                  >
                    {isCurrentArticleFavorite ? t.articleFavRemove : t.articleFavAdd}
                  </span>
                </motion.button>
              </div>

              <div className="mt-6 pt-5 border-t border-[#2A231D] flex items-center justify-between">
                <div className="text-[11px] text-[#B9ACA0]/60">
                  {lang === 'ru' ? 'Опубликовано:' : 'Опубліковано:'} {activeArticle.createdAt}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleShareArticle(
                      lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk,
                      lang === 'ru' ? activeArticle.tagRu : activeArticle.tagUk
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D1815] text-[#D8A35C] text-[11px] font-semibold uppercase tracking-wider active:scale-95 transition-transform"
                  style={{ border: '1px solid rgba(216,163,92,0.2)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  {t.shareBtn}
                </button>
              </div>
            </div>

            <div className="h-10 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
