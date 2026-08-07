import { motion } from 'framer-motion'
import { BLOG_ARTICLES } from '../data/blog'
import type { Lang } from '../App'

type BlogPageProps = {
  onBack?: () => void
  lang: Lang
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export function BlogPage({ onBack, lang, isFavorite = false, onToggleFavorite }: BlogPageProps) {
  const hasNew = BLOG_ARTICLES.some((a) => a.isNew)
  const count = BLOG_ARTICLES.length

  const t = {
    ru: {
      title: 'PRO Обувь',
      subtitle: 'БЛОГ И СТАТЬИ',
      tagline: 'Изнанка обувной индустрии. Дизайн, технологии и секреты производства',
      read: 'Читать',
      readSub: count === 0 ? 'Статьи скоро появятся' : `${count} ${count === 1 ? 'статья' : count < 5 ? 'статьи' : 'статей'}`,
      newBadge: 'NEW',
      contact: 'Связаться',
      contactSub: 'Написать в мастерскую',
      favoriteAdd: 'В избранное',
      favoriteAddSub: 'Сохранить на главной',
      favoriteRemove: 'В избранном',
      favoriteRemoveSub: 'Убрать с главной',
      back: 'Назад в меню',
    },
    uk: {
      title: 'PRO Взуття',
      subtitle: 'БЛОГ ТА СТАТТІ',
      tagline: 'Виворіт взуттєвої індустрії. Дизайн, технології та секрети виробництва',
      read: 'Читати',
      readSub: count === 0 ? 'Статті зʼявляться незабаром' : `${count} ${count === 1 ? 'стаття' : count < 5 ? 'статті' : 'статей'}`,
      newBadge: 'NEW',
      contact: "Звʼязатися",
      contactSub: 'Написати в майстерню',
      favoriteAdd: 'В обране',
      favoriteAddSub: 'Зберегти на головній',
      favoriteRemove: 'В обраному',
      favoriteRemoveSub: 'Видалити з головної',
      back: 'Назад до меню',
    },
  }[lang]

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.2) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }

  const favIconColor = isFavorite ? '#F5F1EB' : '#F472B6'
  const favIconBg = isFavorite ? '#F472B6' : 'rgba(244,114,182,0.18)'
  const favBoxShadow = isFavorite ? '0 0 16px rgba(244,114,182,0.6)' : '0 0 12px rgba(244,114,182,0.25)'

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden justify-between">
      {/* BACKGROUND HERO IMAGE */}
      <div className="absolute inset-0 z-0 h-[65vh] overflow-hidden pointer-events-none">
        <img
          src="/blog-hero.png"
          alt="PRO Обувь"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(21,18,16,0.15) 0%, rgba(21,18,16,0.65) 55%, #151210 100%)',
          }}
        />
      </div>

      {/* TOP BACK BUTTON */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
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

      {/* BOTTOM CONTENT AREA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-6 pt-16"
      >
        {/* TITLE BLOCK */}
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

        {/* BUTTONS GRID */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 items-stretch">
          <motion.button
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
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">{t.read}</span>
              </div>
              <div className="text-[9px] text-[#B9ACA0] mt-1 leading-snug">{t.readSub}</div>
            </div>
          </motion.button>

          <motion.button
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

          {/* В избранное (Динамическая кнопка) */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="relative rounded-xl p-3 text-left flex flex-col justify-between overflow-hidden cursor-pointer w-full min-h-[115px]"
            style={cardStyle}
            onClick={() => onToggleFavorite?.()}
          >
            <motion.div
              animate={{ backgroundColor: favIconBg, color: favIconColor, boxShadow: favBoxShadow }}
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 shrink-0 relative z-10 text-sm transition-colors"
            >
              ★
            </motion.div>
            <div className="relative z-10 flex-1 flex flex-col justify-end">
              <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB]">
                {isFavorite ? t.favoriteRemove : t.favoriteAdd}
              </div>
              <div className="text-[9px] mt-1 leading-snug" style={{ color: isFavorite ? '#F472B6' : '#B9ACA0' }}>
                {isFavorite ? t.favoriteRemoveSub : t.favoriteAddSub}
              </div>
            </div>
          </motion.button>
        </div>

        {/* НАЗАД В МЕНЮ */}
        <button
          onClick={onBack}
          className="w-full text-center text-[15px] font-medium text-[#B9ACA0] hover:text-[#F5F1EB] py-2 active:scale-95 transition-all cursor-pointer"
        >
          {t.back}
        </button>
      </motion.div>
    </div>
  )
}
