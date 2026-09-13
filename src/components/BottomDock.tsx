import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Lang } from '../App'

// Обновленный тип вкладок: только Поиск, Настройки, Кабинет
export type Tab = 'search' | 'settings' | 'profile'

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
      settings: 'Настройки',
      profile: 'Кабинет',
    },
    uk: {
      search: 'Пошук',
      settings: 'Налаштування',
      profile: 'Кабінет',
    },
    de: {
      search: 'Suche',
      settings: 'Einstellungen',
      profile: 'Profil',
    },
  }[lang]

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    {
      id: 'search',
      label: labels.search,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20L16.5 16.5" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: labels.settings,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
    {
      id: 'profile',
      label: labels.profile,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 pointer-events-none">
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[20px] p-1 flex items-center justify-between"
        style={{
          background: 'rgba(17, 17, 17, 0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="relative z-10 flex w-full justify-between gap-1">
          {TABS.map((tab) => {
            const isActive = active === tab.id

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange?.(tab.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-[16px] cursor-pointer"
                style={{
                  color: isActive ? '#D8A35C' : 'rgba(255, 255, 255, 0.4)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDock"
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                    className="absolute inset-0 rounded-[16px] z-0"
                    style={{
                      background: 'rgba(216, 163, 92, 0.08)',
                      border: '1px solid rgba(216, 163, 92, 0.35)',
                      boxShadow: '0 0 12px rgba(216, 163, 92, 0.1)',
                    }}
                  />
                )}

                <motion.div
                  className="relative z-10 flex items-center justify-center"
                  animate={{ y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {tab.icon}
                </motion.div>

                <motion.span
                  className="relative z-10 text-[9px] font-medium tracking-wide"
                  animate={{
                    opacity: isActive ? 1 : 0.8,
                  }}
                >
                  {tab.label}
                </motion.span>
                
                {isActive && (
                  <motion.div
                    layoutId="activeDot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#D8A35C]"
                    style={{
                      boxShadow: '0 0 6px rgba(216, 163, 92, 0.8)',
                    }}
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
