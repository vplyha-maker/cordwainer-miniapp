import { motion } from 'framer-motion'

type WelcomePageProps = {
  onStart?: () => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <div className="relative h-[100dvh] overflow-hidden flex flex-col">
      {/* Фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream via-cream to-cream-dark pointer-events-none" />
      <div className="absolute top-0 right-0 w-56 h-56 bg-accent-light/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />

      <div className="relative z-10 flex flex-col h-full px-4 pt-3 pb-4">
        
        {/* Верхняя строка */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-3 shrink-0"
        >
          <span className="text-[9px] tracking-[0.16em] uppercase text-muted font-medium">
            Issue 01 · 2026
          </span>
          <span className="text-[9px] tracking-[0.12em] uppercase text-muted">
            Design · Create · Elevate
          </span>
        </motion.div>

        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-3 shrink-0"
        >
          <h1 className="font-display text-[2.1rem] leading-[0.95] tracking-tight text-ink font-semibold">
            Cordwainer
          </h1>
          <p className="mt-1.5 text-[12.5px] text-warm-gray leading-snug">
            Энциклопедия сапожного ремесла.<br />
            Наука. Эстетика. Мастерство.
          </p>
        </motion.div>

        {/* Картинка */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative flex-1 min-h-0 mb-3 rounded-2xl overflow-hidden shadow-[var(--shadow-elevated)] bg-surface ring-1 ring-black/5"
        >
          <img
            src="/hero-cover.png"
            alt="Cordwainer"
            className="w-full h-full object-cover object-center"
          />
        </motion.div>

        {/* Три категории */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="grid grid-cols-3 gap-2 mb-3 shrink-0"
        >
          {[
            { label: 'Материалы', sub: 'Кожа · Замша' },
            { label: 'Цвета', sub: 'Колористика' },
            { label: 'Фасоны', sub: 'Силуэты' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl bg-surface border border-cream-dark/60 px-2 py-2 text-center shadow-[var(--shadow-soft)]"
            >
              <div className="text-[11px] font-semibold text-ink tracking-wide leading-tight">
                {item.label}
              </div>
              <div className="mt-0.5 text-[9px] text-muted leading-tight">
                {item.sub}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Кнопка */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="shrink-0"
        >
          <button
            onClick={onStart}
            className="w-full h-[48px] rounded-[var(--radius-button)] bg-ink text-cream font-medium text-[14.5px] tracking-wide
                       active:scale-[0.985] transition-all duration-150
                       shadow-[0_8px_24px_-6px_rgba(26,26,26,0.35)]
                       flex items-center justify-center gap-2"
          >
            <span>Начать изучение</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <p className="mt-2 text-center text-[10px] text-muted leading-snug">
            Профессиональный справочник для мастеров
          </p>
        </motion.div>
      </div>
    </div>
  )
            }
