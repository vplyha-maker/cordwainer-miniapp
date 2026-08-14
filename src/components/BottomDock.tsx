import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Lang } from '../App'

type Tab = 'search' | 'workspace' | 'collection' | 'profile'

type BottomDockProps = {
  active?: Tab
  onChange?: (tab: Tab) => void
  lang?: Lang
}

export function BottomDock({
  active = 'search',
  onChange,
  lang = 'ru',
}: BottomDockProps) {
  const labels = {
    ru: {
      search: 'Поиск',
      workspace: 'Инструменты',
      collection: 'Коллекция',
      profile: 'Кабинет',
    },
    uk: {
      search: 'Пошук',
      workspace: 'Інструменти',
      collection: 'Колекція',
      profile: 'Кабінет',
    },
  }[lang]

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    {
      id: 'search',
      label: labels.search,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20L16.5 16.5" />
        </svg>
      ),
    },
    {
      id: 'workspace',
      label: labels.workspace,
      icon: (
        // Заменил "плюс" на элегантную иконку инструментов/слоев
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5" />
          <path d="M12 12v9" />
          <path d="M12 12L4 7.5" />
        </svg>
      ),
    },
    {
      id: 'collection',
      label: labels.collection,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: labels.profile,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 pointer-events-none">
      {/* Container */}
      <div
        className="pointer-events-auto relative mx-auto max-w-[360px] overflow-hidden rounded-[24px] p-1.5 flex items-center justify-between"
        style={{
          background: 'rgba(25, 20, 18, 0.85)', // Глубокий кофейно-угольный оттенок
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(216, 163, 92, 0.12)', // Тончайшая золотистая окантовка
          boxShadow: `
            0 24px 48px rgba(0,0,0,0.6), /* Глубокая тень для эффекта левитации */
            0 0 0 1px rgba(0,0,0,0.8), /* Темный ободок для контраста */
            inset 0 1px 1px rgba(255,255,255,0.08) /* Верхний светлый блик (bevel) */
          `,
        }}
      >
        <div className="relative z-10 flex w-full justify-between gap-1">
          {TABS.map((tab) => {
            const isActive = active === tab.id

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => onChange?.(tab.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-[18px] cursor-pointer"
                style={{
                  color: isActive ? '#D8A35C' : '#8A7A6E',
                }}
              >
                {/* Active Indicator (Pill) */}
                {isActive && (
                  <motion.div
                    layoutId="activeDock"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 35,
                      mass: 0.8
                    }}
                    className="absolute inset-0 rounded-[18px] z-0"
                    style={{
                      background: 'linear-gradient(180deg, rgba(216,163,92,0.15) 0%, rgba(216,163,92,0.03) 100%)',
                      border: '1px solid rgba(216,163,92,0.15)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
                    }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  className="relative z-10 flex items-center justify-center"
                  animate={{
                    y: isActive ? -2 : 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  style={{
                    filter: isActive
                      ? 'drop-shadow(0 4px 6px rgba(216,163,92,0.25)) drop-shadow(0 0 12px rgba(216,163,92,0.15))'
                      : 'none',
                  }}
                >
                  {tab.icon}
                </motion.div>

                {/* Label */}
                <motion.span
                  className="relative z-10 text-[9.5px] font-medium tracking-[0.02em]"
                  animate={{
                    opacity: isActive ? 1 : 0.7,
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {tab.label}
                </motion.span>

                {/* Active dot below text */}
                {isActive && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#D8A35C]"
                    style={{ boxShadow: '0 0 6px rgba(216,163,92,0.6)' }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
