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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
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

export function BottomDock({ active = 'search', onChange }: BottomDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="leather-dock pointer-events-auto mx-auto max-w-md rounded-[var(--radius-dock)] px-2 py-2 flex items-center justify-between">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange?.(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl transition-all duration-200
                ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[9px] font-medium tracking-wide">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
  }
