import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BLOG_ARTICLES } from '../data/blog'
import { ARTICLE_CONTENTS } from '../data/articleContents'
import type { Lang } from '../App'

type BlogPageProps = {
  onBack?: () => void
  lang: Lang
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

type ViewState = 'cover' | 'journal' | 'article' | 'collaboration'

export function BlogPage({ onBack, lang, isFavorite = false, onToggleFavorite }: BlogPageProps) {
  const [view, setView] = useState<ViewState>('cover')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  
  const [emailCopied, setEmailCopied] = useState(false)

  const hasNew = BLOG_ARTICLES.some((a) => a.isNew)
  const count = BLOG_ARTICLES.length

  // Надежный тактильный отклик для Telegram WebApp и браузеров
  const triggerHaptic = () => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
  }

  // Пуленепробиваемое копирование (работает во всех WebViews)
  const handleCopyEmail = async () => {
    triggerHaptic()
    const email = 'cordwain@tuta.io'
    
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email)
      } else {
        // Fallback для старых/встроенных браузеров
        const textArea = document.createElement("textarea")
        textArea.value = email
        textArea.style.position = "absolute"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const t = {
    ru: {
      title: 'PRO Обувь',
      subtitle: 'БЛОГ И СТАТЬИ',
      tagline: 'Изнанка обувной индустрии. Дизайн, технологии и секреты производства',
      read: 'Читать',
      readSub: count === 0 ? 'Статьи скоро появятся' : `${count} ${count === 1 ? 'статья' : count < 5 ? 'статьи' : 'статей'}`,
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
      collabText: 'Мы всегда открыты для профессионального диалога. Разработка концептов, B2B-партнерство, коллаборации или новые идеи в сфере обувного дизайна и производства.',
      collabEmailLabel: 'Прямая связь',
      copyBtn: 'Скопировать',
      copiedBtn: 'Скопировано!',
      mailBtn: 'Написать письмо',
    },
    uk: {
      title: 'PRO Взуття',
      subtitle: 'БЛОГ ТА СТАТТІ',
      tagline: 'Виворіт взуттєвої індустрії. Дизайн, технології та секрети виробництва',
      read: 'Читати',
      readSub: count === 0 ? 'Статті зʼявляться незабаром' : `${count} ${count === 1 ? 'стаття' : count < 5 ? 'статті' : 'статей'}`,
      contact: "Співпраця",
      contactSub: 'Запропонувати ідею',
      favoriteAdd: 'В обране',
      favoriteAddSub: 'Зберегти на головній',
      favoriteRemove: 'В обраному',
      favoriteRemoveSub: 'Видалити з головної',
      backToMenu: 'Назад до меню',
      journalTitle: 'Журнал',
      journalDesc: 'Роздуми про індустрію, людей, дизайн, виробництво та все, що відбувається навколо взуття.',
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
      collabText: 'Ми завжди відкриті до професійного діалогу. Розробка концептів, B2B-партнерство, колаборації або нові ідеї у сфері взуттєвого дизайну та виробництва.',
      collabEmailLabel: 'Прямий звʼязок',
      copyBtn: 'Скопіювати',
      copiedBtn: 'Скопійовано!',
      mailBtn: 'Написати листа',
    },
  }[lang]

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.2) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }

  const filteredArticles = BLOG_ARTICLES.filter((article) => {
    const title = lang === 'ru' ? article.titleRu : article.titleUk
    const tag = lang === 'ru' ? article.tagRu : article.tagUk
    
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || tag === activeFilter
    
    return matchesSearch && matchesFilter
  })

  const activeArticle = activeArticleId ? BLOG_ARTICLES.find(a => a.id === activeArticleId) : null
  const content = activeArticleId ? ARTICLE_CONTENTS[activeArticleId] : null

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden">
      
      {/* Умная кнопка НАЗАД */}
      <button
        onClick={() => {
          triggerHaptic()
          if (view === 'article') setView('journal')
          else if (view === 'journal') setView('cover')
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
        {/* ================= ОБЛОЖКА ================= */}
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
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(21,18,16,0.15) 0%, rgba(21,18,16,0.65) 55%, #151210 100%)' }} />
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-6 pt-16">
              <div className="mb-5">
                <p className="text-[9px] tracking-[0.22em] uppercase text-[#D8A35C] font-semibold mb-1">{t.subtitle}</p>
                <h1 className="font-display text-[2.2rem] leading-tight text-[#F5F1EB] tracking-wide" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                  {t.title}
                </h1>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#B9ACA0] max-w-[92%]">{t.tagline}</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-6 items-stretch">
                {/* Читать */}
                <motion.button onClick={() => { triggerHaptic(); setView('journal'); }} whileTap={{ scale: 0.94 }} className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]" style={cardStyle}>
                  {hasNew && (
                    <motion.div className="absolute inset-0 rounded-xl pointer-events-none" animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ boxShadow: 'inset 0 0 0 1px rgba(216,163,92,0.5), 0 0 20px rgba(216,163,92,0.15)' }} />
                  )}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10" style={{ background: 'rgba(216,163,92,0.18)', color: '#D8A35C', boxShadow: '0 0 12px rgba(216,163,92,0.3)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">{t.read}</div>
                    <div className="text-[9px] text-[#B9ACA0] mt-1 leading-snug">{t.readSub}</div>
                  </div>
                </motion.button>

                {/* Сотрудничество */}
                <motion.button onClick={() => { triggerHaptic(); setView('collaboration'); }} whileTap={{ scale: 0.94 }} className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]" style={cardStyle}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10" style={{ background: 'rgba(96,165,250,0.18)', color: '#60A5FA', boxShadow: '0 0 12px rgba(96,165,250,0.25)' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">{t.contact}</div>
                    <div className="text-[9px] text-[#B9ACA0] mt-1 leading-snug">{t.contactSub}</div>
                  </div>
                </motion.button>

                {/* В избранное */}
                <motion.button onClick={() => { triggerHaptic(); onToggleFavorite?.(); }} whileTap={{ scale: 0.94 }} className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]" style={cardStyle}>
                  <motion.div animate={{ backgroundColor: isFavorite ? '#F472B6' : 'rgba(244,114,182,0.18)', color: isFavorite ? '#F5F1EB' : '#F472B6', boxShadow: isFavorite ? '0 0 16px rgba(244,114,182,0.6)' : '0 0 12px rgba(244,114,182,0.25)' }} className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10 text-sm transition-colors">
                    ★
                  </motion.div>
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">{isFavorite ? t.favoriteRemove : t.favoriteAdd}</div>
                    <div className="text-[9px] mt-1 leading-snug" style={{ color: isFavorite ? '#F472B6' : '#B9ACA0' }}>{isFavorite ? t.favoriteRemoveSub : t.favoriteAddSub}</div>
                  </div>
                </motion.button>
              </div>

              <button onClick={() => { triggerHaptic(); onBack?.(); }} className="w-full text-center text-[15px] font-medium text-[#B9ACA0] hover:text-[#F5F1EB] py-2 active:scale-95 transition-all cursor-pointer">
                {t.backToMenu}
              </button>
            </div>
          </motion.div>
        )}

        {/* ================= ЦИФРОВАЯ ВИЗИТКА ================= */}
        {view === 'collaboration' && (
          <motion.div
            key="collaboration"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col z-40 bg-[#151210] overflow-y-auto px-5 pt-20 pb-10"
          >
            <div className="flex flex-col items-center text-center mt-6 mb-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(96,165,250,0.05) 100%)', boxShadow: 'inset 0 1px 0 rgba(96,165,250,0.4), 0 8px 24px rgba(0,0,0,0.4)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#60A5FA] font-semibold mb-2">{t.collabSubtitle}</p>
              <h2 className="font-display text-[2rem] leading-tight text-[#F5F1EB] mb-4">{t.collabTitle}</h2>
              <p className="text-[13px] leading-relaxed text-[#B9ACA0] max-w-xs">{t.collabText}</p>
            </div>

            {/* Карточка контактов */}
            <div className="rounded-2xl p-5 w-full flex flex-col items-center" style={cardStyle}>
              <span className="text-[10px] text-[#B9ACA0] uppercase tracking-wider mb-2">{t.collabEmailLabel}</span>
              <span className="text-[1.3rem] font-medium text-[#F5F1EB] mb-6 tracking-wide">cordwain@tuta.io</span>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={handleCopyEmail}
                  className="py-3 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: emailCopied ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                    color: emailCopied ? '#60A5FA' : '#F5F1EB',
                    border: `1px solid ${emailCopied ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`
                  }}
                >
                  {emailCopied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                  {emailCopied ? t.copiedBtn : t.copyBtn}
                </button>
                
                <a
                  href="mailto:cordwain@tuta.io"
                  onClick={() => triggerHaptic()}
                  className="py-3 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-center gap-2 text-[#151210]"
                  style={{ backgroundColor: '#D8A35C' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {t.mailBtn}
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= ЖУРНАЛ ================= */}
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
                    onClick={() => { triggerHaptic(); setActiveFilter(filter.id); }}
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
                  const title = lang === 'ru' ? article.titleRu : article.titleUk;
                  const excerpt = lang === 'ru' ? article.excerptRu : article.excerptUk;
                  const tag = lang === 'ru' ? article.tagRu : article.tagUk;
                  const readTime = lang === 'ru' ? article.readTimeRu : article.readTimeUk;

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
                        {article.isNew && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F472B6] animate-pulse" />
                        )}
                      </div>
                      
                      <h3 className="text-[15px] font-semibold leading-snug text-[#F5F1EB] mb-1.5">
                        {title}
                      </h3>
                      
                      <p className="text-[11.5px] text-[#B9ACA0]/80 leading-relaxed line-clamp-2 mb-3">
                        {excerpt}
                      </p>
                      
                      <div className="flex items-center text-[11px] text-[#D8A35C] font-medium group">
                        {t.readBtn} 
                        <span className="ml-1 opacity-70 group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </motion.div>
                  )
                })}

                {filteredArticles.length === 0 && (
                  <div className="text-center text-[#B9ACA0] text-[13px] py-10">
                    Ничего не найдено
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= ЧИТАЛКА (ЭКРАН СТАТЬИ) ================= */}
        {view === 'article' && activeArticle && content && (
          <motion.div
            key="article"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col z-30 bg-[#151210] overflow-y-auto overflow-x-hidden"
          >
            <div className="relative w-full h-[40vh] shrink-0">
              <img 
                src={activeArticle.cover || '/blog-hero.png'} 
                alt="cover" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(21,18,16,0.1) 0%, #151210 100%)' }} />
              
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                 <span className="text-[10px] tracking-[0.1em] uppercase text-[#D8A35C] bg-[#D8A35C]/20 backdrop-blur-md px-2 py-1 rounded-md border border-[#D8A35C]/30">
                    {lang === 'ru' ? activeArticle.tagRu : activeArticle.tagUk}
                 </span>
                 <span className="text-[10px] text-[#B9ACA0] bg-black/40 backdrop-blur-md px-2 py-1 rounded-md">
                   {lang === 'ru' ? activeArticle.readTimeRu : activeArticle.readTimeUk}
                 </span>
              </div>
            </div>

            <div className="px-5 py-6 pb-20">
              <h1 className="font-display text-[1.8rem] leading-tight text-[#F5F1EB] mb-6">
                {lang === 'ru' ? activeArticle.titleRu : activeArticle.titleUk}
              </h1>
              
              <div className="article-content">
                {content[lang]}
              </div>

              <div className="mt-10 pt-6 border-t border-[#2A231D] text-[11px] text-[#B9ACA0]/60">
                {lang === 'ru' ? 'Опубликовано:' : 'Опубліковано:'} {activeArticle.createdAt}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
