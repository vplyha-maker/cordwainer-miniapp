import { motion } from 'framer-motion'
import { BLOG_ARTICLES } from '../data/blog'
import type { Lang } from '../App'

type BlogPageProps = {
  onBack?: () => void
  lang: Lang
  onAddFavorite?: () => void
}

export function BlogPage({ onBack, lang, onAddFavorite }: BlogPageProps) {
  const hasNew = BLOG_ARTICLES.some((a) => a.isNew)
  const count = BLOG_ARTICLES.length

  const t = {
    ru: {
      title: 'Орвард Орто',
      subtitle: 'Мастерская ортопедической обуви',
      tagline: 'Производство на заказ для всей семьи',
      read: 'Читать',
      readSub: count === 0 ? 'Статьи скоро появятся' : `${count} ${count === 1 ? 'статья' : count < 5 ? 'статьи' : 'статей'}`,
      newBadge: 'Новая статья',
      contact: 'Связаться',
      contactSub: 'Написать в мастерскую',
      favorite: 'В избранное',
      favoriteSub: 'Сохранить на главной',
      back: 'Назад в меню',
    },
    uk: {
      title: 'Орвард Орто',
      subtitle: 'Майстерня ортопедичного взуття',
      tagline: 'Виробництво на замовлення для всієї родини',
      read: 'Читати',
      readSub: count === 0 ? 'Статті зʼявляться незабаром' : `${count} ${count === 1 ? 'стаття' : count < 5 ? 'статті' : 'статей'}`,
      newBadge: 'Нова стаття',
      contact: "Звʼязатися",
      contactSub: 'Написати в майстерню',
      favorite: 'В обране',
      favoriteSub: 'Зберегти на головній',
      back: 'Назад до меню',
    },
  }[lang]

  const cardStyle = {
    background: 'linear-gradient(180deg, rgba(39,33,29,0.92) 10%, rgba(21,18,16,0.01) 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(198,164,122,0.35), inset 1px 0 0 rgba(198,164,122,0.05), inset -1px 0 0 rgba(198,164,122,0.05), 0 6px 18px rgba(0,0,0,0.25)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-[#151210] text-[#F5F1EB] overflow-hidden">
      {/* HERO */}
      <div className="relative shrink-0 h-[48vh] min-h-[280px] max-h-[400px] overflow-hidden">
        <img
          src="/blog-hero.png"
          alt="Орвард Орто"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(21,18,16,0.2) 0%, rgba(21,18,16,0.55) 55%, #151210 100%)',
          }}
        />

        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
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

        <div className="absolute bottom-8 left-4 right-4 z-10">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#B9ACA0] mb-1.5">
            {t.subtitle}
          </p>
          <h1
            className="font-display text-[2rem] leading-tight text-[#F5F1EB]"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
          >
            {t.title}
          </h1>
          <p className="mt-1.5 text-[12px] text-[#B9ACA0]">{t.tagline}</p>
        </div>
      </div>

      {/* BUTTONS */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4 }}
        className="flex-1 px-4 pt-2 overflow-y-auto pb-8 -mt-2 relative z-10"
      >
        <div className="flex flex-col gap-2.5 mb-4">
          {/* Читать */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="relative w-full rounded-2xl px-4 py-3.5 text-left flex items-center gap-3 overflow-hidden"
            style={cardStyle}
            onClick={() => console.log('read articles')}
          >
            {hasNew && (
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={{ opacity: [0.15, 0.4, 0.15] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(216,163,92,0.5), 0 0 20px rgba(216,163,92,0.15)',
                }}
              />
            )}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(216,163,92,0.18)',
                color: '#D8A35C',
                boxShadow: '0 0 12px rgba(216,163,92,0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#F5F1EB]">{t.read}</span>
                {hasNew && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(216,163,92,0.2)',
                      color: '#D8A35C',
                    }}
                  >
                    {t.newBadge}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#B9ACA0] mt-0.5">{t.readSub}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9ACA0" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>

          {/* Связаться */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl px-4 py-3.5 text-left flex items-center gap-3"
            style={cardStyle}
            onClick={() => console.log('contact')}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(96,165,250,0.18)',
                color: '#60A5FA',
                boxShadow: '0 0 12px rgba(96,165,250,0.25)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-[#F5F1EB]">{t.contact}</div>
              <div className="text-[11px] text-[#B9ACA0] mt-0.5">{t.contactSub}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9ACA0" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>

          {/* В избранное */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl px-4 py-3.5 text-left flex items-center gap-3"
            style={cardStyle}
            onClick={() => onAddFavorite?.()}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(244,114,182,0.18)',
                color: '#F472B6',
                boxShadow: '0 0 12px rgba(244,114,182,0.25)',
              }}
            >
              ★
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-[#F5F1EB]">{t.favorite}</div>
              <div className="text-[11px] text-[#B9ACA0] mt-0.5">{t.favoriteSub}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9ACA0" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>
        </div>

        <button
          onClick={onBack}
          className="w-full text-center text-[12px] text-[#B9ACA0] py-2"
        >
          {t.back}
        </button>
      </motion.div>
    </div>
  )
    }
