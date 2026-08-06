import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'

type WelcomePageProps = {
  onStart?: () => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <div className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] pb-28">
      
      {/* Hero image */}
      <div className="relative h-[52vh] min-h-[320px] overflow-hidden">
        <img
          src="/hero-cover.png"
          alt="Cordwainer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Градиент снизу */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 40%, var(--color-bg) 100%)',
          }}
        />

        {/* Верхняя подпись */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div>
            <h1 className="font-display text-[2.4rem] leading-[0.92] text-white drop-shadow-md">
              Cordwainer
            </h1>
            <p className="mt-1.5 text-[12px] text-white/80 tracking-wide">
              Энциклопедия обувного мастерства
            </p>
          </div>
          <button className="w-9 h-9 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/15">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>

        {/* Issue */}
        <div className="absolute bottom-16 left-4">
          <span className="text-[10px] tracking-[0.18em] uppercase text-white/60">
            Issue 01 · 2026
          </span>
        </div>
      </div>

      {/* Контент под картинкой */}
      <div className="relative z-10 px-4 -mt-8">
        
        {/* 3 категории */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2 mb-4"
        >
          {[
            { label: 'Материалы', sub: 'Кожа · Замша', icon: '🪵' },
            { label: 'Цвета', sub: 'Колористика', icon: '🎨' },
            { label: 'Фасоны', sub: 'Силуэты', icon: '👞' },
          ].map((item) => (
            <div
              key={item.label}
              className="glass rounded-2xl px-2.5 py-3 text-center"
            >
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-[11px] font-semibold leading-tight">
                {item.label}
              </div>
              <div className="text-[9px] text-[var(--color-muted)] mt-0.5">
                {item.sub}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Кнопка Начать */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          onClick={onStart}
          className="w-full h-[48
