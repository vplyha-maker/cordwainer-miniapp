import { motion } from 'framer-motion'
import { SectionCard } from '../components/SectionCard'

type HomePageProps = {
  onBack?: () => void
}

const SECTIONS = [
  { id: 'materials', title: 'Материалы', subtitle: 'Кожа, замша, подошвы, подкладка', icon: '🪵' },
  { id: 'colors', title: 'Цвета и колористика', subtitle: 'Психология цвета, смешивание, патина', icon: '🎨' },
  { id: 'styles', title: 'Фасоны и силуэты', subtitle: 'Классика, женские, уличные', icon: '👞' },
  { id: 'constructions', title: 'Конструкции', subtitle: 'Методы крепления, каркас, гидроизоляция', icon: '🏗️' },
  { id: 'calculators', title: 'Калькуляторы', subtitle: 'Размеры, расход кожи', icon: '🧮' },
  { id: 'assistant', title: 'Экспресс-помощник', subtitle: 'Склейка, брак, чек-листы', icon: '⚡' },
  { id: 'glossary', title: 'Глоссарий', subtitle: 'Термины мастера', icon: '📖' },
]

export function HomePage({ onBack }: HomePageProps) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-cream">
      <div className="absolute inset-0 bg-gradient-to-b from-cream via-cream to-cream-dark pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-[100dvh] px-4 pt-4 pb-6">
        
        {/* Шапка */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-5 shrink-0"
        >
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-surface border border-cream-dark/60 flex items-center justify-center
                         active:scale-95 transition-transform shadow-[var(--shadow-soft)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="font-display text-[1.6rem] leading-none text-ink font-semibold">
              Cordwainer
            </h1>
            <p className="text-[11px] text-muted mt-0.5 tracking-wide">
              Выберите раздел
            </p>
          </div>
        </motion.div>

        {/* Список разделов */}
        <div className="flex flex-col gap-2.5 flex-1">
          {SECTIONS.map((section, i) => (
            <SectionCard
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              icon={section.icon}
              delay={0.05 + i * 0.04}
              onClick={() => {
                // Позже: переход в раздел
                console.log('Open:', section.id)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
  }
