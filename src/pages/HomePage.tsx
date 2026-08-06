import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'

type HomePageProps = {
  onBack?: () => void
}

const LEARNING = [
  {
    id: 'materials',
    title: 'Материалы',
    subtitle: 'Кожа, замша, подошвы и др.',
    count: '245 статей',
    accent: '#D8A35C',
    icon: '🪵',
  },
  {
    id: 'colors',
    title: 'Цвета и отделка',
    subtitle: 'Психология цвета, патина',
    count: '128 статей',
    accent: '#A78BFA',
    icon: '🎨',
  },
  {
    id: 'styles',
    title: 'Фасоны и силуэты',
    subtitle: 'Классика, женские, уличные',
    count: '186 статей',
    accent: '#60A5FA',
    icon: '👞',
  },
  {
    id: 'constructions',
    title: 'Конструкции',
    subtitle: 'Крепление, каркас, гидро',
    count: '97 статей',
    accent: '#34D399',
    icon: '🏗️',
  },
]

const TOOLS = [
  { id: 'calc', title: 'Калькуляторы', subtitle: '12 инструментов', accent: '#F59E0B', icon: '🧮' },
  { id: 'helper', title: 'Экспресс-помощник', subtitle: '23 инструмента', accent: '#F472B6', icon: '⚡' },
  { id: 'glossary', title: 'Глоссарий', subtitle: '342 термина', accent: '#38BDF8', icon: '📖' },
]

export function HomePage({ onBack }: HomePageProps) {
  return (
    <motion.div 
      // Добавлены анимации появления и ухода для поддержки AnimatePresence из App.tsx
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      // Заменено на жесткую высоту 100dvh + flex для правильного внутреннего скролла
      className="relative flex flex-col h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)] overflow-hidden"
    >
      {/* Контент со скроллом, flex-1 заставляет блок занять все свободное место */}
      <div className="flex-1 px-4 pt-3 pb-[110px] overflow-y-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <h1 className="font-display text-[1.65rem] leading-none text-[var(--color-ink)]">
            Меню
          </h1>
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-[var(--color-muted)] active:scale-95 transition-transform"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="mb-4"
        >
          <div className="glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 cursor-pointer active:scale-[0.98] transition-transform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[var(--color-muted)] shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="text-[12.5px] text-[var(--color-muted)] truncate">
              Поиск по материалам, конструкциям...
            </span>
          </div>
        </motion.div>

        {/* Обучение */}
        <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-muted)] mb-2 px-0.5">
          Обучение
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {LEARNING.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.03 }}
              className="glass rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base mb-2"
                style={{ background: `${item.accent}22`, color: item.accent }}
              >
                {item.icon}
              </div>
              <div className="text-[13px] font-semibold leading-tight mb-0.5">
                {item.title}
              </div>
              <div className="text-[10px] text-[var(--color-muted)] leading-snug mb-1">
                {item.subtitle}
              </div>
              <div className="text-[9px] text-[var(--color-muted)] opacity-80">
                {item.count}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Инструменты */}
        <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--color-muted)] mb-2 px-0.5">
          Инструменты
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TOOLS.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.03 }}
              className="glass rounded-2xl p-2.5 text-left active:scale-[0.98] transition-transform"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm mb-1.5"
                style={{ background: `${item.accent}22`, color: item.accent }}
              >
                {item.icon}
              </div>
              <div className="text-[11px] font-semibold leading-tight mb-0.5">
                {item.title}
              </div>
              <div className="text-[9px] text-[var(--color-muted)] leading-snug">
                {item.subtitle}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Избранное */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="glass rounded-2xl px-3.5 py-3 flex items-center gap-3 mb-3 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)] text-sm">
            ★
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold">Избранное</div>
            <div className="text-[10px] text-[var(--color-muted)]">Сохранённые статьи</div>
          </div>
          <div className="flex -space-x-1.5">
            <div className="w-6 h-6 rounded-full bg-[#8B5E3C]/50 border-2 border-[var(--color-surface)]" />
            <div className="w-6 h-6 rounded-full bg-[#A78BFA]/50 border-2 border-[var(--color-surface)]" />
            <div className="w-6 h-6 rounded-full bg-[#60A5FA]/50 border-2 border-[var(--color-surface)]" />
            <div className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] border-2 border-[var(--color-surface)] flex items-center justify-center text-[8px] text-[var(--color-muted)]">
              +12
            </div>
          </div>
        </motion.div>

        {/* Цитата */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="glass rounded-2xl p-3.5"
        >
          <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-soft)] italic">
            «Мастерство — в деталях. Знание — в опыте.»
          </p>
          <p className="mt-1.5 text-[11px] text-[var(--color-accent)] font-display">
            Cordwainer
          </p>
        </motion.div>
      </div>

      <BottomDock active="search" />
    </motion.div>
  )
}
