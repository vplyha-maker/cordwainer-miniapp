import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Tab = 'search' | 'workspace' | 'collection' | 'profile'

type BottomDockProps = {
  active?: Tab
  onChange?: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'search',
    label: 'Поиск',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20L16.5 16.5" />
      </svg>
    ),
  },
  {
    id: 'workspace',
    label: 'Инструменты',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    id: 'collection',
    label: 'Коллекция',
    icon: (
      // Заменили на иконку звезды в соответствии со скриншотом
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Кабинет',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
]

export function BottomDock({
  active = 'search',
  onChange,
}: BottomDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      
      <div
        className="pointer-events-auto relative mx-auto max-w-md overflow-hidden rounded-[28px] p-1.5 flex items-center justify-between"
        style={{
          // Более темный фон, соответствующий макету
          background: 'linear-gradient(180deg, #321E14 0%, #1A0D07 100%)',
          border: '1px solid rgba(220, 165, 100, 0.3)',
          boxShadow: `
            0 20px 40px rgba(0,0,0,0.85),
            inset 0 1px 1px rgba(255,255,255,0.08),
            inset 0 -3px 12px rgba(0,0,0,0.6)
          `,
        }}
      >
        {/* Верхний блик */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.05), transparent 35%)',
          }}
        />

        {/* Пунктирная строчка — подогнана ближе к краям */}
        <div
          className="absolute inset-[4px] rounded-[24px] pointer-events-none z-0"
          style={{
            border: '1px dashed rgba(220, 170, 110, 0.2)',
          }}
        />

        <div className="relative z-10 flex w-full justify-between">
          {TABS.map((tab) => {
            const isActive = active === tab.id

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => onChange?.(tab.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-[22px]"
                style={{
                  color: isActive ? '#E8B673' : '#8A7A6E', // Приглушенный цвет для неактивных, золотистый для активного
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDock"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                    }}
                    className="absolute inset-0 rounded-[22px] z-0"
                    style={{
                      // Ярко выраженный коньячный фон для активного таба
                      background: 'linear-gradient(180deg, #60371E 0%, #3D2010 100%)',
                      boxShadow: `
                        inset 0 1px 1px rgba(255,255,255,0.12),
                        inset 0 -2px 4px rgba(0,0,0,0.3),
                        0 0 15px rgba(216,163,92,.15)
                      `,
                    }}
                  />
                )}

                <motion.div
                  className="relative z-10"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -1 : 0, // Легкий подъем иконки вверх
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  style={{
                    filter: isActive
                      ? `
                        drop-shadow(0 0 8px rgba(216,163,92,.4))
                        drop-shadow(0 2px 4px rgba(0,0,0,.4))
                      `
                      : 'none',
                  }}
                >
                  {tab.icon}
                </motion.div>

                <motion.span
                  className="relative z-10 text-[10px] font-medium tracking-wide"
                  animate={{
                    opacity: isActive ? 1 : 0.9,
                  }}
                >
                  {tab.label}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
