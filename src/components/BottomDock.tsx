import { motion } from 'framer-motion'

type Tab = 'search' | 'workspace' | 'collection' | 'profile'

type BottomDockProps = {
  active?: Tab
  onChange?: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'search',
    label: 'Поиск',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
  },
  {
    id: 'workspace',
    label: 'Инструменты',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    id: 'collection',
    label: 'Коллекция',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l2.5 6.5L21 10l-5 4.5L17.5 21 12 17.5 6.5 21 8 14.5 3 10l6.5-.5L12 3z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Кабинет',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
]

export function BottomDock({ active = 'search', onChange }: BottomDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div
        className="pointer-events-auto mx-auto max-w-md rounded-[22px] px-1.5 py-1.5 flex items-center justify-between"
        style={{
          background: '#3A2418',
          border: '1.5px solid #C6A47A',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25), 0 8px 28px rgba(0,0,0,0.45)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id

          return (
            <motion.button
              key={tab.id}
              onClick={() => onChange?.(tab.id)}
              whileTap={{ scale: 0.88 }}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl"
              style={{
                color: isActive ? '#D8A35C' : '#B9ACA0',
              }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.18 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 18,
                }}
                style={{
                  filter: isActive
                    ? 'drop-shadow(0 0 8px rgba(216, 163, 92, 0.55))'
                    : 'none',
                }}
              >
                {tab.icon}
              </motion.div>

              <motion.span
                className="text-[9px] font-medium tracking-wide"
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
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
