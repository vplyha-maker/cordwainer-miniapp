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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20L16.5 16.5" />
      </svg>
    ),
  },
  {
    id: 'workspace',
    label: 'Инструменты',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    id: 'collection',
    label: 'Коллекция',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l2.5 6.5L21 10l-5 4.5L17.5 21 12 17.5 6.5 21 8 14.5 3 10l6.5-.5L12 3z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Кабинет',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">

      <div
        className="pointer-events-auto relative mx-auto max-w-md overflow-hidden rounded-[24px] px-2 py-2 flex items-center justify-between"
        style={{
          background:
            'linear-gradient(180deg,#4C3023 0%,#3C261B 45%,#2E1C14 100%)',
          border: '1px solid rgba(214,179,126,.75)',
          boxShadow: `
            0 18px 40px rgba(0,0,0,.55),
            inset 0 1px 0 rgba(255,255,255,.08),
            inset 0 -2px 8px rgba(0,0,0,.35)
          `,
        }}
      >

        {/* Верхний блик */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg,rgba(255,255,255,.08),transparent 28%)',
          }}
        />

        {/* Кремовая строчка */}
        <div
          className="absolute inset-[7px] rounded-[18px] pointer-events-none"
          style={{
            border: '1px dashed rgba(239,216,176,.22)',
          }}
        />

        {TABS.map((tab) => {
          const isActive = active === tab.id

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: .93 }}
              onClick={() => onChange?.(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-[18px]"
              style={{
                color: isActive ? '#F3C27A' : '#B9ACA0',
              }}
            >

              {isActive && (
                <motion.div
                  layoutId="activeDock"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 30,
                  }}
                  className="absolute inset-0 rounded-[18px]"
                  style={{
                    background:
                      'linear-gradient(180deg,#523323,#43291D)',
                    boxShadow: `
                      inset 0 1px 0 rgba(255,255,255,.05),
                      inset 0 -2px 5px rgba(0,0,0,.35),
                      0 0 18px rgba(216,163,92,.18)
                    `,
                  }}
                />
              )}

              <motion.div
                className="relative z-10"
                animate={{
                  scale: isActive ? 1.18 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 18,
                }}
                style={{
                  filter: isActive
                    ? `
                      drop-shadow(0 0 10px rgba(216,163,92,.35))
                      drop-shadow(0 2px 6px rgba(0,0,0,.25))
                    `
                    : 'none',
                }}
              >
                {tab.icon}
              </motion.div>

              <motion.span
                className="relative z-10 text-[10px] font-medium tracking-wide"
                animate={{
                  opacity: isActive ? 1 : .72,
                }}
              >
                {tab.label}
              </motion.span>

            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
