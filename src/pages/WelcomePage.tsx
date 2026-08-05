import { motion } from 'framer-motion'

export function WelcomePage() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cream via-cream to-cream-dark pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-accent-light/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-24 left-0 w-56 h-56 bg-gold/8 rounded-full blur-3xl -translate-x-1/4" />

      <div className="relative z-10 flex flex-col min-h-full px-5 pt-5 pb-7">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="flex items-center justify-between mb-5"
        >
          <span className="text-[10px] tracking-[0.18em] uppercase text-muted font-medium">
            Issue 01 · 2026
          </span>
          <span className="text-[10px] tracking-[0.14em] uppercase text-muted">
            Design · Create · Elevate
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08 }}
          className="mb-6"
        >
          <h1 className="font-display text-[2.6rem] leading-[0.92] tracking-tight text-ink font-semibold">
            Cordwainer
          </h1>
          <p className="mt-2.5 text-[13.5px] text-warm-gray leading-relaxed max-w-[260px]">
            Энциклопедия сапожного ремесла.<br />
            Наука. Эстетика. Мастерство.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15 }}
          className="relative mb-6 rounded-2xl overflow-hidden shadow-[var(--shadow-elevated)] bg-surface ring-1 ring-black/5"
        >
          <img
            src="/hero-cover.png"
            alt="Cordwainer — The Art of Color in Footwear"
            className="w-full h-auto object-cover block"
            style={{ aspectRatio: '3/4' }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="grid grid-cols-3 gap-2.5 mb-7"
        >
          {[
            { label: 'Материалы', sub: 'Кожа · Замша' },
            { label: 'Цвета', sub: 'Колористика' },
            { label: 'Фасоны', sub: 'Силуэты' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl bg-surface/90 border border-cream-dark/50 px-2.5 py-2.5 text-center shadow-[var(--shadow-soft)]"
            >
              <div className="text-[11px] font-semibold text-ink tracking-wide">{item.label}</div>
              <div className="mt-0.5 text-[9px] text-muted leading-tight">{item.sub}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-auto"
        >
          <button
            className="w-full h-[52px] rounded-[var(--radius-button)] bg-ink text-cream font-medium text-[15px] tracking-wide
                       active:scale-[0.985] transition-all duration-150
                       shadow-[0_10px_28px_-8px_rgba(26,26,26,0.4)]
                       flex items-center justify-center gap-2.5"
          >
            <span>Начать изучение</span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <p className="mt-3.5 text-center text-[11px] text-muted leading-snug">
            Профессиональный справочник<br />для мастеров и дизайнеров обуви
          </p>
        </motion.div>
      </div>
    </div>
  )
        }
