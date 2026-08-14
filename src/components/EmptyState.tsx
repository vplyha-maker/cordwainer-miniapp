import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type EmptyStateVariant = 'search' | 'favorites' | 'generic'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  showAnimation?: boolean
}

const variantConfig = {
  search: {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  favorites: {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  generic: {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
}

export function EmptyState({
  variant = 'generic',
  title,
  description,
  icon,
  action,
  showAnimation = true,
}: EmptyStateProps) {
  const iconToShow = icon || variantConfig[variant].icon

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  }

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
    animate: {
      y: [0, -4, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
  }

  const Wrapper = showAnimation ? motion.div : 'div'
  const wrapperProps = showAnimation
    ? {
        variants: containerVariants,
        initial: 'hidden',
        animate: 'visible',
      }
    : {}

  return (
    <Wrapper
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      {...wrapperProps}
    >
      {/* Icon */}
      <motion.div
        variants={showAnimation ? iconVariants : undefined}
        animate={showAnimation ? 'animate' : undefined}
        className="w-16 h-16 rounded-full bg-[#1D1815] flex items-center justify-center mb-4 border border-[#2A231D] text-[#B9ACA0] shrink-0"
      >
        {iconToShow}
      </motion.div>

      {/* Title */}
      <motion.p
        variants={showAnimation ? itemVariants : undefined}
        className="text-[16px] font-semibold text-[#F5F1EB] mb-2 leading-snug"
      >
        {title}
      </motion.p>

      {/* Description */}
      {description && (
        <motion.p
          variants={showAnimation ? itemVariants : undefined}
          className="text-[13px] text-[#B9ACA0] mb-6 max-w-[85%] leading-relaxed"
        >
          {description}
        </motion.p>
      )}

      {/* Action Button */}
      {action && (
        <motion.button
          variants={showAnimation ? itemVariants : undefined}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-6 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider text-[#151210] bg-[#D8A35C] active:scale-95 transition-all cursor-pointer focus-visible hover:bg-[#E5B366]"
        >
          {action.label}
        </motion.button>
      )}
    </Wrapper>
  )
}

export default EmptyState
