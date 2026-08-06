import { motion } from 'framer-motion'

type SectionCardProps = {
  title: string
  subtitle: string
  icon?: string
  onClick?: () => void
  delay?: number
}

export function SectionCard({ title, subtitle, icon, onClick, delay = 0 }: SectionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-surface border border-cream-dark/50 px-4 py-4
                 shadow-[var(--shadow-soft)] active:scale-[0.98] transition-transform duration-150
                 flex items-center gap-3"
    >
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-cream-dark/60 flex items-center justify-center text-xl shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-ink tracking-wide leading-tight">
          {title}
        </div>
        <div className="mt-0.5 text-[12px] text-muted leading-tight">
          {subtitle}
        </div>
      </div>
      <div className="ml-auto text-muted shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </motion.button>
  )
      }
